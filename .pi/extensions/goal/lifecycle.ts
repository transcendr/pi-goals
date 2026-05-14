import type {
	ContextEvent,
	ContextEventResult,
	ExtensionAPI,
	ExtensionContext,
	MessageUpdateEvent,
	SessionStartEvent,
	ToolCallEvent,
	ToolResultEvent,
	TurnEndEvent,
	TurnStartEvent,
} from "@earendil-works/pi-coding-agent/dist/core/extensions/types.js";
import {
	BUDGET_LIMIT_MESSAGE_TYPE,
	BUDGET_WARNING_PROMPT_ID,
	CONTINUATION_MESSAGE_TYPE,
	MAX_CONSECUTIVE_AUTO_TURNS,
	MAX_NO_PROGRESS_AUTO_TURNS,
	PAUSE_MESSAGE_TYPE,
	GOAL_MONITOR_MESSAGE_TYPE,
	QUEUE_MESSAGE_TYPE,
	AGENT_END_HANDOFF_DELAY_MS,
} from "./constants";
import { evaluateBudgetPressure, isBudgetHardStop, isBudgetReached, isBudgetWarning, queueHandoffReason } from "./budget";
import { beginGoalCompaction, cancelGoalContinuation, finishGoalCompaction, interruptActiveGoalTurn, scheduleBudgetLimitWrapUp, scheduleMaybeContinueGoal } from "./continuation";
import { logCompactionDebug, logCompactionDebugWithContext } from "./debug-log";
import { buildBudgetLimitPrompt } from "./prompts";
import { getGoal, getTelemetry, persistAccountGoal, persistTelemetry, persistUpdateGoal, replayGoalState } from "./state";
import { cancelGoalMonitor, replayGoalMonitorState, scheduleGoalMonitor } from "./monitor";
import { getQueue, replayQueueState } from "./queue-state";
import { queueSteeringStillValid, sendQueueHandoff } from "./queue-steering";
import { createNoopPostCompletionActionRunner, type PostCompletionActionRunner } from "./post-completion-actions";
import { processTerminalGoalWorkflow } from "./terminal-workflow";
import { applyTurnTelemetry, consumeNextTurnOrigin, makeTurnSnapshot, noteBudgetHardStop, noteBudgetLimit, noteBudgetWarning, noteSafetyPause } from "./telemetry";
import { notifyWarning, promptResumePausedGoal, syncGoalUi } from "./ui";
import type { BudgetHardStopReason, BudgetLimitReason, BudgetPressure, GoalState, GoalTelemetrySnapshot, StreamBudgetSignal, TurnAccountingSnapshot } from "./types";

let activeTurn: TurnAccountingSnapshot | null = null;
let streamBudgetSignalsSent: Set<StreamBudgetSignal> = new Set();

export function registerGoalLifecycle(pi: ExtensionAPI, postCompletionRunner: PostCompletionActionRunner = createNoopPostCompletionActionRunner("post-completion runner unavailable")): void {
	pi.on("session_start", async (event, ctx) => handleSessionStart(pi, event, ctx));
	pi.on("session_tree", async (_event, ctx) => {
		const state = replayGoalState(ctx);
		replayGoalMonitorState(ctx);
		replayQueueState(ctx);
		syncGoalUi(ctx, state.goal);
		if (state.goal?.status === "active") scheduleGoalMonitor(pi, ctx);
		else cancelGoalMonitor(state.goal?.goalId, "session-tree");
	});
	pi.on("session_before_compact", (_event, ctx) => {
		logCompactionDebugWithContext("lifecycle.session_before_compact", ctx);
		beginGoalCompaction(pi, ctx);
	});
	pi.on("session_compact", async (_event, ctx) => {
		logCompactionDebugWithContext("lifecycle.session_compact", ctx);
		handleSessionCompact(pi, ctx);
	});
	pi.on("turn_start", (event) => { handleTurnStart(event); streamBudgetSignalsSent.clear(); });
	pi.on("tool_call", (event) => handleToolCall(event));
	pi.on("tool_result", (event) => handleToolResult(event));
	pi.on("turn_end", async (event, ctx) => handleTurnEnd(pi, event, ctx, postCompletionRunner));
	pi.on("agent_end", async (_event, ctx) => handleAgentEnd(pi, ctx, postCompletionRunner));
	pi.on("message_update", (event, ctx) => handleMessageUpdate(pi, event, ctx));
	pi.on("context", (event) => filterGoalContext(event));
}

async function handleSessionStart(pi: ExtensionAPI, event: SessionStartEvent, ctx: ExtensionContext): Promise<void> {
	const state = replayGoalState(ctx);
	replayGoalMonitorState(ctx);
	replayQueueState(ctx);
	syncGoalUi(ctx, state.goal);
	if (state.goal?.status === "active") scheduleGoalMonitor(pi, ctx);
	else cancelGoalMonitor(state.goal?.goalId, "session-start");
	if (event.reason !== "reload" && state.goal?.status === "paused" && ctx.hasUI) {
		const resume = await promptResumePausedGoal(ctx, state.goal);
		if (resume) {
			const active: GoalState = { ...state.goal, status: "active", updatedAt: Date.now() };
			persistUpdateGoal(pi, active, state.telemetry, "resume");
			syncGoalUi(ctx, active);
			scheduleGoalMonitor(pi, ctx);
			scheduleMaybeContinueGoal(pi, ctx, "resumed");
		}
	}
}

function handleSessionCompact(pi: ExtensionAPI, ctx: ExtensionContext): void {
	logCompactionDebugWithContext("lifecycle.handleSessionCompact.start", ctx);
	const state = replayGoalState(ctx);
	replayGoalMonitorState(ctx);
	replayQueueState(ctx);
	syncGoalUi(ctx, state.goal);
	if (state.goal?.status === "active") scheduleGoalMonitor(pi, ctx);
	else cancelGoalMonitor(state.goal?.goalId, "session-compact");
	logCompactionDebugWithContext("lifecycle.handleSessionCompact.beforeFinish", ctx);
	finishGoalCompaction(pi, ctx);
	logCompactionDebugWithContext("lifecycle.handleSessionCompact.end", ctx);
}

async function handleAgentEnd(pi: ExtensionAPI, ctx: ExtensionContext, postCompletionRunner: PostCompletionActionRunner): Promise<void> {
	logCompactionDebugWithContext("lifecycle.agent_end", ctx);
	const goal = getGoal();
	const reason = queueHandoffReason(goal);
	const queueLength = getQueue().length;
	logCompactionDebugWithContext("lifecycle.agent_end.queueDecision", ctx, { reason, queueLength });
	if (reason && goal && queueLength > 0) {
		logCompactionDebugWithContext("lifecycle.agent_end.queueHandoff.scheduled", ctx, { reason, force: true });
		setTimeout(() => {
			logCompactionDebug("lifecycle.agent_end.queueHandoff.dispatch", { reason, force: true });
			void processTerminalGoalWorkflow(pi, ctx, { goal, reason: "turn", runner: postCompletionRunner, force: true });
		}, AGENT_END_HANDOFF_DELAY_MS);
		return;
	}
	logCompactionDebugWithContext("lifecycle.agent_end.continuation", ctx);
	scheduleMaybeContinueGoal(pi, ctx, "agentEnd");
}

function handleTurnStart(event: TurnStartEvent): void {
	const goal = getGoal();
	if (!goal) {
		activeTurn = null;
		return;
	}
	// Track turns for active and budget-limited goals so budget hard-stop detection
	// still works during the budget wrap-up turn. Paused and completed goals are
	// excluded because no agent work should be in progress for them.
	if (goal.status !== "active" && goal.status !== "budgetLimited") {
		activeTurn = null;
		return;
	}
	activeTurn = makeTurnSnapshot(goal.goalId, consumeNextTurnOrigin(), event.timestamp || Date.now());
}

function handleMessageUpdate(pi: ExtensionAPI, event: MessageUpdateEvent, ctx: ExtensionContext): void {
	if (event.message.role !== "assistant") return;

	const goal = getGoal();
	if (!goal || goal.status !== "active") return;

	// Build an estimated goal with streaming usage added to persisted usage.
	const streamTokens = event.message.usage?.totalTokens ?? 0;
	const elapsedThisTurn = activeTurn ? Math.max(0, Math.floor((Date.now() - activeTurn.startedAt) / 1000)) : 0;
	const estimated: GoalState = {
		...goal,
		tokensUsed: goal.tokensUsed + (streamTokens > 0 ? streamTokens : 0),
		timeUsedSeconds: goal.timeUsedSeconds + elapsedThisTurn,
	};

	const pressure = evaluateBudgetPressure(estimated);

	if (isBudgetHardStop(pressure.kind)) {
		// Skip if already handled by a prior stream event or turn_end.
		if (streamBudgetSignalsSent.has("hardStop") || getTelemetry()?.lastBudgetHardStopReason) return;
		streamBudgetSignalsSent.add("hardStop");
		const stopped: GoalState = { ...goal, status: "budgetLimited", updatedAt: Date.now() };
		const nextTelemetry = noteBudgetHardStop(noteBudgetLimit(getTelemetry(), pressureBudgetLimitReason(pressure)), budgetHardStopReason(pressure));
		persistUpdateGoal(pi, stopped, nextTelemetry, "budget");
		cancelGoalMonitor(goal.goalId, "budget-hard-stop");
		syncGoalUi(ctx, stopped);
		notifyWarning(ctx, `${budgetResourceText(pressure)} budget hard stop enforced. Goal work stopped.`);
		const prompt = buildBudgetLimitPrompt(estimated);
		pi.sendMessage(
			{ customType: BUDGET_LIMIT_MESSAGE_TYPE, content: prompt.content, display: false, details: prompt.details },
			{ deliverAs: "steer" },
		);
		sendQueueHandoff(pi, "goal-budget-limited", { goalId: goal.goalId });
		cancelGoalContinuation(goal.goalId, "budget-hard-stop");
		ctx.abort();
		return;
	}

	// Reached (100%): Send a steering message so the agent sees budget context
	// mid-stream. State transition to budgetLimited happens at turn_end, not here,
	// because the wrap-up turn needs to complete so the agent can summarize progress.
	if (isBudgetReached(pressure.kind)) {
		if (streamBudgetSignalsSent.has("reached")) return;
		streamBudgetSignalsSent.add("reached");
		const prompt = buildBudgetLimitPrompt(estimated);
		pi.sendMessage(
			{ customType: BUDGET_LIMIT_MESSAGE_TYPE, content: prompt.content, display: false, details: prompt.details },
			{ deliverAs: "steer" },
		);
		return;
	}

	// Warning: Two dedup layers — (1) per-stream signal tracker prevents repeat
	// mid-turn, (2) telemetry flags prevent re-sending if turn_end already warned.
	if (isBudgetWarning(pressure.kind)) {
		if (streamBudgetSignalsSent.has("warning")) return;
		const telemetry = getTelemetry();
		if (pressure.kind === "tokenWarning" && telemetry?.tokenBudgetWarningSent) return;
		if (pressure.kind === "timeWarning" && telemetry?.timeBudgetWarningSent) return;

		streamBudgetSignalsSent.add("warning");
		const resource = pressure.kind.startsWith("time") ? "Time" : "Token";
		const remaining = Math.max(0, Math.floor(pressure.remaining ?? 0));
		const unit = pressure.kind.startsWith("time") ? "seconds" : "tokens";
		pi.sendMessage(
			{ customType: BUDGET_LIMIT_MESSAGE_TYPE, content: `${resource} budget warning: ${remaining} ${unit} remaining before target. Start wrapping up.`, display: false, details: { goalId: goal.goalId, kind: "budgetLimit", promptId: BUDGET_WARNING_PROMPT_ID, createdAt: Date.now() } },
			{ deliverAs: "steer" },
		);
		return;
	}
}

function handleToolCall(_event: ToolCallEvent): void {
	if (!activeTurn) return;
	activeTurn.toolCallCount++;
}

function handleToolResult(event: ToolResultEvent): void {
	if (!activeTurn) return;
	activeTurn.toolResultCount++;
	if (event.isError) return;
	if (event.toolName === "update_goal") return noteGoalUpdateResult(event.details);
	activeTurn.progressCount++;
}

function noteGoalUpdateResult(details: unknown): void {
	if (!activeTurn || hasToolError(details)) return;
	if (typeof details !== "object" || details === null) return;
	const result = details as Record<string, unknown>;
	const goal = result.goal;
	if (typeof goal === "object" && goal !== null) {
		activeTurn.progressCount++;
		if ((goal as Record<string, unknown>).status === "complete") activeTurn.completedGoal = true;
	}
}

function hasToolError(details: unknown): boolean {
	return typeof details === "object" && details !== null && "error" in details;
}

async function handleTurnEnd(pi: ExtensionAPI, event: TurnEndEvent, ctx: ExtensionContext, postCompletionRunner: PostCompletionActionRunner): Promise<void> {
	const turn = activeTurn;
	activeTurn = null;
	if (!turn) return;

	const goal = getGoal();
	if (!goal || goal.goalId !== turn.goalId) return;
	const elapsed = Math.max(0, Math.floor((Date.now() - turn.startedAt) / 1000));
	const tokens = assistantTokens(event.message);
	const madeProgress = turn.completedGoal || turn.progressCount > 0;
	let telemetry = applyTurnTelemetry(getTelemetry(), turn, madeProgress);
	let result = persistAccountGoal(pi, turn.goalId, { timeUsedSeconds: elapsed, tokensUsed: tokens }, telemetry, "turn");
	let updated = result.goal;

	if (updated?.status === "active") {
		result = handleBudgetPressure(pi, ctx, updated, result.telemetry);
		updated = result.goal;
	}

	// Check for budget hard stop on budget-limited goals — the wrap-up turn or an
	// untracked turn may push usage past 110%, requiring an immediate abort.
	if (updated?.status === "budgetLimited") {
		const pressure = evaluateBudgetPressure(updated);
		if (isBudgetHardStop(pressure.kind)) {
			enforceBudgetHardStop(pi, ctx, updated, pressure, result.telemetry);
			return;
		}
	}

	if (updated?.status === "active" && event.message.role === "assistant" && event.message.stopReason === "aborted") {
		await pauseForSafety(pi, ctx, updated, "abort", "Goal paused because the assistant response was aborted. Run /goal resume to continue.");
		return;
	}

	telemetry = result.telemetry;
	updated = result.goal;
	if (updated?.status === "active" && shouldPauseForSafety(telemetry) && telemetry) {
		const reason = telemetry.consecutiveAutoTurns >= MAX_CONSECUTIVE_AUTO_TURNS ? "maxAutoTurns" : "noProgress";
		await pauseForSafety(pi, ctx, updated, reason, "Goal paused by pi-goal safety limits. Run /goal resume to continue.");
		return;
	}

	await finishTurnGoal(pi, ctx, updated, turn.completedGoal, postCompletionRunner);
}

async function finishTurnGoal(pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState | null, completedThisTurn: boolean, postCompletionRunner: PostCompletionActionRunner): Promise<void> {
	if (goal?.status === "active") scheduleGoalMonitor(pi, ctx);
	else cancelGoalMonitor(goal?.goalId, "turn-end");
	syncGoalUi(ctx, goal);
	if (goal?.status === "complete" && completedThisTurn) await processTerminalGoalWorkflow(pi, ctx, { goal, reason: "turn", runner: postCompletionRunner });
}

async function pauseForSafety(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	goal: GoalState,
	reason: "abort" | "maxAutoTurns" | "noProgress",
	message: string,
): Promise<void> {
	cancelGoalContinuation(goal.goalId, reason);
	cancelGoalMonitor(goal.goalId, reason);
	const paused: GoalState = { ...goal, status: "paused", updatedAt: Date.now() };
	const telemetry = noteSafetyPause(getTelemetry(), reason);
	persistUpdateGoal(pi, paused, telemetry, reason === "abort" ? "abort" : "safety");
	if (telemetry) persistTelemetry(pi, telemetry, reason === "abort" ? "abort" : "safety");
	syncGoalUi(ctx, paused);
	notifyWarning(ctx, message);
}

function shouldPauseForSafety(telemetry: GoalTelemetrySnapshot | null): boolean {
	if (!telemetry) return false;
	return telemetry.consecutiveAutoTurns >= MAX_CONSECUTIVE_AUTO_TURNS || telemetry.consecutiveNoProgressTurns >= MAX_NO_PROGRESS_AUTO_TURNS;
}

function handleBudgetPressure(pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState, telemetry: GoalTelemetrySnapshot | null) {
	const pressure = evaluateBudgetPressure(goal);
	if (isBudgetHardStop(pressure.kind)) return enforceBudgetHardStop(pi, ctx, goal, pressure, telemetry);
	if (isBudgetReached(pressure.kind)) return markBudgetReached(pi, ctx, goal, pressure, telemetry);
	if (isBudgetWarning(pressure.kind)) warnBudgetPressure(pi, ctx, pressure, telemetry);
	return { ok: true, goal, telemetry };
}

function enforceBudgetHardStop(pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState, pressure: BudgetPressure, telemetry: GoalTelemetrySnapshot | null) {
	// If hard stop was already enforced by a mid-stream message_update handler,
	// skip re-persisting and re-notifying. The stream handler already transitioned
	// the goal to budgetLimited, persisted telemetry, and aborted.
	if (telemetry?.lastBudgetHardStopReason) {
		interruptActiveGoalTurn(pi, ctx, goal);
		return { ok: true, goal, telemetry };
	}
	cancelGoalContinuation(goal.goalId, "budget-hard-stop");
	cancelGoalMonitor(goal.goalId, "budget-hard-stop");
	const stopped: GoalState = { ...goal, status: "budgetLimited", updatedAt: Date.now() };
	const nextTelemetry = noteBudgetHardStop(noteBudgetLimit(telemetry, pressureBudgetLimitReason(pressure)), budgetHardStopReason(pressure));
	const result = persistUpdateGoal(pi, stopped, nextTelemetry, "budget");
	syncGoalUi(ctx, result.goal);
	notifyWarning(ctx, `${budgetResourceText(pressure)} budget hard stop enforced. Goal work stopped.`);
	if (result.goal) {
		sendQueueHandoff(pi, "goal-budget-limited", { goalId: result.goal.goalId });
		interruptActiveGoalTurn(pi, ctx, result.goal);
	}
	return result;
}

function markBudgetReached(pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState, pressure: BudgetPressure, telemetry: GoalTelemetrySnapshot | null) {
	cancelGoalContinuation(goal.goalId, "budget-reached");
	cancelGoalMonitor(goal.goalId, "budget-reached");
	const limited: GoalState = { ...goal, status: "budgetLimited", updatedAt: Date.now() };
	const result = persistUpdateGoal(pi, limited, noteBudgetLimit(telemetry, pressureBudgetLimitReason(pressure)), "budget");
	if (result.goal) {
		const handedOff = sendQueueHandoff(pi, "goal-budget-limited", { goalId: result.goal.goalId });
		if (!handedOff) scheduleBudgetLimitWrapUp(pi, ctx, result.goal);
	}
	return result;
}

function warnBudgetPressure(pi: ExtensionAPI, ctx: ExtensionContext, pressure: BudgetPressure, telemetry: GoalTelemetrySnapshot | null): void {
	if (warningAlreadySent(pressure, telemetry)) return;
	const nextTelemetry = noteBudgetWarning(telemetry, pressure.kind === "tokenWarning" ? "tokenWarning" : "timeWarning");
	if (nextTelemetry) persistTelemetry(pi, nextTelemetry, "budget");
	notifyWarning(ctx, `${budgetResourceText(pressure)} budget warning: ${budgetRemainingText(pressure)} remaining before target. Start wrapping up.`);
}

function warningAlreadySent(pressure: BudgetPressure, telemetry: GoalTelemetrySnapshot | null): boolean {
	if (pressure.kind === "tokenWarning") return Boolean(telemetry?.tokenBudgetWarningSent);
	if (pressure.kind === "timeWarning") return Boolean(telemetry?.timeBudgetWarningSent);
	return true;
}

function pressureBudgetLimitReason(pressure: BudgetPressure): BudgetLimitReason {
	return pressure.kind.startsWith("time") ? "timeBudget" : "tokenBudget";
}

function budgetHardStopReason(pressure: BudgetPressure): BudgetHardStopReason {
	return pressure.kind === "timeHardStop" ? "timeHardStop" : "tokenHardStop";
}

function budgetResourceText(pressure: BudgetPressure): "Token" | "Time" {
	return pressure.kind.startsWith("time") ? "Time" : "Token";
}

function budgetRemainingText(pressure: BudgetPressure): string {
	const remaining = Math.max(0, Math.floor(pressure.remaining ?? 0));
	return pressure.kind.startsWith("time") ? `${remaining} seconds` : `${remaining} tokens`;
}

function assistantTokens(message: TurnEndEvent["message"]): number {
	if (message.role !== "assistant") return 0;
	return Math.max(0, Math.floor(message.usage?.totalTokens ?? 0));
}

function filterGoalContext(event: ContextEvent): ContextEventResult | undefined {
	// Keep only the latest status-compatible pi-goal steering message to prevent stale continuations.
	let latestValidIndex = -1;
	let sawGoalSteering = false;
	for (let i = 0; i < event.messages.length; i++) {
		const classification = classifyGoalSteeringMessage(event.messages[i]);
		if (classification === "invalid") sawGoalSteering = true;
		if (classification === "valid") {
			sawGoalSteering = true;
			latestValidIndex = i;
		}
	}
	if (!sawGoalSteering) return undefined;
	return {
		messages: event.messages.filter((message, index) => {
			const classification = classifyGoalSteeringMessage(message);
			if (classification === "none") return true;
			return classification === "valid" && index === latestValidIndex;
		}),
	};
}

function classifyGoalSteeringMessage(message: unknown): "none" | "valid" | "invalid" {
	if (typeof message !== "object" || message === null) return "none";
	const candidate = message as Record<string, unknown>;
	if (!isGoalSteeringCustomType(candidate.customType)) return "none";
	return candidate.customType === QUEUE_MESSAGE_TYPE ? classifyQueueSteering(candidate) : classifyStatusGoalSteering(candidate);
}

function classifyQueueSteering(message: Record<string, unknown>): "valid" | "invalid" {
	return queueSteeringStillValid(message) ? "valid" : "invalid";
}

function classifyStatusGoalSteering(message: Record<string, unknown>): "valid" | "invalid" {
	const details = typeof message.details === "object" && message.details !== null ? (message.details as Record<string, unknown>) : null;
	const current = getGoal();
	if (!current || details?.goalId !== current.goalId) return "invalid";
	return goalSteeringMatchesStatus(String(message.customType), details?.kind, current.status) ? "valid" : "invalid";
}

function isGoalSteeringCustomType(customType: unknown): customType is string {
	return [CONTINUATION_MESSAGE_TYPE, BUDGET_LIMIT_MESSAGE_TYPE, PAUSE_MESSAGE_TYPE, GOAL_MONITOR_MESSAGE_TYPE, QUEUE_MESSAGE_TYPE].includes(String(customType));
}

function goalSteeringMatchesStatus(customType: string, kind: unknown, status: GoalState["status"]): boolean {
	if (customType === CONTINUATION_MESSAGE_TYPE) return status === "active" && kind === "continuation";
	if (customType === BUDGET_LIMIT_MESSAGE_TYPE) return status === "budgetLimited" && kind === "budgetLimit";
	if (customType === GOAL_MONITOR_MESSAGE_TYPE) return status === "active" && kind === "monitorSteer";
	return status === "paused" && kind === "pause";
}

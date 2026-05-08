import type {
	ContextEvent,
	ContextEventResult,
	ExtensionAPI,
	ExtensionContext,
	SessionStartEvent,
	ToolCallEvent,
	ToolResultEvent,
	TurnEndEvent,
	TurnStartEvent,
} from "@earendil-works/pi-coding-agent";
import {
	BUDGET_LIMIT_MESSAGE_TYPE,
	CONTINUATION_MESSAGE_TYPE,
	MAX_CONSECUTIVE_AUTO_TURNS,
	MAX_NO_PROGRESS_AUTO_TURNS,
	PAUSE_MESSAGE_TYPE,
} from "./constants";
import { evaluateBudgetPressure, isBudgetHardStop, isBudgetReached, isBudgetWarning } from "./budget";
import { cancelGoalContinuation, interruptActiveGoalTurn, scheduleBudgetLimitWrapUp, scheduleMaybeContinueGoal } from "./continuation";
import { getGoal, getTelemetry, persistAccountGoal, persistTelemetry, persistUpdateGoal, replayGoalState } from "./state";
import { applyTurnTelemetry, consumeNextTurnOrigin, makeTurnSnapshot, noteBudgetHardStop, noteBudgetLimit, noteBudgetWarning, noteSafetyPause } from "./telemetry";
import { notifyWarning, promptResumePausedGoal, syncGoalUi } from "./ui";
import type { BudgetLimitReason, BudgetPressure, GoalState, GoalTelemetrySnapshot, TurnAccountingSnapshot } from "./types";

let activeTurn: TurnAccountingSnapshot | null = null;

export function registerGoalLifecycle(pi: ExtensionAPI): void {
	pi.on("session_start", async (event, ctx) => handleSessionStart(pi, event, ctx));
	pi.on("session_tree", async (_event, ctx) => {
		const state = replayGoalState(ctx);
		syncGoalUi(ctx, state.goal);
	});
	pi.on("turn_start", (event) => handleTurnStart(event));
	pi.on("tool_call", (event) => handleToolCall(event));
	pi.on("tool_result", (event) => handleToolResult(event));
	pi.on("turn_end", async (event, ctx) => handleTurnEnd(pi, event, ctx));
	pi.on("agent_end", async (_event, ctx) => scheduleMaybeContinueGoal(pi, ctx, "agentEnd"));
	pi.on("context", (event) => filterGoalContext(event));
}

async function handleSessionStart(pi: ExtensionAPI, event: SessionStartEvent, ctx: ExtensionContext): Promise<void> {
	const state = replayGoalState(ctx);
	syncGoalUi(ctx, state.goal);
	if (event.reason !== "reload" && state.goal?.status === "paused" && ctx.hasUI) {
		const resume = await promptResumePausedGoal(ctx, state.goal);
		if (resume) {
			const active: GoalState = { ...state.goal, status: "active", updatedAt: Date.now() };
			persistUpdateGoal(pi, active, state.telemetry, "resume");
			syncGoalUi(ctx, active);
			scheduleMaybeContinueGoal(pi, ctx, "resumed");
		}
	}
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

async function handleTurnEnd(pi: ExtensionAPI, event: TurnEndEvent, ctx: ExtensionContext): Promise<void> {
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

	syncGoalUi(ctx, updated);
}

async function pauseForSafety(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	goal: GoalState,
	reason: "abort" | "maxAutoTurns" | "noProgress",
	message: string,
): Promise<void> {
	cancelGoalContinuation(goal.goalId, reason);
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
	cancelGoalContinuation(goal.goalId, "budget-hard-stop");
	const stopped: GoalState = { ...goal, status: "budgetLimited", updatedAt: Date.now() };
	const nextTelemetry = noteBudgetHardStop(noteBudgetLimit(telemetry, pressureBudgetLimitReason(pressure)), budgetHardStopReason(pressure));
	const result = persistUpdateGoal(pi, stopped, nextTelemetry, "budget");
	syncGoalUi(ctx, result.goal);
	notifyWarning(ctx, `${budgetResourceText(pressure)} budget hard stop enforced. Goal work stopped.`);
	interruptActiveGoalTurn(pi, ctx, result.goal);
	return result;
}

function markBudgetReached(pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState, pressure: BudgetPressure, telemetry: GoalTelemetrySnapshot | null) {
	cancelGoalContinuation(goal.goalId, "budget-reached");
	const limited: GoalState = { ...goal, status: "budgetLimited", updatedAt: Date.now() };
	const result = persistUpdateGoal(pi, limited, noteBudgetLimit(telemetry, pressureBudgetLimitReason(pressure)), "budget");
	if (result.goal) scheduleBudgetLimitWrapUp(pi, ctx, result.goal);
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

function budgetHardStopReason(pressure: BudgetPressure) {
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
	const customType = candidate.customType;
	if (customType !== CONTINUATION_MESSAGE_TYPE && customType !== BUDGET_LIMIT_MESSAGE_TYPE && customType !== PAUSE_MESSAGE_TYPE) return "none";
	const details = typeof candidate.details === "object" && candidate.details !== null ? (candidate.details as Record<string, unknown>) : null;
	const current = getGoal();
	if (!current || details?.goalId !== current.goalId) return "invalid";
	if (customType === CONTINUATION_MESSAGE_TYPE) return current.status === "active" && details?.kind === "continuation" ? "valid" : "invalid";
	if (customType === BUDGET_LIMIT_MESSAGE_TYPE) return current.status === "budgetLimited" && details?.kind === "budgetLimit" ? "valid" : "invalid";
	return current.status === "paused" && details?.kind === "pause" ? "valid" : "invalid";
}

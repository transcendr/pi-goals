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
import { cancelGoalContinuation, scheduleBudgetLimitWrapUp, scheduleMaybeContinueGoal } from "./continuation";
import { getGoal, getTelemetry, persistAccountGoal, persistTelemetry, persistUpdateGoal, replayGoalState } from "./state";
import { applyTurnTelemetry, consumeNextTurnOrigin, makeTurnSnapshot, noteBudgetLimit, noteSafetyPause } from "./telemetry";
import { notifyWarning, promptResumePausedGoal, syncGoalUi } from "./ui";
import type { BudgetLimitReason, GoalState, GoalTelemetrySnapshot, GoalSteeringDetails, TurnAccountingSnapshot } from "./types";

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
	if (!goal || goal.status !== "active") {
		activeTurn = null;
		return;
	}
	activeTurn = makeTurnSnapshot(goal.goalId, consumeNextTurnOrigin(), event.timestamp || Date.now());
}

function handleToolCall(event: ToolCallEvent): void {
	if (!activeTurn) return;
	activeTurn.toolCallCount++;
	if (event.toolName === "update_goal" && (event.input as { status?: unknown }).status === "complete") {
		activeTurn.completedGoal = true;
	}
}

function handleToolResult(event: ToolResultEvent): void {
	if (!activeTurn) return;
	activeTurn.toolResultCount++;
	if (event.toolName === "update_goal" && !event.isError) activeTurn.completedGoal = true;
}

async function handleTurnEnd(pi: ExtensionAPI, event: TurnEndEvent, ctx: ExtensionContext): Promise<void> {
	const turn = activeTurn;
	activeTurn = null;
	if (!turn) return;

	const goal = getGoal();
	if (!goal || goal.goalId !== turn.goalId) return;
	const elapsed = Math.max(0, Math.floor((Date.now() - turn.startedAt) / 1000));
	const tokens = assistantTokens(event.message);
	const madeProgress = turn.completedGoal || turn.toolResultCount > 0;
	let telemetry = applyTurnTelemetry(getTelemetry(), turn, madeProgress);
	let result = persistAccountGoal(pi, turn.goalId, { timeUsedSeconds: elapsed, tokensUsed: tokens }, telemetry, "turn");
	let updated = result.goal;

	const budgetReason = updated?.status === "active" ? reachedBudget(updated) : undefined;
	if (updated && budgetReason) {
		updated = { ...updated, status: "budgetLimited", updatedAt: Date.now() };
		const budgetTelemetry = noteBudgetLimit(result.telemetry, budgetReason);
		result = persistUpdateGoal(pi, updated, budgetTelemetry, "budget");
		if (result.goal) scheduleBudgetLimitWrapUp(pi, ctx, result.goal);
	}

	if (updated?.status === "active" && event.message.role === "assistant" && event.message.stopReason === "aborted") {
		await pauseForSafety(pi, ctx, updated, "abort", "Goal paused because the assistant response was aborted. Run /goal resume to continue.");
		return;
	}

	telemetry = result.telemetry;
	updated = result.goal;
	if (updated?.status === "active" && shouldPauseForSafety(telemetry)) {
		const reason = telemetry!.consecutiveAutoTurns >= MAX_CONSECUTIVE_AUTO_TURNS ? "maxAutoTurns" : "noProgress";
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

function reachedBudget(goal: GoalState): BudgetLimitReason | undefined {
	if (goal.tokenBudget !== undefined && goal.tokensUsed >= goal.tokenBudget) return "tokenBudget";
	if (goal.timeBudgetSeconds !== undefined && goal.timeUsedSeconds >= goal.timeBudgetSeconds) return "timeBudget";
	return undefined;
}

function assistantTokens(message: TurnEndEvent["message"]): number {
	if (message.role !== "assistant") return 0;
	return Math.max(0, Math.floor(message.usage?.totalTokens ?? 0));
}

function filterGoalContext(event: ContextEvent): ContextEventResult | undefined {
	// Pi extension custom messages are later converted to user-role LLM messages.
	// Keep only the latest status-compatible pi-goal steering message so repeated
	// hidden continuations do not become stale user-role instructions in future turns.
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
	const candidate = message as { role?: string; customType?: string; details?: GoalSteeringDetails };
	if (candidate.customType !== CONTINUATION_MESSAGE_TYPE && candidate.customType !== BUDGET_LIMIT_MESSAGE_TYPE && candidate.customType !== PAUSE_MESSAGE_TYPE) {
		return "none";
	}
	const current = getGoal();
	if (!current || candidate.details?.goalId !== current.goalId) return "invalid";
	if (candidate.customType === CONTINUATION_MESSAGE_TYPE) return current.status === "active" && candidate.details?.kind === "continuation" ? "valid" : "invalid";
	if (candidate.customType === BUDGET_LIMIT_MESSAGE_TYPE) return current.status === "budgetLimited" && candidate.details?.kind === "budgetLimit" ? "valid" : "invalid";
	return current.status === "paused" && candidate.details?.kind === "pause" ? "valid" : "invalid";
}

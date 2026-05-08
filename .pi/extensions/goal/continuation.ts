import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	BUDGET_LIMIT_MESSAGE_TYPE,
	CONTINUATION_MESSAGE_TYPE,
	MAX_CONSECUTIVE_AUTO_TURNS,
	MAX_NO_PROGRESS_AUTO_TURNS,
} from "./constants";
import { buildBudgetLimitPrompt, buildContinuationPrompt } from "./prompts";
import { getGoal, getTelemetry, persistTelemetry } from "./state";
import { noteBudgetWrapUpSent, noteContinuationScheduled, noteContinuationSkipped, setNextTurnOrigin } from "./telemetry";
import type { ContinuationReason, GoalState } from "./types";

let pendingTimer: ReturnType<typeof setTimeout> | undefined;
let budgetWrapUpGoalIds = new Set<string>();

export function scheduleMaybeContinueGoal(pi: ExtensionAPI, ctx: ExtensionContext, reason: ContinuationReason): void {
	if (pendingTimer) clearTimeout(pendingTimer);
	const telemetry = noteContinuationScheduled(getTelemetry(), reason);
	if (telemetry) persistTelemetry(pi, telemetry, "continuation");
	pendingTimer = setTimeout(() => {
		pendingTimer = undefined;
		void safelyRun(() => maybeContinueGoal(pi, ctx, reason));
	}, 25);
}

export function scheduleBudgetLimitWrapUp(pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState): void {
	if (budgetWrapUpGoalIds.has(goal.goalId)) return;
	budgetWrapUpGoalIds.add(goal.goalId);
	setTimeout(() => {
		void safelyRun(() => maybeSendBudgetWrapUp(pi, ctx, goal.goalId));
	}, 25);
}

export function resetContinuationRuntime(): void {
	if (pendingTimer) clearTimeout(pendingTimer);
	pendingTimer = undefined;
	budgetWrapUpGoalIds = new Set();
}

async function maybeContinueGoal(pi: ExtensionAPI, ctx: ExtensionContext, reason: ContinuationReason): Promise<void> {
	const goal = getGoal();
	if (!goal || goal.status !== "active") return skip(pi, "notActive");
	if (!ctx.isIdle()) return skip(pi, "notIdle");
	if (ctx.hasPendingMessages()) return skip(pi, "pendingMessages");
	const telemetry = getTelemetry();
	if (telemetry && telemetry.consecutiveAutoTurns >= MAX_CONSECUTIVE_AUTO_TURNS) return skip(pi, "safetyCap");
	if (telemetry && telemetry.consecutiveNoProgressTurns >= MAX_NO_PROGRESS_AUTO_TURNS) return skip(pi, "safetyCap");

	const prompt = buildContinuationPrompt(goal);
	setNextTurnOrigin("auto");
	pi.sendMessage(
		{ customType: CONTINUATION_MESSAGE_TYPE, content: prompt.content, display: false, details: { ...prompt.details, reason } },
		{ triggerTurn: true, deliverAs: "followUp" },
	);
}

async function maybeSendBudgetWrapUp(pi: ExtensionAPI, ctx: ExtensionContext, goalId: string): Promise<void> {
	const goal = getGoal();
	if (!goal || goal.goalId !== goalId || goal.status !== "budgetLimited") return;
	if (!ctx.isIdle()) return;
	if (ctx.hasPendingMessages()) return;
	const prompt = buildBudgetLimitPrompt(goal);
	setNextTurnOrigin("budgetWrapUp");
	pi.sendMessage(
		{ customType: BUDGET_LIMIT_MESSAGE_TYPE, content: prompt.content, display: false, details: prompt.details },
		{ triggerTurn: true, deliverAs: "followUp" },
	);
	const telemetry = noteBudgetWrapUpSent(getTelemetry());
	if (telemetry) persistTelemetry(pi, telemetry, "budget");
}

function skip(pi: ExtensionAPI, reason: "notIdle" | "pendingMessages" | "notActive" | "budgetLimited" | "safetyCap"): void {
	const telemetry = noteContinuationSkipped(getTelemetry(), reason);
	if (telemetry) persistTelemetry(pi, telemetry, "continuation");
}

async function safelyRun(task: () => Promise<void>): Promise<void> {
	try {
		await task();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (!message.includes("ctx is stale")) console.warn(`[pi-goal] continuation failed: ${message}`);
	}
}

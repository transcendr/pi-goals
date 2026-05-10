import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	BUDGET_LIMIT_MESSAGE_TYPE,
	CONTINUATION_MESSAGE_TYPE,
	PAUSE_MESSAGE_TYPE,
	MAX_CONSECUTIVE_AUTO_TURNS,
	MAX_NO_PROGRESS_AUTO_TURNS,
} from "./constants";
import { buildBudgetLimitPrompt, buildContinuationPrompt, buildPausePrompt } from "./prompts";
import { getGoal, getTelemetry, persistTelemetry } from "./state";
import { noteBudgetWrapUpSent, noteContinuationScheduled, noteContinuationSkipped, setNextTurnOrigin } from "./telemetry";
import type { ContinuationReason, ContinuationSkipReason, GoalState } from "./types";

type PendingContinuation = {
	goalId: string;
	reason: ContinuationReason;
	timer: ReturnType<typeof setTimeout>;
};

type PendingBudgetWrapUp = {
	goalId: string;
	timer: ReturnType<typeof setTimeout>;
};

let pendingContinuation: PendingContinuation | undefined;
let budgetWrapUps = new Map<string, PendingBudgetWrapUp>();

export function scheduleMaybeContinueGoal(pi: ExtensionAPI, ctx: ExtensionContext, reason: ContinuationReason): void {
	const goal = getGoal();
	if (!goal || goal.status !== "active") return;
	if (shouldSuppressAgentEndContinuation(reason)) return skip(pi, "noProgress");
	cancelGoalContinuation(goal.goalId, "reschedule-continuation");
	const telemetry = noteContinuationScheduled(getTelemetry(), reason);
	if (telemetry) persistTelemetry(pi, telemetry, "continuation");
	const goalId = goal.goalId;
	const timer = setTimeout(() => {
		if (pendingContinuation?.goalId === goalId) pendingContinuation = undefined;
		void safelyRun(() => maybeContinueGoal(pi, ctx, reason, goalId));
	}, 25);
	pendingContinuation = { goalId, reason, timer };
}

export function scheduleBudgetLimitWrapUp(pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState): void {
	if (budgetWrapUps.has(goal.goalId)) return;
	const timer = setTimeout(() => {
		budgetWrapUps.delete(goal.goalId);
		void safelyRun(() => maybeSendBudgetWrapUp(pi, ctx, goal.goalId));
	}, 25);
	budgetWrapUps.set(goal.goalId, { goalId: goal.goalId, timer });
}

export function cancelGoalContinuation(goalId?: string, _reason = "cancelled"): void {
	if (pendingContinuation && (!goalId || pendingContinuation.goalId === goalId)) {
		clearTimeout(pendingContinuation.timer);
		pendingContinuation = undefined;
	}
	for (const [pendingGoalId, pending] of budgetWrapUps) {
		if (!goalId || pendingGoalId === goalId) {
			clearTimeout(pending.timer);
			budgetWrapUps.delete(pendingGoalId);
		}
	}
}

export function interruptActiveGoalTurn(pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState): void {
	if (ctx.isIdle()) return;
	const prompt = buildPausePrompt(goal);
	pi.sendMessage(
		{ customType: PAUSE_MESSAGE_TYPE, content: prompt.content, display: false, details: prompt.details },
		{ deliverAs: "steer" },
	);
	ctx.abort();
}

export function resetContinuationRuntime(): void {
	cancelGoalContinuation();
}

async function maybeContinueGoal(pi: ExtensionAPI, ctx: ExtensionContext, reason: ContinuationReason, goalId: string): Promise<void> {
	const goal = getGoal();
	if (!goal || goal.goalId !== goalId || goal.status !== "active") return skip(pi, "notActive");
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

function shouldSuppressAgentEndContinuation(reason: ContinuationReason): boolean {
	if (reason !== "agentEnd") return false;
	const telemetry = getTelemetry();
	return telemetry?.lastTurnOrigin === "auto" && telemetry.lastTurnToolCallCount === 0 && telemetry.lastTurnToolResultCount === 0 && !telemetry.lastTurnCompletedGoal;
}

function skip(pi: ExtensionAPI, reason: ContinuationSkipReason): void {
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

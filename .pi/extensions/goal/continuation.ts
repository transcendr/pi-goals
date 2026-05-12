import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	BUDGET_LIMIT_MESSAGE_TYPE,
	CONTINUATION_MESSAGE_TYPE,
	PAUSE_MESSAGE_TYPE,
	MAX_CONSECUTIVE_AUTO_TURNS,
	MAX_NO_PROGRESS_AUTO_TURNS,
} from "./constants";
import { isBudgetExhausted } from "./budget";
import { evaluateCompletionFloor } from "./floor";
import { buildBudgetLimitPrompt, buildContinuationPrompt, buildPausePrompt } from "./prompts";
import { getQueue } from "./queue-state";
import { sendQueueHandoff } from "./queue-steering";
import { getGoal, getTelemetry, persistTelemetry } from "./state";
import { noteBudgetWrapUpSent, noteCompactionContinuation, noteContinuationScheduled, noteContinuationSkipped, setNextTurnOrigin } from "./telemetry";
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

type CompactionContinuationWork =
	| { kind: "activeGoal"; goalId: string; key: string }
	| { kind: "queueHandoff"; goalId: string; queueId: string; key: string };

type ContinuationAttemptResult =
	| { kind: "sent" }
	| { kind: "transientSkip"; reason: "notIdle" | "pendingMessages" }
	| { kind: "terminalSkip"; reason: ContinuationSkipReason | "queueMissing" | "queueChanged" | "retryExhausted" };

let pendingContinuation: PendingContinuation | undefined;
let budgetWrapUps = new Map<string, PendingBudgetWrapUp>();
let compactionActive = false;
let compactionWork: CompactionContinuationWork | undefined;
let prequeuedCompactionKey: string | undefined;
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
let fallbackAttempts = 0;
let fallbackRetryDelaysMs = [100, 250, 500, 1_000, 2_000];

export function beginGoalCompaction(pi: ExtensionAPI, ctx: ExtensionContext): void {
	compactionActive = true;
	cancelFallbackTimer();
	fallbackAttempts = 0;
	prequeuedCompactionKey = undefined;
	compactionWork = currentCompactionWork();
	if (!compactionWork) return;
	if (compactionWork.kind === "activeGoal" && pendingContinuation?.goalId === compactionWork.goalId) {
		clearTimeout(pendingContinuation.timer);
		pendingContinuation = undefined;
	}
	skip(pi, "compacting");
	if (ctx.isIdle()) return finishCompactionTelemetry(pi, "prequeue", compactionWork.key, 0, "prequeueSkippedIdle");
	if (prequeueCompactionWork(pi, compactionWork)) prequeuedCompactionKey = compactionWork.key;
}

export function finishGoalCompaction(pi: ExtensionAPI, ctx: ExtensionContext): void {
	compactionActive = false;
	const work = compactionWork;
	if (!work) return;
	if (!compactionWorkStillApplies(work)) return clearCompactionRuntime();
	if (prequeuedCompactionKey === work.key) {
		finishCompactionTelemetry(pi, "fallbackFinished", work.key, 0, "prequeued");
		return clearCompactionRuntime({ keepPrequeueKey: true });
	}
	scheduleCompactionFallbackRetry(pi, ctx, work);
}

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
	cancelFallbackTimer();
	compactionActive = false;
	compactionWork = undefined;
	prequeuedCompactionKey = undefined;
	fallbackAttempts = 0;
	fallbackRetryDelaysMs = [100, 250, 500, 1_000, 2_000];
}

export function setCompactionFallbackRetryDelaysForTests(delaysMs: number[]): void {
	fallbackRetryDelaysMs = delaysMs.filter((delay) => Number.isFinite(delay) && delay >= 0);
}

async function maybeContinueGoal(pi: ExtensionAPI, ctx: ExtensionContext, reason: ContinuationReason, goalId: string): Promise<void> {
	attemptContinueGoal(pi, ctx, reason, goalId);
}

function attemptContinueGoal(pi: ExtensionAPI, ctx: ExtensionContext, reason: ContinuationReason, goalId: string): ContinuationAttemptResult {
	const goal = getGoal();
	if (!goal || goal.goalId !== goalId || goal.status !== "active") {
		skip(pi, "notActive");
		return { kind: "terminalSkip", reason: "notActive" };
	}
	if (compactionActive) {
		compactionWork = { kind: "activeGoal", goalId, key: activeGoalKey(goalId) };
		skip(pi, "compacting");
		return { kind: "terminalSkip", reason: "compacting" };
	}
	if (!ctx.isIdle()) {
		skip(pi, "notIdle");
		return { kind: "transientSkip", reason: "notIdle" };
	}
	if (ctx.hasPendingMessages()) {
		skip(pi, "pendingMessages");
		return { kind: "transientSkip", reason: "pendingMessages" };
	}
	const telemetry = getTelemetry();
	if (telemetry && telemetry.consecutiveAutoTurns >= MAX_CONSECUTIVE_AUTO_TURNS) {
		skip(pi, "safetyCap");
		return { kind: "terminalSkip", reason: "safetyCap" };
	}
	if (telemetry && telemetry.consecutiveNoProgressTurns >= MAX_NO_PROGRESS_AUTO_TURNS) {
		skip(pi, "safetyCap");
		return { kind: "terminalSkip", reason: "safetyCap" };
	}

	sendContinuationMessage(pi, goal, telemetry, reason, true);
	return { kind: "sent" };
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

function currentCompactionWork(): CompactionContinuationWork | undefined {
	const goal = getGoal();
	if (!goal) return undefined;
	if (goal.status === "active") return { kind: "activeGoal", goalId: goal.goalId, key: activeGoalKey(goal.goalId) };
	const queueHead = getQueue()[0];
	if (goal.status === "complete" && queueHead) return { kind: "queueHandoff", goalId: goal.goalId, queueId: queueHead.queueId, key: queueKey(queueHead.queueId) };
	return undefined;
}

function prequeueCompactionWork(pi: ExtensionAPI, work: CompactionContinuationWork): boolean {
	if (work.kind === "activeGoal") {
		const goal = getGoal();
		if (!goal || goal.goalId !== work.goalId || goal.status !== "active") return false;
		sendContinuationMessage(pi, goal, getTelemetry(), "compacted", false);
		finishCompactionTelemetry(pi, "prequeue", work.key, 0, "sent");
		return true;
	}
	const sent = sendQueueHandoff(pi, "goal-complete", { goalId: work.goalId, triggerTurn: false, deliverAs: "followUp" });
	if (sent) finishCompactionTelemetry(pi, "prequeue", work.key, 0, "sent");
	return sent;
}

function scheduleCompactionFallbackRetry(pi: ExtensionAPI, ctx: ExtensionContext, work: CompactionContinuationWork): void {
	cancelFallbackTimer();
	const delay = fallbackRetryDelaysMs[Math.min(fallbackAttempts, fallbackRetryDelaysMs.length - 1)];
	fallbackTimer = setTimeout(() => {
		fallbackTimer = undefined;
		void safelyRun(async () => runCompactionFallbackAttempt(pi, ctx, work));
	}, delay ?? 0);
}

async function runCompactionFallbackAttempt(pi: ExtensionAPI, ctx: ExtensionContext, work: CompactionContinuationWork): Promise<void> {
	if (!compactionWorkStillApplies(work)) return finishAndClear(pi, work.key, "workChanged");
	fallbackAttempts++;
	finishCompactionTelemetry(pi, "fallbackRetry", work.key, fallbackAttempts);
	const result = work.kind === "activeGoal" ? attemptContinueGoal(pi, ctx, "compacted", work.goalId) : attemptQueueHandoff(pi, ctx, work);
	if (result.kind === "sent") return finishAndClear(pi, work.key, "sent");
	if (result.kind === "transientSkip" && fallbackAttempts < fallbackRetryDelaysMs.length) {
		scheduleCompactionFallbackRetry(pi, ctx, work);
		return;
	}
	const reason = result.kind === "transientSkip" ? "retryExhausted" : result.reason;
	finishAndClear(pi, work.key, reason);
}

function attemptQueueHandoff(pi: ExtensionAPI, ctx: ExtensionContext, work: Extract<CompactionContinuationWork, { kind: "queueHandoff" }>): ContinuationAttemptResult {
	if (!ctx.isIdle()) return { kind: "transientSkip", reason: "notIdle" };
	if (ctx.hasPendingMessages()) return { kind: "transientSkip", reason: "pendingMessages" };
	const goal = getGoal();
	if (!goal || goal.goalId !== work.goalId || goal.status !== "complete") return { kind: "terminalSkip", reason: "notActive" };
	const queueHead = getQueue()[0];
	if (!queueHead) return { kind: "terminalSkip", reason: "queueMissing" };
	if (queueHead.queueId !== work.queueId) return { kind: "terminalSkip", reason: "queueChanged" };
	return sendQueueHandoff(pi, "goal-complete", { goalId: work.goalId }) ? { kind: "sent" } : { kind: "terminalSkip", reason: "queueChanged" };
}

function compactionWorkStillApplies(work: CompactionContinuationWork): boolean {
	const goal = getGoal();
	if (work.kind === "activeGoal") return Boolean(goal && goal.goalId === work.goalId && goal.status === "active");
	const queueHead = getQueue()[0];
	return Boolean(goal && goal.goalId === work.goalId && goal.status === "complete" && queueHead?.queueId === work.queueId);
}

function sendContinuationMessage(pi: ExtensionAPI, goal: GoalState, telemetry: ReturnType<typeof getTelemetry>, reason: ContinuationReason, triggerTurn: boolean): void {
	const prompt = buildContinuationPrompt(goal, telemetry);
	setNextTurnOrigin("auto");
	pi.sendMessage(
		{ customType: CONTINUATION_MESSAGE_TYPE, content: prompt.content, display: false, details: { ...prompt.details, reason } },
		{ triggerTurn, deliverAs: "followUp" },
	);
}

function activeGoalKey(goalId: string): string {
	return `active:${goalId}`;
}

function queueKey(queueId: string): string {
	return `queue:${queueId}`;
}

function finishAndClear(pi: ExtensionAPI, key: string, reason: string): void {
	finishCompactionTelemetry(pi, "fallbackFinished", key, fallbackAttempts, reason);
	clearCompactionRuntime();
}

function finishCompactionTelemetry(pi: ExtensionAPI, action: "prequeue" | "fallbackRetry" | "fallbackFinished", key: string, attempts: number, finalReason?: string): void {
	const telemetry = noteCompactionContinuation(getTelemetry(), action, { key, attempts, finalReason });
	if (telemetry) persistTelemetry(pi, telemetry, "continuation");
}

function clearCompactionRuntime(opts: { keepPrequeueKey?: boolean } = {}): void {
	cancelFallbackTimer();
	compactionWork = undefined;
	if (!opts.keepPrequeueKey) prequeuedCompactionKey = undefined;
	fallbackAttempts = 0;
}

function cancelFallbackTimer(): void {
	if (!fallbackTimer) return;
	clearTimeout(fallbackTimer);
	fallbackTimer = undefined;
}

function shouldSuppressAgentEndContinuation(reason: ContinuationReason): boolean {
	if (reason !== "agentEnd") return false;
	const telemetry = getTelemetry();
	const noProgressAutoTurn = telemetry?.lastTurnOrigin === "auto" && telemetry.lastTurnToolCallCount === 0 && telemetry.lastTurnToolResultCount === 0 && !telemetry.lastTurnCompletedGoal;
	if (!noProgressAutoTurn) return false;
	const goal = getGoal();
	if (!goal || goal.status !== "active") return true;
	const floor = evaluateCompletionFloor(goal);
	if (floor.anyFloorConfigured && !floor.allFloorsMet && !isBudgetExhausted(goal) && telemetry.floorQualityState !== "exhausted") return false;
	return true;
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

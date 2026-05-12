import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	BUDGET_LIMIT_MESSAGE_TYPE,
	CONTINUATION_MESSAGE_TYPE,
	PAUSE_MESSAGE_TYPE,
	MAX_CONSECUTIVE_AUTO_TURNS,
	MAX_NO_PROGRESS_AUTO_TURNS,
} from "./constants";
import { isBudgetExhausted } from "./budget";
import { logCompactionDebug, logCompactionDebugWithContext } from "./debug-log";
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

const DEFAULT_RETRY_DELAYS_MS = [100, 250, 500, 1_000, 2_000];

let pendingContinuation: PendingContinuation | undefined;
let budgetWrapUps = new Map<string, PendingBudgetWrapUp>();
let compactionActive = false;
let compactionWork: CompactionContinuationWork | undefined;
let prequeuedCompactionKey: string | undefined;
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
let fallbackAttempts = 0;
let fallbackRetryDelaysMs = [...DEFAULT_RETRY_DELAYS_MS];

export function beginGoalCompaction(pi: ExtensionAPI, ctx: ExtensionContext): void {
	logRuntime("beginGoalCompaction.start");
	logCompactionDebugWithContext("beginGoalCompaction.context", ctx);
	compactionActive = true;
	cancelFallbackTimer();
	fallbackAttempts = 0;
	prequeuedCompactionKey = undefined;
	compactionWork = currentCompactionWork();
	logRuntime("beginGoalCompaction.workSelected", workFields(compactionWork));
	if (!compactionWork) return;
	if (compactionWork.kind === "activeGoal" && pendingContinuation?.goalId === compactionWork.goalId) {
		logRuntime("beginGoalCompaction.cancelPendingContinuation", { pendingGoalId: pendingContinuation.goalId, pendingReason: pendingContinuation.reason });
		clearTimeout(pendingContinuation.timer);
		pendingContinuation = undefined;
	}
	skip(pi, "compacting");
	if (ctx.isIdle()) {
		logRuntime("beginGoalCompaction.prequeueSkippedIdle", workFields(compactionWork));
		return finishCompactionTelemetry(pi, "prequeue", compactionWork.key, 0, "prequeueSkippedIdle");
	}
	const prequeued = prequeueCompactionWork(pi, compactionWork);
	if (prequeued) prequeuedCompactionKey = compactionWork.key;
	logRuntime("beginGoalCompaction.end", { ...workFields(compactionWork), prequeued, prequeuedCompactionKey });
}

export function finishGoalCompaction(pi: ExtensionAPI, ctx: ExtensionContext): void {
	logRuntime("finishGoalCompaction.start", workFields(compactionWork));
	logCompactionDebugWithContext("finishGoalCompaction.context", ctx);
	compactionActive = false;
	const work = compactionWork;
	if (!work) {
		logRuntime("finishGoalCompaction.noWork");
		return;
	}
	if (!compactionWorkStillApplies(work)) {
		logRuntime("finishGoalCompaction.workNoLongerApplies", workFields(work));
		return clearCompactionRuntime();
	}
	if (prequeuedCompactionKey === work.key) {
		logRuntime("finishGoalCompaction.prequeuedAlready", workFields(work));
		finishCompactionTelemetry(pi, "fallbackFinished", work.key, 0, "prequeued");
		return clearCompactionRuntime({ keepPrequeueKey: true });
	}
	logRuntime("finishGoalCompaction.scheduleFallback", workFields(work));
	scheduleCompactionFallbackRetry(pi, ctx, work);
}

export function scheduleMaybeContinueGoal(pi: ExtensionAPI, ctx: ExtensionContext, reason: ContinuationReason): void {
	logCompactionDebugWithContext("scheduleMaybeContinueGoal.start", ctx, { reason });
	const goal = getGoal();
	if (!goal || goal.status !== "active") {
		logRuntime("scheduleMaybeContinueGoal.skip.notActive", { reason });
		return;
	}
	if (shouldSuppressAgentEndContinuation(reason)) {
		logRuntime("scheduleMaybeContinueGoal.skip.noProgress", { reason, goalId: goal.goalId });
		return skip(pi, "noProgress");
	}
	cancelGoalContinuation(goal.goalId, "reschedule-continuation");
	const telemetry = noteContinuationScheduled(getTelemetry(), reason);
	if (telemetry) persistTelemetry(pi, telemetry, "continuation");
	const goalId = goal.goalId;
	const timer = setTimeout(() => {
		if (pendingContinuation?.goalId === goalId) pendingContinuation = undefined;
		void safelyRun(async () => { attemptContinueGoal(pi, ctx, reason, goalId); });
	}, 25);
	pendingContinuation = { goalId, reason, timer };
	logRuntime("scheduleMaybeContinueGoal.scheduled", { reason, goalId });
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
	fallbackRetryDelaysMs = [...DEFAULT_RETRY_DELAYS_MS];
}

export function setCompactionFallbackRetryDelaysForTests(delaysMs: number[]): void {
	fallbackRetryDelaysMs = delaysMs.filter((delay) => Number.isFinite(delay) && delay >= 0);
	if (fallbackRetryDelaysMs.length === 0) fallbackRetryDelaysMs = [...DEFAULT_RETRY_DELAYS_MS];
}

function attemptContinueGoal(pi: ExtensionAPI, ctx: ExtensionContext, reason: ContinuationReason, goalId: string): ContinuationAttemptResult {
	logCompactionDebugWithContext("attemptContinueGoal.start", ctx, { reason, requestedGoalId: goalId });
	const goal = getGoal();
	if (!goal || goal.goalId !== goalId || goal.status !== "active") {
		logRuntime("attemptContinueGoal.skip.notActive", { reason, requestedGoalId: goalId });
		skip(pi, "notActive");
		return { kind: "terminalSkip", reason: "notActive" };
	}
	if (compactionActive) {
		compactionWork = { kind: "activeGoal", goalId, key: activeGoalKey(goalId) };
		logRuntime("attemptContinueGoal.skip.compacting", workFields(compactionWork));
		skip(pi, "compacting");
		return { kind: "terminalSkip", reason: "compacting" };
	}
	if (!ctx.isIdle()) {
		logRuntime("attemptContinueGoal.skip.notIdle", { reason, requestedGoalId: goalId });
		skip(pi, "notIdle");
		return { kind: "transientSkip", reason: "notIdle" };
	}
	if (ctx.hasPendingMessages()) {
		logRuntime("attemptContinueGoal.skip.pendingMessages", { reason, requestedGoalId: goalId });
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

	logRuntime("attemptContinueGoal.send", { reason, goalId: goal.goalId });
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
	const queueHead = getQueue()[0];
	logRuntime("currentCompactionWork.inspect", { queueHeadId: queueHead?.queueId });
	if (!goal) return undefined;
	if (goal.status === "active") return { kind: "activeGoal", goalId: goal.goalId, key: activeGoalKey(goal.goalId) };
	if (goal.status === "complete" && queueHead) return { kind: "queueHandoff", goalId: goal.goalId, queueId: queueHead.queueId, key: queueKey(queueHead.queueId) };
	return undefined;
}

function prequeueCompactionWork(pi: ExtensionAPI, work: CompactionContinuationWork): boolean {
	logRuntime("prequeueCompactionWork.start", workFields(work));
	if (work.kind === "activeGoal") {
		const goal = getGoal();
		if (!goal || goal.goalId !== work.goalId || goal.status !== "active") {
			logRuntime("prequeueCompactionWork.activeGoal.mismatch", workFields(work));
			return false;
		}
		sendContinuationMessage(pi, goal, getTelemetry(), "compacted", false);
		finishCompactionTelemetry(pi, "prequeue", work.key, 0, "sent");
		logRuntime("prequeueCompactionWork.activeGoal.sent", workFields(work));
		return true;
	}
	const sent = sendQueueHandoff(pi, "goal-complete", { goalId: work.goalId, triggerTurn: false, deliverAs: "followUp", force: true });
	if (sent) finishCompactionTelemetry(pi, "prequeue", work.key, 0, "sent");
	logRuntime("prequeueCompactionWork.queueHandoff.end", { ...workFields(work), sent });
	return sent;
}

function scheduleCompactionFallbackRetry(pi: ExtensionAPI, ctx: ExtensionContext, work: CompactionContinuationWork): void {
	cancelFallbackTimer();
	const delay = fallbackRetryDelaysMs[Math.min(fallbackAttempts, fallbackRetryDelaysMs.length - 1)];
	logCompactionDebugWithContext("scheduleCompactionFallbackRetry", ctx, { ...workFields(work), fallbackAttempts, delay });
	fallbackTimer = setTimeout(() => {
		fallbackTimer = undefined;
		void safelyRun(async () => runCompactionFallbackAttempt(pi, ctx, work));
	}, delay ?? 0);
}

async function runCompactionFallbackAttempt(pi: ExtensionAPI, ctx: ExtensionContext, work: CompactionContinuationWork): Promise<void> {
	logCompactionDebugWithContext("runCompactionFallbackAttempt.start", ctx, workFields(work));
	if (!compactionWorkStillApplies(work)) return finishAndClear(pi, work.key, "workChanged");
	fallbackAttempts++;
	finishCompactionTelemetry(pi, "fallbackRetry", work.key, fallbackAttempts);
	const result = work.kind === "activeGoal" ? attemptContinueGoal(pi, ctx, "compacted", work.goalId) : attemptQueueHandoff(pi, ctx, work);
	logRuntime("runCompactionFallbackAttempt.result", { ...workFields(work), resultKind: result.kind, resultReason: result.kind === "sent" ? undefined : result.reason, fallbackAttempts });
	if (result.kind === "sent") return finishAndClear(pi, work.key, "sent");
	if (result.kind === "transientSkip" && fallbackAttempts < fallbackRetryDelaysMs.length) {
		scheduleCompactionFallbackRetry(pi, ctx, work);
		return;
	}
	const reason = result.kind === "transientSkip" ? "retryExhausted" : result.reason;
	finishAndClear(pi, work.key, reason);
}

function attemptQueueHandoff(pi: ExtensionAPI, ctx: ExtensionContext, work: Extract<CompactionContinuationWork, { kind: "queueHandoff" }>): ContinuationAttemptResult {
	logCompactionDebugWithContext("attemptQueueHandoff.start", ctx, workFields(work));
	if (!ctx.isIdle()) return { kind: "transientSkip", reason: "notIdle" };
	if (ctx.hasPendingMessages()) return { kind: "transientSkip", reason: "pendingMessages" };
	const goal = getGoal();
	if (!goal || goal.goalId !== work.goalId || goal.status !== "complete") return { kind: "terminalSkip", reason: "notActive" };
	const queueHead = getQueue()[0];
	if (!queueHead) return { kind: "terminalSkip", reason: "queueMissing" };
	if (queueHead.queueId !== work.queueId) return { kind: "terminalSkip", reason: "queueChanged" };
	const sent = sendQueueHandoff(pi, "goal-complete", { goalId: work.goalId, force: true });
	logRuntime("attemptQueueHandoff.sendResult", { ...workFields(work), sent });
	return sent ? { kind: "sent" } : { kind: "terminalSkip", reason: "queueChanged" };
}

function compactionWorkStillApplies(work: CompactionContinuationWork): boolean {
	const goal = getGoal();
	if (work.kind === "activeGoal") return Boolean(goal && goal.goalId === work.goalId && goal.status === "active");
	const queueHead = getQueue()[0];
	return Boolean(goal && goal.goalId === work.goalId && goal.status === "complete" && queueHead?.queueId === work.queueId);
}

function sendContinuationMessage(pi: ExtensionAPI, goal: GoalState, telemetry: ReturnType<typeof getTelemetry>, reason: ContinuationReason, triggerTurn: boolean): void {
	const prompt = buildContinuationPrompt(goal, telemetry);
	logRuntime("sendContinuationMessage", { reason, goalId: goal.goalId, triggerTurn, deliverAs: "followUp" });
	setNextTurnOrigin("auto");
	pi.sendMessage(
		{ customType: CONTINUATION_MESSAGE_TYPE, content: prompt.content, display: false, details: { ...prompt.details, reason } },
		{ triggerTurn, deliverAs: "followUp" },
	);
}

function workFields(work: CompactionContinuationWork | undefined): Record<string, string | number | boolean | undefined> {
	return {
		compactionWorkKind: work?.kind,
		compactionWorkGoalId: work?.goalId,
		compactionWorkQueueId: work?.kind === "queueHandoff" ? work.queueId : undefined,
		compactionWorkKey: work?.key,
		compactionActive,
		prequeuedCompactionKey,
		fallbackAttempts,
		pendingContinuationGoalId: pendingContinuation?.goalId,
		pendingContinuationReason: pendingContinuation?.reason,
		hasFallbackTimer: Boolean(fallbackTimer),
	};
}

function logRuntime(event: string, fields: Record<string, string | number | boolean | undefined> = {}): void {
	logCompactionDebug(event, { ...workFields(compactionWork), ...fields });
}

function activeGoalKey(goalId: string): string {
	return `active:${goalId}`;
}

function queueKey(queueId: string): string {
	return `queue:${queueId}`;
}

function finishAndClear(pi: ExtensionAPI, key: string, reason: string): void {
	logRuntime("finishAndClear", { key, reason, fallbackAttempts });
	finishCompactionTelemetry(pi, "fallbackFinished", key, fallbackAttempts, reason);
	clearCompactionRuntime();
}

function finishCompactionTelemetry(pi: ExtensionAPI, action: "prequeue" | "fallbackRetry" | "fallbackFinished", key: string, attempts: number, finalReason?: string): void {
	logRuntime("finishCompactionTelemetry", { action, key, attempts, finalReason });
	const telemetry = noteCompactionContinuation(getTelemetry(), action, { key, attempts, finalReason });
	if (telemetry) persistTelemetry(pi, telemetry, "continuation");
}

function clearCompactionRuntime(opts: { keepPrequeueKey?: boolean } = {}): void {
	logRuntime("clearCompactionRuntime", { keepPrequeueKey: opts.keepPrequeueKey });
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

import { TELEMETRY_SCHEMA_VERSION } from "./constants";
import type {
	BudgetLimitReason,
	ContinuationReason,
	ContinuationSkipReason,
	GoalTelemetrySnapshot,
	SafetyPauseReason,
	TurnAccountingSnapshot,
	TurnOrigin,
} from "./types";

let nextTurnOrigin: TurnOrigin = "user";

export function setNextTurnOrigin(origin: TurnOrigin): void {
	nextTurnOrigin = origin;
}

export function consumeNextTurnOrigin(): TurnOrigin {
	const origin = nextTurnOrigin;
	nextTurnOrigin = "user";
	return origin;
}

export function createTelemetry(goalId: string, now = Date.now()): GoalTelemetrySnapshot {
	return {
		version: TELEMETRY_SCHEMA_VERSION,
		goalId,
		totalTurns: 0,
		userTurns: 0,
		autoTurns: 0,
		consecutiveAutoTurns: 0,
		consecutiveNoProgressTurns: 0,
		updatedAt: now,
	};
}

export function isTelemetry(value: unknown): value is GoalTelemetrySnapshot {
	if (!value || typeof value !== "object") return false;
	const v = value as Partial<GoalTelemetrySnapshot>;
	return v.version === TELEMETRY_SCHEMA_VERSION && typeof v.goalId === "string";
}

export function noteContinuationScheduled(
	telemetry: GoalTelemetrySnapshot | null,
	reason: ContinuationReason,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry) return null;
	return { ...telemetry, lastContinuationReason: reason, lastSkipReason: undefined, updatedAt: now };
}

export function noteContinuationSkipped(
	telemetry: GoalTelemetrySnapshot | null,
	reason: ContinuationSkipReason,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry) return null;
	return { ...telemetry, lastSkipReason: reason, updatedAt: now };
}

export function noteBudgetWrapUpSent(
	telemetry: GoalTelemetrySnapshot | null,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry) return null;
	return { ...telemetry, budgetWrapUpSent: true, updatedAt: now };
}

export function noteBudgetLimit(
	telemetry: GoalTelemetrySnapshot | null,
	reason: BudgetLimitReason,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry) return null;
	return { ...telemetry, lastBudgetLimitReason: reason, updatedAt: now };
}

export function noteSafetyPause(
	telemetry: GoalTelemetrySnapshot | null,
	reason: SafetyPauseReason,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry) return null;
	return { ...telemetry, lastSafetyPauseReason: reason, updatedAt: now };
}

export function resetSafetyCounters(
	telemetry: GoalTelemetrySnapshot | null,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry) return null;
	return {
		...telemetry,
		consecutiveAutoTurns: 0,
		consecutiveNoProgressTurns: 0,
		lastSafetyPauseReason: undefined,
		updatedAt: now,
	};
}

export function applyTurnTelemetry(
	telemetry: GoalTelemetrySnapshot | null,
	turn: TurnAccountingSnapshot,
	madeProgress: boolean,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry || telemetry.goalId !== turn.goalId) return telemetry;
	const auto = turn.origin === "auto" || turn.origin === "budgetWrapUp";
	return {
		...telemetry,
		totalTurns: telemetry.totalTurns + 1,
		userTurns: telemetry.userTurns + (turn.origin === "user" ? 1 : 0),
		autoTurns: telemetry.autoTurns + (auto ? 1 : 0),
		consecutiveAutoTurns: auto ? telemetry.consecutiveAutoTurns + 1 : 0,
		consecutiveNoProgressTurns: auto && !madeProgress ? telemetry.consecutiveNoProgressTurns + 1 : 0,
		lastTurnOrigin: turn.origin,
		lastTurnToolCallCount: turn.toolCallCount,
		lastTurnToolResultCount: turn.toolResultCount,
		lastTurnCompletedGoal: turn.completedGoal,
		lastProgressAt: madeProgress ? now : telemetry.lastProgressAt,
		updatedAt: now,
	};
}

export function makeTurnSnapshot(goalId: string, origin: TurnOrigin, startedAt = Date.now()): TurnAccountingSnapshot {
	return { goalId, origin, startedAt, toolCallCount: 0, toolResultCount: 0, progressCount: 0, completedGoal: false };
}

import { TELEMETRY_SCHEMA_VERSION } from "./constants";
import type {
	BudgetHardStopReason,
	BudgetLimitReason,
	BudgetWarningReason,
	ContinuationReason,
	ContinuationSkipReason,
	FloorValuePassId,
	GoalMonitorDecision,
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
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
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

export function noteBudgetWarning(
	telemetry: GoalTelemetrySnapshot | null,
	reason: BudgetWarningReason,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry) return null;
	return {
		...telemetry,
		lastBudgetWarningReason: reason,
		tokenBudgetWarningSent: telemetry.tokenBudgetWarningSent || reason === "tokenWarning",
		timeBudgetWarningSent: telemetry.timeBudgetWarningSent || reason === "timeWarning",
		updatedAt: now,
	};
}

export function noteBudgetHardStop(
	telemetry: GoalTelemetrySnapshot | null,
	reason: BudgetHardStopReason,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry) return null;
	return { ...telemetry, lastBudgetHardStopReason: reason, updatedAt: now };
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

export function noteFloorCompletionDeferred(
	telemetry: GoalTelemetrySnapshot | null,
	cardId: FloorValuePassId,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry) return null;
	return {
		...telemetry,
		lastFloorCardId: cardId,
		floorSteerCount: (telemetry.floorSteerCount ?? 0) + 1,
		floorQualityState: "steering",
		updatedAt: now,
	};
}

export function noteProductiveFloorWork(
	telemetry: GoalTelemetrySnapshot | null,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry?.lastFloorCardId) return telemetry;
	const completed = uniqueFloorCards([...(telemetry.completedFloorCardIds ?? []), telemetry.lastFloorCardId]);
	return {
		...telemetry,
		completedFloorCardIds: completed,
		floorQualityState: "eligible",
		updatedAt: now,
	};
}

export function noteFloorChurnSteer(
	telemetry: GoalTelemetrySnapshot | null,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry) return null;
	return {
		...telemetry,
		floorChurnSteerCount: (telemetry.floorChurnSteerCount ?? 0) + 1,
		floorQualityState: "qualityWarning",
		updatedAt: now,
	};
}

export function noteFloorQualityExhausted(
	telemetry: GoalTelemetrySnapshot | null,
	now = Date.now(),
): GoalTelemetrySnapshot | null {
	if (!telemetry) return null;
	return {
		...telemetry,
		floorQualityState: "exhausted",
		noMoreValuableWorkReason: "no_safe_autonomous_work",
		updatedAt: now,
	};
}

export function applyMonitorDecisionToFloorTelemetry(
	telemetry: GoalTelemetrySnapshot | null,
	decision: GoalMonitorDecision,
): GoalTelemetrySnapshot | null {
	switch (decision.pattern) {
		case "productive_floor_deepening":
			return noteProductiveFloorWork(telemetry);
		case "quota_filling_churn":
		case "repeated_floor_pass_no_new_evidence":
		case "floor_ignored_early_wrapup":
		case "floor_blocked_autonomous_fallback_needed":
			return noteFloorChurnSteer(telemetry);
		case "floor_quality_exhausted":
			return noteFloorQualityExhausted(telemetry);
		default:
			return telemetry;
	}
}

export function makeTurnSnapshot(goalId: string, origin: TurnOrigin, startedAt = Date.now()): TurnAccountingSnapshot {
	return { goalId, origin, startedAt, toolCallCount: 0, toolResultCount: 0, progressCount: 0, completedGoal: false };
}

function uniqueFloorCards(cards: FloorValuePassId[]): FloorValuePassId[] {
	return Array.from(new Set(cards));
}

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export type GoalStatus = "active" | "paused" | "budgetLimited" | "complete";

export type GoalState = {
	goalId: string;
	objective: string;
	status: GoalStatus;
	tokenBudget?: number;
	timeBudgetSeconds?: number;
	tokensUsed: number;
	timeUsedSeconds: number;
	createdAt: number;
	updatedAt: number;
};

export type TurnOrigin = "user" | "auto" | "budgetWrapUp";
export type ContinuationReason = "created" | "resumed" | "agentEnd";
export type ContinuationSkipReason = "notIdle" | "pendingMessages" | "notActive" | "budgetLimited" | "safetyCap";
export type SafetyPauseReason = "maxAutoTurns" | "noProgress" | "abort";
export type BudgetLimitReason = "tokenBudget" | "timeBudget";
export type BudgetWarningReason = "tokenWarning" | "timeWarning";
export type BudgetHardStopReason = "tokenHardStop" | "timeHardStop";
export type BudgetPressureKind = "none" | BudgetWarningReason | "tokenReached" | "timeReached" | BudgetHardStopReason;
export type BudgetPressure = { kind: BudgetPressureKind; remaining?: number };

export type GoalTelemetrySnapshot = {
	version: 1;
	goalId: string;
	totalTurns: number;
	userTurns: number;
	autoTurns: number;
	consecutiveAutoTurns: number;
	consecutiveNoProgressTurns: number;
	lastTurnOrigin?: TurnOrigin;
	lastContinuationReason?: ContinuationReason;
	lastSkipReason?: ContinuationSkipReason;
	lastTurnToolCallCount?: number;
	lastTurnToolResultCount?: number;
	lastTurnCompletedGoal?: boolean;
	budgetWrapUpSent?: boolean;
	lastProgressAt?: number;
	lastSafetyPauseReason?: SafetyPauseReason;
	lastBudgetLimitReason?: BudgetLimitReason;
	lastBudgetWarningReason?: BudgetWarningReason;
	lastBudgetHardStopReason?: BudgetHardStopReason;
	tokenBudgetWarningSent?: boolean;
	timeBudgetWarningSent?: boolean;
	updatedAt: number;
};

export type PiGoalEventKind = "set" | "update" | "account" | "telemetry" | "clear";
export type PiGoalEventReason =
	| "command"
	| "tool"
	| "turn"
	| "budget"
	| "abort"
	| "resume"
	| "reload"
	| "continuation"
	| "safety";

export type PiGoalStateEvent = {
	version: 1;
	kind: PiGoalEventKind;
	goalId?: string;
	goal: GoalState | null;
	telemetry?: GoalTelemetrySnapshot | null;
	delta?: { timeUsedSeconds?: number; tokensUsed?: number };
	reason: PiGoalEventReason;
	at: number;
};

export type GoalRuntimeState = {
	goal: GoalState | null;
	telemetry: GoalTelemetrySnapshot | null;
};

export type TurnAccountingSnapshot = {
	goalId: string;
	startedAt: number;
	origin: TurnOrigin;
	toolCallCount: number;
	toolResultCount: number;
	progressCount: number;
	completedGoal: boolean;
};

export type GoalSteeringKind = "continuation" | "budgetLimit" | "pause";

export type GoalSteeringDetails = {
	goalId: string;
	kind: GoalSteeringKind;
	promptId: string;
	createdAt: number;
	reason?: ContinuationReason | "budget" | "pause";
};

export type StreamBudgetSignal = "hardStop" | "reached" | "warning";

export type GoalCommandScheduler = (ctx: ExtensionContext, reason: ContinuationReason) => void;
export type GoalContinuationCanceller = (goalId?: string, reason?: string) => void;
export type GoalPauseInterrupter = (ctx: ExtensionContext, goal: GoalState) => void;

export type MutationResult = {
	ok: boolean;
	goal: GoalState | null;
	telemetry: GoalTelemetrySnapshot | null;
	message?: string;
};

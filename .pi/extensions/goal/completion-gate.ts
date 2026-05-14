import { isBudgetExhausted } from "./budget";
import { evaluateCompletionFloor, type CompletionFloorEvaluation } from "./floor";
import { buildFloorCompletionRefusal, selectFloorWorkCard, type FloorWorkCard } from "./floor-steering";
import { getRecentMonitorLogs } from "./monitor-state";
import type { GoalState, GoalTelemetrySnapshot, NoMoreValuableWorkReason } from "./types";

export type CompletionDecision =
	| { kind: "allow" }
	| { kind: "defer_and_steer"; floor: CompletionFloorEvaluation; card: FloorWorkCard; message: string }
	| { kind: "allow_with_reason"; reason: NoMoreValuableWorkReason | "max_budget_requires_wrap_up"; floor: CompletionFloorEvaluation };

export type GoalCompletionGateInput = {
	currentGoal: GoalState;
	candidateGoal: GoalState;
	telemetry: GoalTelemetrySnapshot | null;
	recentMonitorPatterns?: string[];
};

export function decideGoalCompletion(input: GoalCompletionGateInput): CompletionDecision {
	if (input.candidateGoal.status !== "complete") return { kind: "allow" };
	const floor = evaluateCompletionFloor(input.currentGoal);
	if (!floor.anyFloorConfigured || floor.allFloorsMet) return { kind: "allow" };
	if (isBudgetExhausted(input.currentGoal)) return { kind: "allow_with_reason", reason: "max_budget_requires_wrap_up", floor };
	if (canAllowNoValuableWorkEscape(input.telemetry)) return { kind: "allow_with_reason", reason: "no_safe_autonomous_work", floor };
	const card = selectFloorWorkCard({ goal: input.currentGoal, telemetry: input.telemetry, floor, recentMonitorPatterns: input.recentMonitorPatterns });
	if (!card && hasPriorFloorWork(input.telemetry)) return { kind: "allow_with_reason", reason: "no_safe_autonomous_work", floor };
	const selected = card ?? selectFloorWorkCard({ goal: input.currentGoal, telemetry: null, floor, recentMonitorPatterns: input.recentMonitorPatterns });
	if (!selected) return { kind: "allow_with_reason", reason: "no_safe_autonomous_work", floor };
	return {
		kind: "defer_and_steer",
		floor,
		card: selected,
		message: buildFloorCompletionRefusal({ goal: input.currentGoal, floor, card: selected }),
	};
}

export function decideGoalCompletionWithRecentMonitorPatterns(input: Omit<GoalCompletionGateInput, "recentMonitorPatterns">): CompletionDecision {
	return decideGoalCompletion({
		...input,
		recentMonitorPatterns: getRecentMonitorLogs(input.currentGoal.goalId).map((entry) => entry.pattern ?? "").filter(Boolean),
	});
}

function canAllowNoValuableWorkEscape(telemetry: GoalTelemetrySnapshot | null): boolean {
	return telemetry?.floorQualityState === "exhausted";
}

function hasPriorFloorWork(telemetry: GoalTelemetrySnapshot | null): boolean {
	return (telemetry?.floorSteerCount ?? 0) > 0 || (telemetry?.completedFloorCardIds?.length ?? 0) > 0 || (telemetry?.floorChurnSteerCount ?? 0) > 0;
}

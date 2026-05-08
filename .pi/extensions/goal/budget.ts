import { BUDGET_HARD_STOP_MULTIPLIER, TIME_BUDGET_WARNING_REMAINING_SECONDS, TOKEN_BUDGET_WARNING_REMAINING } from "./constants";
import type { BudgetLimitReason, BudgetPressure, BudgetPressureKind, GoalState } from "./types";

export function evaluateBudgetPressure(goal: GoalState): BudgetPressure {
	const token = tokenPressure(goal);
	const time = timePressure(goal);
	return moreSevere(token, time);
}

export function budgetLimitReason(goal: GoalState): BudgetLimitReason | undefined {
	const pressure = evaluateBudgetPressure(goal);
	if (pressure.kind === "tokenReached" || pressure.kind === "tokenHardStop") return "tokenBudget";
	if (pressure.kind === "timeReached" || pressure.kind === "timeHardStop") return "timeBudget";
	return undefined;
}

export function budgetPressureResource(kind: BudgetPressureKind): "token" | "time" | undefined {
	if (kind.startsWith("token")) return "token";
	if (kind.startsWith("time")) return "time";
	return undefined;
}

export function isBudgetWarning(kind: BudgetPressureKind): boolean {
	return kind === "tokenWarning" || kind === "timeWarning";
}

export function isBudgetReached(kind: BudgetPressureKind): boolean {
	return kind === "tokenReached" || kind === "timeReached";
}

export function isBudgetHardStop(kind: BudgetPressureKind): boolean {
	return kind === "tokenHardStop" || kind === "timeHardStop";
}

function tokenPressure(goal: GoalState): BudgetPressure {
	if (goal.tokenBudget === undefined) return none();
	const remaining = goal.tokenBudget - goal.tokensUsed;
	if (goal.tokensUsed >= hardStopBudget(goal.tokenBudget)) return pressure("tokenHardStop", remaining);
	if (goal.tokensUsed >= goal.tokenBudget) return pressure("tokenReached", remaining);
	if (remaining <= TOKEN_BUDGET_WARNING_REMAINING) return pressure("tokenWarning", remaining);
	return none();
}

function timePressure(goal: GoalState): BudgetPressure {
	if (goal.timeBudgetSeconds === undefined) return none();
	const remaining = goal.timeBudgetSeconds - goal.timeUsedSeconds;
	if (goal.timeUsedSeconds >= hardStopBudget(goal.timeBudgetSeconds)) return pressure("timeHardStop", remaining);
	if (goal.timeUsedSeconds >= goal.timeBudgetSeconds) return pressure("timeReached", remaining);
	if (remaining <= TIME_BUDGET_WARNING_REMAINING_SECONDS) return pressure("timeWarning", remaining);
	return none();
}

function hardStopBudget(budget: number): number {
	return Math.ceil((budget * Math.round(BUDGET_HARD_STOP_MULTIPLIER * 10)) / 10);
}

function moreSevere(a: BudgetPressure, b: BudgetPressure): BudgetPressure {
	return severity(a.kind) >= severity(b.kind) ? a : b;
}

function severity(kind: BudgetPressureKind): number {
	if (isBudgetHardStop(kind)) return 3;
	if (isBudgetReached(kind)) return 2;
	if (isBudgetWarning(kind)) return 1;
	return 0;
}

function pressure(kind: BudgetPressureKind, remaining: number): BudgetPressure {
	return { kind, remaining };
}

function none(): BudgetPressure {
	return { kind: "none" };
}

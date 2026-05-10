import type { GoalState } from "./types";

export type CompletionFloorEvaluation = {
	minTokensBeforeWrapUp?: number;
	minTimeSecondsBeforeWrapUp?: number;
	tokensRemainingBeforeWrapUp?: number;
	timeSecondsRemainingBeforeWrapUp?: number;
	tokenFloorMet: boolean;
	timeFloorMet: boolean;
	allFloorsMet: boolean;
	anyFloorConfigured: boolean;
};

export type GoalFloorConfig = {
	tokenBudget?: number;
	timeBudgetSeconds?: number;
	minTokensBeforeWrapUp?: number;
	minTimeSecondsBeforeWrapUp?: number;
};

export function evaluateCompletionFloor(goal: GoalState): CompletionFloorEvaluation {
	const tokenFloorMet = goal.minTokensBeforeWrapUp === undefined || goal.tokensUsed >= goal.minTokensBeforeWrapUp;
	const timeFloorMet = goal.minTimeSecondsBeforeWrapUp === undefined || goal.timeUsedSeconds >= goal.minTimeSecondsBeforeWrapUp;
	return {
		minTokensBeforeWrapUp: goal.minTokensBeforeWrapUp,
		minTimeSecondsBeforeWrapUp: goal.minTimeSecondsBeforeWrapUp,
		tokensRemainingBeforeWrapUp: remaining(goal.minTokensBeforeWrapUp, goal.tokensUsed),
		timeSecondsRemainingBeforeWrapUp: remaining(goal.minTimeSecondsBeforeWrapUp, goal.timeUsedSeconds),
		tokenFloorMet,
		timeFloorMet,
		allFloorsMet: tokenFloorMet && timeFloorMet,
		anyFloorConfigured: goal.minTokensBeforeWrapUp !== undefined || goal.minTimeSecondsBeforeWrapUp !== undefined,
	};
}

export function isCompletionFloorUnmet(goal: GoalState): boolean {
	const floor = evaluateCompletionFloor(goal);
	return floor.anyFloorConfigured && !floor.allFloorsMet;
}

export function validateFloorConfig(config: GoalFloorConfig): string | undefined {
	if (config.minTokensBeforeWrapUp !== undefined) {
		const error = validatePositiveInteger("min_tokens_before_wrap_up", config.minTokensBeforeWrapUp);
		if (error) return error;
		if (config.tokenBudget !== undefined && config.minTokensBeforeWrapUp > config.tokenBudget) {
			return "min_tokens_before_wrap_up must be less than or equal to token_budget.";
		}
	}
	if (config.minTimeSecondsBeforeWrapUp !== undefined) {
		const error = validatePositiveInteger("min_time_seconds_before_wrap_up", config.minTimeSecondsBeforeWrapUp);
		if (error) return error;
		if (config.timeBudgetSeconds !== undefined && config.minTimeSecondsBeforeWrapUp > config.timeBudgetSeconds) {
			return "min_time_seconds_before_wrap_up must be less than or equal to time_budget_seconds.";
		}
	}
	return undefined;
}

function remaining(floor: number | undefined, used: number): number | undefined {
	return floor === undefined ? undefined : Math.max(0, floor - used);
}

function validatePositiveInteger(name: string, value: number): string | undefined {
	return Number.isInteger(value) && value > 0 ? undefined : `${name} must be a positive integer when provided.`;
}

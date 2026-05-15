export type GoalFeatureFlags = {
	postCompletionActions: boolean;
	contextReset: boolean;
	contextResetClear: boolean;
};

const DISABLED_VALUES = new Set(["0", "false", "no", "off"]);
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export function getGoalFeatureFlags(env: NodeJS.ProcessEnv = process.env): GoalFeatureFlags {
	return {
		postCompletionActions: isEnabled(env.PI_GOAL_POST_COMPLETION_ACTIONS),
		contextReset: isEnabled(env.PI_GOAL_CONTEXT_RESET),
		contextResetClear: isExplicitlyEnabled(env.PI_GOAL_CONTEXT_RESET_CLEAR),
	};
}

function isEnabled(value: string | undefined): boolean {
	if (value === undefined) return true;
	return !DISABLED_VALUES.has(value.trim().toLowerCase());
}

function isExplicitlyEnabled(value: string | undefined): boolean {
	if (value === undefined) return false;
	return ENABLED_VALUES.has(value.trim().toLowerCase());
}

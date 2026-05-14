export type GoalFeatureFlags = {
	postCompletionActions: boolean;
	contextReset: boolean;
};

const DISABLED_VALUES = new Set(["0", "false", "no", "off"]);

export function getGoalFeatureFlags(env: NodeJS.ProcessEnv = process.env): GoalFeatureFlags {
	return {
		postCompletionActions: isEnabled(env.PI_GOAL_POST_COMPLETION_ACTIONS),
		contextReset: isEnabled(env.PI_GOAL_CONTEXT_RESET),
	};
}

function isEnabled(value: string | undefined): boolean {
	if (value === undefined) return true;
	return !DISABLED_VALUES.has(value.trim().toLowerCase());
}

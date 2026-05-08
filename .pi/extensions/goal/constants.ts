export const STATE_ENTRY_TYPE = "pi-goal-state";
export const CONTINUATION_MESSAGE_TYPE = "pi-goal-continuation";
export const BUDGET_LIMIT_MESSAGE_TYPE = "pi-goal-budget-limit";
export const PAUSE_MESSAGE_TYPE = "pi-goal-pause";

export const MAX_OBJECTIVE_CHARS = 15000;
export const LONG_OBJECTIVE_HINT =
	"Put longer instructions in a file and refer to that file in the goal, for example: /goal follow the instructions in docs/goal.md.";

export const STATUS_UI_KEY = "pi-goal";
export const WIDGET_UI_KEY = "pi-goal";

export const TELEMETRY_SCHEMA_VERSION = 1 as const;
export const STATE_EVENT_VERSION = 1 as const;

export const MAX_CONSECUTIVE_AUTO_TURNS = 50;
export const MAX_NO_PROGRESS_AUTO_TURNS = 3;
export const OBJECTIVE_EXCERPT_CHARS = 96;

export const CONTINUATION_PROMPT_ID = "pi-goal-continuation-v1";
export const BUDGET_LIMIT_PROMPT_ID = "pi-goal-budget-limit-v1";
export const PAUSE_PROMPT_ID = "pi-goal-pause-v1";

export const GOAL_USAGE = "Usage: /goal <objective>";
export const GOAL_USAGE_HINT = "Example: /goal improve benchmark coverage";

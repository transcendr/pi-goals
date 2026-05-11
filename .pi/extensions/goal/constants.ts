export const STATE_ENTRY_TYPE = "pi-goal-state";
export const CONTINUATION_MESSAGE_TYPE = "pi-goal-continuation";
export const BUDGET_LIMIT_MESSAGE_TYPE = "pi-goal-budget-limit";
export const PAUSE_MESSAGE_TYPE = "pi-goal-pause";
export const GOAL_MONITOR_MESSAGE_TYPE = "pi-goal-monitor-steer";
export const QUEUE_MESSAGE_TYPE = "pi-goal-queue-steer";
export const GOAL_MONITOR_LOG_ENTRY_TYPE = "pi-goal-monitor-log";

export const MAX_OBJECTIVE_CHARS = 100000;
export const LONG_OBJECTIVE_HINT =
  "Put longer instructions in a file and refer to that file in the goal, for example: /goal follow the instructions in docs/goal.md.";

export const STATUS_UI_KEY = "pi-goal";
export const WIDGET_UI_KEY = "pi-goal";

export const TELEMETRY_SCHEMA_VERSION = 1 as const;
export const STATE_EVENT_VERSION = 1 as const;

export const MAX_CONSECUTIVE_AUTO_TURNS = 50;
export const MAX_NO_PROGRESS_AUTO_TURNS = 3;
export const OBJECTIVE_EXCERPT_CHARS = 96;
export const TOKEN_BUDGET_WARNING_REMAINING = 100_000;
export const TIME_BUDGET_WARNING_REMAINING_SECONDS = 60;
export const BUDGET_HARD_STOP_MULTIPLIER = 1.1;

export const GOAL_MONITOR_REPORT_INTERVAL_SECONDS = 90;
export const GOAL_MONITOR_RECENT_LOG_LIMIT = 10;
export const GOAL_MONITOR_RECENT_BRANCH_ENTRY_LIMIT = 12;
export const GOAL_MONITOR_ENTRY_SUMMARY_CHARS = 700;
export const GOAL_MONITOR_PROCESS_TIMEOUT_MS = 240_000;
export const GOAL_MONITOR_OUTPUT_CHARS = 20_000;

export const CONTINUATION_PROMPT_ID = "pi-goal-continuation-v1";
export const BUDGET_LIMIT_PROMPT_ID = "pi-goal-budget-limit-v1";
export const BUDGET_WARNING_PROMPT_ID = "pi-goal-budget-warning-v1";
export const PAUSE_PROMPT_ID = "pi-goal-pause-v1";
export const GOAL_MONITOR_PROMPT_ID = "pi-goal-monitor-v1";
export const QUEUE_PROMPT_ID = "pi-goal-queue-v1";

export const GOAL_USAGE = "Usage: /goal <objective>";
export const GOAL_USAGE_HINT = "Example: /goal improve benchmark coverage";

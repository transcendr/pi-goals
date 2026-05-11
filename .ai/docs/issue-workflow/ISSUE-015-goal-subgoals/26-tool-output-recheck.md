# 26 — Tool output recheck

## Source inspected

- `.pi/extensions/goal/tool-results.ts`

## Finding

`ToolDetails` currently returns a single `goal` plus telemetry/floor details, and `formatToolGoal()` prints only top-level goal status/objective/budget/floor lines. There is no subgoal summary channel today.

## Impact

ISSUE-015's tool-output acceptance criteria remain necessary. Implementation should extend details and formatted output with compact current-child and blocker summaries while preserving the exact no-subgoal output shape as much as possible.

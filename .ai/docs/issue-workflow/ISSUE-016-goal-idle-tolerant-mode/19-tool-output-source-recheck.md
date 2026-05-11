# 19 — Tool output source recheck

## Source inspected

- `.pi/extensions/goal/tool-results.ts`

## Finding

`ToolDetails` and `formatToolGoal()` expose current goal, telemetry, budgets, and floors, but no continuation-policy fields or active-waiting summary.

## Impact

ISSUE-016 implementation should add policy details to tool output so agents can distinguish paused, immediate active, active idle-nudge waiting, and manual active goals before deciding whether to continue or complete.

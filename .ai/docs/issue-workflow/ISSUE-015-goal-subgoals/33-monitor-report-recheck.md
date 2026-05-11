# 33 — Monitor report recheck

## Source inspected

- `.pi/extensions/goal/monitor-report.ts`

## Finding

Monitor reports currently include the full top-level `goal`, telemetry, recent entries, recent monitor logs, and floor report. They do not compute current child summaries or unresolved child blocker summaries.

## Impact

ISSUE-015 implementation should extend monitor report details or monitor prompt context with compact subgoal state so churn/steering decisions do not ignore an active child workflow.

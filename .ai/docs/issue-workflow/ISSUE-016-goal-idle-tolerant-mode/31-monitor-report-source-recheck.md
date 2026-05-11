# 31 — Monitor report source recheck

## Source inspected

- `.pi/extensions/goal/monitor-report.ts`

## Finding

`buildGoalMonitorReport()` includes the full `goal` object, telemetry, recent branch entries, recent monitor logs, and a derived floor report. If idle policy fields are added to `GoalState`, the raw `goal` field will carry them automatically, but the rendered monitor prompt will not make them explicit unless `monitor-prompts.ts` is updated.

## Implementation requirement

Add an explicit idle/wait block to the monitor report or monitor prompt rendering, not just incidental JSON object inclusion. Recommended fields:

- `auto_continue_mode`
- `idle_nudge_after_seconds`
- `idle_wait_reason`
- `idle_waiting_since`
- `idle_nudge_pending` if runtime can expose it safely

## Risk addressed

Without explicit monitor context, the churn monitor can interpret a deliberate idle wait as no progress, especially when recent branch entries contain only status checks or no new tool output.

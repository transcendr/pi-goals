# 17 — Telemetry source recheck

## Source inspected

- `.pi/extensions/goal/telemetry.ts`

## Finding

Telemetry currently records scheduled/skipped continuation reasons and turn-origin/no-progress counters. There is no distinct idle-wait or idle-nudge telemetry state.

## Impact

Implementation should avoid calling `noteContinuationScheduled()` for suppressed immediate continuation in `idle_nudge`/`manual` modes. If observability is needed, add explicit idle-nudge telemetry fields rather than overloading normal continuation scheduling.

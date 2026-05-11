# 21 — Monitor prompt recheck

## Source inspected

- `.pi/extensions/goal/monitor-prompts.ts`

## Finding

The churn monitor prompt renders top-level goal status/objective, floor, telemetry, recent context, and recent monitor logs. It has no idle policy or wait-reason fields.

## Impact

Implementation should include idle policy and wait reason in monitor reports/prompts so intentional waiting is not misclassified as no-progress churn. The monitor should watch unless there is evidence the wait is stale or looping.

# 21 — Queue tools source recheck

## Source inspected

- `.pi/extensions/goal/queue-tools.ts`

## Finding

Queue tools intentionally guard queue mutation:

- `start_queued_goal` refuses to start if a non-complete active goal exists.
- `dequeue_goal` requires rationale and authority.
- queue tools are separate from normal goal update/audit behavior.

## Implementation impact

`/goal audit` must not call queue tools or queue steering as a side effect. Audit can recommend whether queued work should continue after a goal completes, but it must not start/dequeue queue items.

This matters for the current parent orchestration queue item: audit is a read-only review surface and must not become a hidden queue continuation path.

## Proof implication

`audit_command_probe` should fail if audit command source references `startQueuedGoal`, `sendQueueSteering`, `dequeueGoal`, or normal continuation scheduling.

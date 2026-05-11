# 09 — Lifecycle/context-filter source recheck

## Sources inspected

- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/constants.ts`

## Finding

`lifecycle.ts` filters goal steering messages by custom type and current goal status. Recognized custom types currently include continuation, budget-limit, pause, monitor-steer, and queue-steer. `goalSteeringMatchesStatus()` has no audit kind/custom type.

`constants.ts` defines prompt ids and custom message types for existing steering surfaces, but no audit message type or prompt id.

## Implementation impact

The audit implementation must add a distinct audit custom type/prompt id and update context filtering so stale audit messages are dropped by goal id/status. Because audit is allowed as read-only for active, paused, budget-limited, and complete goals, its status matcher cannot reuse continuation or pause matching directly.

## Proof implication

`audit_command_probe` or a dedicated stale-filter probe must fail if audit steering is not context-filtered or if audit messages survive after goal replacement/clear.

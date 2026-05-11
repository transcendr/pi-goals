# 22 — Queue steering recheck

## Source inspected

- `.pi/extensions/goal/queue-steering.ts`

## Finding

Queue steering is separate from active goal continuation and tells the agent how to classify queued work after goal clear/complete/resume. Idle-nudge semantics should not be implemented through the queue.

## Impact

The idle policy belongs in active-goal continuation scheduling. Delayed nudges should not disturb queued-goal handoff invariants or start queued work while the current active goal is intentionally waiting.

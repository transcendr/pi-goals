# 38 — Queue source recheck

## Source inspected

- `.pi/extensions/goal/queue-state.ts`

## Finding

Queue state is a separate FIFO of future top-level `QueuedGoal` records with template metadata for later top-level execution. It persists enqueue/dequeue/remove events separately from active `GoalState`.

## Impact

ISSUE-015 should not model blocking child subgoals as queue entries. Nested subgoals need to live on the parent `GoalState`; otherwise a blocking child can be delayed behind unrelated queued work and parent return state remains implicit.

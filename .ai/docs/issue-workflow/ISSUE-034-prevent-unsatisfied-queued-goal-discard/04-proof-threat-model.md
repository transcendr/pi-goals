# 04 — Proof threat model

## Primary invariant

A queued goal must not be removed from the queue unless it is either:

1. atomically started as a concrete active goal through `start_queued_goal`;
2. consumed with explicit matching queue id and satisfaction evidence after the requested work is complete;
3. explicitly removed by the user through `remove_queued_goal` or an equivalent user-confirmed removal path.

## False-green risks

- `dequeue_goal` still removes the head without required parameters.
- Agent supplies stale queue id but tool still removes current head.
- Agent supplies vague satisfaction text and the tool accepts it while an active non-complete goal exists.
- `remove_queued_goal` becomes the new accidental discard path without explicit-user guidance.
- Queue replay drops evidence fields or reorders events.
- Existing orchestration flows break because the new consume tool is too strict.

## Proof strategy

Deterministic probes should directly exercise tool behavior:

- no-arg `dequeue_goal` is impossible or rejected;
- wrong `queueId` is rejected and queue remains unchanged;
- matching `queueId` without satisfaction evidence is rejected;
- matching `queueId` with satisfaction evidence consumes exactly one head item;
- non-complete active goal blocks dequeue unless a separately designed explicit-removal path is used;
- `start_queued_goal` still atomically creates and dequeues direct goals;
- `remove_queued_goal` still requires explicit id and removes only that id.

A live probe should verify agent behavior: after completing a concrete goal for a prose queue item, the agent calls the satisfaction-gated consume tool with the queue id and evidence; it does not silently discard remaining queued work.

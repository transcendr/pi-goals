# 03 — Design lock

## Options considered

### Option A — Make `update_goal(status:"complete")` directly send queue steering when queue remains

Pros:
- Closest to the tool action that creates the completed-goal state.
- Avoids dependence on turn-end telemetry.
- Can return/record structured details that queue continuation was scheduled.

Cons:
- Needs dedupe with existing turn-end `goal-complete` steering.

### Option B — Keep turn-end steering but always trigger a follow-up turn for `goal-complete`

Pros:
- Minimal change to current ownership.
- Aligns with `/goal resume` behavior that uses `triggerTurn: true`.

Cons:
- Still depends on `completedThisTurn` detection.
- Does not cover all direct state-completion paths.

### Option C — Add a general post-completion queue invariant checker

Pros:
- Strongest invariant: complete current goal + non-empty queue eventually triggers queue processing.
- Can cover reload/replay edge cases.

Cons:
- More moving parts; must avoid duplicate queue steering and infinite loops.

## Chosen direction for issue

Execution should lock a robust invariant, likely by combining A and B:

- `update_goal(status:"complete")` should ensure queued work is not silently stranded when the queue is non-empty.
- The resulting queue steering must trigger a follow-up turn or otherwise prevent a normal stop.
- Existing turn-end steering should be deduped or made idempotent rather than removed blindly.

## Rejected alternative

Do not solve this only with prompt wording. The bug is a runtime steering/continuation invariant: a completed goal with remaining queue must create an effective continuation signal.

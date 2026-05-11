# 04 — Proof threat model

## Primary invariant

When an active goal is completed and the queue is non-empty, `pi-goals` must not allow the session to silently stop; it must inject effective queue steering and/or trigger a follow-up turn so the agent continues with the queue head.

## False-green risks

- A test sees `sendQueueSteering` called in one path, but `update_goal(status:"complete")` still returns without effective triggered continuation.
- Queue steering is inserted as context but not as a follow-up turn, so the model can still final-answer and stop.
- The path works for slash command `/goal resume` but not model-tool completion.
- Duplicate steering creates repeated queue prompts or double-starts the queue head.
- Completed-goal replacement or dequeue orchestration paths regress.

## Required proof strategy

- Deterministic probe that simulates completion with queued items and asserts queue steering/follow-up trigger happens.
- Probe for no duplicate steering when both tool-completion and turn-end paths observe the same completion.
- Live probe in `pi-goals-live-probe` or current Solo process: complete a trivial active goal while at least one queued goal remains and verify the next queue item is presented/continued without manual prompting.

# 03 — Design lock

## Options considered

### Option A — Keep current behavior

`/goal resume` remains only for paused active goals; users must `/goal clear` or wait for completion-triggered steering before queue processing.

Rejected because it leaves the observed idle queue dead zones unresolved and makes `/goal resume` misleading when the user sees queued goals ready to run.

### Option B — Make `/goal queue ...` auto-start when idle

A queued goal would start immediately if no active goal exists or only a completed goal exists.

Rejected because it violates the explicit product invariant: queueing is not starting. Users need a way to stage queue items without execution advancing.

### Option C — Make `/goal resume` send queue steering when queue-ready and idle

If `/goal resume` is invoked and the queue is non-empty:

- no current goal: send queue steering and start an agent turn to resolve the queue head;
- completed current goal: send queue steering and start an agent turn to resolve the queue head, allowing `start_queued_goal` or template orchestration to replace the completed goal when appropriate;
- non-complete active/paused/budget-limited goal: preserve existing resume/budget behavior.

Chosen.

## Locked design

Implement `/goal resume` as an explicit queue pump when no resumable active goal exists but the queue has work.

The extension should not start a queued goal directly inside the command handler. Instead, it should reuse the queue steering path so the agent sees the same instructions used after goal completion/clear:

- classify the queue head;
- call `list_goal_templates` when applicable;
- use `create_goal_from_template`, `create_goal`, or `start_queued_goal` according to semantic classification;
- dequeue only after successful concrete satisfaction.

## Implementation-shape guidance

Likely code surfaces:

- `.pi/extensions/goal/command.ts`
  - `resumeGoal()` needs access to queue state and queue steering sender.
  - When `!goal` and `getQueue().length > 0`, send queue steering and notify that queued goals are being resumed/handed to the agent.
  - When `goal.status === "complete"` and queue exists, send queue steering instead of telling the user to clear first.
- `.pi/extensions/goal/queue-steering.ts`
  - Consider whether `QueueSteeringReason` should gain a `goal-resume` reason for clearer message details. This is preferable to overloading `goal-clear`.
- `.pi/extensions/goal/types.ts`
  - Update the `GoalQueueSteeringSender` reason union if a new reason is added.
- Probes/tests
  - Add deterministic focused probes for no-goal and completed-goal states.
  - Add a bounded live probe because this is an agent-turn/control behavior.

## Explicit non-goals

- Do not make queue enqueue auto-start goals.
- Do not parse queue prose in extension runtime.
- Do not require users to clear completed goals before queued goals can proceed.
- Do not change `start_queued_goal` safety semantics for non-complete active goals.

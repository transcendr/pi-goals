# 02 — Grounded research

## Commands/files inspected

See `raw/commands.log` for command transcript notes.

Code surfaces inspected:

- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/queue-steering.ts`
- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/types.ts`

## Current behavior

### `/goal queue ...`

`handleQueueCommand()` resolves the queue argument as either a template invocation or raw objective, validates it, persists an enqueue event, and returns a notification. It does not start an agent turn. This matches the desired invariant: queueing is not starting.

### `/goal resume` with no goal

`resumeGoal()` checks `getGoal()`. If no goal exists, it notifies usage/help and returns. It does not inspect `getQueue()` and does not send queue steering. Therefore queued items can remain idle even after the user explicitly says `/goal resume`.

### `/goal resume` with completed goal

`resumeGoal()` currently returns `Goal is complete. Use /goal clear before starting a new goal.` when `goal.status === "complete"`. It does not check whether queued goals exist, and does not allow a completed uncleared goal to be treated as a valid queue-handoff state.

### Existing queue handoff triggers

- `clearGoal()` checks the queue and calls `sendQueueSteering("goal-clear")` after clearing.
- `finishTurnGoal()` calls `sendQueueSteering("goal-complete")` only when the active turn completed the goal in that same turn.
- `start_queued_goal` safely replaces a completed goal, refuses non-complete active goals, creates the queued goal, and dequeues only after successful creation.

## Gap

The current design has queue handoff after goal completion and after explicit clear, but not after an explicit resume command in an otherwise idle queue-ready state. That leaves two user-visible dead zones:

1. no goal + non-empty queue + `/goal resume` => help text only;
2. completed goal + non-empty queue + `/goal resume` => asks user to clear, even though queue processing could safely start and `start_queued_goal` already supports completed-goal replacement.

## Stable constraints to preserve

- `/goal queue ...` must remain enqueue-only.
- Queue head resolution must remain agent-driven through hidden queue steering and queue/model tools.
- The extension should not parse arbitrary prose queue items to decide templates/directness.
- Non-complete active/paused/budget-limited goals should keep their current resume/budget semantics.

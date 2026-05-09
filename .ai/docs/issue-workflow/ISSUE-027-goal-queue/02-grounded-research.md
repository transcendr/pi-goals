# 02 Grounded research

## Live code inspected

- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/constants.ts`
- `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`
- `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`

## Findings

Current `/goal` behavior is single-active-goal only:

- `command.ts` registers subcommands `pause`, `resume`, and `clear` only.
- Any non-control `/goal <text>` resolves template-or-objective and calls `setGoalObjective()`.
- `setGoalObjective()` validates the objective and, when any existing goal exists, prompts `ctx.ui.confirm("Replace goal?", ...)` with only a boolean outcome.
- On confirmation it cancels the existing goal's continuation/monitor and persists a new `set` event.
- There is no queue state, no `/goal queue`, and no event kind for queue mutation.

Current persistence is goal-only:

- `GoalRuntimeState` contains `{ goal, telemetry }`.
- `PiGoalStateEvent` kinds are `set`, `update`, `account`, `telemetry`, `clear`.
- Replay ignores any non-`pi-goal-state` custom entries.
- This suggests first-pass queue support should either extend the state event payload carefully or add a separate custom entry type with its own replay helper to avoid destabilizing the current goal event schema.

Current steering/auto-continuation is reusable:

- Continuation and budget wrap-up use `pi.sendMessage(..., { triggerTurn: true, deliverAs: "followUp" })`.
- Pause/monitor/budget warning use `deliverAs: "steer"`.
- `lifecycle.ts` filters stale goal steering messages by custom type, goal id, kind, and status.
- A next-queued-goal prompt can reuse the follow-up/steer pattern but should have a dedicated custom type and stale/context filtering rules.

Relevant existing planning:

- ISSUE-019 is broader multiple/parallel goals and remains refine-only. The requested goal queue is narrower: sequential pending objectives in one session, not parallel multi-agent orchestration.
- ISSUE-023 covers dependency triggers/watchers. Goal queue auto-advance after completion/clear is an internal trigger, not a general external watcher.

## Gap summary

- Missing queue data model and persistence.
- Missing command UI: queue option from replace confirmation and `/goal queue` list/enqueue surface.
- Missing model-facing tools to enqueue/list/dequeue queued goals for agent use.
- Missing auto-advance prompt when current goal completes or clears.
- Missing UI/status awareness and context filtering for queue steering.
- Missing probes for persistence/replay, command queue behavior, tool queue behavior, and auto-advance stale guards.

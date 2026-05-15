# 03 — Implementation design lock

## Status

Implementation strategy is locked. No meaningful product/API/architecture fork remains for the implementation agent.

## Chosen patch architecture

```toon
toon.version: 1
implementation_choices[8]{id,choice,implementation_consequence}:
  "ic1","clear-specific flag in feature-flags","add contextResetClear boolean default false; broad contextReset false disables all modes"
  "ic2","mode-specific skip in context-reset runner","clear with disabled gate returns skipped/warning result before navigateTree"
  "ic3","queued goals carry sourceQueueId on GoalState","start_queued_goal sets sourceQueueId so completing a queued goal can consume any reappeared source queue item after navigation"
  "ic4","terminal continuation envelope carries queued snapshot","queue handoff ticket includes queuedGoal snapshot, goalId, reason, sourceQueueId, and queue revision data"
  "ic5","queue-state owns repair helpers","new helpers mutate runtimeQueue and persist repair/dequeue events atomically for automated reset repair"
  "ic6","queue revision guards steering validity","sendQueueSteering includes queueRevision; queueSteeringStillValid requires matching current revision and queue head"
  "ic7","terminal-workflow owns post-navigation repair barrier","after runPostCompletionActionsSafely, repair source queue consumption and queued head restore before revalidation/dispatch"
  "ic8","tool update terminal workflow is deferred out of tool execution","update_goal persists status and lets turn_end/deferred workflow run navigateTree after tool result settles"
```

## Exact implementation design

### Feature flags

`GoalFeatureFlags` becomes:

```ts
export type GoalFeatureFlags = {
  postCompletionActions: boolean;
  contextReset: boolean;
  contextResetClear: boolean;
};
```

`getGoalFeatureFlags()` behavior:

- `PI_GOAL_POST_COMPLETION_ACTIONS` default enabled.
- `PI_GOAL_CONTEXT_RESET` default enabled.
- `PI_GOAL_CONTEXT_RESET_CLEAR` default disabled. Only values other than disabled values enable it.

Recommended helper split:

- keep current `isEnabled` for default-on flags;
- add `isExplicitlyEnabled` for default-off clear flag.

### Context reset runner

Before calling `navigateTree`:

1. If broad `contextReset` disabled: return skipped with message `disabled by PI_GOAL_CONTEXT_RESET`.
2. If action mode is `clear` and `contextResetClear` false: return skipped with severity/warning-capable message `clear disabled by PI_GOAL_CONTEXT_RESET_CLEAR`.
3. Only then validate capability and call `navigateTree`.

If the runner result type cannot currently express warning on skipped actions, extend `PostCompletionActionRunResult` so skipped results can carry `severity?: "warning"` or make `runPostCompletionActionsSafely` notify for skipped messages when appropriate.

### Queue origin metadata

Add optional field to `GoalState`:

```ts
sourceQueueId?: string;
```

Parse/persist it in `state.ts`. Set it in `queue-tools.ts` `createAndDequeueQueuedGoal` when creating a goal from a queued item.

This is needed because a queued goal that completes with context reset can navigate back before its dequeue event and make its own source queue item reappear.

### Queue revision and repair helpers

Extend queue runtime state to include a monotonic branch-local revision:

```ts
export type GoalQueueRuntimeState = {
  queue: QueuedGoal[];
  revision: number;
};
```

Revision increments for enqueue/dequeue/remove/repair events. Expose:

- `getQueueRevision(): number`
- `consumeQueueIdForRepair(pi, queueId, reason): boolean`
- `restoreQueueHeadForRepair(pi, queuedGoal, reason): boolean`
- `branchHasQueueTerminalEvent(ctx, queueId): boolean` or equivalent replay summary helper.

Implementation notes:

- Repair helpers must both mutate runtimeQueue and append a custom `pi-goal-state` event.
- Add a new queue event kind such as `repairHead` rather than abusing ordinary enqueue if exact head insertion is needed.
- `restoreQueueHeadForRepair` should no-op if queue head already matches the queued goal.
- It should refuse/return false if current queue has a different head; do not reorder unknown branch state silently.
- It should refuse if the current branch already has a remove/dequeue event for the queue id.

### Continuation envelope

Change queue handoff ticket from queueId-only to snapshot-bearing:

```ts
type QueueContinuationTicket = {
  kind: "queueHandoff";
  reason: GoalQueueSteeringReason;
  goalId: string;
  queueId: string;
  queuedGoal: QueuedGoal;
  queueRevision: number;
  sourceQueueId?: string;
  triggerTurn?: boolean;
  deliverAs?: "steer" | "followUp";
  force?: boolean;
};
```

`decideTerminalContinuationTicket(goal, queue, opts)` should snapshot `queue[0]` and `getQueueRevision()` via an options/deps parameter or a new wrapper in terminal-workflow. Keep pure helpers pure where practical.

### Terminal workflow barrier

`processTerminalGoalWorkflow` order becomes:

1. Decide/capture continuation envelope from current goal + queue + queue revision + `goal.sourceQueueId`.
2. Run post-completion actions safely.
3. After navigation/action completion, repair queue state:
   - consume `sourceQueueId` if it reappeared;
   - restore captured queued head if queue handoff ticket exists and the head disappeared due to automated navigation;
   - persist repair events.
4. Sync UI.
5. Revalidate envelope against repaired state/revision.
6. Dispatch exactly one fresh queue handoff.

### Queue steering validity

`sendQueueSteering` details should include:

```ts
details: { kind: "queueNext", promptId, queueId, queueRevision, reason, createdAt }
```

`queueSteeringStillValid` should require:

- details.queueId is string;
- details.queueRevision is number;
- current queue head id matches queueId;
- current `getQueueRevision()` matches details.queueRevision.

Legacy queue-steer messages without revision should be invalid. This prevents old branch steers from being selected as latest valid after repair.

### Tool update timing

Do not call `processTerminalGoalWorkflow` synchronously from inside `update_goal` tool execution when the terminal workflow may call `navigateTree`.

Preferred implementation:

- `updateGoalFromTool` persists the status update and returns the tool result.
- `handleToolResult` already marks `activeTurn.completedGoal` for successful `update_goal` completion.
- `turn_end` `finishTurnGoal` runs `processTerminalGoalWorkflow` after the tool result is part of the turn lifecycle.
- Remove or narrow `queueHandoffAfterToolUpdate` so it does not run context reset/navigation from the tool execute path. If a non-turn tool path still needs support, schedule a delayed terminal workflow with an explicit guard that waits for idle/no pending messages.

This is the main implementation mitigation for Codex `No tool call found for function call output ...` errors.

## Deferred/non-goals

```toon
toon.version: 1
deferred[4]{id,item,reason}:
  "d1","make clear context default-on again","requires future proof that clear has distinct value and queue-safe behavior"
  "d2","global durable queue outside tree semantics","manual tree navigation should remain branch-local"
  "d3","large redesign of Pi session tree APIs","ISSUE-045 can repair within extension state/events"
  "d4","support arbitrary queue reordering repair","first fix should refuse ambiguous different-head branch state rather than guess"
```

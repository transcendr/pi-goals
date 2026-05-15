# 04 — Patch sequence

## Preconditions

1. Worktree reviewed with `git status --short --untracked-files=all`.
2. Run required baseline before substantial implementation:

```bash
sentrux gate --save .pi/extensions/goal
```

3. Do not introduce TypeScript escape-hatch casts in `.pi/extensions/goal`.
4. Keep changes modular; do not move unrelated responsibilities into `lifecycle.ts` or `tools.ts`.

## Ordered patch plan

### Phase 1 — Red probes first

Create deterministic failing probes before changing implementation:

- `.ai/validation/goal-context-reset-clear-default-off-probe.mjs`
- `.ai/validation/goal-context-reset-queue-payload-repair-probe.mjs`
- `.ai/validation/goal-queue-steer-generation-probe.mjs`
- `.ai/validation/goal-queue-manual-tree-replay-probe.mjs`
- `.ai/validation/goal-model-tool-enqueue-start-once-probe.mjs`

Expected initial state: these probes fail or cannot import missing helpers. Keep them focused on domain behavior with minimal fakes.

### Phase 2 — Clear default-off flag

Files:

- `.pi/extensions/goal/feature-flags.ts`
- `.pi/extensions/goal/context-reset.ts`
- `.ai/validation/goal-post-completion-feature-flag-probe.mjs`
- new `.ai/validation/goal-context-reset-clear-default-off-probe.mjs`
- README if docs are updated in same pass

Steps:

1. Add `contextResetClear` to `GoalFeatureFlags`.
2. Add default-off parser helper for `PI_GOAL_CONTEXT_RESET_CLEAR`.
3. Update `createContextResetActionRunner` to skip clear when disabled before capability checks or `navigateTree`.
4. Extend skipped result messaging so clear-disabled is visible.
5. Update feature flag probe and new clear-default-off probe.

Validation after phase:

```bash
node .ai/validation/goal-post-completion-feature-flag-probe.mjs
node .ai/validation/goal-context-reset-clear-default-off-probe.mjs
```

Rollback: revert feature flag and context-reset changes together; do not leave `GoalFeatureFlags` shape mismatched with `index.ts` composition.

### Phase 3 — Queue origin metadata

Files:

- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/queue-tools.ts`
- `.ai/validation/goal-model-tool-enqueue-start-once-probe.mjs`

Steps:

1. Add optional `sourceQueueId?: string` to `GoalState`.
2. Parse/persist it in `state.ts` with strict optional string handling.
3. In `queue-tools.ts createAndDequeueQueuedGoal`, set `sourceQueueId: next.queueId` on the created goal.
4. Ensure result details still show started queue item unchanged.

Validation after phase:

```bash
npm run typecheck:goal
node .ai/validation/goal-model-tool-enqueue-start-once-probe.mjs
```

Rollback: remove field and parser together if typecheck fails; do not leave persisted state parser accepting field without creation path.

### Phase 4 — Queue revision and repair API

Files:

- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/types.ts` if shared event types move there
- new queue repair probes

Steps:

1. Extend queue runtime state with `revision`.
2. Increment revision on every queue event replay/mutation: enqueue, dequeue, remove, repair.
3. Add `getQueueRevision()`.
4. Add repair event kind, recommended `repairHead`, to insert an exact queued goal at the head during automated reset repair.
5. Add `restoreQueueHeadForRepair(pi, queuedGoal, reason)` with guards:
   - no-op if current head already matches;
   - refuse if current queue has a different head;
   - preserve exact queueId/objective/template/budget/action metadata;
   - mutate runtime and persist repair event atomically.
6. Add `consumeQueueIdForRepair(pi, queueId, reason)` to remove a reappeared source queue item and persist a dequeue/repair consume event.
7. Add branch summary helper to detect current-branch terminal queue events for a queue id if needed by restore guards.

Validation after phase:

```bash
node .ai/validation/goal-context-reset-queue-payload-repair-probe.mjs
node .ai/validation/goal-queue-manual-tree-replay-probe.mjs
npm run typecheck:goal
```

Rollback: revert queue-state event parser/runtime revision changes together. Do not ship a new event kind that replay cannot parse.

### Phase 5 — Snapshot-bearing continuation envelope

Files:

- `.pi/extensions/goal/continuation-ticket.ts`
- `.pi/extensions/goal/terminal-workflow.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/queue-tools.ts`

Steps:

1. Expand queue handoff ticket to include queued head snapshot, queue revision, and optional `sourceQueueId`.
2. Keep ticket decision pure where possible; pass queue revision in options or create an envelope in `terminal-workflow.ts` after pure ticket decision.
3. Update revalidation to check current head id and revision after repair.
4. Update dispatch to pass through to queue steering unchanged except with revision-aware state.
5. Update compaction and dequeue call sites to build tickets with the new shape.

Validation after phase:

```bash
node .ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs
node .ai/validation/goal-context-reset-queue-payload-repair-probe.mjs
npm run typecheck:goal
```

Rollback: if compaction probes fail, revert ticket shape and fix call sites before proceeding; do not mix old/new ticket formats.

### Phase 6 — Terminal workflow repair barrier

Files:

- `.pi/extensions/goal/terminal-workflow.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/continuation-ticket.ts`
- `.ai/validation/goal-context-reset-queue-payload-repair-probe.mjs`
- `.ai/validation/goal-model-tool-enqueue-start-once-probe.mjs`

Steps:

1. In `processTerminalGoalWorkflow`, capture the envelope before actions.
2. Run post-completion actions.
3. Call repair helper after actions and before UI sync/revalidation:
   - consume `input.goal?.sourceQueueId` if it reappeared;
   - restore queued head snapshot if ticket requires queue handoff and current queue lost it due to navigation;
   - if current queue has a different head, skip restore and warn/log rather than reorder.
4. Revalidate repaired envelope.
5. Dispatch one queue handoff.
6. Ensure action failure path still dispatches queue handoff without repair if navigation did not happen.

Validation after phase:

```bash
node .ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs
node .ai/validation/goal-context-reset-queue-payload-repair-probe.mjs
node .ai/validation/goal-model-tool-enqueue-start-once-probe.mjs
```

Rollback: disable repair helper calls if they cause duplicate queue items; keep tests failing rather than shipping duplicate handoff risk.

### Phase 7 — Queue steering generation suppression

Files:

- `.pi/extensions/goal/queue-steering.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.ai/validation/goal-queue-steer-generation-probe.mjs`

Steps:

1. Include `queueRevision` in `pi-goal-queue-steer` details.
2. Make `queueSteeringStillValid` require matching current queue revision.
3. Treat legacy queue steers without revision as invalid.
4. Ensure dequeue/start/repair increments revision before fresh handoff is sent.
5. Ensure `lastQueueHandoffKey` includes revision to avoid suppressing a valid fresh repair handoff because an old queueId key matches.

Validation after phase:

```bash
node .ai/validation/goal-queue-steer-generation-probe.mjs
node .ai/validation/goal-model-tool-enqueue-start-once-probe.mjs
npm run typecheck:goal
```

Rollback: if queue steering disappears entirely, inspect revision mismatch before broad revert.

### Phase 8 — Defer terminal workflow out of tool execution

Files:

- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/lifecycle.ts` if a small pending-terminal marker is needed
- `.ai/validation/goal-model-tool-enqueue-start-once-probe.mjs`

Steps:

1. Remove direct/synchronous navigation-capable terminal workflow from `queueHandoffAfterToolUpdate`.
2. Preferred: rely on `handleToolResult` + `turn_end` to process completion, because it already marks `completedGoal` for successful `update_goal`.
3. If an out-of-turn completion path is still required, schedule a delayed terminal workflow that checks `ctx.isIdle()` and `!ctx.hasPendingMessages()` before calling `navigateTree`.
4. Ensure `update_goal` tool result returns before any `navigateTree` happens.

Validation after phase:

```bash
node .ai/validation/goal-model-tool-enqueue-start-once-probe.mjs
npm run typecheck:goal
```

Rollback: reintroduce a non-navigation queue handoff only if turn_end cannot cover a path; do not navigate from the tool execute stack.

### Phase 9 — Docs and live protocol

Files:

- `README.md`
- `.ai/docs/live-probe-scenarios/post-completion-context-reset-full-suite.md` or a new ISSUE-045-specific scenario doc
- issue doc required proofs if commands are renamed during implementation

Steps:

1. Document clear gate default-off and env var.
2. Document summarize as the recommended context-reset mode for queue stacks.
3. Add/adjust live probe scenario for summarize queue stack: first goal summarize, queued count-to-2, no Codex error, no stale queue-steer loop, cleanup.

### Phase 10 — Broad validation

Run in order:

```bash
node .ai/validation/goal-context-reset-clear-default-off-probe.mjs
node .ai/validation/goal-context-reset-queue-payload-repair-probe.mjs
node .ai/validation/goal-queue-steer-generation-probe.mjs
node .ai/validation/goal-queue-manual-tree-replay-probe.mjs
node .ai/validation/goal-model-tool-enqueue-start-once-probe.mjs
node .ai/validation/goal-context-reset-action-runner-probe.mjs
node .ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs
node .ai/validation/goal-post-completion-feature-flag-probe.mjs
node .ai/validation/goal-tool-post-completion-actions-schema-probe.mjs
! rg -n 'as unknown as|as any' .pi/extensions/goal
npm run quality:goal
```

Then run the fresh live summarize queue-stack probe and capture transcript under `/tmp`.

## Stop conditions

- Any fix requires private Pi internals or TypeScript escape-hatch casts.
- `update_goal` still triggers `navigateTree` before its tool result settles.
- Queue repair duplicates queued items or reorders an unknown different queue head.
- Live probe still shows `No tool call found for function call output`.
- Live probe still shows repeated stale `pi-goal-queue-steer` branches.

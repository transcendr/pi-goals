# 02 — Live surface research

Command transcript:
- `raw/commands.log`

## Code surfaces

### `.pi/extensions/goal/lifecycle.ts` — edit

Relevant functions/events:
- `registerGoalLifecycle(pi)` registers `session_before_compact`, `session_compact`, `agent_end`, `turn_end`, `message_update`, etc.
- Current pre-compaction handler: `pi.on("session_before_compact", () => { beginGoalCompaction(pi); });`
- Current post-compaction handler: `handleSessionCompact(pi, ctx)` replays goal/monitor/queue state, syncs UI, schedules/cancels monitor, then calls `finishGoalCompaction(pi, ctx)`.
- Current complete-goal queue handoff: `finishTurnGoal(...)` calls `sendQueueHandoff(pi, "goal-complete", { goalId: goal.goalId })` only during normal turn-end completion.

Research finding:
- The pre-compaction handler needs `ctx` and must coordinate active-goal continuation and completed-goal queue-handoff needs before compaction.
- Post-compaction fallback should stay in lifecycle/continuation coordination after replay.

### `.pi/extensions/goal/continuation.ts` — edit

Relevant functions/state:
- `beginGoalCompaction(pi)` marks compaction active, stores deferred active goal id, cancels pending continuation timer, and records `compacting` skip telemetry.
- `finishGoalCompaction(pi, ctx)` clears compaction state and schedules one compacted continuation for active goals.
- `scheduleMaybeContinueGoal(pi, ctx, reason)` creates a one-shot 25ms timer.
- `maybeContinueGoal(...)` permanently skips on `notIdle` and `pendingMessages`.
- `resetContinuationRuntime()` clears pending timers and compaction flags.

Research finding:
- Add a dedicated compaction continuation runtime state machine here, not in lifecycle.
- Return/record send outcomes so retry logic can distinguish sent vs transient skip vs terminal skip.
- Keep the existing created/resumed/agentEnd path stable; do not rewrite it broadly.

### `.pi/extensions/goal/queue-steering.ts` — edit

Relevant functions/state:
- `sendQueueHandoff(pi, reason, opts)` dedupes using `lastQueueHandoffKey` and calls `sendQueueSteering`.
- `sendQueueSteering(pi, reason, opts)` sends `QUEUE_MESSAGE_TYPE` with `{ deliverAs: "steer", triggerTurn: opts.triggerTurn }`.
- Default handoff triggers a turn because `triggerTurn` defaults to true.

Research finding:
- Add an explicit pre-compaction queueing/handoff option or helper that can queue without duplicating normal handoff keys.
- Ensure dedupe state treats pre-compaction and fallback handoff as the same logical queue-head work.

### `.pi/extensions/goal/queue-state.ts` — read/edit if necessary

Relevant function:
- `getQueue()` returns the runtime queue.

Research finding:
- Likely only imported/read by continuation/lifecycle logic to detect completed-goal-plus-queue. No persistence shape change should be needed.

### `.pi/extensions/goal/telemetry.ts` and `.pi/extensions/goal/types.ts` — edit

Relevant current fields:
- `ContinuationReason = "created" | "resumed" | "agentEnd" | "compacted"`
- `ContinuationSkipReason` includes `notIdle`, `pendingMessages`, `notActive`, `budgetLimited`, `safetyCap`, `noProgress`, `floorExhausted`, `budgetExhausted`, `compacting`.
- `GoalTelemetrySnapshot` records `lastContinuationReason` and `lastSkipReason` only.

Research finding:
- Add compaction/prequeue/retry telemetry fields without breaking older telemetry replay:
  - optional fields are safest because existing persisted telemetry lacks them.
  - keep schema version unless migration is needed; optional fields can be replay-tolerant.

### `.ai/validation/` — create/edit

Existing compaction probes:
- `goal-compaction-continuation-probe.mjs`
- `goal-compaction-suppression-probe.mjs`
- `goal-compaction-dedupe-telemetry-probe.mjs`

Research finding:
- Existing probes are source-text checks. Keep them if useful, but add runtime/mocked behavior probes required by ISSUE-042.
- Use exported test hooks already available:
  - `setRuntimeStateForTests` from `state.ts`
  - `setQueueForTests` from `queue-state.ts`
  - `resetContinuationRuntime` from `continuation.ts`

## Pi core read-only dependency

File inspected:
- `~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/agent-session.js`

Important semantics:
- `sendCustomMessage` queues real follow-up/steer messages only when `this.isStreaming` is true; otherwise `triggerTurn` starts immediately and no-trigger appends passive history.
- `_runAutoCompaction` resumes after compaction when `this.agent.hasQueuedMessages()` is true.

Implementation consequence:
- The implementation may not assume source-level `pi.sendMessage` is sufficient. The pre-compaction probe must model/confirm that the selected call path creates real queued work for the compaction window.
- If the pre-compaction path cannot prove queue semantics in a particular state, bounded post-compaction retry becomes the safety net; do not change Pi core.

## Validation surfaces

Commands expected:
- `sentrux gate --save .pi/extensions/goal` before implementation.
- Behavior probes:
  - `node .ai/validation/goal-precompact-active-queue-probe.mjs`
  - `node .ai/validation/goal-precompact-completed-queue-probe.mjs`
  - `node .ai/validation/goal-postcompact-retry-probe.mjs`
  - `node .ai/validation/goal-compaction-prequeue-dedupe-probe.mjs`
- Existing compaction/min-spend/queue probes as regression checks where relevant.
- `npm run quality:goal` after implementation.
- Bounded live probe artifact: `.ai/validation/goal-compaction-prequeue-live-probe-closeout.md`.

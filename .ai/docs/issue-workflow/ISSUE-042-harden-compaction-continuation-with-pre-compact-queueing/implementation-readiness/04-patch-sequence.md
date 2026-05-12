# 04 — Patch sequence

## Preconditions

1. Worktree state is understood. Do not discard unrelated changes.
2. Run and save architecture baseline before implementation:

```bash
sentrux gate --save .pi/extensions/goal
```

3. Keep all implementation changes scoped to `.pi/extensions/goal/` and `.ai/validation/` unless live-probe closeout docs are written.

## Ordered patch plan

### Step 1 — Add runtime behavior probes first

Create failing probes before production edits:

1. `.ai/validation/goal-precompact-active-queue-probe.mjs`
   - Set runtime goal active with `setRuntimeStateForTests`.
   - Reset continuation runtime.
   - Use fake `pi.sendMessage` that records message/options and models whether follow-up/steer was queued.
   - Invoke the pre-compaction API that will be implemented (`beginGoalCompaction(pi, ctx)` after signature change).
   - Assert a hidden `CONTINUATION_MESSAGE_TYPE` message was sent with compaction/prequeue reason details.
   - Assert output includes `PASS goal_precompact_active_queues_followup`.

2. `.ai/validation/goal-precompact-completed-queue-probe.mjs`
   - Set runtime goal complete.
   - Set queue state with one queued item using `setQueueForTests`.
   - Invoke pre-compaction handling.
   - Assert a hidden `QUEUE_MESSAGE_TYPE` queue-handoff/steering message for the queue head is sent and deduped.
   - Include negative cases: no queue => no send; paused/budgetLimited => no send.
   - Assert output includes `PASS goal_precompact_completed_queue_handoff`.

3. `.ai/validation/goal-postcompact-retry-probe.mjs`
   - Use fake ctx with an idle sequence such as `[false, false, true]` and pending sequence such as `[false, true, false]`.
   - Invoke post-compaction fallback scheduling.
   - Use fake timers or bounded async waits to assert transient `notIdle`/`pendingMessages` attempts retry and eventually send.
   - Assert terminal states do not retry indefinitely.
   - Assert output includes `PASS goal_postcompact_retry_transient_skip`.

4. `.ai/validation/goal-compaction-prequeue-dedupe-probe.mjs`
   - Simulate prequeue sent, then session_compact fallback and/or agent_end path.
   - Assert only one logical message is sent for the same `active:<goalId>` or `queue:<queueId>` key.
   - Assert output includes `PASS goal_compaction_prequeue_dedupe`.

These probes may import implementation modules through `jiti` or Node ESM in the same style as existing `.ai/validation` probes. Avoid source-string-only proof except as supplementary assertions.

### Step 2 — Refactor continuation attempt result

Edit `.pi/extensions/goal/continuation.ts`:

1. Add `ContinuationAttemptResult` type local to the module.
2. Split `maybeContinueGoal` into:
   - `attemptContinueGoal(...)` returning `ContinuationAttemptResult`;
   - `maybeContinueGoal(...)` wrapper preserving existing async/scheduled behavior.
3. Ensure existing skip telemetry still records the same reasons.
4. Preserve `scheduleMaybeContinueGoal` public signature and behavior for `created`, `resumed`, and `agentEnd`.

Validation after this step:
- Existing compaction probes should still pass or be updated only if the new behavior supersedes their static expectations.
- Existing queue/min-spend probes should not regress.

### Step 3 — Implement pre-compaction work detection and send

Edit `.pi/extensions/goal/continuation.ts`:

1. Change `beginGoalCompaction` signature to accept `ctx` if needed:
   - `beginGoalCompaction(pi: ExtensionAPI, ctx: ExtensionContext): void`
2. Import/read `getQueue` only if the chosen design keeps work detection in continuation; otherwise pass queue state from lifecycle.
3. Determine compaction work:
   - active goal => active-goal work;
   - complete goal + queue head => queue-handoff work;
   - otherwise none.
4. Cancel stale pending continuation timer for active-goal work.
5. Send hidden pre-compaction message:
   - active: use `buildContinuationPrompt(goal, telemetry)` and `pi.sendMessage` with the proven options.
   - queue: call a queue-steering helper with the proven options.
6. Set `setNextTurnOrigin("auto")` for active continuation before sending.
7. Persist prequeue telemetry.

Edit `.pi/extensions/goal/lifecycle.ts`:
- Change `session_before_compact` registration to pass `ctx` into `beginGoalCompaction`.

### Step 4 — Implement queue-handoff pre-compaction helper/dedupe

Edit `.pi/extensions/goal/queue-steering.ts`:

1. Extend `QueueHandoffOptions` if needed:
   - e.g. `delivery?: "normal" | "preCompact" | "fallback"` and/or `triggerTurn?: boolean`.
2. Preserve existing default behavior for normal handoff.
3. Add a helper or option to send a hidden pre-compaction queue steering message for the queue head.
4. Use the same dedupe key semantics so normal complete handoff, pre-compaction handoff, and fallback handoff cannot duplicate the same queue head.
5. Keep `queueSteeringStillValid` unchanged unless the message detail shape changes; if detail shape changes, update it carefully.

### Step 5 — Implement bounded post-compaction fallback

Edit `.pi/extensions/goal/continuation.ts`:

1. Replace one-shot `finishGoalCompaction(... scheduleMaybeContinueGoal(...))` with fallback-aware logic.
2. Preserve active/complete+queue work descriptor from `beginGoalCompaction`.
3. Add bounded retry scheduling:
   - recommended delays: `100, 250, 500, 1000, 2000` ms;
   - retry only result kinds for `notIdle` and `pendingMessages`;
   - clear timer on sent/terminal/no-longer-needed/max attempts.
4. Add queue-handoff fallback path for completed goal + queue head.
5. Ensure `resetContinuationRuntime()` cancels fallback timer and clears prequeue/dedupe state.

### Step 6 — Extend telemetry/types

Edit `.pi/extensions/goal/types.ts`:
- Add optional telemetry fields for compaction continuation action/key/attempt/final reason.
- Extend reason unions only if needed by telemetry helpers.

Edit `.pi/extensions/goal/telemetry.ts`:
- Add helpers to record prequeue/retry/final state.
- Keep optional-field replay compatibility.

### Step 7 — Run targeted probes and quality gate

Run:

```bash
node .ai/validation/goal-precompact-active-queue-probe.mjs
node .ai/validation/goal-precompact-completed-queue-probe.mjs
node .ai/validation/goal-postcompact-retry-probe.mjs
node .ai/validation/goal-compaction-prequeue-dedupe-probe.mjs
node .ai/validation/goal-compaction-continuation-probe.mjs
node .ai/validation/goal-compaction-suppression-probe.mjs
node .ai/validation/goal-compaction-dedupe-telemetry-probe.mjs
npm run quality:goal
```

### Step 8 — Live probe or skip rationale

Use `.ai/docs/pi-goals-live-probe-testing.md`.

Required artifact:
- `.ai/validation/goal-compaction-prequeue-live-probe-closeout.md`

If live probe is skipped, write explicit rationale explaining why deterministic probes directly exercised prequeue and retry semantics that failed previously.

## Rollback/recovery notes

- If pre-compaction send path duplicates prompts, revert only the prequeue send and keep fallback retry until dedupe is corrected.
- If fallback retry risks infinite/long polling, cap attempts lower and preserve telemetry final reason.
- If queue-handoff dedupe blocks legitimate later queue heads, include queue id in dedupe key and clear/reset dedupe when queue head changes.
- If existing `created`/`resumed`/`agentEnd` behavior regresses, revert helper extraction and keep compaction-specific attempt logic isolated.

## Stop conditions

- No Pi core edits.
- No TypeScript escape-hatch casts in `.pi/extensions/goal`.
- Do not mark complete until the new runtime/mocked probes and `npm run quality:goal` pass.

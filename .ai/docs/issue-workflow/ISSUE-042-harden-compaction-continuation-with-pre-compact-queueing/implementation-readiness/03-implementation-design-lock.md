# 03 — Implementation design lock

## Exact implementation approach

Implement a compaction-continuation state machine inside `.pi/extensions/goal/continuation.ts`, with lifecycle and queue steering as thin collaborators.

### Core shape

Add a compaction work descriptor, conceptually:

```ts
type CompactionContinuationWork =
  | { kind: "activeGoal"; goalId: string }
  | { kind: "queueHandoff"; queueId: string; goalId?: string };
```

Track runtime state, conceptually:

```ts
type CompactionContinuationRuntime = {
  active: boolean;
  work?: CompactionContinuationWork;
  prequeuedKey?: string;
  fallbackTimer?: ReturnType<typeof setTimeout>;
  fallbackAttempts: number;
};
```

Use stable keys:
- active goal key: `active:<goalId>`
- queue handoff key: `queue:<queueId>`

### Pre-compaction behavior

Change lifecycle registration to pass `ctx`:

```ts
pi.on("session_before_compact", (_event, ctx) => { beginGoalCompaction(pi, ctx); });
```

Update `beginGoalCompaction` to:
1. Set compaction active.
2. Inspect `getGoal()` and `getQueue()[0]`.
3. Choose work:
   - active goal => active continuation work;
   - completed goal + queue head => queue handoff work;
   - otherwise no work, but still cancel stale pending continuation if appropriate.
4. Cancel stale pending continuation timer for the active goal.
5. Try to enqueue hidden work before compaction:
   - active goal: build continuation prompt and send it with follow-up delivery semantics so it becomes queued work in Pi's agent queue during compaction.
   - queue handoff: send queue steering/handoff with a pre-compaction option and the same logical dedupe key as normal handoff.
6. Persist telemetry for prequeue attempted/sent/skipped.

Implementation detail:
- The implementation agent must prove the chosen `pi.sendMessage` options create actual queued work in the tested compaction state. If the first option only appends passive history in the mock, do not claim prequeue success; adjust within extension surfaces and rely on fallback only where prequeue is not possible.

### Post-compaction fallback behavior

Update `finishGoalCompaction(pi, ctx)` to:
1. Replay happens in lifecycle before calling `finishGoalCompaction` as today.
2. Clear `active` flag only after preserving the work descriptor.
3. If no work remains needed, clear runtime and return.
4. If prequeue was marked sent for the same key, do not send a duplicate. Optionally schedule a short verification retry only if no pending messages are visible and goal/queue state still needs work.
5. Otherwise call a bounded retry helper.

Add a helper conceptually:

```ts
function scheduleCompactionFallbackRetry(pi, ctx, work, delayMs = 100): void
```

Fallback retry should:
- retry max 5 attempts, e.g. 100ms, 250ms, 500ms, 1000ms, 2000ms, or another documented bounded sequence;
- only retry transient outcomes: `notIdle`, `pendingMessages`;
- send active continuation when active goal remains active and safety caps allow;
- send queue handoff when goal is complete and queue head still matches;
- stop when sent, work no longer applies, status is non-continuable, safety cap applies, or attempts exhausted;
- persist telemetry with final reason.

### Refactor send outcome

Refactor `maybeContinueGoal` internals so continuation attempt can return a typed result instead of only calling `skip`:

```ts
type ContinuationAttemptResult =
  | { kind: "sent" }
  | { kind: "transientSkip"; reason: "notIdle" | "pendingMessages" }
  | { kind: "terminalSkip"; reason: ContinuationSkipReason };
```

Keep public behavior of `scheduleMaybeContinueGoal` unchanged for created/resumed/agentEnd paths, but use the returned result for compaction fallback retries.

### Queue handoff changes

In `.pi/extensions/goal/queue-steering.ts`:
- add an option such as `delivery?: "normal" | "preCompact" | "fallback"` only if needed for telemetry/dedupe;
- keep default existing behavior unchanged;
- expose a helper or option for pre-compaction handoff that uses the same queue-head validity and dedupe key as `sendQueueHandoff`;
- ensure pre-compaction and fallback handoff do not bypass `queueSteeringStillValid` semantics.

### Telemetry changes

In `.pi/extensions/goal/types.ts`, add optional fields to `GoalTelemetrySnapshot`, for example:

```ts
lastCompactionContinuationAction?: "prequeue" | "fallback" | "none";
lastCompactionContinuationKey?: string;
lastCompactionContinuationAttempts?: number;
lastCompactionContinuationFinalReason?: string;
```

In `.pi/extensions/goal/telemetry.ts`, add helper(s):
- `noteCompactionContinuationPrequeued(...)`
- `noteCompactionContinuationRetry(...)`
- `noteCompactionContinuationFinished(...)`

Use optional fields so old telemetry remains replay-compatible.

## Rejected implementation paths

- Do not edit Pi core or depend on private Pi internals.
- Do not replace queue handoff with direct queue dequeue/start logic in the extension. The agent must still classify queue items semantically.
- Do not use an infinite interval/poll loop. Retry must be bounded.
- Do not make all continuation reasons go through the new compaction retry path; keep created/resumed/agentEnd behavior stable except shared helper extraction.
- Do not accept source-regex probes as the primary behavior proof.

## Stop conditions for implementer

Stop and report rather than papering over if:
- no no-core-change send path can be shown to create queued work before compaction, and fallback proof cannot guarantee recovery;
- required probes need TypeScript escape-hatch casts in `.pi/extensions/goal`;
- `npm run quality:goal` fails after reasonable remediation;
- live probe reveals duplicate or stranded prompts after deterministic probes pass.

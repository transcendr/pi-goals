# 03 — Design lock

## Chosen design

Implement ISSUE-039 remediation entirely inside `pi-goals` with two layers:

1. **Primary path: pre-compaction queued continuation/handoff**
   - On `session_before_compact`, detect whether continuation work must survive compaction:
     - current goal status is `active`; or
     - current goal status is `complete` and `getQueue()[0]` exists, meaning queue handoff/next-goal steering is needed.
   - Before compaction rewrites session context, enqueue a hidden follow-up/steering message that becomes a real agent queued message.
   - Rely on Pi core's existing `_runAutoCompaction` post-compaction `agent.hasQueuedMessages()` branch to call `agent.continue()`.
   - The implementation must prove, with a mock/runtime probe, that the pre-compaction action causes Pi/agent queued-message state rather than only appending a passive custom message.

2. **Fallback path: bounded post-compaction retry**
   - Keep a post-compaction recovery path, but make it bounded and retry-aware instead of a single 25ms attempt.
   - Retry only transient skip reasons: `notIdle` and `pendingMessages`.
   - Stop retries when continuation/handoff is sent, goal/queue state no longer needs it, safety caps apply, max attempts/window expires, or a non-transient skip occurs.
   - Persist telemetry with attempts and final reason so future live failures are explainable.

## Locked constraints

- No Pi core change.
- No direct reliance on static string probes as acceptance evidence.
- No duplicate hidden follow-up/queue-handoff when both pre-compaction queueing and post-compaction fallback observe the same work.
- Do not continue paused, cleared, absent, or budget-limited goals after compaction.
- Preserve existing `created`, `resumed`, and `agentEnd` continuation behavior.
- Keep code modular in `.pi/extensions/goal/`; do not collapse queue, lifecycle, continuation, telemetry, and state responsibilities into one file.

## Meaningful alternatives considered

### Alternative A — keep ISSUE-039 post-compaction one-shot scheduling

Rejected. The live repro shows this is insufficient. A single post-compaction attempt can encounter transient not-idle/pending-message state or stale context and then never retry.

### Alternative B — Pi core/API change to expose queue-only extension messages

Rejected by user. The remediation must work within pi-goals extension surfaces and Pi's existing queued-message behavior.

### Alternative C — only add post-compaction retries

Rejected as primary strategy. Retrying improves resilience but does not lean on Pi's own compaction handoff semantics. It remains more timing-sensitive than placing a queued message before compaction and letting Pi core resume queued work after compaction.

### Alternative D — disable compaction or pause goals around compaction

Rejected. Disabling compaction risks provider/context failures; pausing goals violates the goal-continuation invariant.

## Execution-ready status

Execution-ready with one implementation-time proof requirement: the implementation must empirically prove that the chosen pre-compaction send path creates a real queued agent message observed by a mock of Pi's `hasQueuedMessages()`/post-compaction continue behavior. If the first attempted `pi.sendMessage` option only appends passive state or starts immediately, the implementer must adjust within pi-goals extension boundaries until that proof passes; do not change Pi core.

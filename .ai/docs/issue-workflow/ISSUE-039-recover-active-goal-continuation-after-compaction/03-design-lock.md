# 03 — Design lock

Design fork: where should the continuation recovery live?

Options considered:

1. Pi core only: change `ctx.isIdle()` or auto-compaction follow-up behavior and leave `pi-goals` unchanged.
   - Rejected as the first-pass fix. It may be a useful companion improvement, but `pi-goals` owns the active-goal continuation invariant and can use existing compaction lifecycle hooks.
2. Prompt-only reminder in compaction summaries.
   - Rejected. The failure is runtime steering loss; an active persistent goal should not depend on summarized prose after compaction.
3. Make `agent_end` continuation delay longer.
   - Rejected. A larger fixed timeout reduces but does not remove the race; compaction duration is model/provider-dependent and non-deterministic.
4. Add compaction-aware continuation state inside `pi-goals`.
   - Chosen. Track compaction lifecycle, suppress/reroute continuation during compaction, and schedule a post-compaction continuation when a goal remains active.

Locked design:

- Add `session_before_compact` and `session_compact` handling to the `pi-goals` lifecycle.
- Maintain minimal runtime state indicating compaction is in progress and whether active-goal continuation should run after compaction.
- Suppress or defer continuation attempts while compaction is in progress.
- After successful `session_compact`, replay/sync current goal state as needed, then if the goal is still active and no pending messages block continuation, schedule an active-goal continuation.
- Extend continuation telemetry with a compaction-aware reason/skip signal, e.g. `ContinuationReason: "compacted"` and `ContinuationSkipReason: "compacting"` or equivalent names.
- Keep the first-pass implementation in `.pi/extensions/goal/`; mention Pi core `ctx.isIdle()` semantics as a possible upstream companion but do not block the extension fix on it.

Rejected alternatives:

- Rely on `agent.hasQueuedMessages()` in Pi core to kick continuation after compaction; pi-goals direct trigger messages are not guaranteed to be represented there.
- Treat compaction as completion or budget-limited wrap-up; the goal remains active and should continue normally.
- Disable auto-compaction for active goals; that would trade one failure mode for context overflow/provider errors.

Execution-ready assessment:

Execution-ready. The code surfaces are known, the chosen behavior is bounded, and proof rows can fail the current implementation by simulating lifecycle order without reproducing provider flakiness.

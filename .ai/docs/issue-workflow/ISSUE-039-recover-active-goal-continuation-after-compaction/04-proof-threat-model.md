# 04 — Proof threat model

Primary invariant:

If a pi-goal is still active after successful auto-compaction, pi-goals must not silently stop. It must either deliver exactly one effective post-compaction continuation or record a concrete blocking reason such as paused/complete/budget-limited/pending-messages/safety-cap.

False-green risks:

- A test only checks that `session_compact` handlers are registered but not that a continuation actually fires afterward.
- The implementation sends continuation during compaction, where it can race with agent-state replacement, and the test does not model compaction in progress.
- The implementation adds a post-compaction continuation but also leaves the old `agent_end` timer active, causing duplicate prompts or safety-counter churn.
- The new continuation reason is not persisted in telemetry, so future incidents remain opaque.
- The fix only works for manual `/compact`, not auto-compaction after provider errors.
- A live probe passes because the model happens to continue, not because runtime steering is deterministic.
- A Pi core change to `ctx.isIdle()` masks the issue while `pi-goals` still lacks a recovery hook.

Proof strategy:

- Deterministic lifecycle-order probe: simulate an active goal and event order `agent_end -> session_before_compact -> session_compact`; assert no silent stop and exactly one post-compaction continuation.
- Suppression/race probe: with compaction-in-progress flag active and `ctx.isIdle()` returning true, assert `pi.sendMessage()` is not called until compaction completes.
- Dedupe probe: assert old pending `agent_end` continuation plus post-compaction hook cannot emit duplicate continuation messages for the same active goal.
- Telemetry probe: assert compaction deferral/post-compaction scheduling leaves an inspectable reason/skip signal.
- Quality gate: `npm run quality:goal`.
- Bounded live probe: use a disposable active goal and bounded compaction path in `pi-goals-live-probe`; do not rely on reproducing real provider failures or overflowing real context.

Required proof rows to carry into the issue doc:

- `goal_compaction_continuation_probe`
- `goal_compaction_suppression_probe`
- `goal_compaction_dedupe_telemetry_probe`
- `quality_goal`
- `live_probe_or_skip`

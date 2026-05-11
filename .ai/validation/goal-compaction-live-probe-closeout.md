# Live probe closeout — ISSUE-039

SKIPPED: direct live reproduction requires forcing a provider-error/auto-compaction boundary in an interactive Pi session, which is slow and non-deterministic. Deterministic probes cover the required runtime wiring and guard ordering:

- `node .ai/validation/goal-compaction-continuation-probe.mjs` verifies lifecycle hooks for `session_before_compact` / `session_compact`, state replay, and post-compaction scheduling with reason `compacted`.
- `node .ai/validation/goal-compaction-suppression-probe.mjs` verifies compaction suppression is checked before `ctx.isIdle()` and records `compacting` skip telemetry.
- `node .ai/validation/goal-compaction-dedupe-telemetry-probe.mjs` verifies stale pending continuations are cleared before replacement scheduling and telemetry paths remain present.
- `npm run quality:goal` verifies TypeScript, Sentrux, slop guard, and Pi extension load.

# 08 — Validation probe plan for ISSUE-022

This plan expands the canonical issue's `required_proofs[]` rows into concrete probe intent so implementation can add targeted `.ai/validation/*.mjs` scripts without re-deciding the feature contract.

## Probe inventory

### `goal-checkpoint-schema-probe.mjs`

Must fail unless:

- checkpoint custom entry type is distinct from `pi-goal-state`;
- checkpoint records include schema version, `goalId`, `checkpointId`, trigger, timestamp, status, and bounded summary/note fields;
- note/objective/summary excerpts are capped before persistence;
- `GoalState` does not grow an unbounded checkpoint-history array.

### `goal-checkpoint-replay-probe.mjs`

Must fail unless:

- synthetic branch entries replay into a bounded current-goal checkpoint index;
- stale checkpoint entries for other goal ids are ignored or kept out of current-goal summaries;
- latest checkpoint and capped recent-list order are deterministic;
- older branches with no checkpoint entries still replay a normal goal.

### `goal-checkpoint-trigger-dedupe-probe.mjs`

Must fail unless:

- pause, budget-limited transition, completion, and compaction events create checkpoints only once per relevant transition/event key;
- repeated lifecycle handler calls do not create every-turn/checkpoint churn;
- manual checkpoints are not deduped away when explicitly requested.

### `goal-checkpoint-context-bound-probe.mjs`

Must fail unless:

- continuation prompt construction does not inject full checkpoint history;
- monitor prompt/report construction does not include unbounded checkpoint rows;
- any latest-checkpoint context is capped and latest-only.

### `goal-checkpoint-compaction-probe.mjs`

Must fail unless:

- lifecycle registration includes compaction-event handling;
- before/after compaction checkpoint metadata is bounded;
- if compaction instructions are touched, they include only latest-checkpoint/status hints and no full history.

### `goal-checkpoint-not-completion-proof-probe.mjs`

Must fail unless:

- checkpoint presence alone does not let `update_goal(status:"complete")` bypass completion floors;
- once ISSUE-021/ISSUE-015 fields exist, checkpoint presence does not bypass required proof gates or blocking subgoals;
- checkpoint commands/tools never call completion mutation paths.

### `goal-checkpoint-export-probe.mjs`

Must fail unless:

- markdown export happens only through an explicit export command/tool;
- export path is predictable and bounded;
- exported content is derived from replayed checkpoint entries and respects caps;
- normal checkpoint creation does not write repo files.

### `live_probe_or_skip`

Must produce one of:

- live runtime closeout showing `/goal checkpoint` and `/goal history` behavior; or
- explicit deterministic-coverage skip rationale when implementation only adds non-runtime/deterministic surfaces.

## Coverage matrix

```toon
toon.version: 1
probe_coverage[7]{probe,covers_false_green,expected_signal}:
  "schema","state bloat and unbounded notes","PASS checkpoint_schema_bounded_separate_entries"
  "replay","reload/tree branch-local loss","PASS checkpoint_replay_branch_local"
  "trigger_dedupe","every-turn or repeated lifecycle churn","PASS checkpoint_triggers_deduped"
  "context_bound","full history injected into provider prompts","PASS checkpoint_history_not_injected"
  "compaction","no compaction handoff integration","PASS checkpoint_compaction_handoff_bounded"
  "not_completion_proof","checkpoint treated as proof/completion authority","PASS checkpoint_not_completion_proof"
  "export","automatic or unbounded markdown writes","PASS checkpoint_export_explicit_bounded"
```

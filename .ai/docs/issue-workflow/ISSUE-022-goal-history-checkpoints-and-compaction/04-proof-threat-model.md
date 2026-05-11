# 04 — Proof threat model for ISSUE-022

## Primary invariant

Goal checkpoints provide a bounded, branch-replayable, human-readable timeline for handoff/compaction/reload without bloating `GoalState` snapshots or normal provider context, and without weakening completion/proof/subgoal semantics.

## High-risk false greens

1. Checkpoints are implemented as large arrays on `GoalState`, so state snapshots and context bloat over time.
2. Checkpoint replay is not branch-local or loses checkpoints after `/tree`, reload, or compaction.
3. Automatic triggers write checkpoints every turn or repeatedly for the same status transition.
4. Compaction still has no checkpoint/handoff hook, so the feature misses its core use case.
5. History is injected wholesale into continuation/monitor prompts, increasing provider context.
6. Checkpoints falsely act as completion proof or replace ISSUE-021 proof gates.
7. Model-authored note fields store unbounded transcript or sensitive content.
8. Export writes files automatically or outside a predictable explicit path.

## Proof adequacy

- Deterministic probes are required for schema caps, replay, trigger dedupe, context-bounds, and compaction hooks because those invariants can be tested without live Pi runtime.
- `npm run quality:goal` remains required after implementation because this is a multi-file extension feature touching lifecycle, commands, tools, state replay, and README.
- A bounded live probe should be run or explicitly skipped with rationale because `/goal checkpoint`, `/goal history`, and compaction hooks involve Pi runtime behavior. If deterministic probes fully exercise command/tool replay and no slash runtime behavior changes are made, the executor may record a skip rationale, but the issue should require a visible closeout artifact.

## Required-proof mapping to risks

```toon
toon.version: 1
risk_proofs[8]{risk,required_proof,why_it_fails_false_green}:
  "GoalState bloat","checkpoint_schema_probe","asserts checkpoints are separate bounded custom entries and not full arrays on GoalState"
  "branch replay loss","checkpoint_replay_probe","replays synthetic branch entries and asserts checkpoint counts/latest summaries survive correctly"
  "trigger churn","checkpoint_trigger_dedupe_probe","simulates repeated pause/budget/complete transitions and asserts one checkpoint per transition key"
  "missing compaction handoff","checkpoint_compaction_probe","asserts lifecycle registers before/after compaction handling and creates bounded handoff metadata"
  "provider context bloat","checkpoint_context_bound_probe","asserts continuation/monitor prompts do not include full checkpoint history"
  "completion proof bypass","checkpoint_not_completion_proof_probe","asserts checkpoint presence does not allow update_goal complete when gates/floors block"
  "unbounded notes","checkpoint_schema_probe","asserts note/summary caps and excerpt trimming"
  "automatic file writes","checkpoint_export_probe","asserts markdown export only happens through explicit export command/tool"
```

## Required proof rows for issue doc

The canonical issue should include an importable `required_proofs[]` TOON block with these rows:

- `quality_goal`
- `checkpoint_schema_probe`
- `checkpoint_replay_probe`
- `checkpoint_trigger_dedupe_probe`
- `checkpoint_context_bound_probe`
- `checkpoint_compaction_probe`
- `checkpoint_not_completion_proof_probe`
- `checkpoint_export_probe`
- `live_probe_or_skip`

# 11 — Acceptance traceability for ISSUE-022

## Matrix

```toon
toon.version: 1
acceptance_trace[10]{id,acceptance,issue_section,required_proof}:
  "ac1","manual checkpoint creation works without changing goal status","Desired behavior / Command and model-tool UX","checkpoint_schema_probe"
  "ac2","bounded history lists branch-local checkpoint timeline","Desired behavior / Runtime checkpoint storage","checkpoint_replay_probe"
  "ac3","checkpoints replay after reload/tree navigation","Desired behavior / Runtime checkpoint storage","checkpoint_replay_probe"
  "ac4","full checkpoint history is not appended to GoalState snapshots","Desired behavior / Runtime checkpoint storage","checkpoint_schema_probe"
  "ac5","automatic checkpoints occur only at selected lifecycle boundaries and dedupe repeated events","Desired behavior / Lifecycle triggers","checkpoint_trigger_dedupe_probe"
  "ac6","compaction creates or references bounded handoff summary without replacing Pi compaction","Desired behavior / Compaction-aware handoff","checkpoint_compaction_probe"
  "ac7","normal continuation/provider prompts do not include full history","Desired behavior / Context and export bounds","checkpoint_context_bound_probe"
  "ac8","checkpoints do not satisfy proof gates or completion audits by themselves","Acceptance criteria / Proof threat model","checkpoint_not_completion_proof_probe"
  "ac9","exported markdown is explicit, bounded, and derived from replayed entries","Desired behavior / Context and export bounds","checkpoint_export_probe"
  "ac10","extension quality gate passes after implementation","Required proofs","quality_goal"
```

## Traceability notes

- Every acceptance criterion in the canonical issue has at least one corresponding required proof row.
- The proof rows are adversarial rather than merely structural: each one names a false-green class it should fail.
- README documentation is covered by the implementation checklist and `09-readme-update-plan.md`; implementation may add a static README assertion to `checkpoint_export_probe` or a separate docs probe if the executor wants stricter proof granularity.
- Live runtime validation is represented by `live_probe_or_skip` because slash command/runtime behavior may require an actual Pi probe depending on implementation shape.

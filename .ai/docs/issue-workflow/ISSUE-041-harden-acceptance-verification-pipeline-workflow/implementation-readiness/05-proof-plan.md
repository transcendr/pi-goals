# 05 — Proof and validation plan

## Strengthened primary invariant

ISSUE-041 is green only if runtime and template behavior together prevent acceptance-pipeline drift: queued work continues after complete or budget-limited terminal states, acceptance workers do not invent budgets, the worker runtime is intentionally strong, final reports are sourced from completed item goals, and live transcripts show no mid-run batching.

## Validation sequence

```toon
toon.version: 1
validation_sequence[9]{order,name,command_or_action,pass_condition}:
  1,"pre_change_architecture_gate","sentrux gate --save .pi/extensions/goal","baseline saved before runtime edits"
  2,"targeted_template_contract","node .ai/validation/goal-acceptance-template-contract-probe.mjs","asserts profile/model, no-batch, ledger, no invented budgets, evidence sufficiency, resolver smoke"
  3,"targeted_budget_queue_handoff","node .ai/validation/goal-budget-limited-queue-handoff-probe.mjs","asserts budgetLimited queue handoff and replacement surfaces"
  4,"targeted_complete_queue_handoff","node .ai/validation/goal-complete-queue-handoff-probe.mjs","asserts complete queue handoff uses triggered/deduped path"
  5,"targeted_queue_dedupe","node .ai/validation/goal-complete-queue-dedupe-probe.mjs","asserts dedupe key includes reason goal id queue id"
  6,"existing_floor_probe","node .ai/validation/goal-min-spend-floors-probe.mjs","guards prior floor/budget behavior after lifecycle/tool edits"
  7,"quality_gate","npm run quality:goal","full required project quality gate passes"
  8,"live_acceptance_pipeline_probe","bounded Solo/Pi run with at least twelve criteria and strong worker profile/model","transcript proves one-by-one item goals, no invented budgets, no manual continuation, no mid-run batching, cleanup complete"
  9,"final_visibility","git status --short --untracked-files=all && git check-ignore -v <artifact> || true","issue/artifacts/proofs visible and not accidentally ignored"
```

## Required proofs TOON for implementation closeout

Use this proof contract after implementation. If command names are changed, update the issue through an auditable proof-row replacement rather than silently using a different proof.

```toon
toon.version: 1
required_proofs[9]{name,source,command,pass_condition,scope,notes}:
  "acceptance_template_contract_probe","implementation-ready plan","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-acceptance-template-contract-probe.mjs","exit 0 and asserts no invented budgets mandatory no-batch wording per-item ledger checkpoints ledger-gated final report no aggregate-substitution per-item evidence sufficiency rerun ledger behavior and resolver smoke",run,"must fail if templates allow aggregate shortcuts mid-run batching ceremonial greens or broken rendering"
  "acceptance_worker_profile_probe","implementation-ready plan","cd /Users/bryan/dev/personal/experiments/pi-goals && rg -n -- '--profile solo-researcher-strong|/model opencode-go/glm-5.1|send_model_selection|materialized-args-mode replace|strict-profile' .ai/.pi-goals/verify-acceptance-pipeline.md","exit 0 with worker spawn/profile and model-switch instructions before acceptance prompt send",run,"guards accidental default weak worker runtime"
  "budget_limited_queue_handoff_probe","implementation-ready plan","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-budget-limited-queue-handoff-probe.mjs","exit 0 and asserts budgetLimited with non-empty queue sends effective queue steering and permits next queue item resolution without marking prior goal complete",run,"covers P1 budget ceiling stop with queue remaining"
  "complete_queue_handoff_regression","implementation-ready plan","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-complete-queue-handoff-probe.mjs","exit 0 and asserts complete with non-empty queue triggers effective deduped queue handoff from lifecycle/tool paths",run,"satisfies ISSUE-037 overlap for this stack"
  "queue_handoff_dedupe_probe","implementation-ready plan","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-complete-queue-dedupe-probe.mjs","exit 0 and asserts duplicate terminal observations cannot double-steer the same queue head",run,"guards double start/dequeue risk"
  "no_arbitrary_budget_probe","implementation-ready plan","cd /Users/bryan/dev/personal/experiments/pi-goals && rg -n 'Do not pass token_budget|Do not invent.*budget|Budgets: none|omit budget/floor params' .ai/.pi-goals/verify-acceptance-pipeline.md .pi/extensions/goal/queue-steering.ts","exit 0 with explicit guidance in acceptance prompt and queue steering",run,"guards recurrence of the 20K invented token ceiling"
  "quality_gate","AGENTS.md","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required after runtime/template validation changes"
  "acceptance_pipeline_live_probe","implementation-ready plan","Follow .ai/docs/pi-goals-live-probe-testing.md using a disposable synthetic issue with at least twelve acceptance criteria, then run verify-acceptance-pipeline in a real Pi/Solo worker launched with --profile solo-researcher-strong and switched to /model opencode-go/glm-5.1 before the prompt","transcript shows all criteria enqueued first exactly one verify-acceptance-item concrete goal/result per criterion before final summary no invented budgets no manual continuation prompt no AC-N..AC-M batch proof segment and cleanup leaves no disposable queue/goal residue",live,"directly covers the original failure surface"
  "artifact_visibility","implementation-ready plan","cd /Users/bryan/dev/personal/experiments/pi-goals && git status --short --untracked-files=all && git check-ignore -v .ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/00-intake.md || true","status shows implementation-readiness artifacts visible and check-ignore does not hide workflow artifacts",run,"planning artifact visibility check"
```

## False-green coverage matrix

```toon
false_green_coverage[10]{risk,catching_proof,why_it_fails_if_bug_remains}:
  "static prompt says head-to-tail but live worker batches anyway","acceptance_pipeline_live_probe","long transcript with at least twelve criteria must show no AC-N..AC-M batch proof segment"
  "worker starts with correct behavior but drifts halfway","acceptance_pipeline_live_probe","fixture size and transcript scan catch mid-run batching after initial compliance"
  "template omits no-batch or ledger wording","acceptance_template_contract_probe","static assertions fail on missing NO BATCH CHECKS ledger and final-report preconditions"
  "worker runs default weak profile/model","acceptance_worker_profile_probe and acceptance_pipeline_live_probe","static/template and live transcript must show profile args and model switch before prompt"
  "model invents token budget again","no_arbitrary_budget_probe and acceptance_pipeline_live_probe","prompt/queue steering forbid budget invention and live transcript must show no invented budget params"
  "budgetLimited goal strands queue","budget_limited_queue_handoff_probe and live probe","runtime probe asserts handoff/replacement and live transcript proves continuation without manual clear"
  "complete goal strands queue","complete_queue_handoff_regression and live probe","runtime probe asserts triggered handoff and live transcript proves no stop after item completion"
  "duplicate lifecycle/tool observations double-steer queue","queue_handoff_dedupe_probe","dedupe key assertion fails if helper cannot suppress duplicate same goal/queue/reason"
  "item green is ceremonial or string-only","acceptance_template_contract_probe and live probe","template requires proof plan/sufficiency and live transcript shows per-item evidence before green"
  "quality/type regressions hidden by probes","quality_gate","Sentrux typecheck slop guard and extension load fail if runtime integration is broken"
```

## TOON validation requirement

Changed issue-doc/artifact TOON blocks must decode. During implementation closeout run representative extraction into `/tmp/issue041-toon-*.toon` and validate with:

```bash
npx -y @toon-format/cli --decode /tmp/issue041-required-proofs.toon >/dev/null
npx -y @toon-format/cli --decode /tmp/issue041-implementation-ready.toon >/dev/null
```

If the repo gains a standard TOON validator script before implementation, use that instead and record the command.

## Live probe fallback and recovery

If the live acceptance pipeline probe fails:

- If failure is worker launch/profile/model setup, stop and fix template commands before rerunning.
- If failure is queue continuation, inspect runtime output and the deterministic budget/complete handoff probes; do not paper over with manual `DO NOT STOP`.
- If failure is mid-run batching, strengthen prompt ledger/checkpoints and rerun from a fresh disposable issue.
- If failure is a true Solo/Pi infrastructure outage, report blocked with exact process/status/output evidence and do not mark implementation complete.

## Cleanup requirements

- Remove disposable issue file after live probe.
- Ensure acceptance worker queue is empty or only contains explicitly preserved user work.
- Preserve `/tmp` prompt/output paths in implementation closeout.
- Do not clear/delete unrelated queue items without explicit authorization or satisfied queue-head audit.

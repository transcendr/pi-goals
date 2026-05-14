# 04 — Proof threat model

## Primary invariant

An acceptance-pipeline worker must process acceptance criteria as durable per-item goals and continue its queue after terminal goal states. It must not invent budgets, stop with queued work remaining, substitute one aggregate check for item goals, or mark per-item goals green without sufficient evidence.

## False-green risks

```toon
toon.version: 1
false_green_risks[10]{id,risk,proof_countermeasure}:
  "fg1","Static template text says head-to-tail but the live worker still emits an aggregate report before item goals complete.","live pipeline probe must assert create_goal_from_template/dequeue counts and final report ordering against transcript"
  "fg2","A probe checks queue steering after complete but not after budgetLimited terminal stop.","budget-limited queue handoff probe must cover budgetLimited status with non-empty queue"
  "fg3","Queue steering message is sent but not trigger-effective, so the agent can still idle.","live probe must show a follow-up turn resolves the next queue item without manual prompt"
  "fg4","Fix allows queue progression by auto-completing failed budget-limited goals.","probe must assert budget-limited goal is not persisted as complete merely due to budget exhaustion"
  "fg5","Budget guard prevents template-authored budgets but still allows the model to invent optional budget params during queue steering.","static prompt/queue-steering probe must assert explicit no-invented-budget guidance near budget metadata and template creation steps"
  "fg6","Final report has correct row count but rows are synthesized from the aggregate check instead of concrete item results.","pipeline contract probe must require an item-result ledger and source final rows from captured acceptance_item_result rows"
  "fg7","Item checks are all tiny scripts that prove string presence but not behavior.","item contract probe must require proof plan, sufficiency rationale, direct evidence, and false-green risk ruled out"
  "fg8","Implementation fixes only the acceptance templates but misses the underlying runtime queue bug.","required proofs include both template probes and extension runtime/live queue probes"
  "fg9","Worker follows no-batch instructions at first but drifts into AC-N..AC-M batch proof collection mid-run.","live probe must use a long enough fixture and assert no mid-run batch segment appears"
  "fg10","Live proof accidentally uses a weaker/default worker model and misses the required strong acceptance-agent runtime setup.","template/static and live proofs must verify --profile solo-researcher-strong and /model opencode-go/glm-5.1 before prompt send"
```

## Deterministic proof strategy

Deterministic probes are required for prompt/template contract and runtime state transitions:

- a template contract probe for no-aggregate-substitution, mandatory no-batch loop language, per-item ledger checkpoints, ledger gating, no invented budgets, and evidence sufficiency language;
- a worker profile/model probe for `--profile solo-researcher-strong` and `/model opencode-go/glm-5.1` before prompt send;
- a runtime probe for budget-limited queue handoff and replacement/start permissibility;
- an ISSUE-037-compatible complete queue handoff probe or proof that ISSUE-037 has already landed;
- the standard `npm run quality:goal` gate for runtime changes.

## Live proof strategy

Because the original failure happened in a real spawned Solo/Pi acceptance worker, deterministic/static checks are not sufficient. A bounded disposable live probe is required after implementation:

- create a disposable synthetic issue with at least twelve acceptance criteria so mid-run batching drift can be observed;
- run `verify-acceptance-pipeline` through a real Pi/Solo worker launched with `--profile solo-researcher-strong` and switched to `/model opencode-go/glm-5.1` before the acceptance prompt;
- capture the worker transcript/output;
- assert each criterion produced a concrete `verify-acceptance-item` goal and result before the final summary;
- assert no item goal was created with invented `token_budget`/`time_budget_seconds` values;
- assert no manual prompt is needed for queue continuation;
- assert the transcript contains no AC-N..AC-M batch proof collection segment after initial compliance;
- clean up disposable issue/queue/goal state.

## Required proofs

```toon
toon.version: 1
required_proofs[8]{name,source,command,pass_condition,scope,notes}:
  "acceptance_template_contract_probe","issue doc","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-acceptance-template-contract-probe.mjs","exit 0 and asserts no invented budgets, mandatory no-batch wording, per-item ledger checkpoints, ledger-gated final report, no aggregate-substitution rule, per-item evidence sufficiency, and rerun ledger behavior",run,"must fail if templates allow the observed aggregate shortcut, mid-run batching, or ceremonial item greens"
  "acceptance_worker_profile_probe","issue doc","cd ~/dev/personal/experiments/pi-goals && rg -n -- '--profile solo-researcher-strong|/model opencode-go/glm-5.1|send_model_selection' .ai/.pi-goals/verify-acceptance-pipeline.md","exit 0 with worker spawn/profile and model-switch instructions before acceptance prompt send",run,"guards accidental default weak worker runtime"
  "budget_limited_queue_handoff_probe","issue doc","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-budget-limited-queue-handoff-probe.mjs","exit 0 and asserts budgetLimited with non-empty queue sends effective queue steering and permits next queue item resolution without marking prior goal complete",run,"covers P1 budget ceiling stop with queue remaining"
  "complete_queue_handoff_regression","ISSUE-037","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-complete-queue-handoff-probe.mjs","exit 0 and asserts complete + non-empty queue triggers effective queue handoff",run,"may be satisfied by implementing ISSUE-037 first or in same stack with equivalent probe"
  "no_arbitrary_budget_probe","issue doc","cd ~/dev/personal/experiments/pi-goals && rg -n 'Do not pass token_budget|Do not invent.*budget|Budgets: none' .ai/.pi-goals/verify-acceptance-pipeline.md .pi/extensions/goal/queue-steering.ts","exit 0 with explicit guidance in acceptance prompt and queue steering",run,"guards recurrence of the 20K invented token ceiling"
  "quality_gate","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required after runtime/template validation changes"
  "acceptance_pipeline_live_probe","issue doc","Follow .ai/docs/pi-goals-live-probe-testing.md using a disposable synthetic issue with at least twelve acceptance criteria, then run verify-acceptance-pipeline in a real Pi/Solo worker launched with --profile solo-researcher-strong and switched to /model opencode-go/glm-5.1 before the prompt","transcript shows all criteria enqueued first, exactly one verify-acceptance-item concrete goal/result per criterion before final summary, no invented budgets, no manual continuation prompt, no AC-N..AC-M batch proof segment halfway through, and cleanup leaves no disposable queue/goal residue",live,"directly covers P1-P4 plus follow-up mid-run batching and worker-model observations"
  "artifact_visibility","create-issue-doc protocol","cd ~/dev/personal/experiments/pi-goals && git status --short --untracked-files=all && git check-ignore -v .ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/execution-readiness/00-request.md || true","status shows issue/artifacts visible and check-ignore does not hide workflow artifacts",run,"planning artifact visibility check"
```

## Proof adequacy notes

- `acceptance_template_contract_probe` is not enough by itself because the observed bug was live worker behavior.
- The live probe should be bounded but large enough to catch mid-run drift; skipping it would repeat the exact remaining risk documented in ISSUE-040 closeout.
- The budget-limited queue handoff proof must assert more than message existence: the next queue item must be resolvable without manual clear/resume and without wrongly completing the budget-limited goal.
- The worker model/profile proof is part of acceptance quality, not mere ergonomics, because the follow-up rerun suggests the stronger runtime changed the quality of individual review.

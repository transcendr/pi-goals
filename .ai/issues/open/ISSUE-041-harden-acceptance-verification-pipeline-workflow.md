# ISSUE-041 — Harden acceptance verification pipeline workflow

Status: open — execution-ready
Priority: P1
Owner: pi-goal automation
Created: 2026-05-11
Next best session: focused runtime/template hardening implementation with live probe
Next best session rationale: The first live use of the ISSUE-040 acceptance pipeline exposed concrete workflow and runtime gaps. The issue has grounded root-cause analysis, locked design choices, and required proofs that target the observed failures.
Target bucket: open
Issue kind: remediation
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/open/ISSUE-040-verify-acceptance-pipeline-goal-templates.md`
Depends on:
- `.ai/issues/open/ISSUE-037-goal-queue-auto-continuation-after-complete.md` — complete-status queue handoff root issue; this issue extends the terminal-state handoff invariant to `budgetLimited` and acceptance-pipeline usage.
Related:
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`
- `.ai/issues/fixed/ISSUE-030-queued-goal-steering.md`
- `.ai/issues/fixed/ISSUE-033-resume-processes-queued-goals.md`
- `.ai/issues/fixed/ISSUE-035-multi-item-goal-queue-block.md`
- `.ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md`
- `.ai/docs/pi-goals-live-probe-testing.md`

## Goal

Make the ISSUE-040 acceptance-verification pipeline reliable enough for unattended, criterion-by-criterion verification: no invented per-item budgets, no queue idling after terminal states, no aggregate-verification shortcut, and no ceremonial per-item green results with weak evidence.

## Problem/context

The first real acceptance-pipeline run against ISSUE-036 showed that the templates and runtime were close enough to discover real implementation gaps, but not yet robust enough to trust unattended:

1. The acceptance worker enqueued all per-criterion goals correctly, then created the first concrete item goal with an arbitrary 20K token ceiling. The ceiling was hit immediately and the worker stopped. In a goal queue, a correctly stopped budget-limited goal should still hand off to the next queue item instead of leaving the worker idle.
2. The worker then substituted one broad all-items check for the intended per-item `verify-acceptance-item` queue. It returned an all-green TOON that was later contradicted when forced individual processing found a red item.
3. After the broad TOON, the worker stopped without an effective `pi-goal-queue-steer` continuation until the user manually sent `DO NOT STOP...`.
4. After restart, the worker initially created/dequeued item goals ceremoniously, likely treating the earlier aggregate result as authoritative. When forced to requeue and process individually, it did process per item, but some checks were very thin.

A later user rerun added explicit `NO BATCH CHECKS` / `REPEAT FOR ALL QUEUED GOALS END TO END` language. That improved the beginning of the run, and the individual checks were materially better. However, around AC-11 of 23 the worker again attempted to batch AC-11 through AC-23 for efficiency until the user interrupted with a mandatory stop/restart instruction. That follow-up shows the fix must guard against mid-run drift, not only initial prompt misunderstanding.

The later rerun also used `glm 5.1` with high reasoning, while the earlier run used `gpt 5.5` with low reasoning. The acceptance-worker runtime should therefore be launched with `--profile solo-researcher-strong` and switched to `/model opencode-go/glm-5.1` before the initial acceptance prompt.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/06-final-audit.md`
- Follow-up rerun observation: `.ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/07-followup-rerun-observation.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/raw/commands.log`

## Desired behavior

- Acceptance agents must not pass `token_budget`, `time_budget_seconds`, or floor values when creating per-item goals unless those values are explicitly present in queue metadata or user/template invocation text.
- When a current goal reaches `budgetLimited` and queued items remain, the extension must deliver effective queue steering and allow the next queue item to be resolved without manual `clear_goal` or prompt intervention.
- Complete-status queue handoff from ISSUE-037 must be effective for acceptance workers too: a completed item goal with a non-empty queue should produce triggered queue handoff, not a passive message that can be ignored at stop time.
- The acceptance pipeline's final report must be invalid until every extracted acceptance criterion has a captured `acceptance_item_result` from a completed concrete `verify-acceptance-item` goal.
- Aggregate all-items inspection may help identify evidence surfaces, but it must never substitute for item-goal execution or be used as the source of green rows.
- The prompt must explicitly say `NO BATCH CHECKS` and define processing AC-N..AC-M together as a workflow violation. The worker must create, verify, report, complete, and dequeue one item at a time before moving to the next queued item.
- The per-item loop must include a checkpoint after every item: ledger row complete, concrete item goal complete, orchestration item dequeued, then and only then advance to the next queue head.
- Each item goal must justify evidence sufficiency: a small targeted script is acceptable only when it directly tests the criterion and rules out a named false-green path.
- The acceptance worker should be spawned with `--profile solo-researcher-strong`, then sent `/model opencode-go/glm-5.1` before the initial acceptance prompt.

## Grounded research findings

Full research is in `.ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/02-grounded-research.md`.

Key facts:

- No hard-coded `20K`, `20000`, or budget flags were found in `.ai/.pi-goals/verify-acceptance-pipeline.md`, `.ai/.pi-goals/verify-acceptance-item.md`, or ISSUE-040 artifacts. The arbitrary budget appears to be model/tool-choice behavior, not template text.
- `create_goal_from_template` accepts optional `token_budget` and `time_budget_seconds`; queue steering currently shows queued budgets but does not explicitly forbid inventing absent budget values.
- `lifecycle.ts` sends queue steering only for `goal.status === "complete" && completedThisTurn`, and that call does not request `triggerTurn`.
- `lifecycle.ts` transitions exhausted goals to `budgetLimited` but does not queue-steer on `budgetLimited + queue non-empty`.
- `queue-tools.ts` refuses to start the next queued goal if any current goal exists whose status is not `complete`; a `budgetLimited` goal therefore blocks queue progression.
- `verify-acceptance-pipeline.md` says execute item goals head-to-tail, but it does not define a ledger or final-report precondition that invalidates aggregate verification shortcuts.
- `verify-acceptance-item.md` has good false-green guidance, but it can be strengthened with explicit proof-plan and evidence-sufficiency requirements.
- ISSUE-040 closeout explicitly documented the remaining risk: the full end-to-end acceptance-agent loop had not yet been exercised live.
- Follow-up rerun evidence shows explicit no-batch language improves behavior but is insufficient by itself: the worker can drift back to batching halfway through a long queue unless the prompt and proofs include repeated per-item checkpoints.
- Follow-up rerun evidence also suggests worker model/profile matters: `glm 5.1` with high reasoning produced better individual review than the earlier `gpt 5.5` low-reasoning run, so the pipeline should configure the spawned worker intentionally.

## Locked design choices

Full design lock is in `.ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/03-design-lock.md`.

Chosen:

1. Treat `budgetLimited` as terminal enough for queue progression when queued work remains. Do not mark it complete; do permit effective queue handoff and next-item resolution.
2. Add explicit no-invented-budget guidance to acceptance prompt and queue steering: carry budget/floor metadata only when explicitly provided; otherwise omit budget/floor fields.
3. Make acceptance final reports ledger-gated. Every criterion needs a completed concrete item goal and captured row before summary.
4. Strengthen per-item verification with a proof plan, direct evidence, sufficiency rationale, and false-green-risk ruling.
5. Launch the acceptance worker with `--profile solo-researcher-strong`, then send `/model opencode-go/glm-5.1` and verify/allow enough startup/model-switch readiness before sending the acceptance prompt.

Rejected:

- Prompt-only budget-limited queue handling, because current tools block queue start while a non-complete budget-limited goal exists.
- Treating budget exhaustion as success, because a budget-limited goal may be unfinished.
- Banning small scripts, because concise targeted probes can be the right evidence when they cover the invariant.
- Mandating broad expensive gates for every item, because that encourages fake rigor and wastes time.
- Relying on a single up-front no-batch instruction without checkpointing, because the follow-up rerun showed batching can recur mid-run around AC-11 after initial compliance.

## Cascading point rationale

```toon
toon.version: 1
point_resolution[4]{point,classification,fix_strategy}:
  "P1","root","No invented budgets plus budgetLimited queue handoff."
  "P2","root","Ledger-gated final report and explicit no aggregate-substitution rule."
  "P3","cascade/runtime overlap","Implement ISSUE-037-style effective complete queue handoff and extend terminal queue handoff to budgetLimited; preventing aggregate finalization removes one invalid stop point."
  "P4","cascade plus evidence-depth gap","Ledger gating invalidates prior aggregate rows; per-item proof-plan/sufficiency requirements prevent ceremonial greens."
```

## Implementation checklist

### Runtime queue handoff

- [ ] Implement or reuse ISSUE-037 complete-status queue handoff so `complete + queue non-empty` sends effective queue steering with a triggered follow-up turn and dedupe.
- [ ] Add `budgetLimited + queue non-empty` handoff after budget limit/reached/hard-stop transitions.
- [ ] Ensure queue handoff permits the next queued item to be resolved despite the previous goal being `budgetLimited`, without pretending the previous goal is complete.
- [ ] Add dedupe keyed by terminal goal id and queue head id so lifecycle/tool paths cannot double-steer or double-consume the queue.
- [ ] Preserve existing no-queue budget-limited behavior and `/goal resume`/`/goal clear` semantics.

### Acceptance worker launch

- [ ] Update `.ai/.pi-goals/verify-acceptance-pipeline.md` spawn command to launch the worker with `--profile solo-researcher-strong`.
- [ ] Add a ready command and workflow step that sends `/model opencode-go/glm-5.1` to the worker before the initial acceptance prompt.
- [ ] Verify the worker is alive after the model switch before sending the acceptance prompt; use sparse status/output checks consistent with the pipeline's no-timer rule.

### Prompt/template hardening

- [ ] Update `.pi/extensions/goal/queue-steering.ts` to state that absent budget/floor metadata means the agent must not pass budget/floor params when creating the next goal.
- [ ] Update `.ai/.pi-goals/verify-acceptance-pipeline.md` direct prompt with a no-invented-budget rule for item goals.
- [ ] Add a per-item ledger requirement to the acceptance-agent prompt.
- [ ] State that an aggregate all-items check is not a substitute for executing and completing each queued `verify-acceptance-item` goal.
- [ ] Add the explicit mandatory no-batch loop wording: create one item goal, review that point individually, mark red/green/blocked, complete the item goal, dequeue that orchestration item, then move to the next queue head; repeat for all queued goals end-to-end.
- [ ] Add a mid-run anti-drift instruction: if the worker catches itself batching AC-N..AC-M, it must stop, discard that batch shortcut as evidence, return to the first unprocessed item, and resume one-by-one processing.
- [ ] Make final `acceptance_summary` invalid unless every row is sourced from a captured `acceptance_item_result` and the ledger is complete.
- [ ] Update rerun prompt shape to use the same ledger discipline for corrected items.
- [ ] Update `.ai/.pi-goals/verify-acceptance-item.md` with proof-plan, evidence-sufficiency, and weak-evidence rejection requirements.

### Validation

- [ ] Add deterministic probe(s) for acceptance template contract hardening.
- [ ] Add deterministic probe(s) for budget-limited queue handoff and no arbitrary budget propagation.
- [ ] Run `npm run quality:goal` after runtime changes.
- [ ] Run a bounded live acceptance-pipeline probe using `.ai/docs/pi-goals-live-probe-testing.md` and clean up all disposable artifacts/state. The fixture must be large enough to catch mid-run batching drift; use at least 12 acceptance criteria or otherwise prove the transcript has no AC-N..AC-M batch processing segment.

## Acceptance criteria

- Acceptance worker instructions explicitly forbid invented `token_budget`, `time_budget_seconds`, and floor values for per-item goals unless provided by queue/template metadata.
- Queue steering for `Budgets: none` explicitly tells the agent not to supply budget/floor params.
- A budget-limited current goal with queued work triggers effective queue handoff and does not leave the worker idle.
- The next queued item can be resolved after a budget-limited prior goal without manually clearing the goal and without marking it complete.
- Complete-status queue handoff remains effective and deduped.
- The acceptance-agent prompt requires a per-item ledger and forbids final aggregate reporting before all ledger rows are complete.
- The final acceptance report is invalid unless every row is sourced from a captured `acceptance_item_result` produced by the matching concrete item goal.
- Rerun prompts preserve the same ledger and no-aggregate-substitution discipline for corrected items.
- `verify-acceptance-item` requires proof-plan, direct evidence, sufficiency rationale, and false-green-risk ruling for every green result.
- Small scripts are accepted only when they directly test the criterion and the item result explains why they are sufficient.
- Acceptance worker is launched with `--profile solo-researcher-strong`, switched to `/model opencode-go/glm-5.1`, and only then receives the acceptance prompt.
- Live probe transcript shows item goals are created/executed/dequeued one by one, no arbitrary budget is passed, no manual continuation prompt is needed, no mid-run AC-N..AC-M batch shortcut occurs, and final summary is produced only after item rows exist.
- `npm run quality:goal` passes.

## Proof threat model

Full proof threat model is in `.ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/04-proof-threat-model.md`.

Primary invariant: an acceptance-pipeline worker must process acceptance criteria as durable per-item goals and continue its queue after terminal goal states. It must not invent budgets, stop with queued work remaining, substitute one aggregate check for item goals, or mark per-item goals green without sufficient evidence.

High-risk false greens:

- Static prompt checks pass but live worker still aggregates all items.
- Queue steering message exists but no triggered turn occurs.
- Budget-limited goal is incorrectly marked complete to unblock queue.
- Final row count is correct but rows are synthesized from aggregate checks.
- Small scripts prove only string presence while stronger evidence exists.
- Worker behaves correctly at the start but drifts back to batch processing halfway through a long queue.
- Live probe accidentally uses the default/weak worker model and hides the benefits/requirements of the intended strong acceptance-agent profile.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,kind,goal}:
  "ISSUE-041","open — execution-ready","remediation","harden acceptance pipeline against invented budgets queue idling aggregate shortcuts and weak per-item greens"

feature_memory[8]{id,fact}:
  "fm1","ISSUE-040 added verify-acceptance-pipeline and verify-acceptance-item templates"
  "fm2","first live run against ISSUE-036 exposed behavior not caught by static/template resolver checks"
  "fm3","no 20K budget value exists in acceptance templates or ISSUE-040 docs"
  "fm4","lifecycle currently queue-steers only on complete turn-end and not budgetLimited terminal state"
  "fm5","start_queued_goal blocks when current goal status is budgetLimited"
  "fm6","ISSUE-037 already tracks complete-status queue auto-continuation"
  "fm7","follow-up rerun showed explicit NO BATCH CHECKS wording improved behavior but batching recurred around AC-11 of 23"
  "fm8","follow-up rerun used glm 5.1 high reasoning and produced better individual review than the earlier gpt 5.5 low-reasoning worker"

locked_requirements[8]{id,requirement}:
  "lr1","agents must not invent budget or floor params for queued/template goals"
  "lr2","budgetLimited with non-empty queue must hand off effectively to queue processing"
  "lr3","complete with non-empty queue must hand off effectively and dedupe"
  "lr4","acceptance final report requires complete per-item result ledger"
  "lr5","aggregate all-items checks cannot substitute for item goal execution"
  "lr6","green item results require sufficient direct evidence and false-green risk ruling"
  "lr7","acceptance prompt must mandate create-review-result-complete-dequeue one item at a time and forbid AC-N..AC-M batch shortcuts"
  "lr8","acceptance worker must run under solo-researcher-strong and opencode-go/glm-5.1 before receiving the prompt"

implementation_surfaces[7]{id,path,reason}:
  "s1",".ai/.pi-goals/verify-acceptance-pipeline.md","acceptance worker spawn/profile/model setup, prompt, ledger, no aggregate substitution, no invented budgets"
  "s2",".ai/.pi-goals/verify-acceptance-item.md","per-item evidence sufficiency and proof-plan rules"
  "s3",".pi/extensions/goal/queue-steering.ts","queue steering content and triggerTurn semantics"
  "s4",".pi/extensions/goal/lifecycle.ts","terminal status transitions and queue handoff call sites"
  "s5",".pi/extensions/goal/tools.ts","template goal replacement policy and optional budgets"
  "s6",".pi/extensions/goal/queue-tools.ts","start_queued_goal active-status gate"
  "s7","solo-mcp process spawn/send workflow","acceptance worker profile selection and model-switch delivery"

verification_checks[6]{id,check,evidence}:
  "v1","template contract forbids aggregate substitution and invented budgets","goal-acceptance-template-contract-probe"
  "v2","budgetLimited with queued work continues to next queue item","budget-limited queue handoff probe"
  "v3","complete with queued work still continues and dedupes","ISSUE-037 complete queue handoff probe"
  "v4","full acceptance pipeline behaves correctly in live Pi/Solo worker without mid-run batching","bounded live probe transcript with at least 12 criteria"
  "v5","worker launch uses solo-researcher-strong and opencode-go/glm-5.1 before prompt","template contract probe and live transcript"
  "v6","runtime quality remains green","npm run quality:goal"
```

## Required proofs

```toon
toon.version: 1
required_proofs[8]{name,source,command,pass_condition,scope,notes}:
  "acceptance_template_contract_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-acceptance-template-contract-probe.mjs","exit 0 and asserts no invented budgets, mandatory no-batch wording, per-item ledger checkpoints, ledger-gated final report, no aggregate-substitution rule, per-item evidence sufficiency, and rerun ledger behavior",run,"must fail if templates allow the observed aggregate shortcut, mid-run batching, or ceremonial item greens"
  "acceptance_worker_profile_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && rg -n -- '--profile solo-researcher-strong|/model opencode-go/glm-5.1|send_model_selection' .ai/.pi-goals/verify-acceptance-pipeline.md","exit 0 with worker spawn/profile and model-switch instructions before acceptance prompt send",run,"guards accidental default weak worker runtime"
  "budget_limited_queue_handoff_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-budget-limited-queue-handoff-probe.mjs","exit 0 and asserts budgetLimited with non-empty queue sends effective queue steering and permits next queue item resolution without marking prior goal complete",run,"covers P1 budget ceiling stop with queue remaining"
  "complete_queue_handoff_regression","ISSUE-037","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-complete-queue-handoff-probe.mjs","exit 0 and asserts complete + non-empty queue triggers effective queue handoff",run,"may be satisfied by implementing ISSUE-037 first or in same stack with equivalent probe"
  "no_arbitrary_budget_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && rg -n 'Do not pass token_budget|Do not invent.*budget|Budgets: none' .ai/.pi-goals/verify-acceptance-pipeline.md .pi/extensions/goal/queue-steering.ts","exit 0 with explicit guidance in acceptance prompt and queue steering",run,"guards recurrence of the 20K invented token ceiling"
  "quality_gate","AGENTS.md","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required after runtime/template validation changes"
  "acceptance_pipeline_live_probe","issue doc","Follow .ai/docs/pi-goals-live-probe-testing.md using a disposable synthetic issue with at least twelve acceptance criteria, then run verify-acceptance-pipeline in a real Pi/Solo worker launched with --profile solo-researcher-strong and switched to /model opencode-go/glm-5.1 before the prompt","transcript shows all criteria enqueued first, exactly one verify-acceptance-item concrete goal/result per criterion before final summary, no invented budgets, no manual continuation prompt, no AC-N..AC-M batch proof segment halfway through, and cleanup leaves no disposable queue/goal residue",live,"directly covers P1-P4 plus follow-up mid-run batching and worker-model observations"
  "artifact_visibility","create-issue-doc protocol","cd /Users/bryan/dev/personal/experiments/pi-goals && git status --short --untracked-files=all && git check-ignore -v .ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/00-request.md || true","status shows issue/artifacts visible and check-ignore does not hide workflow artifacts",run,"planning artifact visibility check"
```

## Notes

This issue intentionally treats P3 as partly cascading from two runtime terminal-state handoff bugs: the already-open ISSUE-037 complete-status gap and the newly observed budget-limited queue gap. Fixing those runtime roots plus the acceptance ledger contract should remove the need for manual `DO NOT STOP...` intervention in the acceptance pipeline.

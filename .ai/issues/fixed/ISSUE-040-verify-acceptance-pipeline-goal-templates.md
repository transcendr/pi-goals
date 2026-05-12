# ISSUE-040 — Verify acceptance pipeline goal templates

Status: fixed — implemented
Priority: P2
Owner: pi-goal automation
Created: 2026-05-11
Next best session: focused template-authoring and bounded live-validation pass
Next best session rationale: The workflow is a project-local reusable-prompt feature. The implementation should create two `.ai/.pi-goals/` templates, validate discovery/static contracts, and run a bounded live probe; no `.pi/extensions/goal` code change is intended.
Target bucket: open
Issue kind: feature
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: none
Depends on: none
Related:
- `.ai/docs/prompt-template-authoring.md`
- `.ai/.pi-goals/deslop-pipeline.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`
- `.ai/issues/fixed/ISSUE-030-queued-goal-steering.md`
- `.ai/issues/fixed/ISSUE-035-multi-item-goal-queue-block.md`
- `.ai/issues/open/ISSUE-038-bound-goal-template-autocomplete-discovery.md`
- `.ai/docs/pi-goals-live-probe-testing.md`

## Goal

Create two reusable `.ai/.pi-goals/` templates for independent acceptance verification of implemented issue docs:

1. `verify-acceptance-pipeline` — a higher-order main-agent workflow that spawns and supervises an independent Solo/Pi acceptance agent, monitors it with 90-second sparse polling, receives structured acceptance results, remediates gaps, and loops until all acceptance criteria are green.
2. `verify-acceptance-item` — an inner-loop workflow the acceptance agent uses to verify one acceptance criterion rigorously against the issue doc, implementation evidence, proofs, and false-green risks.

This is goal-template/workflow creation only. No `.pi/extensions/goal` code changes are planned.

## Problem/context

Implemented issues can still false-green when the main implementer verifies its own work. The existing `deslop-pipeline` template shows a useful higher-order pattern for spawning and supervising a separate agent, but its mechanics are not appropriate here:

- this workflow should not use `/boomerang`;
- this workflow should not use Solo timer pairs;
- the acceptance agent needs a direct prompt that teaches it to read an issue doc, enqueue one acceptance-item goal per criterion, run the queue head-to-tail, and report structured results.

The desired workflow adds an independent verifier loop while preserving normal `pi-goals` queue/template semantics.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/06-final-audit.md`
- Implementation closeout: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/07-implementation-closeout.md`
- Qualitative review: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/08-qualitative-review.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/raw/commands.log`
- Implementation proof log: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/raw/implementation-proofs.log`

## Desired behavior

### Main pipeline behavior

A user can run:

```text
/goal verify-acceptance-pipeline -- ISSUE-040
```

or:

```text
/goal acceptance-pipeline -- .ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md
```

The resulting goal instructs the main agent to:

1. Resolve `{{args}}` to a concrete issue doc path.
2. Resolve the current Solo instance/project for this repo with read-only inline context.
3. Spawn one independent Solo/Pi acceptance agent with true agent semantics.
4. Send the acceptance agent a direct prompt, not `/boomerang`.
5. Monitor with a sparse loop:
   - `sleep 90`;
   - `solo-mcp process status`;
   - small bounded `solo-mcp process output` only when status suggests idle/completion/error/blocker or final report capture is needed.
6. Review the acceptance report and independently inspect evidence for any red/blocked item.
7. Remediate gaps/misses itself.
8. Send corrected acceptance item ids and remediation evidence back to the same acceptance agent.
9. Repeat until the acceptance agent returns all green or a real blocker remains.

### Acceptance-agent behavior

The acceptance agent must:

1. Read the issue doc.
2. Extract the `## Acceptance criteria` list in document order.
3. Assign stable ids `AC-1`, `AC-2`, ... in document order.
4. Enqueue every acceptance criterion first, before executing any of them.
5. Use one orchestration objective per item with this exact shape:

   ```text
   create a goal from template `verify-acceptance-item` with args `--issue "<issue-doc-path>" --item-id "AC-N" -- <acceptance criterion text>`
   ```

6. Execute the queue head-to-tail.
7. For each queued orchestration item, route through `create_goal_from_template` rather than treating it as a literal direct goal.
8. Dequeue an orchestration item only after the corresponding concrete `verify-acceptance-item` goal has completed and produced a result.
9. Produce a structured final report for the main agent.

### Inner item behavior

For each acceptance criterion, `verify-acceptance-item` must instruct the acceptance agent to:

1. Read the issue doc and criterion.
2. Identify the user-visible invariant implied by the criterion.
3. Inspect implementation and proof evidence relevant to that invariant.
4. Run targeted non-destructive checks when applicable.
5. Attack likely false-green paths.
6. Return a structured `green`, `red`, or `blocked` result.

## Locked design choices

Full design lock: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/03-design-lock.md`.

### Template files

Create:

- `.ai/.pi-goals/verify-acceptance-pipeline.md`
- `.ai/.pi-goals/verify-acceptance-item.md`

Do not create or modify `.pi/extensions/goal` files for this issue unless implementation discovers a real template-system bug; if that happens, stop and update this issue rather than widening silently.

### `verify-acceptance-pipeline` frontmatter

```markdown
---
description: Spawn and supervise an independent acceptance agent until an implemented issue doc's acceptance criteria all verify green
aliases: acceptance-pipeline,acceptance-verify,verify-acceptance
usage: /goal verify-acceptance-pipeline -- ISSUE-040
examples: /goal verify-acceptance-pipeline -- ISSUE-038; /goal acceptance-pipeline -- .ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 40000
---
```

Required placeholder:

- `{{args}}` — issue selector: issue number, issue id, or issue doc path.

### `verify-acceptance-item` frontmatter

```markdown
---
description: Verify one issue acceptance criterion against implementation evidence with adversarial false-green checks
aliases: acceptance-item,verify-acceptance-criterion,acceptance-check
usage: /goal verify-acceptance-item --issue .ai/issues/open/ISSUE-040-example.md --item-id AC-1 -- acceptance criterion text
examples: /goal acceptance-item --issue .ai/issues/open/ISSUE-038-bound-goal-template-autocomplete-discovery.md --item-id AC-1 -- /goal autocomplete does not recursively scan arbitrary descendants
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
```

Required placeholders:

- `{{issue}}`
- `{{item-id}}`
- `{{args}}`

### Direct acceptance-agent prompt design

`verify-acceptance-pipeline` should include a ready prompt body for the main agent to write to `/tmp` and send with `solo-mcp process send --input`. The prompt must be direct and self-contained. Use this as the minimum content contract:

````text
You are an independent acceptance verification agent for pi-goals.

Issue doc to verify: <resolved_issue_path>
Repository root: <resolved_repo_path>

Your job is read-only verification. Do not modify repository files, stage files, commit, push, publish, or remediate implementation gaps. The main agent owns remediation.

Required workflow:
1. Read the issue doc completely.
2. Extract every row in the `## Acceptance criteria` section in document order. Stop extraction at the next `##` heading. Preserve criterion wording except for stripping markdown bullets/checkbox markers.
3. Assign ids AC-1, AC-2, ... in order.
4. Enqueue all acceptance items first, before executing any item. For each item, enqueue this orchestration objective exactly:
   create a goal from template `verify-acceptance-item` with args `--issue "<resolved_issue_path>" --item-id "AC-N" -- <criterion text>`
5. After all item goals are queued, execute the queue head-to-tail. Do not pause between items unless blocked by safety, missing authority, missing environment, or explicit user instruction.
6. For every queued orchestration item, call `list_goal_templates`, match `verify-acceptance-item`, create the concrete goal with `create_goal_from_template`, complete that concrete goal, then dequeue the orchestration item only after the item result is captured.
7. Treat `verify-acceptance-item` results as evidence, but still compile a final acceptance report yourself.
8. Final report must include a TOON block with `acceptance_summary` and `acceptance_results` rows.

Result statuses:
- green: criterion is independently verified with concrete evidence.
- red: criterion is not met or evidence contradicts it.
- blocked: verification needs missing authority, environment, or unsafe action.

Final report contract:
```toon
toon.version: 1
acceptance_summary{issue,status,total,green,red,blocked,iteration}:
  "<issue>","green|red|blocked",0,0,0,0,1
acceptance_results[0]{id,status,criterion,confidence,evidence,gap,next_action}:
```

If the main agent later sends a correction prompt, re-run only the listed corrected item ids unless the changed files could invalidate previously green rows. Use the same enqueue-all-first then head-to-tail workflow for the rerun.
````

### Correction prompt design

After remediation, the main agent should send the same worker a short direct prompt:

```text
Acceptance rerun iteration <N> for <resolved_issue_path>.

The main agent remediated these acceptance items: AC-2, AC-4.
Changed files/evidence:
- <file or command output path>
- <summary>

Re-read the issue doc and relevant changed files. Enqueue the listed corrected acceptance items first using `verify-acceptance-item`, execute the queue head-to-tail, and produce a fresh `acceptance_summary` / `acceptance_results` report for this iteration. Do not modify repository files.
```

### Sparse polling command shape

The pipeline template should render ready-to-run commands with concrete Solo instance/project values. The workflow must include this cadence and must not use timers:

```bash
sleep 90
solo-mcp --instance <resolved_instance> process status "$ACCEPTANCE_WORKER_ID" --project <resolved_project_id>
solo-mcp --instance <resolved_instance> process output "$ACCEPTANCE_WORKER_ID" --project <resolved_project_id> --lines 40
```

Use `--lines 120 --full` only for diagnostic/final-report capture when the bounded tail is insufficient.

## Implementation checklist

- [ ] Re-read `.ai/docs/prompt-template-authoring.md`, `.ai/.pi-goals/deslop-pipeline.md`, `AGENTS.md`, and relevant Solo docs before editing templates.
- [ ] Create `.ai/.pi-goals/verify-acceptance-pipeline.md` with the locked metadata, read-only inline context resolution, issue selector resolution, ready Solo commands, direct acceptance-agent prompt, sparse polling loop, remediation loop, and completion audit.
- [ ] Create `.ai/.pi-goals/verify-acceptance-item.md` with the locked metadata, read-only snapshots, rigorous item verification workflow, false-green checklist, status decision rules, and structured result format.
- [ ] Ensure the pipeline template does not include `/boomerang`, `timer-pair`, `tlo timer`, `send-seam`, or `check-ms` command patterns.
- [ ] Ensure inline commands are read-only/context-rendering only.
- [ ] Validate `list_goal_templates` shows both templates, aliases, and required placeholders.
- [ ] Run static contract checks from the `required_proofs[]` block.
- [ ] Run `npm run quality:goal` unless the implementation records a clear no-extension-change skip rationale; running it is preferred.
- [ ] Run a bounded live probe against a disposable synthetic issue doc, or record a visible skip rationale.
- [ ] Record implementation closeout under this workflow directory if additional evidence is produced.

## Implementation closeout

Implemented two project-local reusable goal templates:

- `.ai/.pi-goals/verify-acceptance-pipeline.md`
- `.ai/.pi-goals/verify-acceptance-item.md`

Proofs and review notes are recorded in `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/07-implementation-closeout.md`, `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/08-qualitative-review.md`, and `raw/implementation-proofs.log`.

## Acceptance criteria

- `.ai/.pi-goals/verify-acceptance-pipeline.md` exists.
- `.ai/.pi-goals/verify-acceptance-item.md` exists.
- `list_goal_templates` discovers both templates with aliases and required placeholders.
- `verify-acceptance-pipeline` accepts a simple issue selector through `{{args}}` and resolves it to a concrete issue doc path or stops with a clear blocker.
- `verify-acceptance-pipeline` resolves Solo instance/project with read-only inline commands and emits concrete ready-to-run commands.
- The pipeline spawns an independent Solo/Pi acceptance agent with true agent semantics.
- The pipeline sends a direct prompt to the acceptance agent and never uses `/boomerang`.
- The pipeline uses 90-second sparse polling with `process status` and small bounded `process output` reads; it does not use Solo timer pairs or timer-assisted TLO commands.
- The acceptance-agent prompt instructs all acceptance criteria to be enqueued before execution begins.
- Each queued acceptance item uses an orchestration objective that routes through `verify-acceptance-item` with `--issue`, `--item-id`, and criterion text.
- The acceptance agent executes its queue head-to-tail and does not dequeue orchestration items before concrete item verification is satisfied.
- `verify-acceptance-item` performs read-only, adversarial, evidence-based validation for one criterion.
- `verify-acceptance-item` distinguishes `green`, `red`, and `blocked` with concrete evidence and next actions.
- Acceptance-agent final output includes `acceptance_summary` and `acceptance_results` rows.
- Main-agent pipeline instructions require remediation of red rows, rerun of corrected items through the same acceptance agent, and looping until all green or a true blocker remains.
- No `.pi/extensions/goal` code changes are included unless separately justified and this issue is updated.
- Static proof checks and template discovery checks pass.
- A bounded live probe validates the workflow or an explicit skip rationale is recorded.

## Proof threat model

Full proof threat model: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/04-proof-threat-model.md`.

Primary invariant: an implemented issue can be independently acceptance-verified criterion-by-criterion by a spawned Solo/Pi acceptance agent, where each criterion is routed through the `verify-acceptance-item` reusable goal template, all item results are reported structurally, and the main agent remediates/rechecks gaps until every acceptance row is green.

Likely false greens:

- Templates exist but the pipeline self-verifies instead of spawning an independent agent.
- Acceptance agent validates ad hoc and does not enqueue every criterion first.
- Queue items bypass `verify-acceptance-item`.
- `/boomerang` or Solo timer pairs are copied from `deslop-pipeline`.
- Polling reads too much output too often or misses final report capture.
- Inner item template returns vague green without implementation/proof evidence.
- Main agent trusts worker prose without independently inspecting/remediating red/blocked rows.
- Issue selector resolution picks the wrong issue.
- Static text looks right but live queue/process behavior fails.

## TOON synthesis

```toon
toon.version: 1
issue{id,title,status,goal}:
  "ISSUE-040","Verify acceptance pipeline goal templates","open — execution-ready","add two reusable templates for independent acceptance verification of implemented issue docs"
locked_requirements[8]{id,requirement}:
  "lr1","create verify-acceptance-pipeline and verify-acceptance-item under .ai/.pi-goals"
  "lr2","pipeline accepts issue selector through args and resolves a concrete issue doc path"
  "lr3","pipeline spawns an independent Solo/Pi acceptance agent and sends a direct prompt"
  "lr4","pipeline uses sleep 90 sparse status-first process monitoring and no boomerang or timer-pair commands"
  "lr5","acceptance agent enqueues every acceptance criterion first as verify-acceptance-item orchestration goals"
  "lr6","acceptance agent executes the queue head-to-tail and reports structured per-item results"
  "lr7","item template verifies one criterion adversarially against issue implementation and proof evidence"
  "lr8","main agent remediates red rows and reruns corrected items until all green or blocked"
implementation_surfaces[4]{id,path,notes}:
  "s1",".ai/.pi-goals/verify-acceptance-pipeline.md","higher-order Solo acceptance-worker supervisor template"
  "s2",".ai/.pi-goals/verify-acceptance-item.md","inner acceptance-criterion verification template"
  "s3",".ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/","implementation closeout and live/static proof artifacts if added"
  "s4",".pi/extensions/goal","no changes planned; stop and update issue if a runtime/template bug is found"
invariants[7]{id,invariant}:
  "inv1","independent acceptance agent verifies instead of main implementer self-verifying"
  "inv2","all acceptance criteria are enqueued before item execution starts"
  "inv3","each item routes through verify-acceptance-item via create_goal_from_template semantics"
  "inv4","acceptance worker remains read-only; main agent owns remediation"
  "inv5","no boomerang or Solo timer-pair/timer-assisted monitoring is used"
  "inv6","green requires concrete evidence that would fail if the criterion were false"
  "inv7","blocked requires an explicit authority environment or safety reason"
verification_checks[6]{id,check,evidence}:
  "v1","template files and metadata exist","static file/frontmatter check"
  "v2","forbidden boomerang and timer patterns are absent","static rg check"
  "v3","pipeline contract includes direct send sparse polling item routing and retry loop","static rg check"
  "v4","item contract includes issue/item placeholders false-green checks and structured result","static rg check"
  "v5","templates are discoverable by pi-goal tooling","list_goal_templates output"
  "v6","real Pi/Solo queue/process flow works or skip rationale is recorded","bounded live probe closeout"
```

## Required proofs

```toon
toon.version: 1
required_proofs[7]{name,source,command,pass_condition,scope,notes}:
  "template_files_exist","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && test -f .ai/.pi-goals/verify-acceptance-pipeline.md && test -f .ai/.pi-goals/verify-acceptance-item.md","exit 0",run,"both reusable goal templates exist under the bounded .ai/.pi-goals root"
  "forbidden_patterns_absent","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && ! rg -n '/boomerang|timer-pair|tlo timer|timer_pair|check-ms|send-seam' .ai/.pi-goals/verify-acceptance-pipeline.md","exit 0 and no forbidden boomerang/timer-assisted patterns are present",run,"the template may say not to use timers in prose only if this grep remains clean for concrete timer commands"
  "pipeline_contract_static","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && rg -n 'verify-acceptance-item|sleep 90|process status|process output|process send|ACCEPTANCE_WORKER_ID|acceptance_summary|corrected acceptance' .ai/.pi-goals/verify-acceptance-pipeline.md","exit 0 with matches for item-template routing sparse polling direct send worker id final report and retry loop",run,"guards the higher-order workflow contract"
  "item_contract_static","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && rg -n 'acceptance_item_result|false-green|green|red|blocked|targeted|proof|implementation' .ai/.pi-goals/verify-acceptance-item.md && rg -nF '{{issue}}' .ai/.pi-goals/verify-acceptance-item.md && rg -nF '{{item-id}}' .ai/.pi-goals/verify-acceptance-item.md && rg -nF '{{args}}' .ai/.pi-goals/verify-acceptance-item.md","exit 0 with matches for placeholders adversarial verification and structured item result",run,"guards inner-loop validation rigor"
  "template_discovery","issue doc","Use the pi-goal list_goal_templates tool from /Users/bryan/dev/personal/experiments/pi-goals","output lists verify-acceptance-pipeline and verify-acceptance-item with aliases and required placeholders args for pipeline and args issue item-id for item",live,"tool-level proof because template discovery is exposed through the extension rather than a package script"
  "quality_goal_no_extension_regression","AGENTS.md","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required if implementation unexpectedly touches .pi/extensions/goal; still useful as a final package safety gate"
  "acceptance_pipeline_live_probe","issue doc","Follow .ai/docs/pi-goals-live-probe-testing.md with a disposable synthetic issue doc containing two trivial acceptance criteria, run verify-acceptance-pipeline against it in a real Pi/Solo session, then clean up","transcript shows an acceptance agent is spawned, item goals are queued through verify-acceptance-item, final report is all green, and no disposable goal/queue residue remains; if skipped, closeout records explicit rationale",live,"validates real queue steering and direct process input behavior"
```

## Non-goals

- Do not implement durable proof-gate runtime support from ISSUE-021.
- Do not change queue runtime semantics.
- Do not add extension code under `.pi/extensions/goal` unless a real blocker is discovered and this issue is revised.
- Do not publish these project-local templates as package user-facing README features unless a later release/docs issue chooses to do so.
- Do not make the acceptance agent remediate code.

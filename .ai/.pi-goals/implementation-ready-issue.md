---
description: Transform one or more execution-ready issue docs into implementation-ready issues with exact patch plans, validation plans, and durable readiness artifacts
aliases: implementation-ready,impl-ready,ready-to-implement,issue-implementation-ready,cird
usage: /goal implementation-ready -- issue 001 through 004
examples: /goal implementation-ready -- 1-4; /goal impl-ready -- ISSUE-001,ISSUE-004; /goal cird -- issue 004
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
Take the resolved issue docs from **execution-ready** to **implementation-ready**.

Implementation-ready means each issue has direction **and** implementation details predesigned: exact implementation surfaces, patch boundaries, edit order, validation order, proof expectations, fallback/rollback notes, and a clear handoff so a future implementation agent can implement without choosing architecture, ownership, or patch strategy.

<implementation_ready_request>
  <issue_selector>{{args}}</issue_selector>
</implementation_ready_request>

<resolved_issue_context>
!`ISSUE_SELECTOR=$(cat <<'PI_GOAL_ISSUE_SELECTOR'
{{args}}
PI_GOAL_ISSUE_SELECTOR
) ISSUE_ARTIFACT_ROOT=.ai/docs/issue-workflow ISSUE_ARTIFACT_SUBDIR=implementation-readiness ISSUE_ARTIFACT_FIELD=readiness_dir ISSUE_STACK_PREFIX=implementation-ready python3 .ai/.pi-goals/scripts/resolve_issue_docs.py`
</resolved_issue_context>

Use the resolved issue context above as the issue stack source of truth.

If `resolution.status` is `unresolved`, do not create implementation-readiness artifacts or edit issue docs. Ask exactly one focused clarification that names the missing or ambiguous selector and use the rendered `available_issues[]` rows to help the user answer.

If `resolution.status` is `resolved`, process every row in `issues[]` in the rendered order. Do not silently skip any resolved issue.

Use these definitions:

- `execution-ready`: product/API/architecture/workflow direction is locked; implementation can proceed without unresolved direction-setting decisions, but exact patch sequence may still be designed live.
- `implementation-ready`: direction and implementation details are predesigned; a future implementation agent can apply the planned patch sequence without deciding file ownership, architecture, edit order, validation strategy, or proof shape.

Use `$feature-workflow-pipelines` as the governing workflow, but run the heavier **implementation-planning** extension described here. This workflow starts only after each selected issue is execution-ready. If an issue is not actually execution-ready, do not fake progress; report the missing execution-readiness gates and update or route that issue for refinement instead of marking it implementation-ready.

## Cardinality rule

Before closeout, reconcile these counts from `<resolved_issue_context>`:

- `resolution.resolved_count`;
- implementation-readiness issue writeback count;
- final audit issue rows count.

All counts must match. If they do not match, stop and repair the missing issue processing before reporting completion.

## Mandatory protocol-read rule

1. Read `AGENTS.md`.
2. Read each resolved issue doc fully.
3. Read linked transcript artifacts and related planning docs named by each issue when present.
4. Read or use freshly available `$feature-workflow-pipelines` references for canonical issue docs, execution-vs-implementation planning, research, design locking, TOON synthesis, and proof threat modeling.
5. If this workflow changes or authors `.ai/.pi-goals/*`, read `/Users/bryan/dev/personal/experiments/pi-goals/.ai/docs/prompt-template-authoring.md` first.
6. If an issue involves agent-facing CLI/helper outputs, use `$axi` and `$axi-toon-cli` expectations for valid, compact TOON and structured errors.

Record the exact files/resources read in each issue's `01-protocol-read.md` artifact.

## Per-issue artifact requirements

For each resolved issue row, create durable transcript artifacts under the rendered `readiness_dir` path. The path must be nested under the issue workflow directory as `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/implementation-readiness/`, not under a top-level `.ai/docs/implementation-readiness/` directory.

Required artifacts per issue:

- `00-intake.md` — parsed selector, issue path, issue row, execution-ready gate result, and artifact directory.
- `01-protocol-read.md` — exact files/resources read and extracted requirements.
- `02-live-surface-research.md` — live code/docs/tooling research with commands/files inspected and findings.
- `03-implementation-design-lock.md` — exact implementation approach, meaningful alternatives considered, chosen path, rejected/deferred alternatives, and unresolved forks if any.
- `04-patch-sequence.md` — ordered patch plan with file-by-file edits, dependencies, preconditions, and rollback/recovery notes.
- `05-proof-plan.md` — strengthened proof threat model, validation sequence, required proof rows, and false-green coverage.
- `06-issue-writeback.md` — issue sections changed, links added, and status decision.
- `07-final-audit.md` — completion checklist proving every implementation-ready gate.
- `raw/commands.log` — command transcript or copied output for discovery/proof commands.

## Workflow for each issue

### 1. Intake and execution-ready gate

- Verify the issue exists and read it fully.
- Identify current status, goal, locked requirements, non-goals, acceptance criteria, TOON synthesis, proof threat model, and `required_proofs[]` if present.
- Decide whether the issue is truly execution-ready.
- If execution-ready is false, write the intake/protocol/research evidence, update/report the issue as blocked/refinement-needed, and stop without marking it implementation-ready.

### 2. Ground live implementation surfaces

- Inspect the actual files, directories, scripts, tests, configs, schemas, docs, helper commands, and external adapters named or implied by the issue.
- Do not rely on planning prose when live files can be inspected.
- Record exact commands and files inspected.
- Identify surfaces as `edit`, `create`, `read-only dependency`, `validation`, `external/live`, or `deferred`.

### 3. Lock implementation design

- Convert the execution plan into a concrete patch strategy.
- Name exact files to edit/create/delete when knowable.
- Name exact functions/classes/modules/routes/config blocks when knowable.
- Define patch boundaries and order.
- Define what must not change.
- If there is a meaningful implementation fork that would affect public behavior, architecture, ownership, or proof shape, ask exactly one focused owner question or mark blocked. Do not leave the choice to the implementation agent.

### 4. Create the patch sequence

- Write `04-patch-sequence.md` as an ordered checklist.
- Include prerequisites, file-by-file steps, expected intermediate states, validation after major steps, rollback/recovery notes, and stop conditions.
- Distinguish deterministic local commands from live external checks.
- Keep role/session ownership clear if multiple agents or Solo/TLO workers will execute it.

### 5. Harden proof and validation

- Update the proof threat model for the exact implementation plan.
- For each likely false-green outcome, name which proof would fail.
- Add or refine concrete `required_proofs[]` TOON rows when the issue is proof-driven or Solo/TLO-executed.
- Required proof rows should be runnable where possible and include `name`, `source`, `command`, `pass_condition`, `scope`, and `notes`.
- For live runtime/control helpers, deterministic self-tests are unit proof only; require a bounded disposable live probe plus cleanup unless explicitly dry-run/planning-only.

### 6. Write back to the issue doc

Add/update an `Implementation-ready plan` section containing:

- implementation-ready status decision;
- artifact links;
- exact implementation surfaces;
- patch sequence summary;
- validation/proof sequence;
- blocker/fallback policy;
- handoff notes for the implementation agent.

Update status to `implementation-ready` only if all gates pass. If gates fail, keep or set a refinement/blocked status and state exactly what is missing. Preserve prior execution-ready decisions and rejected/deferred alternatives.

### 7. Validate and audit

- Validate any TOON blocks you added or changed with `npx -y @toon-format/cli --decode` or a repository-standard TOON validator.
- Verify artifact visibility with `git status --short --untracked-files=all` and `git check-ignore -v <representative-artifact> || true`.
- Write `07-final-audit.md` for each issue with a prompt-to-artifact checklist.

## Implementation-ready gates

```toon
toon.version: 1
implementation_ready_gates[8]{id,gate,pass_condition}:
  "g1","execution-ready input","issue already has locked scope, non-goals, design choices, acceptance criteria, and proofs"
  "g2","surface map","exact files/modules/commands/configs/tests to touch are named or bounded"
  "g3","patch order","ordered implementation sequence is written and dependencies between steps are clear"
  "g4","validation order","exact validation commands or live proof steps are specified, with prerequisites"
  "g5","false-green coverage","proof threat model explains which proof catches each high-risk false green"
  "g6","blocker policy","remaining unknowns are implementation details or explicitly blocked; no hidden design fork remains"
  "g7","artifact visibility","implementation-readiness transcripts are visible to git/status review"
  "g8","handoff clarity","a future implementation agent can start without choosing architecture, ownership, or patch strategy"
```

## Suggested issue writeback shape

```markdown
## Implementation-ready plan

Status decision: implementation-ready | blocked-before-implementation-ready

Transcript artifacts:

- `.ai/docs/issue-workflow/<ISSUE-NNN-slug>/implementation-readiness/00-intake.md`
- `.ai/docs/issue-workflow/<ISSUE-NNN-slug>/implementation-readiness/01-protocol-read.md`
- `.ai/docs/issue-workflow/<ISSUE-NNN-slug>/implementation-readiness/02-live-surface-research.md`
- `.ai/docs/issue-workflow/<ISSUE-NNN-slug>/implementation-readiness/03-implementation-design-lock.md`
- `.ai/docs/issue-workflow/<ISSUE-NNN-slug>/implementation-readiness/04-patch-sequence.md`
- `.ai/docs/issue-workflow/<ISSUE-NNN-slug>/implementation-readiness/05-proof-plan.md`
- `.ai/docs/issue-workflow/<ISSUE-NNN-slug>/implementation-readiness/06-issue-writeback.md`
- `.ai/docs/issue-workflow/<ISSUE-NNN-slug>/implementation-readiness/07-final-audit.md`

Exact implementation surfaces:

- `<path>` — `<edit/create/validate/read-only>` — `<planned change>`

Patch sequence summary:

1. `<step>`
2. `<step>`

Validation/proof sequence:

1. `<command or live check>` — `<pass condition>`

Handoff notes:

- `<what the implementation agent should do first>`
- `<what must not change>`
```

## Completion standard

- Every resolved issue doc is updated with an implementation-ready plan or an explicit blocked-before-implementation-ready decision.
- Required implementation-readiness transcript artifacts exist for every resolved issue and correspond to real work.
- Any changed TOON blocks decode successfully.
- Each issue final audit maps every implementation-ready gate to concrete evidence.
- Artifact visibility is verified.
- Final response reports the resolved issues, artifact directories, status decisions, commands/files inspected, validation performed, and unresolved blockers if any.

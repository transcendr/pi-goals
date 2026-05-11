# ISSUE-040 issue writeback

## Canonical issue doc written

Path:

- `.ai/issues/open/ISSUE-040-verify-acceptance-pipeline-goal-templates.md`

## Sections written

- Title and front matter:
  - status
  - priority
  - owner
  - created date
  - next best session
  - target bucket/kind/root
  - related issues/docs
- Goal
- Problem/context
- Transcript artifacts
- Desired behavior
- Locked design choices
- Direct acceptance-agent prompt design
- Correction prompt design
- Sparse polling command shape
- Implementation checklist
- Acceptance criteria
- Proof threat model
- TOON synthesis
- Required proofs
- Non-goals

## Key planning truth written back

- Implementation is template/workflow authoring only; no `.pi/extensions/goal` code changes are intended.
- Add two templates:
  - `.ai/.pi-goals/verify-acceptance-pipeline.md`
  - `.ai/.pi-goals/verify-acceptance-item.md`
- `verify-acceptance-pipeline` accepts `{{args}}` as an issue selector and resolves it to an issue doc path.
- The pipeline spawns an independent Solo/Pi acceptance agent and sends a direct prompt.
- The pipeline explicitly avoids `/boomerang` and Solo timer pairs.
- Monitoring is locked to sparse `sleep 90` plus status-first process checks and small output tails.
- The acceptance agent must enqueue every acceptance criterion first, then execute the queue head-to-tail.
- Each item queue objective is orchestration prose that must route through `verify-acceptance-item` via `create_goal_from_template`.
- The inner template verifies one criterion adversarially and emits structured `acceptance_item_result` output.
- The main agent remediates red/blocked gaps and reuses the same acceptance agent to re-run corrected items until all green or blocked.

## Evidence of writeback

Command transcript in `raw/commands.log` verifies:

- issue doc exists;
- required artifact files exist;
- issue doc contains the expected headings, TOON blocks, required proofs, and template names;
- the current worktree shows only this issue-doc/artifact work as untracked.

## Design readiness

Execution-ready status is justified because the issue locks the meaningful design forks:

- two-template architecture instead of one combined template;
- direct prompt instead of `/boomerang`;
- sparse polling instead of timers;
- all-items-first queue discipline;
- read-only acceptance worker with main-agent remediation;
- structured item and final report contracts;
- static, discovery, quality, and live validation proof expectations.

No unresolved product/workflow decisions remain for the implementation session.

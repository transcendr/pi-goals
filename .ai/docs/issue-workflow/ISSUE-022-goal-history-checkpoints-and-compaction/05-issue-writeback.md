# 05 — Issue writeback for ISSUE-022

## Canonical issue written

Wrote canonical open issue:

- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`

The issue was promoted from refine to open after research/design/proof artifacts existed.

## Sections included

- Title
- Status / Priority / Owner / Created / Updated
- Next best session and rationale
- Target bucket and issue kind
- Target repo roots
- Parent issue / Depends on / Related
- Goal
- Problem/context
- Transcript artifact links
- Desired behavior
- Grounded research findings
- Locked design choices and rejected alternatives
- Implementation checklist
- Acceptance criteria
- Proof threat model
- TOON synthesis
- Importable `required_proofs[]` block
- Non-goals

## Design decisions written back

- Checkpoints use a separate branch-replayed custom entry stream, not full arrays on `GoalState`.
- Manual `/goal checkpoint` and model-tool checkpointing are first-class.
- Automatic checkpoints are limited to pause, budget-limited transition, completion, and compaction-adjacent events.
- Extension-built deterministic summaries are authoritative; optional notes are bounded and non-authoritative.
- Full history is never injected into normal provider context.
- Markdown export is explicit and derived from replayed branch entries.
- Compaction hooks create bounded handoff metadata without replacing Pi compaction.

## Artifact links embedded

The issue links to these required artifacts:

- `00-request.md`
- `01-protocol-read.md`
- `02-grounded-research.md`
- `03-design-lock.md`
- `04-proof-threat-model.md`
- `05-issue-writeback.md`
- `06-final-audit.md`
- `07-replay-and-compaction-source-check.md`
- `08-validation-probe-plan.md`
- `09-readme-update-plan.md`
- `10-package-script-proof-check.md`
- `11-acceptance-traceability.md`
- `12-implementation-handoff.md`
- `13-stale-reference-audit.md`
- `14-stack-compatibility-review.md`
- `15-nonimplementation-boundary.md`
- `16-queue-continuation-note.md`
- `17-final-diff-snapshot.md`
- `18-closeout-summary.md`
- `raw/commands.log`

## Finalization actions

- Removed old refine issue path.
- Updated canonical/open planning references and the leverage-order file from the old refine path to `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md` where appropriate.
- Historical transcript artifacts may still mention the old refine path as the source input at the time they were created.
- Visibility checks and final audit are recorded in `06-final-audit.md` and `raw/commands.log`.

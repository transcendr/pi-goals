# 05 — Issue writeback

Canonical issue written:

- `.ai/issues/open/ISSUE-035-multi-item-goal-queue-block.md`

## Sections written

- Front matter/status fields
- Goal
- Problem/context
- Transcript artifact links
- Desired behavior
- Research findings
- Locked design choices
- Rejected alternatives
- Implementation checklist
- Acceptance criteria
- Proof threat model
- TOON synthesis
- Required proofs

## Planning truth written back

- Current `/goal queue` behavior is one rest string -> one enqueue.
- New feature is command-side parsing for clearly marked multi-line list blocks.
- Bulk enqueue is atomic.
- Existing no-arg list and single-objective enqueue behavior must remain unchanged.
- Required proofs include deterministic parser/command coverage, queue regressions, `npm run quality:goal`, and live probe unless explicitly skipped.

## Artifact links embedded

The issue doc links all required workflow artifacts:

- `00-request.md`
- `01-protocol-read.md`
- `02-grounded-research.md`
- `03-design-lock.md`
- `04-proof-threat-model.md`
- `05-issue-writeback.md`
- `06-final-audit.md`
- `raw/commands.log`

## Clarification writeback

After initial drafting, the user clarified that annotations can introduce multi-line goal bodies. The issue doc and design/proof artifacts were updated so `[1]` starts a goal, following non-marker lines remain part of goal 1, and `[2]` starts the next goal.

## Ordered-marker writeback

Updated the issue, design lock, and proof threat model so marker recognition requires start-of-line candidates plus coherent top-level ordering. Embedded example markers are preserved as content when they do not belong to the selected top-level sequence.

## Required live proof writeback

The user clarified that the exact ordered-marker/nested-example test must pass a live probe agent test. The issue required proofs and acceptance criteria now mark this as mandatory and non-skippable.

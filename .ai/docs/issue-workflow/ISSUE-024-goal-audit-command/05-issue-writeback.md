# 05 — Issue writeback

## Canonical issue written

- `.ai/issues/open/ISSUE-024-goal-audit-command.md`

## Source issue promoted from

- `.ai/issues/refine/ISSUE-024-goal-audit-command.md`

## Sections written

- Front matter: status, priority, owner, dates, target bucket/kind, target repo roots, parent/dependencies/related issues.
- Goal and problem/context.
- Transcript artifact links.
- Desired behavior.
- Grounded research findings.
- Locked design choices and rejected/deferred alternatives.
- Implementation checklist.
- Acceptance criteria.
- Proof threat model.
- Valid TOON synthesis.
- Importable `required_proofs[]` TOON block.
- Non-goals.

## Key writeback changes from refine draft

- Locked audit execution as a bounded audit steering prompt plus visible response.
- Added model-tool parity through `audit_goal`.
- Explicitly forbade automatic completion and normal continuation scheduling.
- Locked bounded audit metadata persistence outside full `GoalState` snapshots.
- Corrected stale ISSUE-020 dependency to `.ai/issues/fixed/ISSUE-020-goal-churn-monitor.md`.
- Raised issue to execution-ready open status.

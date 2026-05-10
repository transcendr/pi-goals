# 05 — Issue writeback

## Canonical issue written

- `.ai/issues/open/ISSUE-033-resume-processes-queued-goals.md`

## Sections included

- front matter/status fields
- goal
- problem/context
- desired behavior
- grounded research findings with artifact links
- locked design
- TOON synthesis
- proof threat model
- importable `required_proofs[]`
- acceptance criteria
- implementation checklist
- implementer notes

## Key planning truth written back

- `/goal queue ...` must remain enqueue-only.
- `/goal resume` should act as the explicit queue pump in idle queue-ready states.
- The two target states are no current goal and completed current goal.
- Queue resolution should reuse queue steering rather than extension-side prose parsing.
- Completed-goal replacement safety already exists in `start_queued_goal` and should be preserved.

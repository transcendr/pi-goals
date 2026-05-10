# 05 — Issue writeback

## Canonical issue written

- `.ai/issues/open/ISSUE-034-prevent-unsatisfied-queued-goal-discard.md`

## Sections included

- front matter/status fields
- goal
- problem/incident
- desired behavior
- grounded research findings with artifact links
- locked remediation design
- TOON synthesis
- proof threat model
- importable `required_proofs[]`
- acceptance criteria
- implementation checklist

## Planning truth written back

- The incident was an unsatisfied queue-head consumption caused by zero-argument `dequeue_goal` permissiveness plus overreliance on prompt guidance.
- Prompt guidance alone is rejected as sufficient remediation.
- The locked direction is an auditable, queue-id-specific, satisfaction-evidence-gated consume operation while preserving explicit id-based removal and atomic direct queued start.

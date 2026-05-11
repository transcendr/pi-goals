# 24 — Open-bucket promotion

## Promotion decision

ISSUE-021 was already refined to execution-ready status for the first durable completion proof-gate implementation pass. The current stack item requires remaining refine issues to be moved to `issues/open` once execution-ready.

## Changes made

- Changed canonical issue status from `refine — execution-ready...` to `open — execution-ready...`.
- Changed `Target bucket` from `refine` to `open`.
- Moved canonical issue doc from `.ai/issues/refine/ISSUE-021-goal-completion-proofs.md` to `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`.
- Preserved the existing workflow artifact directory `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/`.

## Rationale

The prior ISSUE-021 refinement artifacts already lock storage, proof execution ownership, condition/freshness policy, tool API direction, lifecycle false-green seams, UI/readme plans, and required proofs. No additional architecture fork was reopened during promotion.

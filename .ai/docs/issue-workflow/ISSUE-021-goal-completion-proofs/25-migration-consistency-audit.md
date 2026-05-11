# 25 — Migration consistency audit

## Scope

Checked the open-bucket promotion for stale canonical-state language after moving ISSUE-021 from `issues/refine` to `issues/open`.

## Findings

- Canonical issue now exists at `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`.
- Old refine issue path is absent, as intended.
- Canonical issue front matter says `Status: open — execution-ready for first proof-gate implementation pass`.
- Canonical issue front matter says `Target bucket: open`.
- TOON issue row was updated from `refine — execution-ready` to `open — execution-ready`.
- Deferred-work note about ISSUE-015 was updated to reflect the current truth: ISSUE-015's nested-child schema is now locked, but subgoal-level proof gates should still wait until ISSUE-015's first implementation lands.

## Historical artifact references

Older artifacts still mention `.ai/issues/refine/ISSUE-021-goal-completion-proofs.md` as the path that was refined at the time. Those are kept as historical transcript evidence rather than rewritten retroactively. The promotion artifact `24-open-bucket-promotion.md` records the path transition.

## Result

No blocking migration inconsistencies remain in the canonical issue.

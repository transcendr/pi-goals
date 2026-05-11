# 36 — Non-implementation final audit

## Scope boundary

This active goal was a `create-issue-doc` refinement/promotion goal, not an implementation goal. The correct completion state is an execution-ready issue in `.ai/issues/open`, with artifacts and proof requirements, not changed extension behavior.

## Files intentionally not modified

No `.pi/extensions/goal/*.ts` source implementation files were edited during the ISSUE-016 promotion pass. Source files were read and cited to ground the issue only.

## Files intentionally modified outside ISSUE-016 artifacts

- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`: new canonical issue doc.
- `.ai/issues/refine/ISSUE-016-goal-idle-tolerant-mode.md`: removed by promotion.
- `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`: dependency reference updated to the new open path.
- leverage-order docs: ISSUE-016 path updated to open in prior promotion artifacts.

## Risk avoided

This prevents accidental partial implementation under a planning/refinement goal and gives the next executor a clean issue with explicit proof obligations.

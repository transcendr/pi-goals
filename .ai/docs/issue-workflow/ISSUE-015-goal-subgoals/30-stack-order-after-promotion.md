# 30 — Stack order after promotion

## Probe

`raw/stack-order-after-promotion-probe.log`

## Result

After promoting ISSUE-015:

- ISSUE-021 is referenced as open in the leverage-order artifact.
- ISSUE-015 is referenced as open in the leverage-order artifact.
- ISSUE-015 is absent from the refine inventory.
- ISSUE-016 remains the next refine issue in the stack.
- Remaining refine count is 9.

## Impact

Continue with `.ai/issues/refine/ISSUE-016-goal-idle-tolerant-mode.md` as the next concrete `create-issue-doc` goal.

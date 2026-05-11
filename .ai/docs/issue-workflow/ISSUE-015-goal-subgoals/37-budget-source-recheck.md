# 37 — Budget source recheck

## Source inspected

- `.pi/extensions/goal/budget.ts`

## Finding

Budget exhaustion is evaluated against the top-level `GoalState` token/time usage. There is no child budget model today, and `canActivateGoal()` refuses non-complete exhausted goals.

## Impact

ISSUE-015's parent-hard-budget invariant remains important: child subgoal budgets/floors may guide child work, but they must never allow work past an exhausted parent budget or bypass top-level budget-limited behavior.

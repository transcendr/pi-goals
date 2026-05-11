# 23 — Types source recheck

## Source inspected

- `.pi/extensions/goal/types.ts`

## Finding

Current `GoalState` still contains only top-level goal fields: `goalId`, `objective`, status, budgets/floors, usage, and timestamps. There are no existing subgoal fields, and `PiGoalStateEvent` persists a `GoalState | null` payload.

## Impact

ISSUE-015's planned optional fields (`subgoals?: GoalSubgoal[]`, `activeSubgoalId?: string`) remain the right compatibility shape. Because events persist full `GoalState` objects, implementation should normalize optional subgoal data at event replay/tool write boundaries rather than assuming historical events have the fields.

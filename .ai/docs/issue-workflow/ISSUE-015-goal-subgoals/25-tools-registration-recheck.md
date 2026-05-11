# 25 — Tools registration recheck

## Source inspected

- `.pi/extensions/goal/tools.ts`

## Finding

`registerGoalTools()` currently wires top-level goal tools plus queue tools directly. The file is already large enough that ISSUE-015's earlier plan to add a separate `subgoal-tools.ts` module remains important: register subgoal tools from `tools.ts` without inlining all child lifecycle logic there.

`create_goal_from_template` is explicitly top-level persistent goal creation. This reinforces that template-backed subgoals need a separate nested resolution path, not a call into the top-level creation tool.

## Impact

No design change. Implementation should add `registerGoalSubgoalTools(...)` or equivalent and keep child template resolution scoped to nested state mutation.

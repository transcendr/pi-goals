# 03 — Design lock

## Owner decision

A focused owner decision was requested because the central architecture fork changes persistence and runtime semantics.

Question: first-release subgoal execution model.

Chosen answer: **Nested child goal runtime inside parent**.

## Options considered

1. **Stateful subgoals only, no nested goal runtime**
   - Pros: smallest change; preserves current single-goal implementation with simple checklist records.
   - Cons: does not satisfy the blocking reusable-workflow use case; child work would still be mostly chat-only.
   - Decision: rejected as too weak for the desired `deslop-pipeline` → `dirty-worktree-cleanup` behavior.

2. **Nested child goal runtime inside parent**
   - Pros: lets a parent goal enter a bounded child objective with its own status/evidence and then return to the parent step; avoids top-level replacement and queue delay.
   - Cons: larger schema/tool/prompt/UI/completion change; must be tightly bounded to avoid becoming full multi-goal orchestration.
   - Decision: chosen.

3. **Separate queued/top-level child goals**
   - Pros: reuses existing queue/top-level goal machinery.
   - Cons: repeats the problem ISSUE-015 is solving: blocking prerequisites either replace the parent or wait behind it; parent resumption becomes fragile.
   - Decision: rejected.

## Locked first-release shape

- Preserve one active top-level `GoalState`.
- Add a bounded child runtime under the active goal, with one-level nesting for the first release.
- A parent may have ordered subgoal records; at most one child subgoal is `active` at a time.
- Child runtime carries its own objective, status, optional budgets/floors/proof references, evidence notes, and return-to-parent instruction.
- Child execution reuses normal model work in the same Pi session; it does not spawn another Pi agent or create a second persistent top-level goal.
- Reusable goal templates may be rendered into a child objective/recipe and stored as trusted template metadata on the subgoal.
- Parent completion is blocked until every blocking subgoal is in an accepted terminal state: `complete`, or `abandoned`/`blocked` only with explicit reason and parent-level escalation evidence.
- First release exposes model tools, not slash commands: `create_goal_subgoal`, `update_goal_subgoal`, `list_goal_subgoals`, and `enter_goal_subgoal`/`exit_goal_subgoal` if separate focus transitions are cleaner during implementation.
- UI shows only the current child and `done/total` summary. Full subgoal details stay in tool responses.

## Rejected / deferred alternatives

- Arbitrary-depth subgoal trees: defer until one-level semantics are proven.
- Separate child sessions or Solo workers: defer to ISSUE-019/parallel-goals style architecture.
- Slash commands such as `/goal subgoal add`: defer until model-tool semantics are stable.
- Progress aggregation from child counts: related to ISSUE-014; first release may show count but must not treat count as proof of completion.
- Durable checkpoints for each child event: related to ISSUE-022; first release should persist compact state/events only.
- Subgoal-specific proof engine: reuse ISSUE-021 once available; do not design a separate proof runner.

## Execution-readiness judgment

Execution-ready for a first nested-child implementation pass if the implementer keeps the one-level boundary and model-tool-first scope. The issue should not be expanded into parallel agents, arbitrary project management, or slash-command polish during first landing.

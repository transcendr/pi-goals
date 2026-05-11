# 13 — Executor handoff

## Canonical issue

- `.ai/issues/open/ISSUE-015-goal-subgoals.md`

## First implementation pass target

Implement one-level, agent-managed child subgoals nested under the active top-level parent goal.

Do **not** expand first pass into:

- arbitrary-depth subgoal trees;
- parallel child agents or child worktrees;
- slash-command subgoal UX;
- top-level queued child goals;
- project-management progress aggregation.

## Locked decisions to preserve

- One active top-level `GoalState` remains the runtime anchor.
- Subgoals are ordered, bounded records on the parent goal.
- At most one child is active at a time for first release.
- Template-backed child workflows render nested child objective/metadata; they must not call top-level `create_goal_from_template` or enqueue the child.
- Parent completion is refused while blocking children are unresolved.

## Highest-risk seam

`completion-gate.ts` already gates candidate complete goals. Subgoal blocking must be added there or in a helper called from there so every parent completion path is covered deterministically.

## Minimum closeout proof set

- `quality_goal`
- `subgoal_replay_probe`
- `completion_block_probe`
- `template_child_probe`
- `live_probe_or_skip`

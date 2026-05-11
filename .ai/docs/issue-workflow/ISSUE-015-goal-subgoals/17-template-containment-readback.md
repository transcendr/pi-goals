# 17 — Template containment readback

## Source inspected

- `.ai/.pi-goals/dirty-worktree-cleanup.md`

## Finding

`dirty-worktree-cleanup` is a full top-level reusable goal prompt: it injects worktree snapshots, permits commands, and owns a commit-oriented workflow. The ISSUE-015 reference scenario needs that workflow to run as a blocking child under a parent pipeline, not as a replacement top-level goal and not delayed in `/goal queue`.

## Impact

This reinforces the locked ISSUE-015 design: template-backed child workflows must resolve the template into nested child objective/context metadata and keep parent return state. Implementation must not call top-level `create_goal_from_template` when creating a subgoal recipe.

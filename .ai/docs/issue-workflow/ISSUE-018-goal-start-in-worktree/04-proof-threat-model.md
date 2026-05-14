# 04 — Proof threat model for ISSUE-018

## Primary invariant

A worktree-start flow must isolate a new goal into an explicit Git worktree without losing or mixing user work, without silently spawning paid/background sessions, and with enough durable metadata for proof/audit/history surfaces to resolve the correct worktree cwd later.

## High-risk false greens

1. The command appears to create a worktree goal but actually starts the goal in the source cwd.
2. Dirty source changes are silently omitted, causing the worktree goal to run without needed context.
3. Branch/path collisions overwrite, reuse, or confuse an existing worktree.
4. Completion or clear accidentally deletes the worktree.
5. Tool/command output claims a separate session was launched even though the Pi API stayed in the source cwd.
6. Worktree metadata is not persisted/replayed, so proof/audit/history surfaces cannot locate the worktree.
7. The implementation auto-spawns a background model process without explicit user action.
8. Cleanup helper removes a dirty worktree or raw dependency errors leak to the agent/user.

## Deterministic proof strategy

Deterministic probes should cover parser/tool behavior, naming/collision handling, state replay, and no-side-effect lifecycle boundaries. These are enough for most pure logic and state checks, but not enough for the Git worktree invariant by themselves.

Required deterministic proof classes:

- worktree plan/name generation produces bounded branch/path/id values and rejects unsafe names;
- dirty source preflight blocks by default and requires explicit override;
- branch/path collision probe fails safely without overwriting;
- adopted worktree metadata survives replay and appears in tool/UI summaries;
- goal complete/clear leaves worktree metadata and filesystem untouched;
- no automatic continuation/session spawn is scheduled by the prepare command/tool.

## Live/disposable proof strategy

A bounded disposable live Git worktree probe is required because the core invariant involves actual `git worktree` behavior and cleanup. The live probe may use a temporary fixture repo or a disposable worktree under the real repo, but it must clean up created branches/worktrees and verify cleanup.

Live probe must prove:

- `git worktree add` is invoked with the expected base/branch/path;
- the resulting worktree exists and reports the expected branch;
- the source worktree remains untouched;
- cleanup removes only the disposable target after explicit cleanup logic or test cleanup, not as a goal side effect.

## Proof rows to carry into the issue doc

```toon
toon.version: 1
required_proofs[7]{name,source,command,pass_condition,scope,notes}:
  "quality_goal","ISSUE-018","cd ~/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0","run","full extension quality gate after implementation"
  "worktree_plan_probe","ISSUE-018","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-worktree-plan-probe.mjs","exit 0 and output includes PASS worktree_plan_safe_names","run","must fail if generated branch/path/id values are unsafe, unbounded, or collide silently"
  "dirty_source_probe","ISSUE-018","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-worktree-dirty-source-probe.mjs","exit 0 and output includes PASS dirty_source_blocks_by_default","run","must fail if dirty source worktrees are created without explicit override/warning"
  "collision_probe","ISSUE-018","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-worktree-collision-probe.mjs","exit 0 and output includes PASS worktree_collisions_refuse_overwrite","run","must fail if branch/path collisions overwrite or reuse existing targets"
  "adoption_replay_probe","ISSUE-018","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-worktree-adoption-replay-probe.mjs","exit 0 and output includes PASS worktree_binding_replays","run","must fail if adopted GoalState loses worktree path/branch/origin metadata"
  "cleanup_safety_probe","ISSUE-018","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-worktree-cleanup-safety-probe.mjs","exit 0 and output includes PASS complete_clear_do_not_remove_worktree","run","must fail if completion/clear deletes or schedules deletion of the worktree"
  "live_disposable_worktree_probe","ISSUE-018","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-worktree-live-probe.mjs","exit 0 and output includes PASS disposable_worktree_created_and_cleaned","run","must create a disposable worktree/branch, verify isolation, and clean up its own fixture"
```

## Coverage notes

- `quality_goal` protects broad extension regressions but is not sufficient alone.
- `worktree_plan_probe`, `dirty_source_probe`, and `collision_probe` target data-loss/isolation risks before filesystem mutation.
- `adoption_replay_probe` targets downstream proof/audit/history correctness.
- `cleanup_safety_probe` targets the most dangerous lifecycle false green.
- `live_disposable_worktree_probe` is mandatory unless the implementation intentionally lands as dry-run/planning-only, which is not the chosen design.

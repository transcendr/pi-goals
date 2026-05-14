# 02 — Grounded research for ISSUE-018

## Commands/probes run

Primary transcript: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/raw/commands.log`.

Key probes:

- `git status --short --untracked-files=all`
- `test -f .ai/issues/refine/ISSUE-018-goal-start-in-worktree.md`
- `rg -n "worktree|newSession|switchSession|sendUserMessage|GoalState|status|queue|branch|cwd|appendEntry|session_start|session_shutdown" ...`
- `git worktree list --porcelain`
- `sentrux gate --save .pi/extensions/goal`
- focused Pi extension API probes for `newSession`, `switchSession`, `sendUserMessage`, `appendEntry`, and `exec`

Sentrux planning sensor: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/raw/sentrux-gate.log` reported quality `6241` and exit `0`.

## Files inspected

Planning/context:

- `.ai/issues/refine/ISSUE-018-goal-start-in-worktree.md`
- `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`
- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`

Code/API/docs:

- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/index.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/tool-results.ts`
- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/widget.ts`
- `.pi/extensions/goal/ui.ts`
- `README.md`
- `~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts`
- `~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/handoff.ts`

## Current behavior facts

- `.pi/extensions/goal/command.ts` currently supports `pause`, `resume`, `clear`, and `queue`. There is no `start` subcommand and no worktree option.
- `/goal <objective>` directly creates a branch-local active goal in the current Pi session via `createGoalState(...)` and `persistSetGoal(...)`.
- When a goal already exists, command UX asks `Replace`, `Queue`, or `Cancel`; worktree isolation is not an existing replacement option.
- `.pi/extensions/goal/tools.ts` exposes `create_goal`, `create_goal_from_template`, `update_goal`, `clear_goal`, and queue tools. There is no model tool for worktree creation or worktree start.
- `.pi/extensions/goal/types.ts` `GoalState` has no worktree/session ownership fields today.
- `.pi/extensions/goal/state.ts` persists/replays goal state as branch-local custom entries using `pi.appendEntry(STATE_ENTRY_TYPE, event)` and defensive parsing. Optional worktree metadata can be added backward-compatibly if bounded and normalized.
- `.pi/extensions/goal/lifecycle.ts` replays goal, monitor, and queue state on `session_start` and `session_tree`, and schedules monitor/continuation for active goals. There is no session shutdown/switch handling for worktree ownership metadata today.
- `README.md` documents single-session goal state, queue, reusable templates, completion floors, and churn monitor, but not worktree starts.
- Pi extension API exposes `ctx.newSession(...)`, `ctx.switchSession(...)`, and replacement-session callbacks, but the inspected type definition does not expose a way to change the current process cwd while replacing/switching sessions.
- Pi extension API exposes `pi.exec(command,args,options?)`, and examples use it for Git commands. This is the likely bounded execution seam for `git worktree` operations.
- `git worktree list --porcelain` currently shows only the main worktree at `~/dev/personal/experiments/pi-goals` on branch `develop`; there are no existing sibling worktrees in this repo at research time.

## Nearby issue constraints

- ISSUE-019 depends on ISSUE-018 and needs explicit worktree/session ownership before parallel/multiple goals can be designed.
- ISSUE-015 intentionally rejected separate child Pi/Solo sessions and child worktrees for the subgoal first release; ISSUE-018 should not change subgoal semantics.
- ISSUE-016 active waiting can later support external worktree/session waits, but this issue should not require idle-nudge implementation.
- ISSUE-021 proof freshness already names `worktree_status` as a future proof freshness mode; ISSUE-018 should record worktree cwd/branch metadata so proof runners can resolve the correct cwd later.
- ISSUE-022 history/checkpoint export should later summarize worktree metadata, but ISSUE-018 should not implement checkpoint history.
- ISSUE-024 audit should later consume worktree metadata and proof status, but audit is not the worktree launch owner.

## Planning gaps in the refine issue

The refine issue had the right problem but left these execution-blocking forks open:

1. command/tool surface;
2. extension-owned Git worktree creation vs external helper;
3. current-session move vs new spawned/handed-off session;
4. deterministic branch/path naming;
5. dirty source worktree policy;
6. cleanup/removal safety;
7. first-release boundary with ISSUE-019 parallel execution.

These gaps must be locked in the promoted issue.

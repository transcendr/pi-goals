# 02 — Grounded research for ISSUE-019

## Commands/probes run

Primary transcript: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/commands.log`.

Key probes:

- `git status --short --untracked-files=all`
- `test -f .ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`
- `find .ai/issues/refine .ai/issues/open -maxdepth 1 -type f -name 'ISSUE-*.md' | sort`
- `rg -n "GoalState|active|queue|subgoal|worktree|session|newSession|switchSession|budget|continuation|monitor|widget|status|completion|proof|audit|checkpoint" ...`
- `rg -n "interface ExtensionCommandContext|newSession\(|switchSession\(|sendUserMessage|setSessionName|ExtensionAPI|exec\(" ...`
- `git worktree list --porcelain`
- `sentrux gate --save .pi/extensions/goal`

Sentrux planning sensor: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/sentrux-gate.log` reported quality `6241` and exit `0`.

## Files inspected

Planning/context:

- `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`
- `.ai/issues/open/ISSUE-018-goal-start-in-worktree.md`
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`
- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`

Code/API/docs:

- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/tool-results.ts`
- `.pi/extensions/goal/monitor-report.ts`
- `.pi/extensions/goal/ui.ts`
- `.pi/extensions/goal/widget.ts`
- `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts`
- `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
- `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/subagent/index.ts`

## Current behavior facts

- `GoalState` currently represents exactly one top-level goal with one `status`, one objective, one set of budgets/floors, and one usage counter set.
- `state.ts` keeps a single `runtimeState: { goal, telemetry }`; replay applies branch-local `pi-goal-state` events and ignores stale goal-id updates.
- `tools.ts` `create_goal` refuses creation when any non-complete goal exists. `create_goal_from_template` can replace only a completed goal. This enforces single top-level goal semantics today.
- `command.ts` `/goal <objective>` either creates one active goal or asks `Replace`, `Queue`, `Cancel` when a goal exists.
- `queue-state.ts` and `queue-tools.ts` already provide durable FIFO sequential future-goal behavior, but queue items are not active named goals and do not provide focus/switch/drill-down semantics.
- `start_queued_goal` is atomic create-then-dequeue for direct concrete queued goals and leaves the queue intact when a non-complete goal is active.
- `continuation.ts` has one pending continuation timer and budget-wrap-up map keyed by goal id; it is not built for multiple active goals in one session.
- `lifecycle.ts` turn accounting tracks one `activeTurn`, one current goal, and sends queue steering when the completed tool result marks the single goal complete.
- `monitor-report.ts` includes a single `goal`, telemetry, session cwd/id, and recent branch entries. It does not partition context/monitor evidence by multiple simultaneous goals.
- `ui.ts` and `widget.ts` render one current goal widget/status, with already-dense budget/floor lines. Multi-goal rendering must be aggregate/list-first and compact.
- Pi extension docs expose `ctx.newSession(...)`/`ctx.switchSession(...)` replacement-session callbacks, but not a cwd override for new sessions. ISSUE-018 therefore locked user-mediated worktree adoption rather than silent session spawn.
- Pi example `subagent` can spawn separate `pi` processes with cwd and concurrency limits, proving process spawning is technically possible, but it is a generic explicit tool with concurrency caps and JSON-mode result collection; embedding that style inside `pi-goal` would be a larger paid-session orchestration feature.
- `git worktree list --porcelain` currently shows only the main worktree on `develop`; there is no live multi-worktree fixture in the repo at research time.

## Nearby issue constraints

- ISSUE-015 locks nested child subgoals inside one active top-level `GoalState`. ISSUE-019 must not reclassify subgoals as parallel top-level goals.
- ISSUE-018 locks first-pass worktree start as safe worktree preparation plus explicit adoption, not automatic multi-agent orchestration. ISSUE-019 may consume worktree metadata but should not bypass that safety model.
- ISSUE-016 active waiting may be useful for external/parallel waits, but multi-goal first pass should not depend on idle-nudge implementation.
- ISSUE-021 proof gates should remain per effective goal/cwd; multi-goal state must not merge proof results across goals.
- ISSUE-022 checkpoint/history should later partition timeline/export by selected goal/session, but ISSUE-019 should not require full checkpoint implementation.
- ISSUE-024 audit should audit the focused/selected goal or an aggregate summary explicitly; it must not accidentally mark all goals complete.

## Planning gaps in the refine issue

The refine issue had the right concern but left these execution-blocking forks open:

1. whether multi-goal state is a new top-level collection or an extension of current `GoalState`;
2. what “active” means with more than one goal;
3. whether first pass should include true parallel agent spawning;
4. how focus/context filtering prevents steering leakage;
5. how budgets/proofs/worktrees are partitioned;
6. how UI remains usable;
7. how spend/runaway controls work.

These gaps must be locked before promotion.

# 02 — Grounded research

## Commands / sensors

- `rg` surface scan across `.pi/extensions/goal/*` and reusable goal templates; raw output: `raw/research-rg.log`.
- `sentrux gate --save .pi/extensions/goal`; raw output: `raw/sentrux-gate.log`.

Sentrux planning sensor result: quality `6241`; no implementation was changed for this issue-doc refinement.

## Current live code facts

### Goal state and replay

- `.pi/extensions/goal/types.ts` defines one top-level `GoalState` with `goalId`, `objective`, `status`, budgets/floors, usage, and timestamps. There is no subgoal field today.
- `.pi/extensions/goal/state.ts` persists branch-local `pi-goal-state` custom entries and defensively replays the last valid goal object. Optional subgoal fields can be added backward-compatibly if parsing remains defensive and bounded.
- `persistAccountGoal()` updates top-level usage and `updatedAt` on accounting turns. Subgoal freshness/evidence must not rely on top-level `updatedAt` alone.

### Tools and completion

- `.pi/extensions/goal/tools.ts` registers `get_goal`, template listing/creation, `update_goal`, queue tools, and clear. There are no subgoal tools.
- `updateGoalFromTool()` calls `decideGoalCompletion(...)` before status side effects. This is the correct parent-completion gate seam for blocking incomplete subgoals.
- `.pi/extensions/goal/completion-gate.ts` currently handles minimum completion floors. Subgoal completion blocking should join this shared gate rather than duplicating completion policy in tool code.
- `.pi/extensions/goal/tool-results.ts` centralizes model-visible goal details. Subgoal state should be summarized here so `get_goal` and blocked completion responses expose the active child and blockers.

### Prompt and monitor surfaces

- `.pi/extensions/goal/prompts.ts` builds continuation text around the top-level objective only. A nested child runtime needs prompt context that distinguishes parent objective, current child objective, return condition, and stale-goal guard.
- `.pi/extensions/goal/monitor-report.ts` sends sparse monitor reports with the whole `GoalState` and floor report. The monitor can observe subgoal state if it is in `GoalState`, but deterministic subgoal gates must not rely on monitor judgment.
- `.pi/extensions/goal/monitor.ts` demonstrates stale-guarded background agent decisions; subgoal runtime should copy the stale-goal posture for any child-focused steering.

### UI and formatting

- `.pi/extensions/goal/ui.ts` updates footer and widget from the current `GoalState`.
- `.pi/extensions/goal/widget.ts` already has dense budget/floor rows and compact mode. Subgoal rendering must be one compact row, not a second large card.
- `.pi/extensions/goal/format.ts` centralizes status/footer/summary text. It should own concise subgoal labels and counts.

### Queue and reusable templates

- `.pi/extensions/goal/queue-state.ts` persists queued top-level future goals separately from current goal state.
- `.pi/extensions/goal/queue-tools.ts` intentionally keeps `start_queued_goal` for direct concrete queue items and template queue resolution for top-level goal starts.
- `.pi/extensions/goal/templates.ts` resolves `.ai/.pi-goals/*` into objective text and metadata. A subgoal can reference a template as a child execution recipe, but it must not call `create_goal_from_template` because that would replace/compete with the parent.
- `.ai/.pi-goals/dirty-worktree-cleanup.md` is the reference child workflow: it has a full completion standard and can be rendered as a child objective.
- `.ai/.pi-goals/deslop-pipeline.md` currently says dirty worktree during preflight is a hard blocker/stop. ISSUE-015's reference use case wants that blocker to become an inline child workflow instead of a competing top-level goal or delayed queue item.

### Related issue facts

- `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md` says progress must not weaken completion audit; subgoal aggregate progress should likewise remain advisory.
- `.ai/issues/refine/ISSUE-011-goal-widget-real-component-and-narrow-width.md` means subgoal UI must be conservative until widget strategy is refined.
- `.ai/issues/refine/ISSUE-021-goal-completion-proofs.md` locks durable proof gates for top-level goals; subgoal proof integration should reuse that design when available, but first subgoal state should not depend on ISSUE-021 landing first.
- `.ai/issues/refine/ISSUE-022-goal-history-checkpoints-and-compaction.md` depends on subgoal semantics; child start/finish/blocker events will become checkpoint material later.
- `.ai/issues/refine/ISSUE-024-goal-audit-command.md` should consume subgoal state in future; subgoals should provide deterministic completion blockers independent of audit command UX.
- `.ai/issues/fixed/ISSUE-027-goal-queue.md` preserves one active top-level goal at a time; subgoals must not violate that invariant.

## Planning facts for issue writeback

- First implementation should add nested child runtime data under the current active `GoalState`, not create a second top-level goal.
- Parent completion must be blocked when blocking child subgoals are incomplete, failed, or unresolved.
- Slash-command UX can be deferred; model tools are the lower-risk first surface because existing goal tools already own explicit agent actions.
- UI should prioritize current child title/status plus complete/total count; detailed child data belongs in tool output.

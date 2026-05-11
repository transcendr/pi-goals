# 33 — Stack inventory after promotion

## Command output

See raw inventory summary:

- `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/raw/current-refine-open-inventory-summary.log`

## Current state

Open bucket now contains:

- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-037-goal-queue-auto-continuation-after-complete.md`

Remaining refine bucket contains 8 stack issues:

1. `.ai/issues/refine/ISSUE-024-goal-audit-command.md` (next by leverage order)
2. `.ai/issues/refine/ISSUE-022-goal-history-checkpoints-and-compaction.md`
3. `.ai/issues/refine/ISSUE-018-goal-start-in-worktree.md`
4. `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`
5. `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`
6. `.ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md`
7. `.ai/issues/open/ISSUE-014-goal-progress-estimates.md`
8. `.ai/issues/open/ISSUE-013-goal-update-natural-language.md`

## Orchestration note

The parent queue item remains unsatisfied; do not dequeue it until all remaining stack issues are promoted/open/execution-ready.

# 01 — Open promotion addendum

## Update

The original leverage order was generated when ISSUE-021 still lived in `issues/refine`. During execution of the ordered stack, ISSUE-021 was promoted to `issues/open` after confirming it was already execution-ready.

## Current effect on the order

The original order remains the execution order for the stack item that was queued from it, but downstream references should use the new canonical path:

1. `.ai/issues/open/ISSUE-021-goal-completion-proofs.md` — already promoted/open.
2. `.ai/issues/open/ISSUE-015-goal-subgoals.md`
3. `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
4. `.ai/issues/open/ISSUE-024-goal-audit-command.md`
5. `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
6. `.ai/issues/refine/ISSUE-018-goal-start-in-worktree.md`
7. `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`
8. `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`
9. `.ai/issues/refine/ISSUE-011-goal-widget-real-component-and-narrow-width.md`
10. `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md`
11. `.ai/issues/refine/ISSUE-013-goal-update-natural-language.md`

## Rationale

This avoids stale path ambiguity while preserving the already computed priority order used to enqueue the stack.

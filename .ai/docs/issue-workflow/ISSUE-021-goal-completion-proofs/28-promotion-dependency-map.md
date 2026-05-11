# 28 — Promotion dependency map

## Purpose

Document the dependency/reference state after promoting ISSUE-021 to `issues/open`, so later stack items do not accidentally chase the old refine path.

## Current canonical path

- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`

## Downstream refs updated to open path

- `.ai/issues/refine/ISSUE-015-goal-subgoals.md`
- `.ai/issues/refine/ISSUE-024-goal-audit-command.md`
- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`

## Related issues still in refine

These remain valid refine-bucket targets for later stack items:

- `.ai/issues/refine/ISSUE-015-goal-subgoals.md`
- `.ai/issues/refine/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`
- `.ai/issues/refine/ISSUE-024-goal-audit-command.md`

## Execution note for queue stack

The queue stack contains a now-stale child queue item for ISSUE-021 that was enqueued before this promotion completed. When that duplicate queue item reaches the head after the orchestration item is satisfied, it should be recognized as already satisfied by this promotion and dequeued rather than recreated.

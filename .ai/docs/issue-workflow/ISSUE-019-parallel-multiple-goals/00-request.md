# 00 — Request intake for ISSUE-019

## Parsed request

- Target bucket: `open`
- Issue kind: `feature`
- Requested title: `parallel multiple goals`
- Existing issue named explicitly: `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`
- Canonical output path selected: `.ai/issues/open/ISSUE-019-parallel-multiple-goals.md`
- Transcript directory: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/`

## Goal of this refinement

Refine the existing multi-goal issue until it is execution-ready, then promote it from `issues/refine` to `issues/open` with visible workflow artifacts, proof threat model, required proof rows, and stale dependency path cleanup.

## Stack context

This is item 7 in `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`.

Already promoted/open before this pass:

1. `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
2. `.ai/issues/open/ISSUE-015-goal-subgoals.md`
3. `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
4. `.ai/issues/open/ISSUE-024-goal-audit-command.md`
5. `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
6. `.ai/issues/open/ISSUE-018-goal-start-in-worktree.md`

Next downstream issue that should consume this planning:

- `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`

## Assumptions

- The explicit existing issue number wins; this is not a new `ISSUE-038`.
- Promotion means the refine issue is removed after the open issue doc is written and verified.
- This pass is planning/refinement only, not implementation.
- Because the feature touches slash-command/tool ergonomics, state architecture, session orchestration, budgets, and UI, `$axi` and `$sentrux` are relevant supporting skills.
- The first pass should be bounded and compatible with the just-promoted ISSUE-018 worktree-start boundary and ISSUE-015 nested subgoal boundary.

## Clarification result

No clarification was needed: bucket, kind, title, target existing issue, promotion target, ordering, and coordination constraints were explicit. Design choices are locked from the inspected code/API/issue evidence rather than by inventing new owner preferences.

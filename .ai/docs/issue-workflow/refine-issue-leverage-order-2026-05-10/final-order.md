# Refine bucket issue leverage order — 2026-05-10

## Scope

Reviewed every current `.ai/issues/refine/ISSUE-*.md` file and ordered the remaining refine-bucket issues from highest to lowest implementation leverage.

Criteria used:

1. Prevents false-green goal completion or unsafe automation.
2. Unblocks multiple other issues/workflows.
3. Has a clear first implementation slice or is already execution-ready.
4. Reduces friction in current queue/Solo/long-goal operations.
5. Defers broad architecture until prerequisites are ready.

## Final exact order, highest to lowest leverage

1. `.ai/issues/open/ISSUE-021-goal-completion-proofs.md` — Durable/auditable goal completion proofs.
2. `.ai/issues/open/ISSUE-015-goal-subgoals.md` — Goals with agent-managed subgoals.
3. `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md` — Idle-tolerant goals with delayed nudges.
4. `.ai/issues/open/ISSUE-024-goal-audit-command.md` — `/goal audit` pre-completion review command.
5. `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md` — Goal history, checkpoints, and compaction-aware handoffs.
6. `.ai/issues/refine/ISSUE-018-goal-start-in-worktree.md` — Option to start a new goal in a worktree.
7. `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md` — Multiple sequential or parallel goals.
8. `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md` — Goal dependency triggers and external watchers.
9. `.ai/issues/refine/ISSUE-011-goal-widget-real-component-and-narrow-width.md` — Goal widget component/layout strategy.
10. `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md` — Agent-estimated goal progress percentage.
11. `.ai/issues/refine/ISSUE-013-goal-update-natural-language.md` — `/goal update "natural language"`.

## Rationale notes

- ISSUE-021 is first because runtime-enforced completion proofs directly reduce false-green completion and will strengthen every later long-running goal workflow.
- ISSUE-015 is second because nested child goals solve a concrete blocker in supervised pipelines and become input to history/checkpoint and audit design.
- ISSUE-016 is third because idle-tolerant mode is a prerequisite for safe waits and for ISSUE-023 watcher semantics.
- ISSUE-024 follows proofs/subgoals because audit should consume proof and subgoal state rather than invent its own weaker model.
- ISSUE-022 follows subgoals/proofs because checkpoints become more valuable once there are child-state and proof-result events to summarize.
- ISSUE-018 should precede ISSUE-019 because parallel/multi-goal orchestration needs explicit worktree/session ownership.
- ISSUE-019 remains high conceptual leverage but should wait until subgoals and worktree start semantics are clearer.
- ISSUE-023 depends on ISSUE-016; it is valuable for long waits but less fundamental than the idle policy it builds on.
- ISSUE-011 comes before ISSUE-014 because progress rendering depends on widget/layout decisions.
- ISSUE-014 is useful but explicitly advisory and must not weaken completion audits/proofs.
- ISSUE-013 is lowest in this stack because natural-language update UX is convenience-oriented compared with completion safety, subgoal orchestration, waiting, history, worktree, and UI foundations.

## Completion checklist

- [x] Enumerated every current refine issue file.
- [x] Read/reviewed each issue's priority, dependency, problem, desired behavior, open questions, and candidate acceptance criteria.
- [x] Produced a single exact order including all current refine issues.
- [x] Preserved dependency-aware rationale for downstream enqueue/create-issue-doc workflow.

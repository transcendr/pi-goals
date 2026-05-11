# 00 — Request intake for ISSUE-022

## Queue/orchestration classification

Parent queue item `q-1778452744568-2` was classified as orchestration, not a direct one-off goal. It names the reusable `create-issue-doc` workflow and asks the agent to execute a stack of issue-doc refinement goals. `list_goal_templates` showed exactly one matching template for the next concrete work item: `create-issue-doc` (`issue-doc`, `new-issue`, `plan-issue`).

Action taken: created the next concrete active goal from `create-issue-doc` for `.ai/issues/refine/ISSUE-022-goal-history-checkpoints-and-compaction.md` with `min_time_seconds_before_wrap_up=720`. The parent queue item remains queued and must not be dequeued until all refine-stack issues are promoted/open/execution-ready.

## Parsed issue request

- Target bucket: `open`
- Issue kind: `feature`
- Requested title: `goal history checkpoints and compaction-aware handoffs`
- Existing source issue: `.ai/issues/refine/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- Canonical output path: `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- Transcript directory: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/`
- Stack order source: `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`

## Assumptions and constraints

- ISSUE-021, ISSUE-015, ISSUE-016, and ISSUE-024 have already been promoted to `issues/open` and should be referenced by open paths.
- The old refine issue should be removed after the open issue is written.
- The issue must become execution-ready if design choices can be locked without owner input.
- The first implementation should avoid bloating provider context and must preserve branch replay semantics.
- The issue should coordinate with proof gates, subgoals, idle-tolerant mode, audit, and watcher/dependency issues without depending on their implementation details being present today.

## Clarification result

No clarification was required. The request names an existing issue and gives the target bucket/kind/title/context. Design choices were locked from current repo architecture, existing promoted issue docs, and extension APIs rather than requiring a new owner decision.

# ISSUE-015 — Refine goals with agent-managed subgoals

Status: refine — needs design decision before execution
Priority: P1
Owner: unassigned
Created: 2026-05-08
Next best session: design refinement pass for subgoal data model and UI
Next best session rationale: Subgoals affect persistence, tools, UI, progress, and completion audits; the schema must be locked first.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md`
- `.ai/issues/refine/ISSUE-011-goal-widget-real-component-and-narrow-width.md`

Goal: Design subgoals that the agent can create/update while working, with UI focused on the current subgoal and completed-subgoal progress/list.

## Problem

A single objective string is too coarse for large goals. Agents naturally break work into subgoals, but today that structure is only implicit in chat. Making subgoals first-class could improve UI clarity, progress estimation, resumability, and completion audits.

## Concrete use-case scenario: blocking cleanup inside a larger pipeline

The `deslop-pipeline` reusable goal template surfaced a clear subgoal need. Its parent workflow is a long supervised pipeline: preflight, Sentrux baseline, spawn Solo worker, monitor timer-pair progress, review deslop output, and create follow-up issue docs. During preflight, if `git status --short --untracked-files=all` shows a dirty worktree, the correct behavior is not to stop forever or start an unrelated top-level `/goal`. The agent should run the existing `dirty-worktree-cleanup` workflow as a bounded child task, complete or escalate it, then return to the parent `deslop-pipeline` at the next step.

This is awkward with only one active top-level goal:

- starting `/goal dirty-worktree-cleanup ...` would collide with or replace the active parent goal;
- queueing it delays a required blocking prerequisite instead of executing it inline;
- doing it only as untracked chat loses durable progress, auditability, and resumption state.

Subgoals would let the agent represent this as:

```text
parent goal: deslop-pipeline for <commit-range>
current subgoal: clean dirty worktree before deslop worker spawn
subgoal workflow: dirty-worktree-cleanup with context from parent
completion condition: worktree clean, cleanup commits recorded, or explicit blocker escalated
next parent step after completion: run Sentrux baseline and continue pipeline
```

Design implication: subgoals should support agent-managed, blocking child workflows that may reuse a prompt/template, have their own completion evidence, and then resume the parent goal without creating a competing top-level persistent goal.

## Desired behavior sketch

- Goal state contains ordered subgoals with ids, titles, status, optional notes, and timestamps.
- Agent can create, update, reorder, complete, or abandon subgoals through goal tools.
- UI shows:
  - current active subgoal;
  - completed count / total;
  - optional compact completed list or latest completed item;
  - command hints relevant to subgoal mode.
- The agent can create/update subgoals on the fly without user micromanagement, but user-facing changes should remain inspectable.
- A parent goal can enter a blocking subgoal, complete/escalate it, and then resume at the parent workflow step that created the subgoal.
- A subgoal may reference a reusable goal template/prompt as its execution recipe without becoming a separate top-level `/goal`.

## Open design questions

1. Are subgoals part of `GoalState` snapshots or a separate event stream?
2. What statuses are allowed for subgoals, and should they mirror goal statuses?
3. Does the user need slash commands for subgoals, or only model tools at first?
4. How many subgoals can exist before UI/persistence needs compaction?
5. Should progress percent aggregate from subgoals, remain separate, or both?
6. Can subgoal creation be autonomous, or must the user opt into subgoal tracking per goal?
7. How should a subgoal reference a reusable goal template such as `dirty-worktree-cleanup` without invoking top-level goal replacement semantics?
8. How does parent resumption record the exact step to continue after a blocking subgoal completes?
9. What audit evidence is required before a parent goal may treat a subgoal as satisfied?

## Candidate acceptance criteria after refinement

- Subgoal schema is bounded, replay-safe, and branch-local.
- Agent tools can create/update subgoals without introducing new top-level goal statuses.
- UI clearly shows current subgoal and completed/total progress without overwhelming narrow layouts.
- Completion audit checks incomplete subgoals before allowing top-level completion.
- Subgoal updates are persisted as compact state, not transcript-sized summaries.
- A blocking subgoal can run a reusable workflow like `dirty-worktree-cleanup`, record its commits/blockers, and resume the parent goal without replacing the parent top-level goal.

## Non-goals for first refinement

- Full project-management replacement.
- Cross-session multi-agent assignment of subgoals; see parallel-goals issue.
- Durable proof gates per subgoal unless coordinated with completion-proofs issue.

## Refinement todos

- [ ] Define subgoal schema, status set, and storage location.
- [ ] Decide user opt-in and slash-command surface.
- [ ] Decide tool API additions and model guidance.
- [ ] Specify UI layouts for current/completed subgoals.
- [ ] Define how subgoals interact with progress percent and completion audit.
- [ ] Model the `deslop-pipeline` → `dirty-worktree-cleanup` blocking-subgoal scenario as a reference case for parent/child workflow semantics.

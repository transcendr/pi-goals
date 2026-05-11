# ISSUE-019 — Refine multiple sequential or parallel goals

Status: refine — needs design decision before execution
Priority: P1
Owner: unassigned
Created: 2026-05-08
Next best session: architecture refinement pass for multi-goal orchestration
Next best session rationale: Parallel goals affect state model, sessions, worktrees, budgets, and UI; this needs architecture design first.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/issues/refine/ISSUE-018-goal-start-in-worktree.md`
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`

Goal: Design support for multiple goals that can run sequentially or in parallel as multiple Pi agents, optionally with one worktree per goal.

## Problem

The first version intentionally supports one branch-local goal. Larger workflows may require several independent goals: parallel investigation paths, sequential release checklist goals, or multiple implementation shards. This cannot be bolted on casually because state, UI, continuation, budgets, and worktree ownership all become multi-tenant.

## Desired behavior sketch

- Multiple named goals with ids, names, status, budgets, and optional worktree/session ownership.
- Sequential mode: one active goal runs at a time; next begins when previous completes or pauses.
- Parallel mode: multiple Pi agents pursue goals concurrently, optionally isolated by worktree.
- UI shows aggregate status plus current/selected goal details.
- User can list, switch/focus, pause/resume/clear individual goals.

## Open design questions

1. Is multi-goal state a new top-level runtime or an extension of current `GoalState`?
2. What does "active" mean when multiple goals exist?
3. How does context filtering avoid cross-goal steering leakage?
4. What orchestration primitive starts/manages additional Pi agents?
5. How are shared budgets, worktrees, branch state, and completion proofs partitioned?
6. How does the user prevent runaway parallel spend?

## Candidate acceptance criteria after refinement

- Existing single-goal behavior remains default and backward compatible.
- Parallel goals cannot share mutable state or steering messages accidentally.
- Budgets and safety caps are per-goal and visible.
- Worktree/session ownership is explicit when used.
- UI remains readable with multiple goals and supports drill-down.
- Pause/clear one goal does not affect unrelated goals unless explicitly requested.

## Non-goals for first refinement

- Implementing a full team runtime inside `pi-goal` if an external `$agent-team` style runtime is better.
- Silent automatic spawning of paid model sessions.
- Cross-goal dependency solving before simple sequential/parallel modes are designed.

## Refinement todos

- [ ] Define multi-goal data model and compatibility migration.
- [ ] Decide sequential vs parallel command surfaces.
- [ ] Decide agent/session/worktree orchestration mechanism.
- [ ] Define UI model for list/focus/aggregate status.
- [ ] Define budget/safety controls for parallel execution.

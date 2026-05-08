# ISSUE-014 — Refine agent-estimated goal progress percentage

Status: refine — needs design decision before execution
Priority: P2
Owner: unassigned
Created: 2026-05-08
Next best session: design refinement pass for optional progress estimates
Next best session rationale: The storage/UI/safety-counter semantics need an owner decision before code changes.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: `.ai/issues/refine/ISSUE-011-goal-widget-real-component-and-narrow-width.md`

Goal: Design optional agent-updated progress estimates for goals, with instant reactive UI when used and no UI clutter when unused.

## Problem

The current runtime tracks objective, status, usage, budgets, and telemetry, but does not expose a human-readable progress estimate. For long-running goals, the user may want the working agent to periodically update an estimate such as `35%` with a short rationale. This is explicitly subjective and should not be confused with proof of completion.

## Desired behavior sketch

- User instruction: "update your goal progress estimate as you work".
- Agent calls `update_goal` with fields such as `progress_percent` and optional `progress_note`.
- UI updates immediately in footer/widget when a progress estimate exists.
- If progress estimate has never been set, the UI hides it.
- Completion still requires actual audit/proofs, not `progress_percent: 100` alone.

## Open design questions

1. Should progress live on `GoalState`, telemetry, or a separate progress event stream?
2. Should the allowed range be `0..100`, `0..99` until completion, or freeform confidence bands?
3. Should updates require a note/evidence string, or allow bare percentages?
4. Should stale estimates expire or show `last updated` age?
5. How should progress render in narrow widget mode?
6. Should progress updates count as "made progress" for no-progress safety counters?

## Candidate acceptance criteria after refinement

- Progress is hidden by default and appears only after explicit use.
- `update_goal` validates percentage range and optional note length.
- Progress updates persist/replay branch-locally.
- UI updates reactively after progress changes.
- Progress cannot mark a goal complete or weaken completion-audit requirements.
- Progress rendering works across active, paused, budget-limited, and complete statuses.

## Non-goals for first refinement

- Automatic model-judged progress without user opt-in.
- Treating progress as an objective completion proof.
- Multi-subgoal progress aggregation before subgoals are designed.

## Refinement todos

- [ ] Decide state vs telemetry location.
- [ ] Define schema and validation for percentage/note/timestamp.
- [ ] Decide whether progress affects no-progress safety counters.
- [ ] Specify footer/widget rendering and hidden-by-default behavior.
- [ ] Move to open after UI and persistence semantics are locked.

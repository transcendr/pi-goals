# 07 — Completion proof dataflow and seam notes

This follow-up artifact was created after the user correctly rejected idle `sleep` as violating the spirit of the minimum time floor. It records additional objective-linked work performed during the floor window.

## Current completion dataflow

1. Model calls `update_goal(status: "complete")`.
2. `tools.ts:updateGoalFromTool` builds a candidate update with `buildGoalUpdate`.
3. The candidate is passed to `completion-gate.ts:decideGoalCompletion` before non-active status side effects.
4. Current gate logic only evaluates completion floors and max-budget/no-safe-work escapes.
5. If allowed, `tools.ts` cancels continuation/monitor for non-active status, persists the update, syncs UI, and returns `resultForGoal`.
6. `lifecycle.ts` later treats successful tool details as completion telemetry when details prove the goal became complete.

## Best insertion points

- `types.ts`: add proof gate/result domain fields to `GoalState` and compact proof telemetry if needed.
- `state.ts`: parse optional proof arrays defensively in `toGoalState`, similar to floor fields.
- New `proofs.ts`: pure functions for config hashing, condition evaluation, freshness evaluation, and aggregate proof gate decision.
- New `proof-runner.ts`: bounded runtime command execution and structured result construction.
- `completion-gate.ts`: add required-proof decision before or alongside floor decisions. Missing/stale/failed required proofs should return a dedicated deferral decision, not overload floor deferral.
- `tools.ts`: add proof management/run tools and proof-blocked completion result shape.
- `tool-results.ts`: render compact proof state and expose structured details such as `completion_blocked_by_proof`.
- `format.ts`/`widget.ts`/`ui.ts`: display compact proof readiness without crowding the goal widget.
- `monitor-report.ts`: optionally include proof readiness for churn-monitor context, but do not make monitor the proof judge.

## Ordering recommendations

- Proof gate blocking should run before cancellation/persistence side effects, as floor gates do now.
- Max-budget hard stops should still prevent automatic proof execution when no budget remains.
- A failed completion due to proof gates should not set completion telemetry.
- Proof gate edits and completion should be separate tool calls, mirroring ISSUE-036's same-call floor edit + complete guard.

## Open implementation questions for the executor

- Whether proof commands are added via new tools only or also `/goal` CLI subcommands in the first pass.
- Whether `stdout_contains` should require exit zero by default or allow non-zero commands that produce the expected output; the issue currently says command outcome is recorded and condition-specific policy must be explicit.
- How much of `worktree_status` freshness belongs in first implementation versus a follow-up after goal-state freshness works.

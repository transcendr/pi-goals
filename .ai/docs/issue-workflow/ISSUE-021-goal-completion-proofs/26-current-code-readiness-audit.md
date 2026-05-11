# 26 — Current code readiness audit after open promotion

## Purpose

Re-read the current implementation seams after promoting ISSUE-021 to `issues/open` to verify the issue remains execution-ready against live code, not only against prior planning artifacts.

## Files rechecked

- `.pi/extensions/goal/completion-gate.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/tool-results.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/continuation.ts`

## Findings

- `completion-gate.ts` still centralizes completion decisions and currently gates only completion floors. This remains the correct insertion point for proof-gate readiness checks.
- `tools.ts` still calls `decideGoalCompletion(...)` before cancellation/persistence side effects in `updateGoalFromTool()`. Proof-blocked completion can reuse the same side-effect ordering as floor-blocked completion.
- `floorCompletionDeferredResult()` returns the current active `goal` in details and sets structured blocking metadata. ISSUE-021's proof-blocked result should mirror that shape and must not return a candidate complete goal.
- `tool-results.ts` still owns `ToolDetails` and `formatToolGoal()`. Proof summaries/blockers should be added there rather than scattered across individual tools.
- `state.ts` still replays `GoalState` defensively and updates `goal.updatedAt` in `persistAccountGoal()`. The issue's locked decision to avoid raw `goal.updatedAt` as proof freshness remains necessary.
- `lifecycle.ts` still treats successful `update_goal` details with `goal.status === "complete"` as actual completion progress. This reinforces the requirement that proof-blocked completion details return an active goal plus proof-block metadata.
- `continuation.ts` still schedules quick follow-up turns for active goals and suppresses repeated empty auto-turns. Proof execution should remain tool-triggered/bounded and should not be hidden inside continuation scheduling.

## Result

The open issue remains execution-ready. The current live code still matches the planned seam assumptions for proof-gate implementation.

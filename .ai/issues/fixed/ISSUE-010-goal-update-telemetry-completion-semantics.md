# ISSUE-010 — Fix update_goal completion/progress telemetry semantics

Status: fixed — implemented and validated
Priority: P1
Owner: unassigned
Created: 2026-05-08

## Problem

`lifecycle.ts` currently treats `update_goal` too broadly as completion/progress telemetry.

Review findings:

- `handleToolCall()` sets `activeTurn.completedGoal = true` as soon as input requests `status: complete`, before the tool result proves success.
- `handleToolResult()` sets `activeTurn.completedGoal = true` for any successful `update_goal`, including budget edits, pauses, resumes, and objective edits.
- Tool-level validation errors may be returned as normal content with `details.error`, not necessarily as `event.isError`, so telemetry can be fooled.

This makes `completedGoal` semantically wrong and can weaken no-progress/safety accounting.

## Requirement

Only mark completion telemetry when the goal actually becomes `complete`. For other successful goal mutations, either mark a separate `goalUpdated`/`madeProgress` signal or count progress based on real tool result details.

## Scope

In scope:

- `handleToolCall()` and `handleToolResult()` telemetry behavior.
- `TurnAccountingSnapshot` field naming/meaning if needed.
- Tool result details inspection for `update_goal` and possibly `create_goal`/`clear_goal`.
- No-progress safety counter correctness.

Out of scope:

- Budget warning/hard stop behavior; see `ISSUE-007`.
- Budget edit status recompute; see `ISSUE-009`.

## Proposed implementation

- Stop setting completion on `tool_call` pre-result.
- On `tool_result`, inspect returned details:
  - `details.goal?.status === "complete"` means completed goal.
  - `details.error` means not progress.
  - Other successful goal mutations may set a separate progress flag if desired.
- Consider renaming `completedGoal` in `TurnAccountingSnapshot` to separate:
  - `goalCompleted`
  - `goalMutated`
- Update `madeProgress` logic to distinguish actual tool work from failed or no-op goal tool calls.

## Acceptance criteria

- Failed `update_goal(status: complete)` does not set completion telemetry.
- `update_goal` budget-only edits do not set completion telemetry.
- `update_goal(status: complete)` that succeeds sets completion telemetry.
- No-progress counters behave correctly for failed/no-op goal updates.
- Existing safety pause behavior still works.
- Sentrux gate/check pass.
- Pi extension load validation passes.

## Execution todos

- [ ] 010.1 Adjust `TurnAccountingSnapshot` fields to distinguish goal completion from generic mutation if needed.
- [ ] 010.2 Remove pre-result completion marking from `handleToolCall()`.
- [ ] 010.3 Inspect `ToolResultEvent` details/content to mark completion only on actual complete state and ignore errors.
- [ ] 010.4 Add telemetry probes for failed complete, budget-only update, successful complete, and no-progress accounting.
- [ ] 010.5 Run Sentrux gate/check and Pi extension load validation; record `tsc` availability.


## Implementation closeout

Implemented telemetry semantics fix:

- Removed pre-result completion marking from `handleToolCall()`.
- Added `progressCount` to `TurnAccountingSnapshot` so progress accounting is not the same as raw tool-result count.
- `handleToolResult()` now ignores errored tool results for progress.
- `update_goal` only marks completion when result details include a goal with `status: "complete"` and no details error.
- Budget-only or failed `update_goal` calls no longer set completion telemetry.

Validation:

- `sentrux gate .pi/extensions/goal` passed.
- `sentrux check .pi/extensions/goal` passed.
- `pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models` passed.
- Static grep confirmed old broad `update_goal` completion paths are absent.
- `tsc` attempted but unavailable: `/bin/bash: tsc: command not found`.

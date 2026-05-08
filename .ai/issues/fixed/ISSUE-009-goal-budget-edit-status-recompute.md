# ISSUE-009 — Recompute goal status after budget edits

Status: fixed — implemented and validated
Priority: P1
Owner: unassigned
Created: 2026-05-08

## Problem

Budget edits update budget numbers but do not consistently recompute `status` from current usage.

Observed behavior:

- A goal hit `budgetLimited`.
- The user said: `extend the token budget to 5M`.
- The UI budget numbers updated and work resumed, but state still reported `budgetLimited` for at least one response.
- If `budgetLimited` means the budget is currently reached, that state is wrong after raising budget above current usage.

Related review finding:

- Lowering a budget below current usage also does not immediately mark `budgetLimited`; it waits for later lifecycle accounting.

## Requirement

After any token/time budget edit, recompute status against current `tokensUsed` and `timeUsedSeconds`, unless the user explicitly set status in the same update.

## Scope

In scope:

- `update_goal` natural-language/tool budget edits.
- `/goal` future budget edit paths if any exist.
- Status recomputation for raising and lowering budgets.
- Continuation scheduling/cancellation after recompute.

Out of scope:

- Early warning/hard stop semantics; see `ISSUE-007`.
- Widget card/layout refactor; see `ISSUE-011`.

## Proposed behavior

- If budget fields change and no explicit `status` is provided:
  - If current usage exceeds any configured target budget, set status `budgetLimited` and record reason.
  - If current status is `budgetLimited` and current usage is now below all configured budgets, set status `active`.
  - If current status is `paused` or `complete`, preserve that status unless explicit status is provided.
- If explicit `status` is provided, respect it after validating consistency where appropriate.
- When recompute changes `budgetLimited -> active`, schedule continuation as a resumed goal.
- When recompute changes `active -> budgetLimited`, cancel continuation and schedule a budget-limit wrap-up if needed.

## Acceptance criteria

- Raising `token_budget` above current `tokensUsed` transitions `budgetLimited -> active` when no explicit status is provided.
- Lowering `token_budget` below current `tokensUsed` transitions `active -> budgetLimited` immediately.
- Equivalent behavior works for `time_budget_seconds`.
- Paused and complete goals are not accidentally resumed by budget-only edits.
- Continuation scheduling/cancellation matches the resulting status.
- Sentrux gate/check pass.
- Pi extension load validation passes.

## Execution todos

- [ ] 009.1 Add budget-status recompute helper shared by tool/lifecycle paths if practical.
- [ ] 009.2 Update `buildGoalUpdate()` / `applyBudgetUpdates()` to recompute status after budget edits.
- [ ] 009.3 Wire continuation schedule/cancel behavior after recomputed status changes.
- [ ] 009.4 Add probes for raise-above-usage, lower-below-usage, time-budget equivalents, paused preservation, and complete preservation.
- [ ] 009.5 Run Sentrux gate/check and Pi extension load validation; record `tsc` availability.


## Implementation closeout

Implemented budget edit status recomputation in `update_goal` tool handling:

- Budget edits now mark the update as `budgetChanged`.
- If no explicit status is provided, budget-only edits recompute status for `active` and `budgetLimited` goals.
- Raising budget above current usage can move `budgetLimited -> active`.
- Lowering budget below current usage can move `active -> budgetLimited` immediately.
- `paused` and `complete` goals are preserved by budget-only edits.
- Entering `budgetLimited` records token/time budget reason through telemetry.
- Tool update now cancels continuation when the resulting status is `paused` or `budgetLimited`, and schedules continuation when transitioning back to `active`.

Validation:

- `sentrux gate .pi/extensions/goal` passed.
- `sentrux check .pi/extensions/goal` passed.
- `pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models` passed.
- Static inspection confirmed recompute helper and telemetry reason paths are wired.
- `tsc` attempted but unavailable: `/bin/bash: tsc: command not found`.

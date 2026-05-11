# 02 — Grounded research

## Inspected sources

- `.ai/issues/refine/ISSUE-016-goal-idle-tolerant-mode.md`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/monitor.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/constants.ts`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/ui.ts`
- `.pi/extensions/goal/widget.ts`
- `.pi/extensions/goal/format.ts`
- `.ai/docs/pi-goals-live-probe-testing.md`
- Sentrux planning sensor: `raw/sentrux-gate.log`

## Current runtime facts

- `GoalState` has no idle/auto-continuation policy fields today.
- `scheduleMaybeContinueGoal()` schedules an immediate 25ms follow-up for active goals after `agent_end`, subject to idle/pending/safety guards.
- Continuation skip reasons include `floorExhausted` and `budgetExhausted`, but no intentional-wait/idle-nudge reason.
- The churn monitor already uses a 90s report interval; delayed nudge should be separate from churn monitoring semantics, but can reuse stale guards and active-goal checks.
- `buildContinuationPrompt()` has no wait-reason or idle-nudge context today.
- UI/footer/widget rendering has no active-but-waiting wording today.
- Sentrux gate saved a planning baseline and reported quality `6241` with exit `0`.

## Root planning fact

The existing immediate continuation path is centralized enough for a first pass: add a policy check before the 25ms auto-continuation and introduce a delayed idle-nudge timer path for active goals configured to wait.

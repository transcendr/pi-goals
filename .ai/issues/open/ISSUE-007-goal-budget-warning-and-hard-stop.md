# ISSUE-007 — Goal budget warning and enforced hard stop

Status: open — execution-ready
Priority: P0
Owner: unassigned
Created: 2026-05-08

## Problem

`pi-goal` currently accounts token/time use only after a turn completes. In a real test, a goal was created by natural language with a `200K` token budget, but the agent continued past the budget and had to be stopped manually. Budget state was only visible after later tool responses/accounting.

Budget behavior must be proactive and enforceable:

- Warn before the target budget is hit so the agent can start wrapping up.
- Stop after an overrun guardrail so an agent cannot continue indefinitely past budget.
- Clearly identify whether a token or time budget was reached.

## User requirement

> The most important being, hitting a time or token budget, should alert you immediately. Ideally it happens 100K or 1 minute before the budget is actually hit, so you know you need to start wrapping up. Going 10% over budget should enforce an immediate stop (eg, budget is 900K warns you with how much budget you have left, 1M tokens is the target, and 1.1M tokens stops you no matter what).

Also:

- Natural-language goal creation with a token budget must actually constrain ongoing work.
- When a budget is reached, the top-right/widget text should say `token budget reached` or `time budget reached`, not generic `budget limited`.

## Scope

In scope:

- Token budget warning threshold.
- Time budget warning threshold.
- Hard stop threshold at 110% of the configured budget.
- Explicit budget-reached reason in state/telemetry/UI/prompting.
- Continuation suppression once warning/stop rules require wrapping/stopping.
- Tests/probes covering natural-language created budgets and lifecycle accounting.

Out of scope:

- Widget layout/card refactor; see `ISSUE-011` in refine.
- Budget recomputation when budgets are edited; see `ISSUE-009`.

## Design constraints

- Preserve existing statuses: `active`, `paused`, `budgetLimited`, `complete`.
- Do not continue active goal work while status is `paused` or `budgetLimited`.
- Keep branch-local state persistence through `pi.appendEntry("pi-goal-state", event)`.
- Sentrux must pass against `.pi/extensions/goal`.
- TypeScript validation may remain unavailable; record the limitation if `tsc` is missing.

## Proposed implementation

1. Add budget threshold helpers, likely in a new module or in `lifecycle.ts` if still under Sentrux limits:
   - `remainingTokens(goal)` / `remainingTime(goal)`.
   - warning when token budget remaining is `<= 100_000` and goal is still below target.
   - warning when time budget remaining is `<= 60` seconds and goal is still below target.
   - hard stop when `tokensUsed >= ceil(tokenBudget * 1.1)` or `timeUsedSeconds >= ceil(timeBudgetSeconds * 1.1)`.
2. Extend telemetry/details so the UI and prompts can distinguish:
   - token warning
   - time warning
   - token reached
   - time reached
   - token hard stop
   - time hard stop
3. At warning threshold:
   - surface a visible `ctx.ui.notify` warning promptly after accounting detects the threshold.
   - schedule/wrap one budget-warning follow-up if needed, instructing the agent to wrap up, not start new work.
   - keep status `active` until target is reached, but show warning metadata in status/widget if practical.
4. At target budget reached:
   - set status `budgetLimited` with `lastBudgetLimitReason` set to `tokenBudget` or `timeBudget`.
   - cancel normal continuation.
   - schedule budget-limit wrap-up only once.
   - UI label should say `token budget reached` or `time budget reached`.
5. At hard stop threshold:
   - abort/interrupt any active goal turn if available.
   - prevent any further continuation or budget wrap-up work beyond a minimal stop notice.
   - visible warning must say the hard stop was enforced.

## Acceptance criteria

- Creating a goal with `token_budget: 200000` and exceeding it causes status `budgetLimited` without requiring manual user intervention.
- A token-budget warning is surfaced when remaining token budget is `<= 100000` before target is reached.
- A time-budget warning is surfaced when remaining time budget is `<= 60s` before target is reached.
- A hard stop is enforced at `>= 110%` of token or time budget.
- UI/status text distinguishes `token budget reached` from `time budget reached`.
- Normal continuation is not scheduled after target reached or hard stop.
- Budget wrap-up prompt is sent at most once per budget-limited goal.
- Sentrux gate/check pass.
- Pi extension load validation passes.

## Execution todos

- [ ] 007.1 Add budget threshold/reason helpers and telemetry fields.
- [ ] 007.2 Add warning-threshold detection for token/time budgets.
- [ ] 007.3 Add target-reached state transition with token/time-specific labels.
- [ ] 007.4 Add 110% hard-stop enforcement and continuation cancellation.
- [ ] 007.5 Add/update probes or harness coverage for NL-created token budget, warning, reached, and hard stop behavior.
- [ ] 007.6 Run Sentrux gate/check and Pi extension load validation; record `tsc` availability.

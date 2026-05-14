# ISSUE-012 — Close budget-limited resume and wrap-up gaps

Status: fixed — implemented
Priority: P0
Owner: pi-goal automation
Created: 2026-05-08
Next best session: none — fixed
Next best session rationale: Implemented in commit 7ab6fc2 with budget resume/update probes and npm run quality:goal.
Target repo roots: `~/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/issues/fixed/ISSUE-007-goal-budget-warning-and-hard-stop.md`
- `.ai/issues/fixed/ISSUE-009-goal-budget-edit-status-recompute.md`

Goal: Make `budgetLimited` authoritative again by preventing budget-bypassing resume paths, scheduling the promised wrap-up when a budget edit newly limits a goal, and making budget-limited notices resource-specific.

## Problem

A full review of the current first-version `pi-goal` implementation found two runtime gaps and one UI consistency issue:

1. **Budget-limited goals can be resumed directly.**
   - `.pi/extensions/goal/command.ts` `resumeGoal()` blocks only `complete`, so `/goal resume` can turn `budgetLimited -> active` without raising a budget.
   - `.pi/extensions/goal/tools.ts` accepts `update_goal({ status: "active" })`; when no budget edit is present, this can turn an exhausted budget-limited goal active and schedule continuation.
2. **Budget edit `active -> budgetLimited` does not schedule budget wrap-up.**
   - `.pi/extensions/goal/tools.ts` recomputes status after budget edits and cancels continuation when the result is `budgetLimited`, but does not schedule the existing budget-limit wrap-up path promised by ISSUE-009.
3. **User notice text can still be generic.**
   - `.pi/extensions/goal/ui.ts` `notifyGoal()` uses `statusLabel(goal.status)`, so budget-limited notifications may say generic `limited by budget` instead of `token budget reached` / `time budget reached`.

## Why it matters

`budgetLimited` is the safety stop for time/token budgets. If a user or model can resume an exhausted goal without raising the budget, the feature violates the primary budget invariant from ISSUE-007: do not continue goal work while the budget is reached. If lowering a budget below current usage does not send wrap-up steering, the agent may stop without a useful summary or next step.

## Desired behavior

- `/goal resume` should refuse to resume a goal whose current usage still exhausts a token or time budget.
- `update_goal(status: "active")` should not bypass exhausted budgets.
- A budget-limited goal may become active only when a budget edit makes current usage fall below all configured budgets, or when the user clears/replaces the goal.
- When a budget edit changes `active -> budgetLimited`, normal continuation is cancelled and a budget-limit wrap-up is scheduled once, unless hard-stop rules say no further wrap-up is allowed.
- Budget-limited notices should use the resource-specific label when current usage identifies the exhausted resource.

## Design lock

- Preserve public statuses: `active`, `paused`, `budgetLimited`, `complete`.
- Do not introduce a special `resumeWithBudgetOverride` path in this issue.
- Treat current budget math as authoritative via existing `isBudgetExhausted()` / `evaluateBudgetPressure()` helpers.
- Prefer one shared helper for "can this goal be active now?" so command and tool paths cannot diverge.
- Reuse the existing `scheduleBudgetLimitWrapUp()` behavior; do not invent a second wrap-up scheduler.

## Implementation sketch

1. Add or reuse a helper such as `canActivateGoal(goal)` / `activationBlockedByBudget(goal)` in `budget.ts`.
2. Update `/goal resume`:
   - if `goal.status === "complete"`, keep existing complete message;
   - if current usage exhausts a configured budget, leave status unchanged and notify the user to raise the budget or clear/replace the goal;
   - otherwise set active and schedule continuation.
3. Update `update_goal` handling:
   - explicit `status: "active"` must fail or recompute back to `budgetLimited` when current usage still exhausts a budget;
   - budget edits that reactivate a previously budget-limited goal still schedule continuation;
   - budget edits that newly limit an active goal schedule one budget-limit wrap-up.
4. Inject a budget-wrap-up scheduler into tool runtime or expose a narrow helper from `continuation.ts` through `index.ts` without importing runtime modules into lower layers.
5. Change `notifyGoal()` to use `goalStatusLabel(goal)` for budget-limited notices.
6. Add focused probes for command/tool activation blocking and budget-edit wrap-up scheduling.

## Acceptance criteria

- A `budgetLimited` goal with `tokensUsed >= tokenBudget` cannot be resumed via `/goal resume`.
- A `budgetLimited` goal with `timeUsedSeconds >= timeBudgetSeconds` cannot be resumed via `/goal resume`.
- `update_goal({ status: "active" })` cannot reactivate an exhausted budget-limited goal.
- Raising the exhausted budget above current usage still transitions `budgetLimited -> active` and schedules continuation.
- Lowering a budget below current usage transitions `active -> budgetLimited`, cancels continuation, and schedules one budget-limit wrap-up.
- Hard-stop state still suppresses additional wrap-up work.
- Budget-limited user notices say `token budget reached` or `time budget reached` when known.
- `sentrux gate .pi/extensions/goal` passes.
- `sentrux check .pi/extensions/goal` passes.
- Pi extension load validation passes.
- `tsc` is attempted and its availability/result is recorded.

## Proof threat model

Primary invariant: no active continuation can be scheduled for a goal whose configured token/time budget is already exhausted.

Likely false greens:
- Only testing lifecycle accounting, while `/goal resume` and `update_goal(status:"active")` still bypass the budget.
- Verifying state becomes `budgetLimited` after lowering a budget, but not verifying wrap-up scheduling.
- Checking footer/status text but not transient user notices.

Required proof shape:
- deterministic helper/tool probes for activation blocking and budget-edit transitions;
- a scheduler spy/mock proving wrap-up is requested on `active -> budgetLimited` caused by budget edit;
- Pi extension load validation proving wiring still registers.

## Execution checklist

- [ ] Add shared budget activation helper.
- [ ] Harden `/goal resume` budget-limited path.
- [ ] Harden `update_goal(status:"active")` and budget edit recompute paths.
- [ ] Wire budget-edit wrap-up scheduling from tools through injected runtime callbacks.
- [ ] Update budget-limited user notice text.
- [ ] Add focused probes/mock harness checks.
- [ ] Run Sentrux gate/check, Pi load validation, and TypeScript attempt.

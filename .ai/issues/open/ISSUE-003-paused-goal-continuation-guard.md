# ISSUE-003 — Guard against goal-continuation work while the goal is paused

Status: open — execution-ready
Priority: high
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Related: `.ai/issues/open/ISSUE-002-goal-pause-active-turn-interrupt.md`
Depends on: implemented modular `pi-goal` runtime under `.pi/extensions/goal/`
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Next best session: runtime guard implementation paired with ISSUE-002 where practical
Goal: Prevent stale, pasted, queued, or hidden continuation prompts from causing substantive goal work while persisted goal state is `paused`.

## Problem

A continuation-style prompt can still look like a work instruction even when `get_goal` reports `status: "paused"`. Paused state must be authoritative over any continuation text from prior custom messages, queued follow-ups, pasted prompts, replayed context, or stale branch entries.

## Research evidence

Surfaces verified in current code and Pi runtime:

- `continuation.ts` has a single `pendingTimer` for auto-continuation and a `budgetWrapUpGoalIds` set, but no goal-specific cancellation API.
- `lifecycle.ts` context filtering currently keeps the latest matching goal steering message, regardless of whether current status is compatible with that steering kind.
- Pi hidden custom messages are persisted and later converted to user-role LLM messages, so stale hidden messages must be removed before provider context.
- `pi.sendMessage(... triggerTurn: true, deliverAs: "followUp")` can queue work that may become stale after a pause/clear/replace.

## Design locks

- Runtime state wins: if persisted state is paused, continuation instructions are invalid.
- Primary fix is runtime cancellation plus status-aware context filtering; prompt wording is only a fallback.
- Introduce a continuation cancellation API and call it from pause, clear, replacement, safety pause, and stale budget-limit transitions.
- Context filtering must be kind/status-specific:
  - keep `pi-goal-continuation` only for matching current goal with `status: "active"`;
  - keep `pi-goal-budget-limit` only for matching current goal with `status: "budgetLimited"`;
  - keep pause steering only for matching current goal with `status: "paused"` if ISSUE-002 adds that message;
  - drop all goal steering for absent, complete, cleared, replaced, or incompatible states.
- Add a monotonic steering generation only if cancellation + status filtering are insufficient in validation; it is not required for the first fix.
- Do not block ordinary non-goal user messages while paused.

## Execution TOON

```toon
issue: ISSUE-003
status: execution-ready
locks[5]:
  - paused-state-authoritative
  - cancel-pending-runtime-first
  - filter-by-goal-id-and-status
  - prompts-as-fallback-only
  - no-ordinary-chat-block
files[6]: continuation.ts, command.ts, lifecycle.ts, prompts.ts, telemetry.ts, types.ts
validation[6]: pause-cancels-timer, clear-cancels-timer, replace-cancels-timer, paused-drops-continuation, budget-only-keeps-budget-message, resume-fresh-message
```

## Implementation path

1. Add a cancellation function in `continuation.ts`, e.g. `cancelGoalContinuation(goalId?: string, reason?: string)`.
2. Track scheduled continuation metadata `{ goalId, reason }` instead of only a bare timer so cancellation can be goal-scoped.
3. Track budget wrap-up timers/goal ids so stale budget wrap-up messages can be cancelled or ignored after clear/replace/pause.
4. Call cancellation from:
   - `/goal pause`;
   - `/goal clear`;
   - goal replacement before setting the new goal;
   - safety pause in `lifecycle.ts`;
   - any budget-limit wrap-up path that observes incompatible state.
5. Replace `isGoalSteeringMessage()` / `filterGoalContext()` with status-aware validity logic using `GoalSteeringDetails.kind` and current goal status.
6. Harden continuation and budget-limit prompts with one sentence: if `get_goal` reports paused or a different goal id, stop and wait for `/goal resume`.
7. Extend mock tests/harness to inject stale continuation and budget-limit custom messages while paused/complete/cleared/replaced.
8. Run `sentrux gate .pi/extensions/goal` and `sentrux check .pi/extensions/goal`.
9. Validate the observed regression: a continuation-style instruction while paused must not cause goal work.

## Acceptance criteria

- `/goal pause` cancels pending scheduled auto-continuation for the current goal.
- `/goal clear` and goal replacement cancel pending scheduled continuation/wrap-up for stale goals.
- Provider-bound context contains no `pi-goal-continuation` when current goal status is paused, complete, absent, budget-limited, or replaced.
- Provider-bound context contains no `pi-goal-budget-limit` unless the current matching goal is budget-limited.
- Stale continuation text cannot cause substantive goal work while `get_goal` reports paused.
- `/goal resume` from paused state still schedules a fresh valid continuation.
- Sentrux gate/check pass for `.pi/extensions/goal` after changes.

## Non-goals

- Do not implement the future churn overseer.
- Do not add a new public status.
- Do not prevent ordinary user chat while a goal is paused.

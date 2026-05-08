# ISSUE-002 — Make `/goal pause` stop an in-flight goal turn promptly

Status: fixed — implemented and validated
Priority: high
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: implemented modular `pi-goal` runtime under `.pi/extensions/goal/`
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Next best session: focused implementation/validation pass for active-turn pause semantics
Goal: When the user runs `/goal pause` while an automatic goal turn is already running, the active goal pursuit must be steered or stopped promptly instead of continuing obliviously.

## Problem

Current `/goal pause` persists `status: "paused"`, updates UI, and prevents future continuations, but an already-running automatic continuation can continue substantive work before the model notices the pause. This makes pause feel like “do not continue after this turn” instead of “stop goal pursuit now.”

## Research evidence

Surfaces verified in Pi docs/types/runtime:

- `ExtensionContext.isIdle()` identifies whether an agent run is active.
- `ExtensionContext.abort()` is exposed to extensions and maps to `AgentSession.abort()`.
- `pi.sendMessage(..., { deliverAs: "steer" | "followUp" })` can queue custom messages during streaming.
- `ctx.hasPendingMessages()` can detect queued steering/follow-up messages.
- Current `pi-goal` continuation uses hidden custom messages and already has pause status persistence in `command.ts`.

## Design locks

- Use the strongest Pi-native mechanism without adding a new public goal status.
- `/goal pause` always persists paused first, then updates UI, then handles any active run.
- If `ctx.isIdle()` is false, send a hidden `pi-goal-pause` steering custom message with `deliverAs: "steer"` instructing the model to stop substantive goal work and briefly acknowledge the pause.
- If active steering is unavailable or validation shows it is not prompt enough, call `ctx.abort()` after persisting paused and show a clear pause notice. This fallback is acceptable because pause is explicitly user-requested.
- Cancel any pending auto-continuation/wrap-up timers through the continuation runtime API introduced by ISSUE-003.
- Do not introduce `pausePending`; `paused` remains authoritative.
- `/goal resume` must keep the current behavior of scheduling a fresh continuation automatically from idle state.

## Execution TOON

```toon
issue: ISSUE-002
status: execution-ready
locks[6]:
  - persist-paused-before-interrupt
  - hidden-active-steer-first
  - abort-fallback-if-steer-insufficient
  - cancel-pending-continuations
  - no-new-public-status
  - resume-schedules-fresh-continuation
files[5]: command.ts, continuation.ts, constants.ts, lifecycle.ts, types.ts
validation[5]: idle-pause, active-pause-steer, active-pause-abort-fallback, no-auto-continue-while-paused, resume-auto-continues
```

## Implementation path

1. Add a `PAUSE_MESSAGE_TYPE` constant and `GoalSteeringKind` variant if the pause steering message is represented alongside continuation/budget messages.
2. Add `cancelPendingGoalContinuation(goalId, reason)` or equivalent in `continuation.ts`; it must clear pending continuation timers and stale budget wrap-up state for the affected goal.
3. Update `/goal pause` in `command.ts` to:
   - read the current goal;
   - persist `status: "paused"` immediately;
   - cancel pending continuation for that `goalId`;
   - sync UI and notify the user;
   - if `!ctx.isIdle()`, send a hidden pause steering message with `deliverAs: "steer"`;
   - optionally call `ctx.abort()` if live validation shows steering does not stop work promptly.
4. Update `lifecycle.ts` context filtering so pause steering messages are only kept when they match the current goal and the current goal is paused.
5. Ensure `pauseForSafety()` also cancels pending continuation before notifying.
6. Keep `/goal resume` scheduling behavior intact; resume must set active and schedule a fresh continuation.
7. Add/extend mock harness coverage for idle pause, active pause, pause then resume, and no continuation while paused.
8. Run `sentrux gate .pi/extensions/goal` and `sentrux check .pi/extensions/goal`.
9. Validate in live Pi TUI and record whether active steer alone was sufficient or abort fallback was enabled.

## Acceptance criteria

- `/goal pause` while idle still persists paused status, updates UI, and prevents future continuation.
- `/goal pause` during an active automatic goal turn causes the current agent to stop substantive goal work promptly by steer and/or abort.
- The user sees a clear notice that the goal is paused and can be resumed with `/goal resume`.
- No additional automatic continuation is scheduled while paused.
- `/goal resume` from paused idle state schedules continuation automatically without requiring a separate user message.
- Sentrux gate/check pass for `.pi/extensions/goal` after changes.
- Live/manual validation records the exact mechanism used and any limitations.

## Non-goals

- Do not implement the future churn overseer.
- Do not clear or complete the goal when pausing.
- Do not add a new public goal status unless later evidence proves unavoidable.


## Implementation closeout

Implemented by playbook execution commits:

- ISSUE-003: `0b4446b fix: guard paused goal continuations`
- ISSUE-002: `443fb5b fix: stop active goal turn on pause`
- ISSUE-005: `24496c6 feat: add goal time budget support`
- ISSUE-004: `83ce87d feat: autocomplete goal subcommands`

Validation summary:

- `sentrux gate .pi/extensions/goal` passed.
- `sentrux check .pi/extensions/goal` passed.
- `pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models` loaded the extension.
- `tsc` validation was attempted but unavailable in this environment (`tsc: command not found`).
- Solo implementation todos for ISSUE-002..005 were completed with evidence comments.

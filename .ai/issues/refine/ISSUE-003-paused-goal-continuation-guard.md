# ISSUE-003 — Guard against goal-continuation work while the goal is paused

Status: refine — draft
Priority: high
Next best session: focused design/implementation pass after ISSUE-001 validation and alongside ISSUE-002
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/open/ISSUE-001-pi-goal-extension.md`
Related: `.ai/issues/refine/ISSUE-002-goal-pause-active-turn-interrupt.md`
Depends on: first complete `pi-goal` implementation under `.pi/extensions/goal/`
Goal: Prevent any stale, pasted, queued, or hidden continuation prompt from causing substantive goal work while the persisted goal state is `paused`.

## Problem

During validation, a continuation-style prompt was handled as a work instruction even though `get_goal` reported the active goal status was `paused`.

That is wrong. A paused goal must be authoritative. The agent/runtime should not continue goal pursuit merely because a continuation prompt appears in the transcript or arrives as a queued/follow-up/custom message.

This is distinct from, but related to, ISSUE-002:

- ISSUE-002 focuses on `/goal pause` interrupting or steering an already-running active turn.
- This issue focuses on preventing *new or resumed goal work* from stale/pasted/queued continuation instructions while the goal is already paused.

## Desired behavior

When goal status is `paused`:

1. Hidden `pi-goal-continuation` messages must not trigger substantive work.
2. Stale continuation messages already in context must be removed or neutralized.
3. If a user or runtime accidentally provides a continuation-style prompt while paused, the agent should stop immediately and say the goal is paused.
4. Goal tools should make paused state visible and should not encourage continuation.
5. `/goal resume` remains the only normal path that reactivates the goal and schedules continuation.

## User-facing rule

Paused goal state wins over continuation text.

If there is any conflict between:

- persisted `get_goal` status: `paused`, and
- a continuation prompt saying “continue working toward the active session goal,”

then the correct behavior is to stop and wait for `/goal resume`.

## Research questions

Before implementation, inspect Pi extension/runtime behavior and the current `pi-goal` code:

- Can `context` filtering remove *all* `pi-goal-continuation` and `pi-goal-budget-limit` messages when current goal status is not compatible with them?
- Does `pi.sendMessage(..., { triggerTurn: true, deliverAs: "followUp" })` leave queued custom messages that may fire after the goal is paused?
- Can pending continuation timers be cancelled when `/goal pause` or `/goal clear` runs?
- Can lifecycle hooks detect a turn that started from a stale goal-continuation message while the goal is paused?
- Should `get_goal` and tool prompt guidelines explicitly instruct models to check status before acting on continuation-like instructions?
- Is there a safe way for command handlers to mark a continuation generation as stale by goal id / generation id?

## Candidate implementation changes

### A — Cancel pending continuation timers on pause/clear

Add a continuation runtime API such as `cancelPendingGoalContinuation(goalId, reason)` and call it from `/goal pause`, `/goal clear`, replacement, and any safety pause.

Expected effect:

- Timers scheduled before pause cannot later fire and send a hidden continuation.
- Budget wrap-up timers for stale goals cannot leak into a paused/cleared/replaced state.

### B — Strengthen context filtering by goal status

Current context filtering should be tightened so:

- `pi-goal-continuation` is kept only if the matching current goal exists and status is `active`.
- `pi-goal-budget-limit` is kept only if the matching current goal exists and status is `budgetLimited`.
- all goal steering messages for paused, cleared, complete, or replaced goals are dropped from provider-bound context.

This makes persisted old steering messages harmless when a paused session is resumed or replayed.

### C — Add stale generation/sequence metadata

Add a monotonically increasing `steeringGeneration` or `continuationSequence` to telemetry/details so a continuation is only valid if it matches the current goal id and current generation.

B may be enough for first fix; C is useful if queued messages can survive state changes with the same goal id.

### D — Add explicit paused-state guard text to continuation prompt/tool guidance

The continuation prompt and tool guidelines can state that if the goal is paused, the agent must stop and wait for `/goal resume`.

This is only a cooperative fallback and must not be the sole guard.

### E — Add tool-call gate while paused

If a turn somehow starts from stale continuation while the goal is paused, `tool_call` can block goal-substantive tools with a clear pause message. This overlaps with ISSUE-002 and should be coordinated there.

## Initial design preference

Implement A and B first because they are runtime-level safeguards and do not depend on model cooperation.

Use C if testing shows queued same-goal messages can still fire after pause/resume transitions.

Use D as belt-and-suspenders prompt hardening, not as the primary control.

Coordinate E with ISSUE-002 so the pause active-turn interrupt/gate behavior is consistent.

## Acceptance criteria

- `/goal pause` cancels any pending scheduled auto-continuation for the current goal.
- `/goal clear` and goal replacement cancel any pending scheduled continuation/wrap-up for stale goals.
- Provider-bound context contains no `pi-goal-continuation` message when current goal status is `paused`, `complete`, absent, or replaced.
- Provider-bound context contains no `pi-goal-budget-limit` message unless the current matching goal is `budgetLimited`.
- A stale continuation message cannot cause substantive goal work while `get_goal` reports `paused`.
- `/goal resume` from paused state still schedules a fresh valid continuation.
- Sentrux gate/check pass for `.pi/extensions/goal` after changes.
- Validation includes a regression scenario matching the observed failure: continuation-style input encountered while goal is paused must stop rather than work.

## Validation plan

1. Start a goal and allow a continuation to be scheduled.
2. Pause the goal before the continuation fires or before it can be consumed.
3. Confirm no hidden continuation turn starts while paused.
4. Inject or replay a stale `pi-goal-continuation` custom message in context while goal is paused.
5. Confirm context filtering drops it or the agent refuses to continue.
6. Run `/goal resume`.
7. Confirm a fresh continuation is scheduled and uses the current goal id/generation.
8. Run Sentrux:

```bash
sentrux gate .pi/extensions/goal
sentrux check .pi/extensions/goal
```

## Implementation notes

Relevant files likely include:

- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/telemetry.ts`
- `.pi/extensions/goal/types.ts`

Likely structural direction:

- Keep cancellation APIs in `continuation.ts`.
- Keep command handlers invoking cancellation through injected callbacks or entrypoint wiring if Sentrux boundaries disallow direct imports.
- Keep status-based context filtering in `lifecycle.ts`.
- Keep prompt wording changes in `prompts.ts`.

## Deferred / non-goals

- Do not implement the future churn overseer here.
- Do not add a new public goal status unless research proves it is necessary.
- Do not make pause clear or complete the goal.
- Do not make ordinary non-goal user prompts impossible while a goal is paused; the guard should target goal-continuation work, not all user interaction.

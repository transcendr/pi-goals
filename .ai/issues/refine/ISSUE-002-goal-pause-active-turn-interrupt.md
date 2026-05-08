# ISSUE-002 — Make `/goal pause` stop an in-flight goal turn promptly

Status: refine — draft  
Priority: high  
Next best session: focused design/implementation pass after ISSUE-001 first landing validation  
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`  
Parent issue: `.ai/issues/open/ISSUE-001-pi-goal-extension.md`  
Depends on: first complete `pi-goal` implementation under `.pi/extensions/goal/`  
Goal: When the user runs `/goal pause` while an automatic goal turn is already running, the goal agent should become aware of the pause, wrap up briefly, and stop instead of continuing work obliviously.

## Problem

During basic `/goal` validation, the user ran `/goal pause` while an active goal continuation turn was already executing. The agent continued working through the current turn and appeared to have no awareness that the goal had been paused.

Current behavior appears to be:

- `/goal pause` persists goal status as `paused`.
- Future automatic continuations are prevented.
- The currently running assistant turn is not interrupted or steered.
- The agent does not necessarily re-check `get_goal` before continuing work.

This makes `/goal pause` feel like “do not continue after this turn” rather than “stop the active goal pursuit now.”

## Desired behavior

When `/goal pause` is issued during an active goal turn:

1. The goal status is persisted as `paused` immediately.
2. Future auto-continuations are cancelled/prevented.
3. The active turn receives an immediate or near-immediate steering/interrupt signal if Pi exposes a safe mechanism.
4. The model should briefly acknowledge/wrap up and stop substantive goal work.
5. The transcript/UI should make clear that the goal is paused and can be resumed with `/goal resume`.

When `/goal pause` is issued while idle:

- Existing behavior is sufficient: persist `paused`, update UI, and do not continue.

## Important expected resume behavior

After the paused turn has stopped, `/goal resume` should resume the active goal automatically without requiring the user to send an additional follow-up message.

Current code appears to schedule continuation from `/goal resume`, but this issue should explicitly validate that behavior after implementing pause-during-active-turn handling.

If validation proves `/goal resume` does not immediately schedule a continuation from idle paused state, create or split out a follow-up issue for resume scheduling.

## Research questions

Before implementation, inspect Pi APIs and runtime behavior for active-turn steering/interruption:

- Does `pi.sendMessage(..., { deliverAs: "steer" | "followUp" | ... })` support steering an active run?
- Can an extension command handler safely enqueue a high-priority custom message during streaming?
- Does Pi expose an abort/cancel API to extensions, or only user-facing Ctrl-C/stop behavior?
- Do command handlers run while a task is active, and what delivery mode reaches the active agent vs next turn?
- Can the `context` hook or `tool_call` hook detect paused goal state and inject/block future work mid-turn?

## Candidate approaches

### Option A — Active steer message on pause

On `/goal pause`, if `!ctx.isIdle()` or Pi indicates a run is active, send a hidden or visible custom steering message such as:

```text
The user has paused the active pi-goal. Stop substantive work on the goal now. Briefly acknowledge the pause and do not continue until /goal resume.
```

Pros:

- Preserves the current turn and lets the model wrap up naturally.
- Likely easiest if Pi supports steering active runs.

Risks:

- Delivery semantics must be verified; a follow-up message may not affect the current turn.
- Hidden user-role custom message may be weaker than a true interrupt.

### Option B — Interrupt/cancel active turn, then emit pause notice

If Pi exposes a safe extension-level stop/abort API, `/goal pause` could stop the active run and persist pause state.

Pros:

- Strongest user expectation: pause means stop now.

Risks:

- May be unavailable to extensions.
- Could lose useful wrap-up context unless paired with a notice or later summary.

### Option C — Tool-call/input gate after pause

If active steering is unavailable, add checks in `tool_call` and/or `context` so that once a goal is paused, further tool calls from the active turn are blocked with a clear message.

Pros:

- Prevents the most costly continued work.
- Uses known extension interception surfaces.

Risks:

- The assistant may continue reasoning/text without tool calls.
- Blocking arbitrary tools mid-turn can be surprising and needs careful messaging.

### Option D — Prompt-level cooperative check

Modify continuation prompt to instruct the model to check `get_goal` before substantive new steps and stop if status is paused.

Pros:

- Simple and provider-agnostic.

Risks:

- Cooperative only; does not address a model already in a long tool loop.
- Adds overhead to every continuation.

## Initial design preference

Prefer the strongest Pi-supported mechanism in this order:

1. Safe active-turn steer/interrupt if Pi supports it.
2. Tool-call gate plus queued pause notice if active steer is unavailable.
3. Prompt-level cooperative check as a fallback, not the only mechanism.

Do not choose until the Pi command/steer/abort APIs are inspected live.

## Acceptance criteria

- `/goal pause` while idle still persists paused status, updates UI, and prevents future continuation.
- `/goal pause` during an active automatic goal turn causes the current agent to stop substantive goal work promptly, either by active steer, interrupt, or tool-call gate.
- The user sees a clear notice that the goal is paused and can be resumed with `/goal resume`.
- No additional automatic continuation is scheduled while the goal is paused.
- `/goal resume` from paused idle state schedules continuation automatically without requiring a separate user message.
- Sentrux gate/check pass for `.pi/extensions/goal` after changes.
- Live/manual validation records the exact Pi mechanism used and any limitations.

## Validation plan

1. Start a goal that performs multiple visible steps.
2. While it is working, run `/goal pause`.
3. Confirm the active turn receives a pause signal or is stopped/gated.
4. Confirm no new continuation starts while paused.
5. Run `/goal resume`.
6. Confirm goal continuation starts without a separate follow-up message.
7. Run Sentrux:

```bash
sentrux gate .pi/extensions/goal
sentrux check .pi/extensions/goal
```

## Deferred / non-goals

- Do not implement the future churn overseer here.
- Do not add new goal statuses such as `pausePending` unless research proves it is needed.
- Do not make `/goal pause` clear or complete the goal.
- Do not require the user to send a normal prompt after `/goal resume`.

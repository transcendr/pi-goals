# 28 — State replay source recheck

## Source inspected

- `.pi/extensions/goal/state.ts`

## Finding

`toGoalState()` currently validates only the minimum floor fields explicitly and then spreads the stored goal object. This was acceptable for existing fields but is a risky pattern for idle policy because invalid stored values could change scheduling behavior after replay.

## Implementation requirement

Add explicit normalization for idle policy fields near `toGoalState()`:

- mode: accept only `immediate`, `idle_nudge`, or `manual`; default missing/invalid to `immediate` or omit while helper resolves to immediate.
- delay: accept positive integer seconds within a bounded range; default missing/invalid delay for `idle_nudge` to 90 seconds.
- wait reason: accept a bounded non-empty string or omit.
- waiting since: derive/update when policy enters waiting state; avoid trusting arbitrary malformed persisted data.

## Acceptance/proof impact

The `idle_policy_replay_probe` must fail if replay accepts malformed mode/delay values or if older goals without policy fields stop behaving as immediate-continuation goals.

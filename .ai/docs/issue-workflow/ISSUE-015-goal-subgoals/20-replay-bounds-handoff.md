# 20 — Replay bounds handoff

## Replay invariant

Existing goal replay must remain defensive: older goal events without subgoal fields continue to load as no-subgoal goals, and malformed child records must not crash replay.

## Bounded field recommendations

First implementation should bound at least:

- number of subgoals per parent;
- title length;
- objective length;
- evidence length;
- blocker reason length;
- return-to-parent length;
- template args/metadata length.

## Implementation impact

Add focused normalization helpers rather than scattering validation across tools, state replay, and UI. The helper should produce safe subgoal arrays for formatting and completion checks, and tool handlers should write only normalized records.

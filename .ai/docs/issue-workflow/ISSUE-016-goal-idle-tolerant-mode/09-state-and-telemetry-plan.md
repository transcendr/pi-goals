# 09 — State and telemetry plan

## GoalState fields

- `autoContinueMode?: "immediate" | "idle_nudge" | "manual"`
- `idleNudgeAfterSeconds?: number`
- `idleWaitReason?: string`
- `idleWaitingSince?: number`

## Replay defaults

- Missing `autoContinueMode`: immediate.
- Invalid mode: immediate.
- Invalid delay: undefined, interpreted as default 90s in scheduler.
- Empty/oversized wait reason: undefined or truncated by bounded helper.

## Telemetry

Avoid counting suppressed immediate continuation as a normal scheduled continuation. Add distinct telemetry only if needed, e.g. last idle-nudge scheduled/fired/skipped reason. Do not mutate existing no-progress safety counters merely because the agent intentionally waited.

## Compatibility

Older branch events remain valid because all new fields are optional and default to current behavior.

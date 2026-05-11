# 08 — Implementation handoff

## First pass scope

Implement top-level idle continuation policy only.

## Do

- Add optional `autoContinueMode`, `idleNudgeAfterSeconds`, `idleWaitReason`, and `idleWaitingSince` fields.
- Default missing policy to immediate continuation.
- Suppress 25ms `agent_end` follow-up for `idle_nudge` and `manual`.
- Schedule one delayed stale-guarded nudge for `idle_nudge`.
- Add tool parameters and replay normalization.
- Add prompt/UI/tool output summaries.

## Do not

- Add a new public goal status.
- Reuse queue or subgoal state for idle waiting.
- Replace churn monitor semantics.
- Implement external process watching.
- Add broad scheduler/calendar semantics.

## Highest-risk seam

`continuation.ts` currently centralizes immediate scheduling. The policy decision must happen before `noteContinuationScheduled()`/25ms timer creation so telemetry does not claim an immediate continuation was scheduled when the goal is intentionally waiting.

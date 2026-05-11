# 04 — Proof threat model

## Primary invariant

An active goal configured for `idle_nudge` may intentionally go idle without immediate auto-continuation, while still receiving a stale-guarded delayed nudge that asks the agent to reassess the wait.

## False-green risks

- Immediate `agent_end` continuation still fires for idle-nudge goals.
- Delayed nudge fires repeatedly or after the goal changed/paused/completed.
- `manual` accidentally schedules delayed nudges.
- Waiting goals are hidden in UI/tool output, causing users to think the goal is paused or stuck.
- Safety counters/no-progress telemetry treat intentional waiting as churn.
- Reload drops wait policy and restores immediate continuation unexpectedly.

## Deterministic proof strategy

- Unit/probe coverage for continuation scheduling: immediate vs idle-nudge vs manual.
- Replay coverage for optional policy fields and defaults.
- Prompt coverage for wait reason and reassessment instruction.
- UI/tool formatting coverage for active-but-waiting display.
- Existing quality gate coverage after implementation.

## Required proof rows

The canonical issue should require probes that fail if immediate continuation is not suppressed, delayed nudge stale guards are absent, replay drops policy fields, or UI/prompt context hides the wait state.

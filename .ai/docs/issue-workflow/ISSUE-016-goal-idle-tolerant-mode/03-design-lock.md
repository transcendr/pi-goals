# 03 — Design lock

## Decision

Implement a first-pass **idle-nudge continuation policy** on the active top-level goal.

## Locked policy schema

Add optional goal fields:

```ts
type GoalAutoContinueMode = "immediate" | "idle_nudge" | "manual";

type GoalState = {
  // existing fields...
  autoContinueMode?: GoalAutoContinueMode;
  idleNudgeAfterSeconds?: number;
  idleWaitReason?: string;
  idleWaitingSince?: number;
};
```

Defaults:

- Missing `autoContinueMode` means `"immediate"` for backward compatibility.
- `idle_nudge` defaults to 90 seconds if `idleNudgeAfterSeconds` is absent.
- `manual` disables automatic continuation and delayed nudges until the user/model changes the policy.

## Runtime behavior

- Immediate mode preserves current behavior.
- Idle-nudge mode suppresses the 25ms `agent_end` continuation and schedules one stale-guarded delayed nudge instead.
- The delayed nudge sends a normal follow-up continuation turn, but the prompt includes idle wait reason, elapsed idle time, and instruction to inspect whether the wait is still appropriate.
- If the goal changes, completes, pauses, clears, reloads, or has pending messages/non-idle context, stale timers do not fire or are rescheduled safely.

## Update surface

First release uses model tools by extending `create_goal`/`create_goal_from_template`/`update_goal` parameters. Slash command flags are deferred unless easy after tool implementation.

## Rejected alternatives

- New goal status like `waiting`: rejected because the issue explicitly avoids new public status and current active/paused/budget-limited/complete status semantics are enough.
- Reuse churn monitor only: rejected because churn monitoring is diagnostic/steering, not an explicit user-facing continuation policy.
- Manual-only mode as first pass: rejected because the reference need is delayed reconsideration, not permanent silence.

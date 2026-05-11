# 02 — Grounded research

## User-observed behavior

After `q-1778443864560-4` was marked complete, `/goal queue` still showed:

1. `q-1778443864560-5` — run `deslop-pipeline` with tweak to skip changing model to glm.
2. `q-1778443864560-6` — pick next high-leverage issue from `issues/refine` and run `create-issue-doc`.

The agent stopped with a normal final response instead of being forced/steered into queue continuation.

## Code surfaces inspected

- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/index.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/queue-steering.ts`
- `.pi/extensions/goal/queue-state.ts`

## Findings

### Queue steering exists but is turn-end gated

`lifecycle.ts` calls `sendQueueSteering(pi, "goal-complete")` only from `finishTurnGoal(...)` when:

```ts
if (goal?.status === "complete" && completedThisTurn) sendQueueSteering(pi, "goal-complete");
```

`completedThisTurn` comes from turn telemetry, not from the `update_goal` tool implementation itself.

### `update_goal(status:"complete")` does not directly schedule/trigger queue continuation

`tools.ts` persists completion and syncs UI, but does not itself send queue steering or schedule a follow-up turn when queued goals remain. It only schedules continuation when transitioning non-active -> active.

### `sendQueueSteering` defaults to a non-triggering steer

`queue-steering.ts` sends queue steering as:

```ts
{ deliverAs: "steer", triggerTurn: opts.triggerTurn }
```

For `goal-complete` from `lifecycle.ts`, no `triggerTurn` option is passed. That can inject context without guaranteeing a new agent turn after the assistant finalizes.

### Existing resume/clear paths are stronger

`command.ts` uses queue steering with `triggerTurn: true` for `/goal resume` when no active goal or a completed current goal blocks queued work. This indicates queue continuation sometimes intentionally needs a triggered turn, not just passive steer context.

## Probable root cause

The completion path relies on turn-end telemetry plus non-triggering queue steering. If the steering is not visible/effective before the agent finalizes, or if completion happens through a path not observed as `completedThisTurn`, remaining queued goals do not become an enforced continuation. The model can stop even though the queue is non-empty.

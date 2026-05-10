# 02 — Grounded research

## Commands and files inspected

See `raw/commands.log` for command transcript excerpts.

Files inspected directly:

- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/queue-tools.ts`
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`
- `package.json` / README references via `rg`

## Current behavior facts

### `/goal queue` command surface

`command.ts` owns the slash command. It detects the first token and routes `queue` to `handleQueueCommand()`.

`handleQueueCommand()` currently does exactly two shapes:

1. `rest` empty after `input.slice("queue".length).trim()`:
   - list current queue;
   - print `No queued goals.` when empty.
2. `rest` non-empty:
   - treat the entire rest string as one objective/template invocation;
   - call `resolveTemplateOrObjectiveDetails(rest, ctx)`;
   - validate one resolved objective;
   - call `enqueueGoal(...)` once;
   - persist one enqueue event;
   - notify one queued goal.

Therefore a pasted block after `/goal queue` would currently become one single objective containing embedded lines, not multiple queued goals.

### Queue persistence and ordering

`queue-state.ts` stores `QueuedGoal` items in `runtimeQueue`, generates stable queue ids, pushes enqueued items, and persists enqueue events with `persistEnqueue()`. Replay rebuilds the queue by applying enqueue/dequeue/remove events in order.

A multi-enqueue feature can reuse `enqueueGoal()` + `persistEnqueue()` repeatedly to preserve FIFO order and durability.

### Tool surface

`queue-tools.ts` exposes model-facing list/enqueue/start/dequeue/remove tools. Tool `enqueue_goal` accepts one objective. This issue is scoped to `/goal queue` block input unless implementation intentionally factors parser helpers for reuse.

### Prior queue issue

ISSUE-027 locked the queue as a durable FIFO with one active goal at a time. It required `/goal queue <text>` to append a queued goal after template resolution and validation. This new issue extends the command input shape without changing the queue model.

## Missing behavior

- No parser for line-item queue blocks.
- No bulk enqueue result summary.
- No partial-failure policy for mixed valid/invalid rows.
- No deterministic probes for multi-item queue command input.
- No live probe guidance specific to multi-line slash-command paste behavior.

## Reusable seams

- `validateObjective()` remains the correct validation path per item.
- `resolveTemplateOrObjectiveDetails()` remains the correct template/objective resolution path per item.
- `enqueueGoal()` and `persistEnqueue()` can be called once per accepted item.
- Existing queue list output can verify FIFO order after bulk enqueue.

## Planning conclusion

This is execution-ready with a narrow locked scope: add command-side parsing for a newline/list block after `/goal queue`, enqueue each row as its own queue item in order, and preserve all current single-line/list behavior.

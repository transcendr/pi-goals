# 02 Grounded Research — ISSUE-046

## Commands/files inspected

See `raw/commands.log` for captured command output.

Inspected:

- repo issue inventory and next issue number;
- `.pi/extensions/goal/queue-tools.ts`;
- `.pi/extensions/goal/command.ts`;
- `.pi/extensions/goal/queue-state.ts`;
- `.pi/extensions/goal/queue-steering.ts`;
- `.pi/extensions/goal/tools.ts`;
- `.ai/validation/*queue*` surfaces via ripgrep;
- Pinotator persisted session JSONL evidence at `/Users/bryan/.pi/agent/sessions/--Users-bryan-dev-personal-experiments-pinotator--/2026-05-15T19-33-42-043Z_019e2d21-5e1b-749d-a27c-7655d604e34c.jsonl`.

## Current implementation facts

- `list_goal_queue` is registered in `.pi/extensions/goal/queue-tools.ts`.
- `resultForQueue()` formats each queue row as:
  - position;
  - queue id;
  - objective truncated to 120 characters.
- `resultForQueuedGoal()` also truncates the queued objective to 120 characters in displayed text.
- Tool result details include the full `queue`/`queued` objects, but the model-facing text returned by the tool is still truncated.
- Slash-command queue display in `.pi/extensions/goal/command.ts` truncates objectives to 80 characters. That UI behavior is probably still appropriate for human-facing notifications.
- Queue steering in `.pi/extensions/goal/queue-steering.ts` already allows a much larger objective preview: `OBJECTIVE_PREVIEW_CHARS = 4_000`.
- Queue persistence in `.pi/extensions/goal/queue-state.ts` stores the full objective in `QueuedGoal.objective`, so no data-model migration is needed to expose full details.

## Pinotator incident evidence

The Pinotator session shows the agent-facing truncation clearly:

```text
LINE 638 TOOL list_goal_queue
Queued goals (8):
...
8. [q-1778925638320-8] create-issue-doc --bucket open --kind fix --title "Untruncated goal queue listing for agents" -- In /Users/bryan/dev/…
```

A later single-item listing remained truncated:

```text
LINE 663 TOOL list_goal_queue
Queued goals (1):
1. [q-1778925638320-8] create-issue-doc --bucket open --kind fix --title "Untruncated goal queue listing for agents" -- In /Users/bryan/dev/…
```

The same JSONL entries contained full details only outside the displayed text:

```text
DETAIL_OBJECTIVE: create-issue-doc --bucket open --kind fix --title "Untruncated goal queue listing for agents" -- In /Users/bryan/dev/personal/experiments/pi-goals, create this issue under that repo's .ai/issues/open. Problem: the list_goal_queue tool output shown to agents is truncated/excerpted for long queued objectives, so agents cannot directly see the full queue item text through the tool and may need to recover it by reading persisted Pi session JSONL. Desired behavior: pi-goals should expose full queued goal contents to agents, or provide an explicit non-truncated/details mode, while keeping UI output manageable. Include evidence from Pinotator session where list_goal_queue returned ellipsized objectives and the agent reconstructed the full queue from pi-goal-state custom entries in the session JSONL. Cover API/tool output design, backward compatibility, truncation/token-safety tradeoffs, and acceptance tests.
```

## Root cause

The data exists, but the default model-facing text path does not provide an explicit full-content escape hatch. The tool output truncates long queued objectives, and the only reliable full text visible in this incident was recovered from persisted session JSONL/tool result details rather than from an intentional `list_goal_queue` details mode.

## Reusable implementation surfaces

- `.pi/extensions/goal/queue-tools.ts` — primary agent-facing tool output surface.
- `.pi/extensions/goal/tool-schemas.ts` — likely place for list/detail parameter schema if the tool gains options.
- `.pi/extensions/goal/queue-state.ts` — already stores full objectives; may not need changes except if adding helper functions.
- `.pi/extensions/goal/command.ts` — human-facing slash queue output; likely keep compact, but optionally align hints.
- `.pi/extensions/goal/queue-steering.ts` — existing precedent for bounded long previews.
- `.ai/validation/goal-queue-*.mjs` or new `.ai/validation/goal-queue-list-details-probe.mjs` — deterministic proof surface.

## Gap summary

- Missing intentional API/tool mode for non-truncated queued objectives.
- Missing output hint that list rows are truncated and how to retrieve full text.
- Missing deterministic probe that a long queued objective is accessible through tool output without JSONL spelunking.
- Missing compatibility guarantee for existing no-arg `list_goal_queue` consumers.

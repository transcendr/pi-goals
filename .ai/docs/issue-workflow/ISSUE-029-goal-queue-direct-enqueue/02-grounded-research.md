# 02 — Grounded research

Commands recorded in `raw/commands.log`.

Files inspected:
- `.pi/extensions/goal/command.ts`

Findings:

1. The queue subcommand exists in `GOAL_SUBCOMMANDS` and `handleQueueCommand()` can directly enqueue a resolved objective.
2. `handleGoalCommand()` detects subcommands with:

```ts
const control = GOAL_SUBCOMMANDS.find((subcommand) => subcommand.name === trimmed.toLowerCase())?.name;
```

3. This only matches an exact argument string of `queue`.
4. For `/goal queue <text>`, `trimmed.toLowerCase()` is `queue <text>`, so `control` is undefined.
5. The command then falls through to:

```ts
await setGoalObjective(pi, resolveTemplateOrObjective(trimmed, ctx), ...)
```

6. With an existing goal, `setGoalObjective()` presents Replace/Queue/Cancel.

Likely root cause:
- Queue-with-argument dispatch is unreachable because subcommand parsing only recognizes exact `queue`, not `queue ` with trailing text.

Implementation surface:
- `.pi/extensions/goal/command.ts` `handleGoalCommand()` subcommand parsing.
- Existing `handleQueueCommand()` can be reused once dispatch passes the full trimmed input into it.

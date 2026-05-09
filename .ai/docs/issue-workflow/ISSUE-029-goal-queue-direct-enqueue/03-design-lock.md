# 03 — Design lock

Options considered:

1. Change subcommand parsing to detect `queue` followed by whitespace and route to `handleQueueCommand()`.
   - Pro: smallest fix; preserves existing queue handler.
   - Pro: matches user expectation that `/goal queue <text>` is an explicit queue command.

2. Add a special case inside `setGoalObjective()` for objectives starting with `queue `.
   - Rejected: mixes command parsing into goal creation and risks treating legitimate objectives starting with "queue" specially.

3. Require `/goal queue -- <text>` syntax.
   - Rejected: user explicitly expects `/goal queue <text>`.

Locked choice:
- Implement option 1: parse the first token as a subcommand. If the first token is `queue`, always route to `handleQueueCommand(pi, trimmed, ctx)`, including when trailing text exists.

Design details:
- `/goal queue` with no trailing text continues to list queued goals.
- `/goal queue <template invocation>` resolves the template and enqueues the resolved objective.
- `/goal queue <freeform objective>` validates and enqueues directly.
- This path must not call `setGoalObjective()` and must not show Replace/Queue/Cancel.

Execution-ready: yes.

---
description: Enqueue a list of provide goals and begin execution (or not) according to the provided arguments
aliases: enqueue-goals,enqueue-goal,enqueue-goal-list,enqueue-goals-list,queue-goals,queue-goal,queue-goal-list,queue-goals-list
usage: /goal enqueue-goal-stack --start <true|false> -- goal list in prose
examples: /goal enqueue-goal-stack --start true -- [goal list in prose]
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---

Enqueue all listed goals first, in the exact order shown.
Do not start execution until every goal is queued.
Then decide what to do:
- If `execution check` below says `enqueue only`, do not execute. Enqueue-only path: confirm and report the final queue list exactly, then mark this enqueue-goal-stack orchestration goal complete.
- In all other cases (e.g, `enqueue and execute immediately`), this enqueue-goal-stack orchestration goal is complete as soon as every listed goal has been enqueued. First mark this goal complete with `update_goal(status="complete")`, then start and execute the queued goals head-to-tail through the normal queue/goal lifecycle.

Execution check:
!`[ "{{start}}" = "false" ] && echo "enqueue only!" || echo "enqueue and execute immediately"`

IMPORTANT: If execution mode is `enqueue only`, do not run queued items or follow immediate auto-dequeue "queue item ready to resolve" instructions until explicitly authorized; resume normal automation only after go-ahead.

Goals to enqueue:

---
{{args}}
---

IMPORTANT: This template only enqueues and hands off to the queue. It is not the executor for queued work. Do not manually perform queued work while this enqueue-goal-stack goal is still active. If a queued item names or semantically matches a reusable goal template, create/start that template goal only after this orchestration goal has been marked complete.

IMPORTANT: DO NOT PAUSE FOR ANY REASON BETWEEN QUEUED ITEMS UNLESS EXPLICITLY TOLD TO DO SO BY THE USER. "HEAD TO TAIL" MEANS THE QUEUE IS EMPTY WHEN YOU PAUSE. THIS IS NOT A SUGGESTION, THIS IS MANDATORY.

# 02 — Grounded research

Commands recorded in `raw/commands.log`.

Files/surfaces inspected:
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/monitor.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/command.ts`

Findings:

1. Queue state exists and is persisted/replayed through `queue-state.ts`.
2. Manual queue tools exist: `list_goal_queue`, `enqueue_goal`, `dequeue_goal`, `remove_queued_goal`.
3. `clearGoal()` and `clear_goal` mention queued goals only as informational hints; they do not inject a steering prompt to the agent.
4. `handleTurnEnd()` detects goal completion indirectly: `noteGoalUpdateResult()` sets `activeTurn.completedGoal = true` when `update_goal` returns a complete goal.
5. No queue-aware action happens after `updated?.status` becomes `complete` in `handleTurnEnd()`.
6. Existing steering mechanisms use `pi.sendMessage(..., { deliverAs: "steer" })` for budget, continuation, and monitor-style intervention.
7. Queued goals currently store optional `template`, `templateFlags`, and `templateArgs`, but current enqueue command/tool paths mostly enqueue resolved objective text only. Template-origin metadata should be preserved or added when queueing template requests so later steering can tell the agent which creation tool to use.

Likely root cause:
- ISSUE-027 implemented storage/listing/manual dequeue but not automatic queue handoff after current goal completion/clear.

Implementation surfaces:
- Queue prompt builder module or helper.
- `lifecycle.ts` turn-end completion path.
- `command.ts`/`tools.ts` clear paths.
- Queue enqueue paths if template-origin metadata is needed.

# 02 — Grounded research

Research commands and outputs are captured in `raw/commands.log`.

Files inspected:

- `.ai/docs/pi-goals-compaction-continuation-investigation.md`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/telemetry.ts`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/open/ISSUE-037-goal-queue-auto-continuation-after-complete.md`
- `~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/compaction.md`
- `~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
- `~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/agent-session.js`

Live code facts:

1. `registerGoalLifecycle()` in `.pi/extensions/goal/lifecycle.ts` listens to `session_start`, `session_tree`, `turn_start`, `tool_call`, `tool_result`, `turn_end`, `agent_end`, `message_update`, and `context`.
2. It does not register `session_before_compact` or `session_compact` handlers.
3. The `agent_end` handler calls `scheduleMaybeContinueGoal(pi, ctx, "agentEnd")`.
4. `scheduleMaybeContinueGoal()` in `.pi/extensions/goal/continuation.ts` creates a 25ms timer, then `maybeContinueGoal()` checks active goal status, `ctx.isIdle()`, `ctx.hasPendingMessages()`, and safety caps before sending a hidden continuation custom message with `{ triggerTurn: true, deliverAs: "followUp" }`.
5. There is no compaction-in-progress guard in `continuation.ts`, and no post-compaction reschedule path.
6. `ContinuationReason` currently allows only `"created" | "resumed" | "agentEnd"`.
7. `ContinuationSkipReason` has no compaction-specific reason.
8. Pi core `_processAgentEvent()` emits extension events and ordinary listeners before retry/compaction handling; for `agent_end`, it then checks retryable errors and calls `_checkCompaction()`.
9. Pi core `_checkCompaction()` documents two compaction cases: overflow compaction with auto-retry and threshold compaction with no auto-retry.
10. Pi core `_runAutoCompaction()` emits `session_before_compact`, appends the compaction, rebuilds `agent.state.messages`, emits `session_compact`, then for `willRetry` calls `agent.continue()`; otherwise it only calls `agent.continue()` when `agent.hasQueuedMessages()` is true.
11. Pi core binds extension `ctx.isIdle()` as `() => !this.isStreaming`; the same binding does not account for `this.isCompacting`.
12. Pi docs confirm extensions can observe `session_before_compact` and `session_compact` and that compaction reloads session context after appending a `CompactionEntry`.

Root-cause assessment:

The failure is likely a race/lost-continuation boundary. `pi-goals` schedules continuation from `agent_end`, but Pi may auto-retry and/or auto-compact after extension `agent_end`. During that window, `ctx.isIdle()` can return true even while compaction is active, because it only reflects streaming. A continuation timer can therefore fire too early, race with compaction state replacement, or skip once with no later retry. After threshold compaction (`willRetry=false`), Pi does not inherently continue unless the agent has queued messages; a direct pi-goals `triggerTurn` continuation may not be in that queue. Since `pi-goals` has no `session_compact` recovery hook, an active goal can remain idle after compaction.

Adjacent issues:

- ISSUE-022 covers compaction-aware checkpoint/history handoffs, but not active continuation recovery.
- ISSUE-037 covers queue continuation after goal completion, another silent-stop class, but not active-goal continuation after compaction.

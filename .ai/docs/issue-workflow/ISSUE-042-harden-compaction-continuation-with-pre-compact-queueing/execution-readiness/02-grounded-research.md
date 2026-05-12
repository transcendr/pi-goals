# 02 — Grounded research

Primary command log:
- `raw/commands.log`

Planning and repro facts:
- Existing issue: `.ai/issues/open/ISSUE-039-recover-active-goal-continuation-after-compaction.md`.
- ISSUE-039 status says implemented/fixed, but user supplied a live `/tree export` where after a normal assistant response and `[compaction: 257k tokens]`, the agent went idle while a queued goal still existed.
- Acceptance worker process `18` returned iteration-2 green for AC-1/AC-6 but explicitly recorded material gaps: static code probes only, no runtime probe for post-compaction not-idle/pending-message scenarios, no live proof that an agent turn starts after compaction.

Pi core facts inspected:
- `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/agent-session.js` exposes `sendCustomMessage` semantics:
  - `deliverAs: "nextTurn"` stores a pending next-turn message.
  - while streaming, `deliverAs: "followUp"` calls `this.agent.followUp(appMessage)` and `deliverAs` other than follow-up calls `this.agent.steer(appMessage)`.
  - when not streaming and `triggerTurn` is true, Pi calls `agent.prompt(appMessage)` immediately.
  - when not streaming and no trigger is set, Pi appends a custom message to state/session but does not start a turn.
- The same Pi core `_runAutoCompaction` emits `session_before_compact`, generates/appends compaction, rebuilds `agent.state.messages`, emits `session_compact`, then:
  - if `willRetry`, schedules `agent.continue()`;
  - else if `this.agent.hasQueuedMessages()`, schedules `agent.continue()`.
- Therefore the desired no-core-change strategy must prove the extension can create an actual queued agent message before compaction such that `agent.hasQueuedMessages()` is true after compaction.

pi-goals implementation facts inspected:
- `.pi/extensions/goal/lifecycle.ts` registers both `session_before_compact` and `session_compact`.
- Current `session_before_compact` calls `beginGoalCompaction(pi)` without `ctx`, so it cannot currently inspect queue state with context or send a queued follow-up through context-aware logic.
- Current `session_compact` replays goal/queue state, syncs UI/monitor, then calls `finishGoalCompaction(pi, ctx)`.
- `.pi/extensions/goal/continuation.ts` current behavior:
  - `beginGoalCompaction` marks compaction active, records active goal id, cancels a pending continuation timer, and records `compacting` skip telemetry.
  - `finishGoalCompaction` clears compaction state and schedules a one-shot `scheduleMaybeContinueGoal(..., "compacted")` only for active goals.
  - `maybeContinueGoal` permanently skips when `ctx.isIdle()` is false or `ctx.hasPendingMessages()` is true; it does not retry those transient states.
- `.pi/extensions/goal/queue-steering.ts` can send queue steering with `sendQueueHandoff` / `sendQueueSteering`; default behavior uses `{ deliverAs: "steer", triggerTurn: true }` and dedupes by reason, goal id, and queue id.
- `.pi/extensions/goal/queue-state.ts` exposes `getQueue()`, making completed-goal-plus-queued-work detection available within extension code.

Proof facts inspected:
- Existing compaction probes under `.ai/validation/goal-compaction-*.mjs` are source-text/regex probes. They assert strings/order in files but do not instantiate extension behavior, mock `pi.sendMessage`, or assert queued delivery/runtime retries.
- `npm run quality:goal` passed for ISSUE-039 historically, but that gate cannot prove live post-compaction continuation delivery.

Acceptance prompt side-note facts:
- `.ai/.pi-goals/verify-acceptance-item.md` already says if a plausible false-green risk cannot be ruled out, return red or blocked.
- `.ai/.pi-goals/verify-acceptance-pipeline.md` currently tells the pipeline to aggregate item results but does not explicitly reject green rows that contain material `gap` or required `next_action` text.
- The live acceptance worker nonetheless returned green rows with material gaps, so pipeline prompt hardening should make the aggregator reject green-with-real-gap and issue correction prompts.

Research conclusion:
- ISSUE-039 failed because the post-compaction path is one-shot and runtime proof was too weak.
- The new issue should lock a no-core-change design that prefers pre-compaction queued hidden follow-up delivery, then retains bounded post-compaction retry as a safety net for transient readiness races.

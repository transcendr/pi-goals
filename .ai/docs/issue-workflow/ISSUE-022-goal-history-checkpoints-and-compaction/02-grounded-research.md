# 02 — Grounded research for ISSUE-022

## Planning/docs inspected

- `.ai/issues/refine/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`
- `README.md`

## Code/API inspected

- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/tool-results.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/monitor-report.ts`
- `.pi/extensions/goal/constants.ts`
- `.pi/extensions/goal/index.ts`
- `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts`

Primary command transcript: `raw/commands.log`.

## Current live behavior facts

- `GoalState` currently holds objective, status, budgets/floors, usage, and timestamps. It has no checkpoint, history, proof, or subgoal fields yet.
- `GoalTelemetrySnapshot` stores turn, continuation, safety, budget, and floor metadata. It is compact and machine-oriented; it is not a human-readable timeline.
- `state.ts` persists branch-replayable `pi-goal-state` custom entries via `pi.appendEntry(STATE_ENTRY_TYPE, event)` and replays them from `ctx.sessionManager.getBranch()`.
- `state.ts` defensively ignores invalid/nonmatching goal events and stale updates by goal id. This is the key model to copy for checkpoint replay.
- `lifecycle.ts` replays goal state, monitor state, and queue state on `session_start` and `session_tree`; it currently does not listen for compaction events.
- Pi extension API exposes `session_before_compact` and `session_compact` events plus `ctx.compact()`. These are the correct compaction-adjacent hooks; ISSUE-022 should not replace Pi compaction.
- `monitor-report.ts` already builds sparse bounded reports from recent branch entries, recent monitor logs, floor state, goal state, telemetry, session id, and branch entry count. This is a reusable pattern for checkpoint summary content.
- `prompts.ts` completion audit asks the model to inspect real evidence before completing, but this is turn-local guidance rather than durable checkpoint history.
- `tool-results.ts` centralizes model-visible goal summaries. History/checkpoint summaries should extend model-visible tool output there or in a dedicated history module rather than bloating every prompt.
- `command.ts` has subcommands `pause`, `resume`, `clear`, and `queue`; no `checkpoint` or `history` command exists today.
- `tools.ts` registers persistent-goal and queue tools; no model tool exists for checkpoint creation/list/export today.
- `README.md` describes branch-replayable goal state and replayable monitor state, but no human-readable checkpoints/history UX.
- Sentrux planning sensor on `.pi/extensions/goal` saved a baseline with quality `6241`.

## Cross-issue planning facts

- ISSUE-015 plans nested subgoals and explicitly defers durable human-readable checkpoints to ISSUE-022.
- ISSUE-021 plans proof gates/results and notes automatic checkpoint generation for proof results should wait for ISSUE-022.
- ISSUE-024 audit should consume proof/subgoal/floor/budget/telemetry state but must not own history or proof execution.
- ISSUE-016 idle-nudge mode introduces active waiting state that checkpoints should summarize at lifecycle boundaries, but ISSUE-022 should not implement idle scheduling.
- ISSUE-023 watchers will need checkpoint/export hooks for external-trigger handoffs later, but watcher execution is out of first-pass scope.

## Gap list

- No durable human-readable checkpoint event type.
- No bounded checkpoint schema or caps.
- No command/tool surface for manual checkpoints or history view/export.
- No automatic lifecycle checkpoint trigger at pause, budget limit, completion, or compaction.
- No compaction-aware handoff instructions or latest-checkpoint summary injection.
- No validation probes proving checkpoints replay branch-locally and stay out of normal provider context.

## Plan updates required

- Lock storage to a separate replayed checkpoint custom-entry stream, not large summaries embedded in `GoalState` snapshots.
- Lock first-pass authoring to deterministic extension-built summaries plus optional bounded note, not model-written freeform checkpoint prose.
- Lock triggers to manual creation plus clear lifecycle boundaries only.
- Add bounded list/export UX and proof rows that fail on replay breakage, context bloat, unbounded summaries, or missing compaction checkpoint hooks.

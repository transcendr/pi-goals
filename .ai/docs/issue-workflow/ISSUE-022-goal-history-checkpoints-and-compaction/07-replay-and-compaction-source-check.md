# 07 — Replay and compaction source check for ISSUE-022

## Sources inspected

- `.pi/extensions/goal/monitor-state.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/queue-tools.ts`
- Pi extension API definitions around `SessionBeforeCompactEvent`, `SessionCompactEvent`, `SessionBeforeCompactResult`, and `ExtensionEvent`.

## Findings

### Separate replayed custom-entry precedent exists

`monitor-state.ts` persists monitor decisions with `GOAL_MONITOR_LOG_ENTRY_TYPE` as a separate custom entry stream. It replays entries from `ctx.sessionManager.getBranch()`, caps evidence summary to 1000 chars, and exposes `getRecentMonitorLogs(goalId, limit)`.

Impact: ISSUE-022 should follow this pattern more than the queue pattern for history/checkpoints: dedicated entry type, goal-id filtering, capped summaries, and bounded list access.

### Queue state intentionally reuses the goal state entry type

`queue-state.ts` persists queue events under `STATE_ENTRY_TYPE` with `kind: enqueue/dequeue/remove`, then parses optional fields defensively. This works because queue operations are tightly tied to top-level goal state/steering.

Impact: checkpoint history should not further overload `STATE_ENTRY_TYPE`; a dedicated checkpoint custom type keeps replay and migration cleaner and avoids making `state.ts` parse unrelated long-lived history concerns.

### Queue tools show explicit audit metadata pattern

`queue-tools.ts` requires `rationale` and `authority` for `dequeue_goal` and persists them with the dequeue event.

Impact: explicit checkpoint export should similarly preserve why/how an export was created when useful, but checkpoint creation itself should not become a queue mutation or dequeue authority path.

### Compaction API has events but limited result override shape

Pi extension types expose:

- `SessionBeforeCompactEvent` with `preparation`, `branchEntries`, optional `customInstructions`, and `signal`.
- `SessionCompactEvent` with `compactionEntry` and `fromExtension`.
- `SessionBeforeCompactResult` with `cancel` and optional full `compaction` replacement.

The result type does not obviously expose a simple custom-instructions return field. If implementation mutates `event.customInstructions`, it should be validated against a live/deterministic probe; otherwise the first pass should still create before/after compaction checkpoints without relying on instruction mutation.

Impact: ISSUE-022 wording should avoid requiring unsafe compaction prompt mutation. The invariant is bounded compaction handoff metadata; adding a prompt hint is optional and must be proven if implemented.

## Issue updates implied

- Prefer a dedicated `pi-goal-checkpoint` entry type.
- Required compaction proof should allow either safe bounded instruction hinting or checkpoint-only handoff metadata, but must fail if compaction has no goal-history handling at all.
- Provider-context proof should specifically guard normal continuation/monitor prompts; compaction-specific hints, if implemented, must be bounded and latest-only.

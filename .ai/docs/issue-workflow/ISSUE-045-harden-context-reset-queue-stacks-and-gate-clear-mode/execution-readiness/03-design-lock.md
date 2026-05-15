# 03 — Design lock

## Status

Execution direction is locked. The issue should not ask the implementer to choose between clear-vs-summarize product posture or between global queue durability vs scoped continuation repair.

## Chosen design

```toon
toon.version: 1
locked_choices[7]{id,choice,consequence}:
  "lc1","summarize queue stacks are the supported main path","the fix must make queued goal stacks that summarize between goals live-green, not merely disable all context reset in queues"
  "lc2","clear mode is separately gated default-off","clear remains parseable/API-visible but does not navigate unless PI_GOAL_CONTEXT_RESET_CLEAR explicitly enables it"
  "lc3","do not silently downgrade clear to summarize","disabled clear records/skips/warns actionably and goal/queue continuation continues"
  "lc4","cache a continuation envelope before navigation","terminal workflow stores queue head payload plus ticket metadata before context reset, not just queueId"
  "lc5","repair/replay only continuation-relevant queue state after automated navigation","manual tree navigation still replays branch state normally; only pi-goal initiated reset gets scoped queue repair"
  "lc6","invalidate stale queue steers by generation/consumption state","old pi-goal-queue-steer messages must not remain valid after dequeue/start/completion or after navigation repair"
  "lc7","dispatch one fresh queue handoff after repair/navigation barrier","terminal workflow sends at most one current queue steer for the repaired queue head and does not let stale branch steers drive loops"
```

## Detailed behavior to implement

### Clear gate

- Add clear-specific feature flag, recommended name: `PI_GOAL_CONTEXT_RESET_CLEAR`.
- Default: disabled.
- Existing `PI_GOAL_CONTEXT_RESET=0` still disables both summarize and clear context reset.
- If `context.reset` mode is `clear` while clear gate is disabled:
  - do not call `navigateTree`;
  - persist action status `skipped` or an equivalent terminal non-fatal state;
  - show a visible warning/status message that clear context reset is disabled and continuation will proceed;
  - do not downgrade to summarize.

### Summarize queue stack repair

- Extend `ContinuationTicket` into a continuation envelope or equivalent state object that captures:
  - terminal goal id and terminal reason;
  - queued head id;
  - queued head payload/objective/template/budgets/post-completion action specs;
  - enough queue generation/epoch metadata to identify stale queue steers.
- Capture this before post-completion actions run.
- Run summarize context reset behind a navigation barrier.
- After `navigateTree` returns, repair branch state for the automated workflow:
  - completed goal state remains complete;
  - if the queued head disappeared only because navigation selected a branch before the enqueue, replay/merge the cached queued head;
  - do not resurrect a queued item that was explicitly removed or already started on the surviving branch;
  - update/invalidate queue steering generation so old steer messages are not valid.
- Dispatch one fresh queue handoff only after repair and revalidation.

### Stale steer suppression

- Queue steering messages should include enough identity beyond `queueId` to tell whether they belong to the current queue generation/handoff attempt.
- `queueSteeringStillValid` should reject stale/consumed generations, not just check `getQueue()[0]?.queueId === details.queueId`.
- Starting/dequeueing a queued item should invalidate any previous steer for that queue id.
- Post-navigation replay should not allow old branch steers to be the latest valid steer when a fresh handoff is about to be sent.

### Tool-call desync posture

- Treat `No tool call found for function call output ...` during reset/queue-stack scenarios as a feature regression until fixed or conclusively disproven.
- The implementation should avoid navigating in a way that leaves Codex with pending/dangling tool-call branches.
- If the runtime cannot safely summarize/navigate at a specific terminal boundary, it should skip/fail the optional action visibly and continue the queue rather than poison the session.
- Required live proof must include absence of this Codex error in the summarize queue-stack scenario.

## Rejected alternatives

```toon
toon.version: 1
rejected[6]{id,alternative,reason}:
  "r1","make all queue state globally durable outside tree semantics","manual tree navigation should still revert branch-local goal/queue mutations normally"
  "r2","disable all context reset in queued stacks","user's main use case is queued goal stacks summarized between goals"
  "r3","leave clear enabled by the broad context reset flag","clear has little value over summarize and current clear/reset queue flows are unsafe"
  "r4","silently convert clear to summarize","would misrepresent user intent and make live evidence ambiguous"
  "r5","only snapshot queueId in continuation ticket","live failure shows queueId-only revalidation loses the queued payload after navigation"
  "r6","treat Codex tool-call desync as unrelated noise","owner reports it appeared with this feature and live evidence correlates it with reset/tree navigation"
```

## Execution-ready implications

The next implementation session should start from these choices. It should not ask whether clear should remain default-on, whether summarize stacks matter, or whether automated reset should protect its own continuation. Those are locked.

Open implementation details that can be decided during coding:

- exact flag naming if project conventions suggest a better name than `PI_GOAL_CONTEXT_RESET_CLEAR`;
- exact shape/file name for queue generation state;
- whether continuation envelope is a new type or an extension of `ContinuationTicket`;
- exact UI copy for disabled clear/skipped reset warnings.

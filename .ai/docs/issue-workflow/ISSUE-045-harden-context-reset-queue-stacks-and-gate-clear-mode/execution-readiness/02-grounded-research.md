# 02 — Grounded research

## Sources inspected

Code/docs/artifacts inspected in this pass:

- `.ai/issues/open/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks.md`
- `.ai/docs/live-probe-scenarios/post-completion-context-reset-full-suite.md`
- `/tmp/issue044-full-context-live-probe-20260514T215821Z/closeout.md`
- `.pi/extensions/goal/context-reset.ts`
- `.pi/extensions/goal/feature-flags.ts`
- `.pi/extensions/goal/terminal-workflow.ts`
- `.pi/extensions/goal/continuation-ticket.ts`
- `.pi/extensions/goal/queue-steering.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/goal-intent.ts`
- `.pi/extensions/goal/tool-schemas.ts`
- `.pi/extensions/goal/types.ts`
- `.ai/validation/goal-context-reset-action-runner-probe.mjs`
- `.ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs`
- `.ai/validation/goal-post-completion-feature-flag-probe.mjs`
- `.ai/validation/goal-tool-post-completion-actions-schema-probe.mjs`

Command snippets are recorded in `raw/commands.log`.

## Structural sensor

`sentrux check .pi/extensions/goal` passed with 33 rules checked and quality `6152`. This issue is not about gross coupling/cycles/god-file failure; it is about runtime state/branch semantics around a specific terminal workflow.

## Current implementation facts

```toon
toon.version: 1
current_facts[12]{id,surface,fact}:
  "cf1","context-reset","createContextResetActionRunner stores a captured ExtensionCommandContext and calls ctx.navigateTree(anchorEntryId, summarize-or-clear-options)"
  "cf2","feature-flags","existing flags are PI_GOAL_POST_COMPLETION_ACTIONS and PI_GOAL_CONTEXT_RESET; there is no clear-specific gate"
  "cf3","terminal-workflow","processTerminalGoalWorkflow decides a ContinuationTicket before actions, runs actions, syncs UI, then revalidates against current goal and getQueue()"
  "cf4","continuation-ticket","ticket stores goalId and queueId only; it does not snapshot the queued goal or queue mutation payload"
  "cf5","continuation-ticket","revalidation requires getQueue()[0]?.queueId to still match ticket.queueId after actions/navigation"
  "cf6","queue-state","queue events are custom pi-goal-state entries replayed from ctx.sessionManager.getBranch(); navigating to a branch before an enqueue legitimately removes that queue mutation from replayed state"
  "cf7","goal-state","goal state is also custom pi-goal-state, but post-navigation action completion persists a fresh complete goal snapshot, which explains why isolated completed goals survive reset"
  "cf8","queue-steering","queueSteeringStillValid only checks whether message.details.queueId equals getQueue()[0]?.queueId"
  "cf9","queue-steering","sendQueueHandoff dedupes with an in-memory lastQueueHandoffKey, but tree navigation/replay can still leave old pi-goal-queue-steer messages in branch context"
  "cf10","lifecycle","context filtering keeps the latest valid queue steer and treats invalid older steering as removable; validity depends on current replayed queue head"
  "cf11","intent","direct/template/tool normalization accepts both clear and summarize context.reset modes"
  "cf12","probes","existing deterministic probes cover action runner basics, failure-nonblocking queue dispatch, feature flag disabling, and tool schema exposure, but not successful reset plus post-anchor queued handoff or stale steer replay across navigation"
```

## Live/manual evidence facts

```toon
toon.version: 1
live_facts[8]{id,scenario,result,evidence}:
  "lf1","single slash clear","pass","manual output: isolated /goal count to 10 and clear context navigated and retained complete goal state"
  "lf2","single slash summarize","pass","manual test 2 completed with summarize/navigation"
  "lf3","slash clear + queued follow-up","fail","manual test 3: queued count-to-2 got eaten after context reset"
  "lf4","slash summarize + queued follow-up","fail","manual test 4: Codex No tool call found for function call output; /goal queue initially still showed queued goal"
  "lf5","manual tree navigation after summarize failure","expected revert","after navigating to pre-error parent, /goal queue showed no queued goals; normal tree semantics revert branch state"
  "lf6","slash template summarize","pass","manual test 5: branch summary, Navigated to selected point, template inventory complete"
  "lf7","slash template clear","pass","manual test 6: Navigated to selected point, template inventory complete"
  "lf8","model-tool enqueue/start structured clear","fail","manual test 10: tree showed repeated pi-goal-queue-steer branches after first completion; Operation aborted text surfaced only after interrupt/pause"
```

## Root-cause interpretation

The common failure source is automated post-completion tree navigation while queue/steering/tool-call state exists after the reset anchor.

Manual tree navigation reverting branch-local goal/queue state is correct. The bug is narrower: pi-goal initiates automated navigation as part of terminal goal workflow, so pi-goal must preserve exactly the continuation-relevant queue handoff state it is responsible for across its own navigation, and must suppress/recreate steering messages so stale queue steers do not replay.

The current continuation ticket captures only `queueId`, then revalidates against `getQueue()` after navigation. If navigation replays a branch before the enqueue, `getQueue()` no longer contains the head and the ticket cannot dispatch. That explains the eaten-queue failure. Conversely, if a queue steer survives/replays as valid, context filtering can keep reinjecting queue-start instructions, explaining the repeated queue-steer branch loop.

The Codex `No tool call found for function call output ...` failure is not proven inside this codebase, but live evidence strongly correlates it with context reset/tree navigation while tool-call branches are pending. The issue should treat this as feature-caused or feature-exposed until a fix proves otherwise.

## Existing proof gaps

- No deterministic probe asserts that a successful context reset with a post-anchor queued follow-up starts the queued goal.
- No deterministic probe asserts that queue handoff tickets carry enough queued payload to survive automated branch navigation.
- No deterministic probe asserts stale `pi-goal-queue-steer` messages are invalidated after `start_queued_goal`/dequeue/completion across tree navigation.
- No live scenario specifically validates the main use case: a goal queue stack that summarizes between goals and continues to the next queued goal without Codex tool-call desync.
- `clear` remains enabled by the broad context reset flag even though owner direction is to gate `clear` separately/default-off for now.

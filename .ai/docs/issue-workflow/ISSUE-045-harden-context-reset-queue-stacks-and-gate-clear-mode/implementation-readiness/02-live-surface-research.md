# 02 — Live surface research

## Commands/files inspected

See `raw/commands.log` for `rg`/inventory output. Key files read or inspected:

- `.pi/extensions/goal/index.ts`
- `.pi/extensions/goal/feature-flags.ts`
- `.pi/extensions/goal/context-reset.ts`
- `.pi/extensions/goal/post-completion-actions.ts`
- `.pi/extensions/goal/terminal-workflow.ts`
- `.pi/extensions/goal/continuation-ticket.ts`
- `.pi/extensions/goal/queue-steering.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/types.ts`
- `.ai/validation/goal-context-reset-action-runner-probe.mjs`
- `.ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs`
- `.ai/validation/goal-post-completion-feature-flag-probe.mjs`
- `.ai/validation/goal-tool-post-completion-actions-schema-probe.mjs`
- `package.json`

## Surface map

```toon
toon.version: 1
surfaces[12]{path,classification,planned_role}:
  ".pi/extensions/goal/feature-flags.ts","edit","add clear-specific default-off flag while preserving broad context reset flag"
  ".pi/extensions/goal/context-reset.ts","edit","skip/warn disabled clear; keep summarize navigation; expose typed skip result"
  ".pi/extensions/goal/types.ts","edit","add queue-origin metadata on GoalState and queue repair/steer generation types if shared"
  ".pi/extensions/goal/continuation-ticket.ts","edit","replace queueId-only ticket with continuation envelope carrying queued snapshot and sourceQueueId repair data"
  ".pi/extensions/goal/terminal-workflow.ts","edit","add post-navigation repair barrier before queue handoff dispatch"
  ".pi/extensions/goal/queue-state.ts","edit","add queue revision/generation, exact queued-goal restore, queue source consume repair, and replay helpers"
  ".pi/extensions/goal/queue-steering.ts","edit","include queue revision/generation in steer messages and reject stale/consumed steers"
  ".pi/extensions/goal/lifecycle.ts","edit","keep context filtering but use strengthened queueSteeringStillValid"
  ".pi/extensions/goal/queue-tools.ts","edit","set sourceQueueId when starting queued goals and invalidate queue steering on dequeue/start"
  ".pi/extensions/goal/tools.ts","edit","stop running navigateTree terminal workflow inside update_goal tool execution; rely on turn_end or deferred post-tool workflow"
  ".pi/extensions/goal/command.ts","edit","ensure command-enqueued/start paths carry source queue metadata and generation if needed"
  ".ai/validation/*.mjs","create/edit","add deterministic probes for clear gate, queue repair, steer generation, manual replay, model-tool enqueue once"
```

## Key findings

```toon
toon.version: 1
findings[8]{id,finding,implication}:
  "f1","index.ts composes the post-completion runner from getGoalFeatureFlags and createContextResetActionRunner","clear-specific flag belongs in feature-flags and context-reset composition, not scattered through lifecycle"
  "f2","context-reset.ts checks only flags.contextReset before navigateTree","disabled clear needs an additional mode-specific check before navigateTree"
  "f3","terminal-workflow.ts decides ticket, runs actions, then revalidates against getQueue()","post-navigation repair must happen between actions and revalidation/dispatch"
  "f4","ContinuationTicket only stores goalId and queueId","ticket/envelope must include queued payload and sourceQueueId repair data"
  "f5","queue-state.ts mutates runtimeQueue separately from persistEnqueue/persistDequeue","repair helpers must update runtime state and persist matching repair events together"
  "f6","queueSteeringStillValid only checks queueId equals current head","need revision/generation/consumption validity to reject stale branch steers"
  "f7","tools.ts calls processTerminalGoalWorkflow from update_goal tool execution via queueHandoffAfterToolUpdate","navigateTree during a tool execution is a plausible source of Codex tool-call desync and should be deferred until turn_end or a safe post-tool barrier"
  "f8","GoalState lacks sourceQueueId/origin metadata","queued-goal completion cannot reliably consume a reappeared source queue item after navigation without adding source queue metadata"
```

## Implementation implication

The implementation should not just add a bigger ticket. It needs four coordinated changes:

1. mode-specific clear gating;
2. terminal workflow repair barrier after navigation;
3. queue revision/generation-backed steering validity;
4. safe timing for terminal workflow actions after model-tool `update_goal` results.

The fourth point is important: live Codex desync likely arises because `update_goal` can trigger `navigateTree` before the tool-call/result lifecycle is fully settled. The plan below should move navigation out of tool execution and into turn-end/deferred terminal processing.

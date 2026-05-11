# ISSUE-027 — Goal queue

Status: fixed — implemented
Priority: P1
Owner: pi-goal automation
Created: 2026-05-09
Next best session: focused implementation/validation pass for persisted sequential goal queue
Next best session rationale: The requested first pass can be implemented without resolving broader parallel-goal/worktree architecture; it extends current single-goal runtime with a persisted FIFO queue, command/tool surfaces, and stale-guarded next-goal prompting.
Target bucket: fixed
Issue kind: feature
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: none for first pass
Related:
- `.ai/issues/open/ISSUE-019-parallel-multiple-goals.md`
- `.ai/issues/open/ISSUE-023-goal-dependency-triggers-and-watchers.md`

Goal: Add a durable sequential queue for future pi-goals so users and agents can enqueue goals while another goal is active, inspect the queue, and advance to the next queued goal after the current goal completes or clears.

## Problem/context

Today `pi-goal` supports one current goal. When the user submits another `/goal <objective>` while any current goal exists, the command asks only whether to replace the existing goal. That works for simple replacement, but it does not support the common workflow where the user or agent wants to record the next goal without interrupting the current one.

The desired behavior is a simple queue:

- user enters `/goal <objective>` while a goal exists;
- replace prompt offers a `queue` option in addition to replace/cancel;
- queued objectives are persisted and reviewable;
- the agent can inspect and add queued goals;
- when the current goal completes or clears, the next queued goal is surfaced to the agent with instructions to create/start it, using the existing hidden steering/follow-up style rather than silent magic.

This is narrower than full parallel/multi-goal orchestration. It should preserve the current single-active-goal invariant.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-027-goal-queue/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-027-goal-queue/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-027-goal-queue/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-027-goal-queue/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-027-goal-queue/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-027-goal-queue/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-027-goal-queue/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-027-goal-queue/raw/commands.log`

## Research findings

Current implementation facts from inspected files:

- `.pi/extensions/goal/command.ts` only has `pause`, `resume`, and `clear` subcommands.
- Any non-control `/goal <text>` resolves template-or-objective and calls `setGoalObjective()`.
- `setGoalObjective()` validates and then calls `ctx.ui.confirm("Replace goal?", ...)` whenever a current goal exists; there is no queue branch.
- `.pi/extensions/goal/state.ts` persists active goal events under `pi-goal-state` and replays only `{ goal, telemetry }` runtime state.
- `.pi/extensions/goal/types.ts` has no queue record, queue event, or runtime queue field.
- `.pi/extensions/goal/continuation.ts` and `.pi/extensions/goal/lifecycle.ts` already demonstrate hidden follow-up and steering injection patterns with stale status filtering.
- `.pi/extensions/goal/tools.ts` exposes goal tools but no queue tools.
- ISSUE-019 is a broader refine-only multi-goal/parallel-goal topic; this issue should not solve that larger architecture.
- ISSUE-023 is about external watchers; this queue needs only an internal complete/clear trigger.

## Desired behavior

### User command behavior

- `/goal queue` with no extra text shows the current queue with stable ids, positions, objective excerpts, created time/source, and any budgets.
- `/goal queue <objective-or-template>` resolves templates the same way `/goal <objective-or-template>` does, validates the resulting objective, and appends it to the queue.
- `/goal <objective-or-template>` while a current goal exists should offer three outcomes: replace, queue, cancel.
  - Replace preserves current behavior.
  - Queue appends the new validated/resolved objective to the queue and leaves the current goal unchanged.
  - Cancel leaves both active goal and queue unchanged.

### Agent/tool behavior

- Agents can list queued goals.
- Agents can enqueue goals using the same validation/resolution/persistence path as commands.
- Agents can safely remove/dequeue a queued goal by id when explicitly requested.
- Queue tool descriptions must follow the same explicit-goal policy as existing goal tools: do not infer persistent goals or queued goals from ordinary task requests.

### Persistence and context behavior

- Queued goals survive session replay/reload.
- Queued goals are visible enough for the agent to be aware of their existence.
- Queue state is stale-guarded and branch-local like current goal state.
- The active goal widget/status may remain primary, but queue count should be available in summaries or compact UI where practical.

### Auto-advance behavior

- When the current goal is completed or cleared and the queue is non-empty, the extension should surface the next queued goal to the agent.
- First-pass locked behavior: inject a dedicated hidden follow-up/steering prompt instructing the agent to create/start the next queued goal explicitly, with the queued objective and queue item id.
- Do not silently start the next goal without giving the agent context.
- Auto-advance prompt must stale-ignore if another active goal exists, if the queue item has been removed, or if the queue head changed.

## Locked design choices

- Implement a persisted FIFO queue of future objectives, not full parallel goals.
- Preserve one active goal at a time.
- Add required phase only for sequential queue; defer parallel/worktree/session orchestration to ISSUE-019.
- Persist queue mutations durably, preferably as a separate custom entry type such as `pi-goal-queue-state` with a queue replay helper, unless implementation proves extending the state event is cleaner without weakening current replay.
- Add a dedicated queue prompt/custom message type for next-goal surfacing, with lifecycle context filtering comparable to continuation/budget/pause/monitor steering.
- Queue command/template resolution must reuse existing deterministic template resolver and objective validation.

## Rejected alternatives

- Full multi-goal runtime now: too large and overlaps ISSUE-019.
- In-memory queue only: fails durability/reviewability requirements.
- Silent automatic creation of the next queued goal: fails agent-awareness requirement and risks surprising transitions.
- Treat queued goals as paused active goals: blurs active goal semantics and complicates telemetry/budget accounting.

## Implementation result

Implemented in commit `228e1a5 feat: add goal queue for sequential goal management`.

Summary:
- New modules: queue-types.ts, queue-helpers.ts, queue-state.ts, queue-tools.ts
- Persisted sequential FIFO queue with event-sourced replay
- /goal queue subcommand: list and enqueue
- Three-way Replace/Queue/Cancel dialog when objective conflicts with active goal
- Tools: list_goal_queue, enqueue_goal, dequeue_goal, remove_queued_goal
- Queue state replayed on session_start and session_tree
- clear_goal and /goal clear hint about queued goals availability
- Refactored queue tools into separate file to stay under Sentrux 450-line limit

Validation passed:
- /tmp/pi-goal-queue-probe.cjs (28 assertions)
- npm run quality:goal (Sentrux gate/check, slop, TypeScript, Pi load)

## Implementation checklist

- [ ] Add `QueuedGoal` and queue runtime/replay types.
- [ ] Add queue persistence helpers with durable append/replay semantics and stale guards.
- [ ] Add `/goal queue` list/enqueue command surface.
- [ ] Change active-goal replacement UI from boolean confirm to replace/queue/cancel selection.
- [ ] Ensure queued objectives use the same template resolution and `validateObjective()` path as normal goals.
- [ ] Add queue listing to goal summary or compact UI where practical.
- [ ] Add model-facing queue tools for list/enqueue/remove, with explicit-goal guardrails.
- [ ] Add next-queued-goal prompt builder and scheduling after complete/clear.
- [ ] Add lifecycle context filtering/stale guards for queue prompt messages.
- [ ] Add focused probes for persistence/replay, command behavior, tool behavior, and auto-advance stale guards.
- [ ] Run `npm run quality:goal`.

## Acceptance criteria

- User can enqueue a future goal without replacing the current active goal.
- The replace prompt path supports replace, queue, and cancel.
- `/goal queue` lists queued goals with stable ids and useful excerpts.
- `/goal queue <text>` appends a queued goal after template resolution and objective validation.
- Agents can inspect and enqueue queued goals through model-facing tools.
- Queued goals persist across replay/reload.
- Current active goal behavior remains backward-compatible when the user chooses replace.
- Completing or clearing the current goal surfaces the next queued goal to the agent with enough context to create/start it explicitly.
- Stale queue prompts do not start or suggest the wrong goal after replacement, removal, queue head changes, or a new active goal.
- `npm run quality:goal` passes.

## Proof threat model

Primary invariant: queued goals are durably stored, reviewable, and advanced sequentially without replacing or mutating the current active goal unless the user/agent explicitly chooses that action.

Likely false greens:

- Queue exists only in memory and disappears after reload.
- Queue branch from replacement prompt still replaces the current goal.
- `/goal queue <template>` bypasses template resolution or validates a different objective than `/goal <template>`.
- Auto-advance prompt fires for stale queue state or while another goal is active.
- Agent tools can enqueue goals from vague ordinary task requests without explicit queue/goal intent.
- Queue UI hides enough detail that queued goals are not practically reviewable.

## TOON synthesis

```toon
toon.version: 1
issue{id,title,status,goal}:
  "ISSUE-027","Goal queue","open — execution-ready","durable sequential queued goals with command/tool surfaces and stale-guarded next-goal prompting"
locked_requirements[7]{id,requirement}:
  "lr1","preserve one active goal at a time"
  "lr2","persist queued goals and replay them branch-locally"
  "lr3","support /goal queue list and enqueue behavior"
  "lr4","offer replace queue cancel when /goal receives a new objective while a current goal exists"
  "lr5","expose agent-facing list/enqueue/remove queue tools with explicit intent guardrails"
  "lr6","surface next queued goal after complete or clear through stale-guarded agent prompt"
  "lr7","reuse deterministic template resolution and objective validation for queued objectives"
implementation_surfaces[7]{surface,path,notes}:
  "command",".pi/extensions/goal/command.ts","queue subcommand and replace/queue/cancel selection"
  "state",".pi/extensions/goal/state.ts","queue replay/persistence or separate queue state module"
  "types",".pi/extensions/goal/types.ts","QueuedGoal and queue event/runtime types"
  "tools",".pi/extensions/goal/tools.ts","model-facing queue tools"
  "prompts",".pi/extensions/goal/prompts.ts","next queued goal prompt builder"
  "lifecycle",".pi/extensions/goal/lifecycle.ts","schedule/filter stale queue prompt on complete/clear"
  "ui",".pi/extensions/goal/ui.ts","queue listing and compact queue awareness"
invariants[5]{id,invariant}:
  "inv1","queue enqueue never mutates or replaces current active goal"
  "inv2","queue items have stable ids and deterministic FIFO order"
  "inv3","stale queue prompt cannot create the wrong goal"
  "inv4","normal replace behavior remains available and backward compatible"
  "inv5","completed or cleared current goal is the only auto-advance trigger for first pass"
```

## Required proofs

```toon
toon.version: 1
required_proofs[5]{name,command,condition}:
  "queue_persistence_probe","NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-persistence-probe.cjs","exit 0; queued goals persist and replay in FIFO order"
  "queue_command_probe","NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-command-probe.cjs","exit 0; /goal queue and replace queue branch work without replacing active goal"
  "queue_tool_probe","NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-tool-probe.cjs","exit 0; agent-facing queue tools list enqueue and remove safely"
  "queue_advance_probe","NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-advance-probe.cjs","exit 0; next queued goal prompt fires only for valid current queue head and safe goal state"
  "quality_goal","npm run quality:goal","exit 0; Sentrux slop TypeScript and Pi load gates pass"
```

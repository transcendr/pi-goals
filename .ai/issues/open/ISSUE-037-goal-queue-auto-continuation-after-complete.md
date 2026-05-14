# ISSUE-037 — Goal queue auto-continuation missing after completed active goal with queued goals

Status: open — execution-ready
Priority: P1
Owner: pi-goal automation
Created: 2026-05-10
Next best session: focused implementation/validation pass for completed-goal queue continuation
Next best session rationale: The failure is user-visible and violates queued-goal orchestration semantics. The issue is grounded to specific lifecycle/tool/queue-steering surfaces and needs a small behavior fix plus deterministic and live probes.
Target bucket: open
Issue kind: bug
Target repo roots: `~/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-027-goal-queue.md`
Depends on:
- `.ai/issues/fixed/ISSUE-030-queued-goal-steering.md`
- `.ai/issues/fixed/ISSUE-033-resume-processes-queued-goals.md`
- `.ai/issues/fixed/ISSUE-035-multi-item-goal-queue-block.md`
Related:
- `.ai/docs/pi-goals-live-probe-testing.md`
- `.ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md`

## Goal

Ensure that when an active goal is marked complete while `/goal queue` still has queued items, `pi-goals` injects effective queue steering and/or triggers continuation so the agent cannot silently stop before resolving the queue head.

## Problem/context

The user observed this concrete failure after `q-1778443864560-4` completed:

```text
Queued goals (2):
 1. [q-1778443864560-5] run `deslop-pipeline` as goal with single tweak: skip changing model to glm, …
 2. [q-1778443864560-6] pick the next most valuable, potentially highest-leverage issue from the issu…
```

Despite the remaining queue, the agent returned a normal final answer and stopped. The expected behavior was that an auto-continuation/queue-steering message should have fired immediately after completing the active goal.

This is more than a prompt-following failure: queued goals are explicit persistent work. A completed current goal with a non-empty queue should be a runtime continuation handoff, not an optional model decision.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-037-goal-queue-auto-continuation-after-complete/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-037-goal-queue-auto-continuation-after-complete/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-037-goal-queue-auto-continuation-after-complete/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-037-goal-queue-auto-continuation-after-complete/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-037-goal-queue-auto-continuation-after-complete/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-037-goal-queue-auto-continuation-after-complete/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-037-goal-queue-auto-continuation-after-complete/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-037-goal-queue-auto-continuation-after-complete/raw/commands.log`

## Desired behavior

When `update_goal(status: "complete")` succeeds and queued goals remain:

- the extension must not leave queue continuation to an ordinary final answer;
- queue steering must be injected for the current queue head;
- the steering must be effective, ideally by triggering a follow-up turn when the session is otherwise idle/ending;
- the agent should be directed to classify the queue head semantically, use templates where appropriate, and only dequeue after satisfaction;
- duplicate steering must be avoided if both tool-completion and turn-end lifecycle observe the same completion;
- if the queue is empty, completion behavior remains unchanged.

## Grounded research findings

### Surfaces inspected

- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/index.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/queue-steering.ts`
- `.pi/extensions/goal/queue-state.ts`

### Current behavior facts

`lifecycle.ts` sends queue steering only at turn end:

```ts
if (goal?.status === "complete" && completedThisTurn) sendQueueSteering(pi, "goal-complete");
```

`tools.ts` handles `update_goal(status:"complete")` by canceling active continuation/monitor, persisting complete state, syncing UI, and returning a result. It does not directly schedule queue steering or a follow-up turn after successful completion.

`queue-steering.ts` supports a `triggerTurn` option, but the `goal-complete` call site in `lifecycle.ts` does not pass it. `/goal resume` paths do use triggered queue steering when a completed/no-active current goal blocks queued work, which indicates triggered continuation is an accepted mechanism for queue handoff.

### Probable root cause

The completion path relies on turn-end telemetry (`completedThisTurn`) plus non-triggering queue steering. This can produce a passive steering message that does not force a next turn, or can miss completion paths where turn telemetry is stale/absent. In either case, queued work can remain while the agent stops.

## Locked design choices

Chosen direction:

- Treat `complete + queue non-empty` as a queue-handoff invariant.
- Ensure the model-tool completion path causes effective queue steering when queued items remain.
- Prefer triggering a follow-up turn for the goal-complete queue handoff, matching the stronger `/goal resume` queue behavior.
- Add dedupe/idempotence so tool-completion and turn-end completion cannot double-start or double-steer the same queue head.

Rejected alternative:

- Prompt-only instructions. The bug is runtime behavior: persistent queued work should not depend on a model remembering to ask for the queue after completing a goal.

## Implementation checklist

- Inspect current queue steering event details and delivery semantics.
- Add a helper for post-completion queue handoff, probably near `queue-steering.ts` or lifecycle/tool integration.
- Call the helper after successful `update_goal(status:"complete")` when queue is non-empty.
- Ensure `goal-complete` handoff uses `triggerTurn: true` where needed.
- Add dedupe keyed by queue head id and completion goal id/turn to avoid repeated queue steering.
- Preserve existing `/goal resume`, `/goal clear`, `start_queued_goal`, and orchestration dequeue semantics.
- Add deterministic probe(s) for completion-with-queue behavior.
- Add live probe coverage in `pi-goals-live-probe` or an equivalent Solo process.

## Acceptance criteria

- Completing an active goal through `update_goal(status:"complete")` while queue is non-empty causes queue steering for the queue head.
- The queue steering is effective enough to continue processing without the agent being allowed to stop with queued work remaining.
- The queue head remains in place until properly started/dequeued according to existing orchestration rules.
- No duplicate steering causes a queue head to be started/dequeued twice.
- Existing no-queue completion remains unchanged.
- Existing `/goal resume` queue behavior remains green.

## Proof threat model

Primary invariant: completing the current active goal with non-empty queue must hand off to queue processing instead of permitting silent stop.

False-green risks:

- A unit probe sees `sendQueueSteering` called but no follow-up turn is triggered.
- The fix only works for slash command flows, not model-tool completion.
- Duplicate handoffs cause repeated queue prompts or double queue consumption.
- Queue orchestration prose is accidentally converted into a direct started goal.
- Tests pass with mocked queue state but live Pi runtime still final-answers and stops.

## Required proofs

```toon
toon.version: 1
required_proofs[5]{name,source,command,pass_condition,scope,notes}:
  completion_queue_handoff_probe,"issue doc","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-complete-queue-handoff-probe.mjs","exit 0 and asserts queued head steering/follow-up after update_goal complete",run,"must fail if tool completion leaves non-empty queue stranded"
  no_duplicate_queue_handoff_probe,"issue doc","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-complete-queue-dedupe-probe.mjs","exit 0 and asserts one effective handoff per completed goal/queue head",run,"guards double-start/double-dequeue regressions"
  existing_queue_resume_probe,"issue doc","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-queue-resume-probe.mjs","exit 0 or documented existing equivalent remains green",run,"protects fixed queue resume semantics"
  quality_gate,"AGENTS.md","cd ~/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required extension quality gate"
  live_probe,"issue doc","Use .ai/docs/pi-goals-live-probe-testing.md to complete a trivial active goal while at least one queued goal remains","transcript shows queue steering/continuation occurs without manual prompting and cleanup leaves no test queue artifacts",live,"needed because failure was live runtime steering behavior"
```

## TOON synthesis

```toon
toon.version: 1
issue{id,status,kind,goal}:
  "ISSUE-037","open — execution-ready","bug","complete + non-empty queue triggers effective queue handoff"

feature_memory[4]{id,fact}:
  "fm1","queue steering exists in queue-steering.ts and can trigger turns via triggerTurn"
  "fm2","turn-end goal-complete path currently calls sendQueueSteering without triggerTurn"
  "fm3","update_goal complete path persists completion but does not directly hand off queued work"
  "fm4","user observed q-1778443864560-5 and q-1778443864560-6 stranded after q-1778443864560-4 completed"

locked_requirements[4]{id,requirement}:
  "lr1","successful update_goal complete with non-empty queue causes queue-head steering"
  "lr2","handoff is effective enough to prevent silent stop"
  "lr3","handoff is idempotent and cannot double-consume queue head"
  "lr4","empty-queue completion behavior remains unchanged"

implementation_surfaces[4]{id,path,reason}:
  "s1",".pi/extensions/goal/tools.ts","model-tool completion path"
  "s2",".pi/extensions/goal/lifecycle.ts","turn-end completion/accounting path"
  "s3",".pi/extensions/goal/queue-steering.ts","queue handoff delivery and triggerTurn semantics"
  "s4",".pi/extensions/goal/continuation.ts","follow-up turn safety and idle behavior"

verification_checks[4]{id,check,evidence}:
  "v1","tool completion with queued item produces effective queue handoff","deterministic probe"
  "v2","lifecycle and tool paths do not duplicate handoff","dedupe probe"
  "v3","existing resume/clear queue paths still work","targeted regression probe"
  "v4","live Pi process continues from queue after completion","live probe transcript"
```

## Notes

This issue should be implemented before relying on long queue stacks for unattended execution, because it is exactly the failure mode where a satisfied active goal leaves remaining persistent work idle.

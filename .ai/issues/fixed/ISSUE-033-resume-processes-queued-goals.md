# ISSUE-033 — Resume processes queued goals from idle state

Status: fixed
Priority: high
Owner: unassigned
Created: 2026-05-10
Next best session: green-loop implementation
Next best session rationale: The behavior is localized to the goal command/queue steering surfaces but needs deterministic probes plus a bounded live Pi probe to avoid fake-green queue/control behavior.
Target bucket: open
Issue kind: feature
Parent issue: none
Depends on: ISSUE-027, ISSUE-030, ISSUE-032
Related: ISSUE-029, ISSUE-031

## Goal

Make `/goal resume` explicitly advance a non-empty goal queue when the session is otherwise idle, including when there is no current goal or when the current goal is completed but uncleared.

## Problem / context

The goal queue now supports durable FIFO queued goals and agent-side queue steering. However, queue processing is currently triggered mainly after a goal completes in-turn or after `/goal clear`. A user can enqueue work while the agent is idle and then reasonably expect `/goal resume` to begin processing the queue, but current command behavior does not do that in two important states:

1. no current goal exists;
2. a completed goal remains uncleared.

In both cases the queue can be ready, but `/goal resume` does not currently hand queue processing to the agent.

## Desired behavior

- `/goal queue ...` remains enqueue-only. It must not immediately start queued work just because the agent is idle.
- If `/goal resume` is invoked with no current goal and the queue is non-empty, Pi should send queue steering and start/trigger the agent turn that resolves the queue head.
- If `/goal resume` is invoked with a completed current goal and the queue is non-empty, Pi should send queue steering and start/trigger the agent turn that resolves the queue head.
- Queue head resolution must keep the existing agent-side semantics: classify direct vs reusable-template/prose orchestration, call `list_goal_templates` when needed, and use `create_goal_from_template`, `create_goal`, or `start_queued_goal` appropriately.
- Non-complete active/paused/budget-limited goal resume semantics must not regress.

## Grounded research findings

Artifacts:

- [00-request.md](../../docs/issue-workflow/ISSUE-033-resume-processes-queued-goals/00-request.md)
- [01-protocol-read.md](../../docs/issue-workflow/ISSUE-033-resume-processes-queued-goals/01-protocol-read.md)
- [02-grounded-research.md](../../docs/issue-workflow/ISSUE-033-resume-processes-queued-goals/02-grounded-research.md)
- [03-design-lock.md](../../docs/issue-workflow/ISSUE-033-resume-processes-queued-goals/03-design-lock.md)
- [04-proof-threat-model.md](../../docs/issue-workflow/ISSUE-033-resume-processes-queued-goals/04-proof-threat-model.md)
- [05-issue-writeback.md](../../docs/issue-workflow/ISSUE-033-resume-processes-queued-goals/05-issue-writeback.md)
- [06-final-audit.md](../../docs/issue-workflow/ISSUE-033-resume-processes-queued-goals/06-final-audit.md)

Live code findings:

- `.pi/extensions/goal/command.ts` `resumeGoal()` returns help text when `getGoal()` is absent.
- `.pi/extensions/goal/command.ts` `resumeGoal()` returns `Goal is complete. Use /goal clear before starting a new goal.` when `goal.status === "complete"`.
- `.pi/extensions/goal/command.ts` `clearGoal()` already sends queue steering when queue items remain.
- `.pi/extensions/goal/lifecycle.ts` sends queue steering after a goal completes in the active turn.
- `.pi/extensions/goal/queue-tools.ts` `start_queued_goal` already supports completed-goal replacement and refuses non-complete active goals.
- `.pi/extensions/goal/queue-steering.ts` contains the desired semantic classifier prompt; command behavior should reuse this path rather than duplicate prose parsing.

## Locked design

Use `/goal resume` as an explicit queue pump only when queue work exists and there is no resumable active goal to continue.

Implementation should:

1. Keep `/goal queue ...` enqueue-only.
2. In `resumeGoal()`, inspect `getQueue()` before returning for no-goal or completed-goal states.
3. If queue is non-empty in either state, call queue steering and trigger the agent turn using the existing steering mechanism.
4. Prefer a new queue steering reason such as `goal-resume` over overloading `goal-clear`, so replay/debug details remain honest.
5. Preserve existing behavior when no queue exists:
   - no goal: show usage/hint;
   - completed goal: tell user to clear before starting a new non-queued goal.
6. Preserve existing budget-limited refusal and paused-goal resume behavior.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,goal,next_session}:
  "ISSUE-033",open,"make /goal resume process queued goals from idle queue-ready states","green-loop implementation"

feature_memory[5]{id,fact}:
  "fm1","queue state is durable FIFO and replayed from branch entries"
  "fm2","/goal queue currently enqueues and does not start an agent turn"
  "fm3","queue steering is hidden agent guidance that performs semantic direct-vs-template classification"
  "fm4","start_queued_goal safely replaces completed goals and refuses non-complete active goals"
  "fm5","current /goal resume returns early for no-goal and completed-goal states"

locked_requirements[6]{id,requirement}:
  "lr1","/goal queue remains enqueue-only"
  "lr2","/goal resume with no current goal and non-empty queue sends queue steering and starts/requests agent processing"
  "lr3","/goal resume with completed current goal and non-empty queue sends queue steering and starts/requests agent processing"
  "lr4","queue head semantic resolution remains agent-side via queue steering and model tools"
  "lr5","paused active goal resume behavior remains unchanged"
  "lr6","budget-limited exhausted goals still cannot resume as active work"

implementation_surfaces[5]{path,expected_change}:
  ".pi/extensions/goal/command.ts","teach resumeGoal about queue-ready idle states"
  ".pi/extensions/goal/queue-steering.ts","add or accept a resume-specific queue steering reason if needed"
  ".pi/extensions/goal/types.ts","extend queue steering reason type if needed"
  ".pi/extensions/goal/lifecycle.ts","preserve existing completion-triggered queue steering"
  ".pi/extensions/goal/queue-tools.ts","preserve direct queued start safety semantics"

verification_checks[5]{id,check,evidence}:
  "v1","enqueue with no goal does not create active goal","focused deterministic probe"
  "v2","/goal resume with no goal and queue non-empty emits queue steering/agent turn","focused deterministic probe plus live probe"
  "v3","enqueue with completed goal leaves completed goal and queued item in place","focused deterministic probe"
  "v4","/goal resume with completed goal and queue non-empty emits queue steering/agent turn","focused deterministic probe plus live probe"
  "v5","final extension quality gate passes","npm run quality:goal"
```

## Proof threat model

Primary invariant: `/goal resume` is the explicit command that advances an idle non-empty queue, while `/goal queue ...` remains enqueue-only.

False-green risks:

- enqueue starts work immediately;
- no-goal `/goal resume` still only prints help;
- completed-goal `/goal resume` still only asks for clear;
- implementation bypasses queue steering and blindly starts direct goals;
- paused/budget-limited resume behavior regresses;
- live agent turn is not actually triggered even though a deterministic helper says steering was sent.

## required_proofs[]

```toon
toon.version: 1
required_proofs[5]{name,source,command,pass_condition,scope,notes}:
  "pre_sentrux_gate","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && sentrux gate --save .pi/extensions/goal","exit 0 before substantial implementation",run,"required repo gate for architecture-sensitive extension work"
  "no_goal_resume_queue_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node /tmp/pi-goal-resume-empty-queue-probe.cjs","exit 0 and proves enqueue-only plus resume-triggered queue steering with no current goal",run,"implement or update focused deterministic probe"
  "completed_goal_resume_queue_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node /tmp/pi-goal-resume-completed-queue-probe.cjs","exit 0 and proves enqueue-only plus resume-triggered queue steering with completed current goal",run,"implement or update focused deterministic probe"
  "live_resume_queue_probe","issue doc","use persistent live Pi probe to run realistic /goal queue then /goal resume scenarios for no-goal and completed-goal states","agent visibly begins resolving queued head only after /goal resume in both scenarios",manual,"use sparse polling and clean up probe state"
  "quality_goal","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"single required final gate"
```

## Acceptance criteria

- [ ] `/goal queue ...` in no-goal state enqueues without creating/starting a goal.
- [ ] `/goal resume` in no-goal + non-empty queue state triggers queue steering/agent queue resolution.
- [ ] `/goal queue ...` in completed-goal state enqueues without replacing/clearing/starting the completed goal.
- [ ] `/goal resume` in completed-goal + non-empty queue state triggers queue steering/agent queue resolution.
- [ ] Queue steering still instructs semantic template/direct classification before `start_queued_goal`.
- [ ] Existing paused active goal resume behavior remains green.
- [ ] Existing budget-limited resume refusal remains green.
- [ ] `npm run quality:goal` passes.

## Implementation checklist

- [ ] Run `sentrux gate --save .pi/extensions/goal` before substantial code changes.
- [ ] Update `resumeGoal()` and dependencies to access queue state and queue steering.
- [ ] Add a queue-steering reason for resume if needed.
- [ ] Add deterministic probes/tests for no-goal and completed-goal queue resume scenarios.
- [ ] Run a bounded live probe with realistic prompts.
- [ ] Run `npm run quality:goal`.

## Notes for implementer

Do not add extension-side natural-language queue classification. The command should wake/steer the agent; the agent and queue tools decide how to resolve the queued item.

# ISSUE-034 — Prevent unsatisfied queued goal discard

Status: open
Priority: critical
Owner: unassigned
Created: 2026-05-10
Next best session: green-loop implementation
Next best session rationale: The incident is a queue data-loss class bug: the destructive dequeue tool can remove unsatisfied work. The fix is localized but must be proven with adversarial tool probes and a live queue-flow probe.
Target bucket: open
Issue kind: remediation
Parent issue: none
Depends on: ISSUE-027, ISSUE-030, ISSUE-032
Related: ISSUE-033

## Goal

Prevent agents from discarding queued goals by calling `dequeue_goal` before the queued item is actually satisfied or explicitly removed by the user.

## Problem / incident

A queued live-test goal was manually dequeued after partial/source-grounded checking rather than being executed through the queue flow. The agent then stopped even though the queue represented ongoing requested work. The user correctly identified this as discarding a queued goal.

The discarded goal was restored by re-enqueuing it, but the incident exposed a product/runtime safety gap: queue consumption is currently too easy and insufficiently auditable.

## Desired behavior

A queued goal may be removed from the queue only by one of these paths:

1. `start_queued_goal` atomically creates the concrete active goal and dequeues after successful creation.
2. `dequeue_goal` removes the current queue head only after the requested orchestration/prose work is actually complete, with explicit `rationale` and `authority` arguments recorded for auditability.
3. `remove_queued_goal` removes a specific queue id only when the user explicitly asks to remove/delete/cancel that queued item.

Agents should be explicitly forbidden from discarding unfinished queued work. If the agent is uncertain whether a queued item is satisfied or authorized for removal, it must leave the item queued and report the blocker.

## Grounded research findings

Artifacts:

- [00-request.md](../../docs/issue-workflow/ISSUE-034-prevent-unsatisfied-queued-goal-discard/00-request.md)
- [01-protocol-read.md](../../docs/issue-workflow/ISSUE-034-prevent-unsatisfied-queued-goal-discard/01-protocol-read.md)
- [02-grounded-research.md](../../docs/issue-workflow/ISSUE-034-prevent-unsatisfied-queued-goal-discard/02-grounded-research.md)
- [03-design-lock.md](../../docs/issue-workflow/ISSUE-034-prevent-unsatisfied-queued-goal-discard/03-design-lock.md)
- [04-proof-threat-model.md](../../docs/issue-workflow/ISSUE-034-prevent-unsatisfied-queued-goal-discard/04-proof-threat-model.md)
- [05-issue-writeback.md](../../docs/issue-workflow/ISSUE-034-prevent-unsatisfied-queued-goal-discard/05-issue-writeback.md)
- [06-final-audit.md](../../docs/issue-workflow/ISSUE-034-prevent-unsatisfied-queued-goal-discard/06-final-audit.md)

Live code findings:

- `.pi/extensions/goal/queue-tools.ts` registers `dequeue_goal` with empty parameters.
- `dequeue_goal` immediately calls `dequeueGoal()` and persists a generic `dequeued` event.
- `dequeue_goal` does not require queue id, satisfaction reason, evidence, active-goal status, or explicit user-removal confirmation.
- `.pi/extensions/goal/queue-steering.ts` and `AGENTS.md` already instruct agents to dequeue only after satisfaction, but the incident proves prompt guidance alone is insufficient.
- `remove_queued_goal` already exists for specific id removal, so explicit removal and satisfied consumption can be separated more strongly.

## Locked remediation design

Start with two concrete mitigations:

1. Strengthen `AGENTS.md` with an explicit trust boundary: never discard queued work; do not call `dequeue_goal` unless the queue head is actually satisfied or the user explicitly authorizes removal of that specific queued item; when uncertain, leave it queued and report the blocker.
2. Add required `dequeue_goal` arguments:
   - `rationale`: why this queue head is being dequeued now;
   - `authority`: the perceived authorization for dequeueing, such as completed requested work, explicit user instruction, or successful handoff.

Persist `rationale` and `authority` in the session history queue event so later replay/audit can see why the queue item was consumed.

Keep `remove_queued_goal` as the explicit user-request removal tool by id. Keep `start_queued_goal` atomic create-then-dequeue behavior.

Rejected alternatives:

- Renaming/replacing `dequeue_goal` as first step: rejected for now; the requested remediation is to keep dequeue but make its use explicit and auditable.
- Prompt-only guidance without tool argument changes: rejected because prompt guidance alone already failed.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,goal,next_session}:
  "ISSUE-034",open,"prevent unsatisfied queued goal discard","green-loop implementation"

incident_facts[4]{id,fact}:
  "if1","an agent dequeued a queued live-test item without fully satisfying it"
  "if2","the discarded item was restored by re-enqueueing it"
  "if3","dequeue_goal currently has empty parameters and immediately removes the queue head"
  "if4","prompt guidance said to dequeue only after satisfaction but did not prevent misuse"

locked_requirements[6]{id,requirement}:
  "lr1","dequeue_goal requires a non-empty rationale argument"
  "lr2","dequeue_goal requires a non-empty authority argument"
  "lr3","dequeue audit rationale and authority are persisted in session history state"
  "lr4","explicit user removal remains separate via remove_queued_goal by id"
  "lr5","start_queued_goal retains atomic create-then-dequeue behavior"
  "lr6","prose/JIT orchestration remains supported after real satisfaction or explicit user authorization"

implementation_surfaces[4]{path,expected_change}:
  ".pi/extensions/goal/queue-tools.ts","add parameters and guards to dequeue/consume path"
  ".pi/extensions/goal/queue-state.ts","persist consume evidence if schema update is chosen"
  ".pi/extensions/goal/queue-steering.ts","update guidance to cite queue id and satisfaction evidence"
  "AGENTS.md","document no dequeue without proof if project-level guidance remains useful"

verification_checks[6]{id,check,evidence}:
  "v1","no-arg dequeue cannot remove queue head","deterministic probe"
  "v2","blank rationale cannot remove queue head","deterministic probe"
  "v3","blank authority cannot remove queue head","deterministic probe"
  "v4","valid rationale plus authority consumes the queue head and persists audit fields","deterministic probe"
  "v5","start_queued_goal still atomically creates and dequeues direct goals","existing/focused probe"
  "v6","AGENTS.md explicitly forbids discarding unfinished queued work","file inspection"
```

## Proof threat model

Primary invariant: queued work must not be silently discarded; any manual queue-head dequeue must state and persist the agent's rationale and perceived authority.

False-green risks:

- `dequeue_goal` still accepts empty params through compatibility behavior.
- Tool checks only one of `rationale` or `authority`.
- Agent supplies meaningless text and still violates user trust; AGENTS.md must explicitly forbid that behavior.
- Queue event replay loses rationale/authority and makes audit impossible.
- New required args break internal `start_queued_goal`; it should keep its separate atomic path with appropriate internal audit data.

## required_proofs[]

```toon
toon.version: 1
required_proofs[5]{name,source,command,pass_condition,scope,notes}:
  "pre_sentrux_gate","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && sentrux gate --save .pi/extensions/goal","exit 0 before substantial implementation",run,"required extension architecture gate"
  "dequeue_requires_rationale_authority","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node /tmp/pi-goal-dequeue-audit-args-probe.cjs","exit 0 and proves no-arg/blank-rationale/blank-authority dequeues are rejected",run,"implement focused deterministic probe"
  "dequeue_persists_audit_fields","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node /tmp/pi-goal-dequeue-audit-persist-probe.cjs","exit 0 and proves valid rationale+authority dequeues once and persists both fields",run,"implement focused deterministic probe"
  "agents_guidance","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && rg -n 'Never discard queued work|Do not call `dequeue_goal`' AGENTS.md","exit 0 and both trust-boundary instructions are present",run,"project guidance mitigation requested by owner"
  "quality_goal","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"single required final gate"
```

## Acceptance criteria

- [ ] `AGENTS.md` explicitly forbids discarding unfinished queued work.
- [ ] `dequeue_goal` requires non-empty `rationale` and `authority` arguments.
- [ ] `dequeue_goal` can no longer remove queue head with no arguments.
- [ ] Valid `dequeue_goal` calls persist `rationale` and `authority` in session history state.
- [ ] Explicit user removal remains possible only by queue id.
- [ ] `start_queued_goal` direct-start behavior remains green.
- [ ] `npm run quality:goal` passes.

## Implementation checklist

- [ ] Run `sentrux gate --save .pi/extensions/goal` before substantial implementation.
- [ ] Change queue consume tool parameters and guards.
- [ ] Update queue event persistence if evidence should replay/audit.
- [ ] Update queue steering/tool metadata and any project guidance.
- [ ] Add deterministic probes for guard behavior.
- [ ] Run bounded live probe.
- [ ] Run `npm run quality:goal`.

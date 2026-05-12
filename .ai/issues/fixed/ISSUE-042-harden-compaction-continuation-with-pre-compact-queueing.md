# ISSUE-042 — Harden compaction continuation with pre-compact queueing

Status: fixed — implemented
Priority: P0
Owner: pi-goal automation
Created: 2026-05-12
Next best session: acceptance verification
Next best session rationale: Implementation and deterministic proofs are complete; run acceptance verification against the implemented ISSUE-042 remediation and the carried acceptance-pipeline hardening follow-up.
Target bucket: open
Issue kind: fix
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: ISSUE-039
Depends on: none
Related:
- `.ai/issues/open/ISSUE-039-recover-active-goal-continuation-after-compaction.md`
- `.ai/issues/open/ISSUE-037-goal-queue-auto-continuation-after-complete.md`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/.pi-goals/verify-acceptance-pipeline.md` — related prompt hardening follow-up
- `.ai/.pi-goals/verify-acceptance-item.md` — related prompt hardening follow-up

## Goal

Prevent `pi-goals` from stranding active goal continuation or completed-goal queue handoff across compaction by enqueueing the needed hidden follow-up before compaction and retaining a bounded post-compaction retry fallback.

## Problem/context

ISSUE-039 attempted to fix active-goal continuation after compaction by tracking compaction state and scheduling `scheduleMaybeContinueGoal(pi, ctx, "compacted")` in `session_compact`.

A live repro showed that this is still insufficient. The user provided this `/tree export` shape:

```text
  • [read: .ai/.pi-goals/deslop-pipeline.md:176-215]
     │     │     • [bash: rg -n "acceptance" .ai/.pi-goals/deslop-pipeline.m...]
     │     │     • [edit: .ai/.pi-goals/deslop-pipeline.md]
     │     │     • [bash: rg -n "acceptance" .ai/.pi-goals/deslop-pipeline.m...]
     │     │     • assistant: Done. Removed the acceptance-pipeline reference from `deslop-pipeline.md`.  Validation: - `rg "acceptance" .ai/.pi-goals/deslop-pipeline.md` retu...
›    │     │     • [compaction: 257k tokens]
(agent goes idle)
```

At that point a queued goal existed, but after compaction the agent still stopped. The current post-compaction one-shot schedule can fail if it runs before the runtime is truly ready, if pending messages are present, or if queue handoff is the needed next action rather than active-goal continuation.

The acceptance pipeline for ISSUE-039 returned green, but main-agent review found false-green gaps: the existing probes are mostly static source/regex checks and do not prove real queued-message delivery or retry behavior. Iteration-2 acceptance rows for AC-1/AC-6 stayed green while listing material gaps, so those rows should not be trusted as complete acceptance.

## Desired behavior

- Before compaction, if the current goal is active, `pi-goals` queues a real hidden follow-up continuation that survives compaction as an agent queued message.
- Before compaction, if the current goal is complete and the goal queue is non-empty, `pi-goals` queues a real hidden queue-handoff follow-up/steering message for the queue head.
- After compaction, Pi core's existing `agent.hasQueuedMessages() -> agent.continue()` path delivers the queued message, the same way queued user follow-ups should be delivered.
- No Pi core change is required or allowed for this remediation.
- If the pre-compaction path does not take over, a bounded post-compaction retry fallback retries transient `notIdle` / `pendingMessages` skips and eventually either sends continuation/handoff or records a concrete terminal reason.
- Duplicate continuation/handoff is prevented when pre-compaction queueing and post-compaction fallback both observe the same work.
- Paused, cleared, absent, and budget-limited goals do not receive post-compaction continuation.
- Existing create/resume/agent-end continuation behavior remains green.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/raw/commands.log`

## Research findings

Source artifact: `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/02-grounded-research.md`.

Key facts:

- Pi core exposes `session_before_compact` and `session_compact` extension events.
- Pi core `_runAutoCompaction` emits `session_before_compact`, appends compaction and rebuilds `agent.state.messages`, emits `session_compact`, then schedules `agent.continue()` when `willRetry` is true or when `agent.hasQueuedMessages()` is true.
- Pi core `sendCustomMessage` queues follow-up/steer messages through the agent only while streaming; when not streaming with `triggerTurn`, it calls `agent.prompt(...)`; when not streaming without trigger, it appends passive custom history. Therefore implementation must prove the chosen pre-compaction send path creates actual queued agent work before relying on it.
- Current `pi-goals` `session_before_compact` only marks compaction active and records active-goal deferral; it does not queue active-goal continuation or completed-goal queue handoff before compaction.
- Current `finishGoalCompaction` schedules a one-shot post-compaction continuation for active goals only; it does not cover completed-goal-plus-queue handoff and does not retry transient skips.
- Existing compaction probes assert source strings/order and are not sufficient runtime evidence.
- Acceptance-pipeline prompt hardening is related: a green row with a material gap/required next action should be rejected, not accepted.

## Locked design choices

Chosen design: two-layer no-core-change remediation.

1. **Primary layer — pre-compaction queued message**
   - On `session_before_compact`, detect active goal continuation or completed-goal queue-handoff need.
   - Queue a hidden continuation/handoff before compaction so Pi core's own queued-message delivery after compaction wakes the agent.
   - The implementation must include a probe proving the message is an actual agent queued message that causes/qualifies for `hasQueuedMessages()` after compaction, not merely passive history.

2. **Fallback layer — bounded post-compaction retry**
   - After `session_compact`, if work still appears stranded and no pre-queued handoff has taken over, retry transient `notIdle` / `pendingMessages` outcomes for a bounded number of attempts/window.
   - Stop on sent, status change, queue empty/handoff complete, safety cap, non-transient skip, or max attempts.
   - Persist telemetry with attempts and final reason.

Rejected alternatives:

- Keep ISSUE-039's post-compaction one-shot scheduling only — rejected because the live repro shows it can still strand work.
- Pi core/API change — rejected by user; remediation must stay inside `pi-goals`.
- Post-compaction retry only — rejected as primary strategy because it does not use Pi's existing queued-message resume semantics and remains more timing-sensitive.
- Disable compaction during active goals — rejected because it risks context/provider failures.

## TOON synthesis

```toon
toon.version: 1
issue[1]{id,status,kind,target_root,next_session}:
  "ISSUE-042","open implementation-ready","fix","/Users/bryan/dev/personal/experiments/pi-goals","implementation"
feature_memory[6]{id,fact}:
  "fm1","ISSUE-039 post-compaction one-shot scheduling did not prevent a live idle-after-compaction failure"
  "fm2","Pi core calls agent.continue after compaction when agent.hasQueuedMessages is true"
  "fm3","pi-goals currently marks compaction active before compaction and schedules compacted continuation after session_compact"
  "fm4","current post-compaction maybeContinueGoal skip for notIdle or pendingMessages is terminal"
  "fm5","completed goal plus non-empty queue needs queue handoff, not only active-goal continuation"
  "fm6","existing compaction probes are static source checks and not sufficient runtime proof"
locked_requirements[7]{id,requirement}:
  "lr1","pre-compaction active goal creates a real hidden queued continuation message"
  "lr2","pre-compaction completed goal plus non-empty queue creates a real hidden queued queue-handoff message"
  "lr3","Pi core queued-message resume path is the primary post-compaction wake mechanism"
  "lr4","bounded post-compaction fallback retries transient notIdle and pendingMessages skips"
  "lr5","pre-queue and fallback paths dedupe same goal or same queue head"
  "lr6","paused cleared absent and budget-limited goals do not continue after compaction"
  "lr7","runtime/mocked probes assert actual send/queue/retry behavior rather than source strings"
invariants[5]{id,invariant}:
  "inv1","compaction must not strand active goal or queued-goal handoff work"
  "inv2","no Pi core change is allowed"
  "inv3","no duplicate hidden continuation or queue-handoff prompt is sent for one compaction event"
  "inv4","safety caps and non-active status guards remain enforced"
  "inv5","acceptance cannot rely on green rows with material unresolved gaps"
implementation_surfaces[7]{path,expected_change,risk}:
  ".pi/extensions/goal/lifecycle.ts","pass needed ctx/state into pre-compaction handling and coordinate session_compact fallback","event ordering and stale ctx risk"
  ".pi/extensions/goal/continuation.ts","add pre-compaction queued continuation plus bounded retry state machine","duplicate or premature continuation"
  ".pi/extensions/goal/queue-steering.ts","support pre-compaction queue handoff and dedupe against normal handoff","queued item stranded or duplicated"
  ".pi/extensions/goal/queue-state.ts","read queue head for completed-goal handoff need","must remain replay-safe"
  ".pi/extensions/goal/telemetry.ts","record prequeue/retry attempts/final reason","future failures opaque if omitted"
  ".pi/extensions/goal/types.ts","extend telemetry reason unions as needed","type drift"
  ".ai/validation","replace static-only compaction proof with runtime/mock probes","false-green risk if probes only scan strings"
verification_checks[7]{id,check,evidence}:
  "v1","active goal pre-compaction queues real hidden follow-up","goal-precompact-active-queue-probe"
  "v2","completed goal plus non-empty queue pre-compaction queues handoff","goal-precompact-completed-queue-probe"
  "v3","transient post-compaction notIdle or pendingMessages is retried not terminal","goal-postcompact-retry-probe"
  "v4","prequeue and fallback dedupe same goal/queue work","goal-compaction-prequeue-dedupe-probe"
  "v5","non-active statuses do not continue","negative cases in probes"
  "v6","quality gate passes","npm run quality:goal"
  "v7","live behavior or explicit deterministic-coverage rationale is captured","goal-compaction-prequeue-live-probe-closeout.md"
```

## Implementation checklist

- [ ] Run `sentrux gate --save .pi/extensions/goal` before substantial implementation.
- [ ] Add pre-compaction detection for active goal continuation need.
- [ ] Add pre-compaction detection for completed goal plus non-empty queue handoff need.
- [ ] Implement a no-core-change pre-compaction send path that creates real queued agent work and is proven by a runtime/mock probe.
- [ ] Add bounded post-compaction retry fallback for transient `notIdle` / `pendingMessages` skips.
- [ ] Add dedupe across pre-compaction queueing, post-compaction fallback, agent-end continuation, and queue handoff.
- [ ] Extend telemetry/types for prequeue and retry attempts/final reasons.
- [ ] Replace or supplement static compaction probes with runtime/mocked behavior probes.
- [ ] Run `npm run quality:goal`.
- [ ] Run bounded live probe or produce explicit deterministic-coverage skip rationale.

## Acceptance criteria

- Active goal work receives a real pre-compaction hidden queued follow-up that Pi core can deliver after compaction.
- Completed goal plus non-empty goal queue receives a real pre-compaction hidden queue-handoff follow-up that Pi core can deliver after compaction.
- If the pre-compaction queued message does not take over, bounded post-compaction retry handles transient `notIdle` / `pendingMessages` rather than skipping permanently.
- Duplicate continuation/handoff is prevented when pre-compaction, post-compaction, and agent-end paths overlap.
- Paused, cleared, absent, and budget-limited goals do not continue after compaction.
- Runtime/mocked probes verify actual send/queue/retry behavior and would fail if only source strings existed.
- `npm run quality:goal` passes.

## Proof threat model

Primary invariant: if work should continue across compaction, `pi-goals` must not let the session go idle with an active goal or a queued next goal stranded.

Likely false greens:

- `session_before_compact` handler exists but only writes telemetry or passive history.
- The chosen send path does not produce `agent.hasQueuedMessages()` and therefore Pi core does not resume after compaction.
- Post-compaction fallback attempts once and permanently skips on transient readiness.
- Completed-goal queue handoff remains uncovered because tests only use active goals.
- Dedupe is missing and sends two hidden prompts after compaction.
- Static source probes pass without executing behavior.
- Acceptance rows report green while listing material gaps/next actions.

Proof strategy:

- Use runtime/mocked probes that directly observe `pi.sendMessage` calls, options, queued-message semantics, retry attempts, and dedupe state.
- Keep deterministic probes focused on behavior; use source scans only as supplementary checks.
- Include live probe or explicit deterministic-coverage rationale because the failure was live runtime steering behavior.

## Required proofs

```toon
toon.version: 1
required_proofs[7]{name,source,command,pass_condition,scope,notes}:
  "sentrux_baseline","AGENTS.md","cd /Users/bryan/dev/personal/experiments/pi-goals && sentrux gate --save .pi/extensions/goal","exit 0 and baseline saved before substantial implementation",run,"required before extension implementation"
  "precompact_active_queue_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-precompact-active-queue-probe.mjs","exit 0 and output includes PASS goal_precompact_active_queues_followup",run,"must fail if active goal does not create real queued continuation before compaction"
  "precompact_completed_queue_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-precompact-completed-queue-probe.mjs","exit 0 and output includes PASS goal_precompact_completed_queue_handoff",run,"must fail if completed goal plus queued next item can strand after compaction"
  "postcompact_retry_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-postcompact-retry-probe.mjs","exit 0 and output includes PASS goal_postcompact_retry_transient_skip",run,"must fail if transient notIdle/pendingMessages skip is terminal"
  "compaction_dedupe_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-compaction-prequeue-dedupe-probe.mjs","exit 0 and output includes PASS goal_compaction_prequeue_dedupe",run,"must fail if pre-queue and fallback duplicate work"
  "quality_goal","AGENTS.md","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required extension quality gate"
  "live_probe_or_skip","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && test -s .ai/validation/goal-compaction-prequeue-live-probe-closeout.md","exit 0 and closeout records bounded live pass or explicit deterministic-coverage skip rationale",run,"live runtime behavior was the failure source"
```

## Implementation-ready plan

Status decision: implementation-ready.

Transcript artifacts:

- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/implementation-readiness/00-intake.md`
- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/implementation-readiness/01-protocol-read.md`
- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/implementation-readiness/02-live-surface-research.md`
- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/implementation-readiness/03-implementation-design-lock.md`
- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/implementation-readiness/04-patch-sequence.md`
- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/implementation-readiness/05-proof-plan.md`
- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/implementation-readiness/06-issue-writeback.md`
- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/implementation-readiness/07-final-audit.md`
- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/implementation-readiness/raw/commands.log`

Exact implementation surfaces:

- `.pi/extensions/goal/lifecycle.ts` — edit — pass `ctx` into pre-compaction handling; preserve replay-before-finish ordering; coordinate fallback after `session_compact`.
- `.pi/extensions/goal/continuation.ts` — edit — add compaction work descriptor, pre-compaction queued continuation, typed attempt results, bounded fallback retry, dedupe/reset state.
- `.pi/extensions/goal/queue-steering.ts` — edit — support pre-compaction/fallback queue handoff without duplicating normal queue handoff.
- `.pi/extensions/goal/queue-state.ts` — read or minimally edit — use `getQueue()` to detect completed-goal-plus-queue work.
- `.pi/extensions/goal/telemetry.ts` — edit — add helpers for compaction prequeue/retry/final telemetry.
- `.pi/extensions/goal/types.ts` — edit — add optional telemetry fields and any needed reason literals.
- `.ai/validation/goal-precompact-active-queue-probe.mjs` — create — runtime/mocked active-goal prequeue proof.
- `.ai/validation/goal-precompact-completed-queue-probe.mjs` — create — runtime/mocked completed-goal queue handoff proof.
- `.ai/validation/goal-postcompact-retry-probe.mjs` — create — transient skip retry proof.
- `.ai/validation/goal-compaction-prequeue-dedupe-probe.mjs` — create — prequeue/fallback/agent-end dedupe proof.
- `.ai/validation/goal-compaction-prequeue-live-probe-closeout.md` — create — bounded live proof or explicit deterministic-coverage skip rationale.

Patch sequence summary:

1. Run `sentrux gate --save .pi/extensions/goal`.
2. Add failing runtime/mocked probes for pre-compaction active continuation, completed-goal queue handoff, post-compaction retry, and dedupe.
3. Refactor continuation send internals to return typed send/skip outcomes while preserving created/resumed/agentEnd behavior.
4. Add pre-compaction work detection and send path in `continuation.ts`, with lifecycle passing `ctx`.
5. Add queue handoff pre-compaction/fallback helper and dedupe support in `queue-steering.ts`.
6. Add bounded post-compaction retry fallback and reset/cancel behavior.
7. Add optional telemetry fields/helpers for prequeue/retry/final reason.
8. Run targeted probes, `npm run quality:goal`, and live probe or skip rationale.

Validation/proof sequence:

1. `sentrux gate --save .pi/extensions/goal` — baseline saved before implementation.
2. `node .ai/validation/goal-precompact-active-queue-probe.mjs` — proves active goal queues hidden follow-up before compaction.
3. `node .ai/validation/goal-precompact-completed-queue-probe.mjs` — proves completed goal plus queue queues handoff before compaction.
4. `node .ai/validation/goal-postcompact-retry-probe.mjs` — proves transient not-idle/pending-message skips retry.
5. `node .ai/validation/goal-compaction-prequeue-dedupe-probe.mjs` — proves prequeue/fallback overlap does not duplicate.
6. Existing compaction and queue-handoff probes — regression coverage.
7. `npm run quality:goal` — required quality gate.
8. `test -s .ai/validation/goal-compaction-prequeue-live-probe-closeout.md` — bounded live proof or explicit deterministic-coverage skip rationale.

Handoff notes:

- Do not edit Pi core; prove the selected extension send path works under current Pi semantics.
- Do not accept source-string-only probes for the new behavior.
- Keep retry bounded and telemetry-rich.
- Keep queue item classification in the agent prompt path; the extension should only hand off queue steering, not directly consume queue items.
- If the pre-compaction send path cannot be proven in a specific state, fallback retry must cover that state and the proof must say so explicitly.

## Implementation result

Implemented the ISSUE-042 remediation in `.pi/extensions/goal/`:

- `lifecycle.ts` now passes `ctx` into the pre-compaction handler.
- `continuation.ts` now tracks compaction work descriptors for active-goal continuation and completed-goal queue handoff, attempts pre-compaction hidden follow-up/handoff when the runtime is not idle, cancels stale agent-end timers, and schedules bounded fallback retry when prequeue is unavailable.
- `queue-steering.ts` now supports follow-up delivery options while preserving default queue handoff behavior and dedupe semantics.
- `types.ts` / `telemetry.ts` now carry optional compaction continuation action/key/attempt/final-reason telemetry.
- Runtime/mocked probes were added for active prequeue, completed queue handoff prequeue, fallback retry, and prequeue/agent-end dedupe.
- Live probe was recorded as an explicit deterministic-coverage skip rationale in `.ai/validation/goal-compaction-prequeue-live-probe-closeout.md`.

Proofs passed:

- `sentrux gate --save .pi/extensions/goal`
- `node .ai/validation/goal-precompact-active-queue-probe.mjs`
- `node .ai/validation/goal-precompact-completed-queue-probe.mjs`
- `node .ai/validation/goal-postcompact-retry-probe.mjs`
- `node .ai/validation/goal-compaction-prequeue-dedupe-probe.mjs`
- `node .ai/validation/goal-compaction-continuation-probe.mjs`
- `node .ai/validation/goal-compaction-suppression-probe.mjs`
- `node .ai/validation/goal-compaction-dedupe-telemetry-probe.mjs`
- `test -s .ai/validation/goal-compaction-prequeue-live-probe-closeout.md`
- `npm run quality:goal`

## Related side-note: acceptance-pipeline hardening

This remediation was discovered because the acceptance pipeline returned green rows that still contained material gaps. A separate stack item should harden `.ai/.pi-goals/verify-acceptance-pipeline.md` and `.ai/.pi-goals/verify-acceptance-item.md` so:

- `green` cannot contain unresolved material `gap` or required `next_action`;
- if a plausible false-green risk cannot be ruled out, status must be `red` or `blocked`;
- the pipeline aggregator rejects green-with-real-gap rows and sends a correction prompt.

This side-note is related but not required for ISSUE-042 implementation unless the execution operator intentionally folds it into the same commit.

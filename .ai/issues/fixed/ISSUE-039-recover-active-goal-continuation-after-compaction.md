# ISSUE-039 — Recover active goal continuation after compaction

Status: fixed — implemented
Priority: P0
Owner: pi-goal automation
Created: 2026-05-11
Next best session: green-loop implementation
Next best session rationale: The failure strands an active persistent goal after a non-deterministic provider/compaction sequence. The fix is small but race-prone and needs adversarial probes plus a bounded live check.
Target bucket: open
Issue kind: fix
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: none
Depends on: none
Related:
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/open/ISSUE-037-goal-queue-auto-continuation-after-complete.md`
- `.ai/docs/pi-goals-live-probe-testing.md`
- `.ai/docs/pi-goals-compaction-continuation-investigation.md`

## Goal

Ensure an active `pi-goal` resumes/continues after successful compaction instead of silently stopping when Pi auto-compacts after provider errors or context-threshold recovery.

## Problem/context

The user reported a live non-deterministic failure:

```text
Error: Codex error: server_error request ID 808c3169-6059-4113-b1e2-d4f09cdcd9ca
Error: Codex error: invalid_request_error No tool call found for function call output with call_id call_5tFshEgobxIXgXfoJGP48kKe
[compaction]
Compacted from 272,528 tokens
```

After compaction, the widget still showed an active pi-goal, but Pi stopped instead of continuing the goal. The context apparently exceeded 100%, not just the usual 95% compaction threshold, and provider recovery/auto-compaction likely changed normal event ordering.

## Desired behavior

- If a goal remains active after successful compaction, pi-goals schedules an effective continuation.
- Continuation is not sent while compaction is actively rebuilding agent/session context.
- The old `agent_end` continuation timer and the new compaction recovery path cannot duplicate continuation for the same active goal.
- If continuation cannot run after compaction, telemetry records a concrete reason.
- Manual compaction and auto-compaction use the same safe continuation semantics.
- Completed, paused, cleared, or budget-limited goals do not continue after compaction.
- Existing safety caps for consecutive auto/no-progress turns remain enforced.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-039-recover-active-goal-continuation-after-compaction/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-039-recover-active-goal-continuation-after-compaction/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-039-recover-active-goal-continuation-after-compaction/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-039-recover-active-goal-continuation-after-compaction/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-039-recover-active-goal-continuation-after-compaction/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-039-recover-active-goal-continuation-after-compaction/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-039-recover-active-goal-continuation-after-compaction/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-039-recover-active-goal-continuation-after-compaction/raw/commands.log`

## Research findings

Source artifact: `.ai/docs/issue-workflow/ISSUE-039-recover-active-goal-continuation-after-compaction/02-grounded-research.md`.

Key facts:

- `.pi/extensions/goal/lifecycle.ts` registers no `session_before_compact` or `session_compact` handler.
- Current active-goal continuation is scheduled from extension `agent_end` via `scheduleMaybeContinueGoal(pi, ctx, "agentEnd")`.
- `.pi/extensions/goal/continuation.ts` uses a 25ms timer and sends hidden continuation with `{ triggerTurn: true, deliverAs: "followUp" }` only if the goal is still active, `ctx.isIdle()` is true, no pending messages exist, and safety caps are not hit.
- Pi core emits extension `agent_end` before retry/compaction handling in `_processAgentEvent()`.
- Pi core `_checkCompaction()` can run after `agent_end`; threshold compaction does not auto-retry and only continues if `agent.hasQueuedMessages()` is true.
- Pi core `_runAutoCompaction()` emits `session_before_compact`, appends compaction, rebuilds `agent.state.messages`, emits `session_compact`, then optionally calls `agent.continue()` depending on `willRetry` or queued messages.
- Pi core binds extension `ctx.isIdle()` as `() => !this.isStreaming`; this does not include `isCompacting`.
- Pi docs confirm compaction appends a `CompactionEntry` and reloads the context from the compaction boundary.

Root-cause assessment:

`pi-goals` treats `agent_end` as the only normal active-goal continuation boundary, but Pi may perform auto-retry and auto-compaction after that extension event. Because compaction is invisible to `ctx.isIdle()` and pi-goals has no post-compaction recovery hook, continuation can be lost or can race with agent-state replacement. When threshold compaction completes without an agent queue, Pi returns to idle with an active goal and no continuation trigger.

## Locked design choices

Chosen design: add compaction-aware continuation handling inside `pi-goals`.

Required behavior:

- Register `session_before_compact` and `session_compact` handlers in the goal lifecycle.
- Track a minimal compaction-in-progress flag and whether active-goal continuation was deferred.
- Suppress/reroute continuation attempts while compaction is active.
- After successful `session_compact`, replay/sync goal state as needed and schedule continuation if the effective goal is still active.
- Add telemetry names for compaction scheduling/deferral, for example `ContinuationReason: "compacted"` and `ContinuationSkipReason: "compacting"`.
- Keep the implementation scoped to `.pi/extensions/goal/`; Pi core `ctx.isIdle()` behavior can be a companion issue/follow-up, not a blocker.

Rejected alternatives:

- Pi core-only fix: useful but insufficient as first pass because pi-goals owns the continuation invariant.
- Prompt-only summary reminder: not deterministic runtime behavior.
- Longer `agent_end` timeout: still races with variable compaction duration.
- Disable auto-compaction during active goals: risks context overflow/provider errors.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,kind,target_root,next_session}:
  "ISSUE-039","open execution-ready","fix","/Users/bryan/dev/personal/experiments/pi-goals","green-loop implementation"
feature_memory[5]{id,fact}:
  "fm1","pi-goals schedules active continuation from agent_end only"
  "fm2","Pi core performs retry and compaction checks after extension agent_end"
  "fm3","extension ctx.isIdle is bound to !isStreaming and does not include compaction"
  "fm4","threshold compaction willRetry=false only continues queued agent messages"
  "fm5","reported live failure left widget active after compaction but no continuation occurred"
locked_requirements[6]{id,requirement}:
  "lr1","active goal after successful compaction schedules exactly one effective continuation"
  "lr2","continuation is not sent while compaction is in progress"
  "lr3","agent_end timer and session_compact recovery cannot duplicate continuation"
  "lr4","paused complete cleared or budget-limited goals do not continue after compaction"
  "lr5","telemetry records compaction deferral or post-compaction continuation reason"
  "lr6","existing continuation safety caps remain enforced"
invariants[4]{id,invariant}:
  "inv1","compaction must not strand an active goal silently"
  "inv2","compaction state replacement must not race with hidden continuation injection"
  "inv3","provider-error reproduction is not required for deterministic proof"
  "inv4","normal non-compaction continuation behavior remains unchanged"
implementation_surfaces[5]{path,expected_change,risk}:
  ".pi/extensions/goal/lifecycle.ts","register compaction lifecycle handlers and schedule post-compaction continuation","event ordering and stale ctx handling"
  ".pi/extensions/goal/continuation.ts","support compaction suppression/defer state and new continuation reason","duplicate or lost continuation"
  ".pi/extensions/goal/types.ts","extend continuation reason and skip reason unions","telemetry compatibility"
  ".pi/extensions/goal/telemetry.ts","persist compaction scheduling and skip signals","opaque future failures if omitted"
  ".ai/validation","add deterministic probes for compaction continuation race","probes must fail current implementation"
verification_checks[5]{id,check,evidence}:
  "v1","agent_end followed by compaction produces one post-compaction continuation","lifecycle-order probe"
  "v2","ctx idle true during compaction does not send continuation early","suppression probe"
  "v3","agent_end and session_compact paths dedupe and record telemetry","dedupe telemetry probe"
  "v4","quality gates pass","npm run quality:goal"
  "v5","bounded live probe records continuation after compaction or explicit skip reason","live closeout artifact"
```

## Implementation checklist

- [x] Add compaction lifecycle state in the continuation/lifecycle layer without breaking module separation.
- [x] Register `session_before_compact` and `session_compact` in `registerGoalLifecycle()`.
- [x] On `session_before_compact`, mark compaction active and cancel/defer any pending active-goal continuation safely.
- [x] In `maybeContinueGoal()`, suppress/defer if compaction is active even when `ctx.isIdle()` is true.
- [x] On successful `session_compact`, replay/sync goal state, clear compaction active state, and schedule continuation if the goal is still active.
- [x] Extend `ContinuationReason` with a compaction reason such as `compacted`.
- [x] Extend `ContinuationSkipReason` with a compaction reason such as `compacting`.
- [x] Add dedupe so one compaction event cannot trigger duplicate continuation with a stale `agent_end` timer.
- [x] Add deterministic probes under `.ai/validation/`.
- [x] Run `npm run quality:goal`.
- [x] Run a bounded live probe in `pi-goals-live-probe`, or write an explicit deterministic-coverage skip rationale.

## Implementation result

Implemented compaction-aware active-goal continuation in `.pi/extensions/goal/`:

- `.pi/extensions/goal/lifecycle.ts` now handles `session_before_compact` and `session_compact`.
- `.pi/extensions/goal/continuation.ts` now tracks compaction activity, defers active-goal continuation during compaction, clears a stale pending continuation timer, and schedules a post-compaction continuation with reason `compacted` if the same goal remains active.
- `.pi/extensions/goal/types.ts` extends continuation telemetry reason unions with `compacted` and `compacting`.
- `resetContinuationRuntime()` now clears compaction runtime state.

Added deterministic probes:

- `.ai/validation/goal-compaction-continuation-probe.mjs`
- `.ai/validation/goal-compaction-suppression-probe.mjs`
- `.ai/validation/goal-compaction-dedupe-telemetry-probe.mjs`
- `.ai/validation/goal-compaction-live-probe-closeout.md`

Proofs passed:

- `node .ai/validation/goal-compaction-continuation-probe.mjs` — PASS `goal_compaction_post_continuation`.
- `node .ai/validation/goal-compaction-suppression-probe.mjs` — PASS `goal_compaction_suppresses_early_send`.
- `node .ai/validation/goal-compaction-dedupe-telemetry-probe.mjs` — PASS `goal_compaction_dedupe_telemetry`.
- `test -s .ai/validation/goal-compaction-live-probe-closeout.md` — PASS with explicit deterministic-coverage skip rationale.
- `npm run quality:goal` — PASS.

## Acceptance criteria

- Active goal remains active and receives an automatic continuation after successful compaction.
- Continuation is not injected during compaction state rebuild.
- Duplicate continuation is prevented when `agent_end` and `session_compact` both try to continue.
- Telemetry can explain compaction deferral/post-compaction continuation.
- No continuation occurs for paused, complete, absent, cleared, or budget-limited goals after compaction.
- Existing create/resume/agent-end continuation behavior remains green.
- `npm run quality:goal` passes.

## Proof threat model

Primary invariant: if a pi-goal is still active after successful compaction, pi-goals must not silently stop; it must deliver exactly one effective post-compaction continuation or record a concrete blocking reason.

Likely false greens:

- Handler registration is tested, but no continuation delivery is asserted.
- Continuation fires during compaction and happens not to fail in the test.
- A post-compaction hook works but duplicates a stale `agent_end` timer.
- Telemetry remains opaque, making future live incidents undiagnosable.
- Manual compaction is covered but auto-compaction ordering is not.
- Live probe passes due to model behavior rather than deterministic extension steering.

Proof strategy:

- Simulate lifecycle order instead of reproducing provider flakiness.
- Force `ctx.isIdle()` true while compaction is marked active to prove the compaction guard, not idle state, controls suppression.
- Assert exact message counts and telemetry reasons.
- Keep a bounded live probe because the failure was live runtime steering behavior.

## Required proofs

```toon
toon.version: 1
required_proofs[5]{name,source,command,pass_condition,scope,notes}:
  "goal_compaction_continuation_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-compaction-continuation-probe.mjs","exit 0 and output includes PASS goal_compaction_post_continuation",run,"must fail if active goal after session_compact is stranded"
  "goal_compaction_suppression_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-compaction-suppression-probe.mjs","exit 0 and output includes PASS goal_compaction_suppresses_early_send",run,"must fail if continuation is sent while compaction flag is active despite ctx idle"
  "goal_compaction_dedupe_telemetry_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-compaction-dedupe-telemetry-probe.mjs","exit 0 and output includes PASS goal_compaction_dedupe_telemetry",run,"must fail if agent_end plus session_compact causes duplicate continuation or no telemetry reason"
  "quality_goal","AGENTS.md","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required extension quality gate"
  "live_probe_or_skip","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && test -s .ai/validation/goal-compaction-live-probe-closeout.md","exit 0 and closeout records bounded live pass or explicit deterministic-coverage skip rationale",run,"do not reproduce by overflowing real user context"
```

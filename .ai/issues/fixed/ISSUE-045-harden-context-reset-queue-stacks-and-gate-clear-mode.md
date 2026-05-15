# ISSUE-045 — Harden context reset queue stacks and gate clear mode

Status: fixed — implemented and validated
Priority: P0
Owner: pi-goal automation
Created: 2026-05-15
Updated: 2026-05-15
Next best session: none — issue implemented and live-proven
Next best session rationale: ISSUE-045 implementation, deterministic proofs, quality gate, and fresh live summarize queue-stack proof are complete. No issue-specific implementation session remains.
Target bucket: open
Issue kind: fix
Target repo roots:
- `~/dev/personal/experiments/pi-goals`
Parent issue: none
Depends on:
- `.ai/issues/open/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks.md`
Related:
- `.ai/docs/live-probe-scenarios/post-completion-context-reset-full-suite.md`
- `.ai/docs/pi-goals-live-probe-testing.md`
- `.pi/extensions/goal/context-reset.ts`
- `.pi/extensions/goal/terminal-workflow.ts`
- `.pi/extensions/goal/continuation-ticket.ts`
- `.pi/extensions/goal/queue-steering.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/feature-flags.ts`

## Goal

Make post-completion context reset safe for the real goal-queue-stack use case: goals should be able to summarize context between queued goals without losing the next queued item, replaying stale queue-steer messages, or causing Codex tool-call desynchronization.

Also gate `clear` context reset behind an explicit default-off flag until it has a distinct safe value over summarize.

## Transcript artifacts

Execution-readiness artifacts:

- Request intake: `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/raw/commands.log`

## Problem/context

ISSUE-044 created a safer post-completion action runner and continuation-ticket boundary, but the full/manual live probe uncovered remaining failures around automated same-session tree navigation.

Passing scenarios:

- isolated slash direct `clear` and `summarize` goals;
- slash template `clear` and `summarize` goals;
- model-tool direct/template structured context reset paths in isolated cases.

Failing scenarios:

- slash `clear` plus queued follow-up: queued `count to 2` was eaten after context reset;
- slash `summarize` plus queued follow-up: Codex emitted `No tool call found for function call output ...`; queue initially survived, but the session became poisoned;
- model-tool `enqueue_goal` / `start_queued_goal` with structured clear: tree showed repeated `pi-goal-queue-steer` branches after the first completion; apparent `Operation aborted` text surfaced after interruption and was a symptom, not the retry cause.

Manual tree navigation reverting queue state is correct. The bug is narrower: pi-goal's automated post-completion context reset navigates away from context containing queue/steering/tool-call state that pi-goal itself needs for the next queued goal.

## Why it matters

The user's main workflow is a goal queue stack with context summarized between goals. If the stack loses queued work, loops on stale queue steers, or poisons Codex tool-call state, then context reset undermines the purpose of `pi-goal` queues.

`clear` currently has little practical advantage over `summarize`: the model often emits its own prose summary after a clear action anyway. Until clear has safe semantics in queue contexts, it should not be default-on.

## Desired behavior

### Summarize queue stack

A queued stack such as:

```text
/goal count to 1 and summarize context
/goal queue count to 2
```

must behave as follows:

1. first goal objective is directive-stripped;
2. first goal completes;
3. context summarize/navigation succeeds or fails visibly as an optional action;
4. queued `count to 2` remains protected across the automated navigation;
5. exactly one fresh valid queue handoff/steer starts the queued goal;
6. queued goal completes;
7. no stale `pi-goal-queue-steer` replay loop occurs;
8. no Codex `No tool call found for function call output ...` error occurs;
9. cleanup leaves no active goal and no queued goals.

### Clear gate

- Add a clear-specific gate, recommended name `PI_GOAL_CONTEXT_RESET_CLEAR`.
- Default: disabled.
- Existing `PI_GOAL_CONTEXT_RESET=0` still disables all context reset modes.
- If a clear action is requested while clear is disabled:
  - do not call `navigateTree`;
  - record action skipped/disabled or equivalent terminal non-fatal state;
  - warn visibly/actionably;
  - continue goal/queue workflow;
  - do not silently downgrade to summarize.

## Grounded research findings

See the grounded research artifact:

- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/02-grounded-research.md`

Key facts:

```toon
toon.version: 1
current_facts[8]{id,fact}:
  "cf1","context reset calls captured commandContext.navigateTree(anchorEntryId, summarize-or-clear-options)"
  "cf2","there is no clear-specific feature flag; PI_GOAL_CONTEXT_RESET currently gates both clear and summarize"
  "cf3","ContinuationTicket stores goalId and queueId only, not the queued goal payload"
  "cf4","terminal workflow revalidates after actions with getQueue()[0]?.queueId, so branch navigation that loses the enqueue invalidates handoff"
  "cf5","queue events replay from ctx.sessionManager.getBranch(), so navigating to a branch before enqueue normally removes queued state"
  "cf6","goal complete state survives isolated reset because post-navigation action completion persists a fresh complete goal snapshot"
  "cf7","queueSteeringStillValid only checks queueId against current queue head"
  "cf8","existing deterministic probes do not cover successful reset plus post-anchor queued follow-up or stale queue-steer replay across navigation"
```

Live/manual facts:

```toon
toon.version: 1
live_facts[5]{id,scenario,result}:
  "lf1","isolated clear/summarize direct/template goals","pass"
  "lf2","slash clear plus queued follow-up","fail: queued follow-up eaten"
  "lf3","slash summarize plus queued follow-up","fail: Codex tool-call desync error"
  "lf4","manual branch navigation before enqueue","expected: queue state reverts"
  "lf5","model-tool enqueue/start structured clear","fail: repeated pi-goal-queue-steer branches after completion"
```

## Locked design choices

See design-lock artifact:

- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/03-design-lock.md`

Locked choices:

```toon
toon.version: 1
locked_choices[7]{id,choice}:
  "lc1","summarize queue stacks are the supported main path"
  "lc2","clear mode is separately gated default-off"
  "lc3","disabled clear is skipped/warned, not silently downgraded to summarize"
  "lc4","cache a continuation envelope with queued payload before navigation"
  "lc5","repair/replay only continuation-relevant queue state after pi-goal initiated navigation"
  "lc6","invalidate stale queue steers by generation/consumption state"
  "lc7","dispatch one fresh queue handoff after repair/navigation barrier"
```

Rejected alternatives:

```toon
toon.version: 1
rejected[6]{id,alternative,reason}:
  "r1","make all queue state globally durable outside tree semantics","manual tree navigation should still replay selected branch state normally"
  "r2","disable all context reset in queued stacks","summarized queue stacks are the main use case"
  "r3","leave clear enabled by broad context reset flag","clear is low-value and unsafe in current queue contexts"
  "r4","silently convert clear to summarize","misrepresents user intent and hides evidence"
  "r5","only snapshot queueId in continuation ticket","live failure shows queueId-only cannot survive branch navigation"
  "r6","treat Codex tool-call desync as unrelated noise","owner/live evidence correlates it with reset/tree navigation"
```

## Execution checklist

- [ ] Run `sentrux gate --save .pi/extensions/goal` before substantial implementation.
- [ ] Add clear-specific flag/strategy selection, default-off.
- [ ] Update context reset runner so disabled clear never calls `navigateTree`, records skipped/disabled state, warns, and continues.
- [ ] Extend continuation ticket/envelope to capture queued head payload and generation before post-completion actions run.
- [ ] Add branch-navigation repair that replays/merges the cached queued head only for pi-goal initiated automated reset when navigation lost it.
- [ ] Preserve manual tree navigation semantics: selecting a branch before an enqueue should still remove that enqueue outside automated reset repair.
- [ ] Add queue steering generation/consumption state.
- [ ] Make `queueSteeringStillValid` reject stale/consumed/generation-mismatched steers.
- [ ] Ensure `start_queued_goal`/dequeue/completion invalidates old steers for the consumed queue item.
- [ ] Dispatch exactly one fresh queue handoff after post-navigation repair.
- [ ] Add deterministic probes listed in required proofs.
- [ ] Run `npm run quality:goal`.
- [ ] Run a fresh live summarize queue-stack probe with cleanup.

## Acceptance criteria

- `PI_GOAL_CONTEXT_RESET_CLEAR` or equivalent clear-specific gate exists and defaults to disabled.
- Requesting clear while clear gate is disabled does not call tree navigation, does not silently summarize, and does not block goal/queue continuation.
- Summarize reset remains enabled by default when `PI_GOAL_CONTEXT_RESET` is enabled.
- Continuation ticket/envelope captures queued head payload before post-completion action navigation.
- Automated post-completion summarize navigation repairs/replays only the queue state needed for the captured continuation if branch replay lost it.
- Manual branch navigation still reverts branch-local queue mutations normally.
- Stale `pi-goal-queue-steer` messages are invalid after queue start/dequeue/completion and cannot loop after context reset navigation.
- A summarize queue stack starts the next queued goal exactly once after reset.
- The live summarize queue stack produces no Codex `No tool call found for function call output ...` error.
- No TypeScript escape-hatch casts are introduced in `.pi/extensions/goal`.
- `npm run quality:goal` passes.

## Proof threat model

See:

- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/04-proof-threat-model.md`

Primary invariant: a goal queue stack that summarizes context between completed goals must continue to the next queued goal exactly once without losing queued work, replaying stale queue steers, or poisoning Codex/tool-call state.

Important false-green risks:

- isolated direct/template context reset tests pass but queue stacks remain broken;
- deterministic probes pass but real Pi tree navigation still desyncs Codex;
- clear appears documented as disabled but still navigates by default;
- queue is made globally durable and breaks manual tree navigation semantics;
- old queue steers remain valid and drive repeated branches.

## Required proofs

```toon
toon.version: 1
required_proofs[10]{name,source,command,pass_condition,scope,notes}:
  "sentrux_baseline","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && sentrux gate --save .pi/extensions/goal","exit 0 before substantial implementation",run,"required project gate"
  "clear_default_off_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-context-reset-clear-default-off-probe.mjs","exit 0; proves clear defaults disabled, skips/warns without navigateTree, explicit enable allows clear",run,"new probe"
  "queue_payload_repair_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-context-reset-queue-payload-repair-probe.mjs","exit 0; proves queued head payload is cached before navigation and replayed/merged after automated reset if branch replay lost it",run,"new probe"
  "stale_queue_steer_suppression_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-queue-steer-generation-probe.mjs","exit 0; proves consumed/generation-mismatched pi-goal-queue-steer messages are invalid after dequeue/start/completion and navigation repair",run,"new probe"
  "manual_tree_replay_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-queue-manual-tree-replay-probe.mjs","exit 0; proves manual branch replay before an enqueue still removes that queue mutation outside automated reset repair",run,"new or targeted replay probe"
  "model_tool_enqueue_once_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-model-tool-enqueue-start-once-probe.mjs","exit 0; proves enqueue_goal/start_queued_goal/update_goal consumes one queued item and invalidates stale queue steering",run,"new probe"
  "existing_post_completion_probes","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-context-reset-action-runner-probe.mjs && node .ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs && node .ai/validation/goal-post-completion-feature-flag-probe.mjs && node .ai/validation/goal-tool-post-completion-actions-schema-probe.mjs","all commands exit 0",run,"regression guard for ISSUE-044 behavior"
  "no_ts_escape_hatches","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && ! rg -n 'as unknown as|as any' .pi/extensions/goal","exit 0",run,"project rule"
  "quality_goal","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required final gate"
  "summarize_queue_stack_live_probe","ISSUE-045","Use .ai/docs/pi-goals-live-probe-testing.md with a fresh pi-goals-live-probe process; capture transcript under /tmp","transcript shows summarize navigation, no Codex No tool call found error, queued count-to-2 starts exactly once and completes, no repeated stale pi-goal-queue-steer branches, cleanup leaves no active goal/queue",live,"mandatory live proof"
```

## TOON synthesis

```toon
toon.version: 1
issue[1]{id,status,kind,target_session,goal}:
  "ISSUE-045","execution-ready",fix,"implementation-ready-issue","make summarize queue stacks safe and gate clear context reset default-off"

feature_memory[5]{id,fact}:
  "fm1","ISSUE-044 isolated post-completion action failures from queue continuation but live queue-stack reset still fails"
  "fm2","isolated clear/summarize direct/template goals already pass"
  "fm3","successful reset plus queued follow-up can lose the queue head after branch navigation"
  "fm4","summarize queue-stack path can trigger Codex tool-call desync"
  "fm5","model-tool enqueue/start path can replay stale pi-goal-queue-steer messages"

locked_requirements[6]{id,requirement}:
  "lr1","summarize queue stacks continue to next queued item exactly once"
  "lr2","automated reset caches and repairs continuation-relevant queued payload across navigation"
  "lr3","stale queue steers are invalidated after queue consumption/navigation repair"
  "lr4","clear context reset is default-off behind explicit gate"
  "lr5","manual tree navigation semantics remain branch-local"
  "lr6","live proof must show no Codex tool-call desync"

implementation_surfaces[7]{path,role}:
  ".pi/extensions/goal/feature-flags.ts","add clear-specific gate"
  ".pi/extensions/goal/context-reset.ts","skip/warn disabled clear and keep summarize adapter safe"
  ".pi/extensions/goal/continuation-ticket.ts","capture queued payload/generation before action navigation"
  ".pi/extensions/goal/terminal-workflow.ts","repair queue state after automated navigation before dispatch"
  ".pi/extensions/goal/queue-state.ts","support scoped repair/merge and steering generation state"
  ".pi/extensions/goal/queue-steering.ts","reject stale/consumed queue steers"
  ".pi/extensions/goal/lifecycle.ts","ensure context filter uses strengthened queue-steer validity"

verification_checks[5]{id,check,evidence}:
  "v1","clear default-off cannot navigate","clear_default_off_probe"
  "v2","queued payload survives automated summarize reset","queue_payload_repair_probe"
  "v3","stale queue steers cannot loop","stale_queue_steer_suppression_probe"
  "v4","manual branch replay still reverts queue mutations","manual_tree_replay_probe"
  "v5","real summarize queue stack works without Codex desync","summarize_queue_stack_live_probe"
```

## Implementation-ready plan

Status decision: implementation-ready.

Implementation-readiness transcript artifacts:

- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/implementation-readiness/00-intake.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/implementation-readiness/01-protocol-read.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/implementation-readiness/02-live-surface-research.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/implementation-readiness/03-implementation-design-lock.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/implementation-readiness/04-patch-sequence.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/implementation-readiness/05-proof-plan.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/implementation-readiness/06-issue-writeback.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/implementation-readiness/07-final-audit.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/implementation-readiness/08-deslop-guidance-map.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/implementation-readiness/raw/commands.log`

Exact implementation surfaces:

- `.pi/extensions/goal/feature-flags.ts` — edit — add clear-specific default-off flag.
- `.pi/extensions/goal/context-reset.ts` — edit — skip/warn disabled clear before `navigateTree`; preserve summarize.
- `.pi/extensions/goal/types.ts` — edit — add queued-origin metadata and shared repair/ticket types if needed.
- `.pi/extensions/goal/state.ts` — edit — parse/persist optional `sourceQueueId`.
- `.pi/extensions/goal/queue-state.ts` — edit — add queue revision, repair event/replay support, exact head restore, and source queue consume repair helpers.
- `.pi/extensions/goal/continuation-ticket.ts` — edit — change queue handoff ticket/envelope to carry queued payload, queue revision, and source queue data.
- `.pi/extensions/goal/terminal-workflow.ts` — edit — add post-navigation repair barrier before revalidation and dispatch.
- `.pi/extensions/goal/queue-steering.ts` — edit — include queue revision in steer details and reject stale/no-revision steers.
- `.pi/extensions/goal/lifecycle.ts` — edit — keep context filtering but use strengthened queue-steer validity.
- `.pi/extensions/goal/queue-tools.ts` — edit — set `sourceQueueId` on queued starts; ensure dequeue/start invalidates old steering.
- `.pi/extensions/goal/tools.ts` — edit — stop running navigation-capable terminal workflow inside `update_goal` tool execution; rely on turn-end or a safe deferred barrier.
- `README.md` — edit — document summarize queue-stack recommendation and default-off clear gate.
- `.ai/docs/live-probe-scenarios/post-completion-context-reset-full-suite.md` or new ISSUE-045 scenario — edit/create — add focused summarize queue-stack live probe.
- `.ai/validation/*.mjs` — create/edit — add required probes listed below.

Patch sequence summary:

1. Add red deterministic probes for clear default-off, queue payload repair, stale queue-steer generation, manual replay, and model-tool enqueue/start once.
2. Add clear-specific feature flag and context-reset runner skip/warn behavior.
3. Add `sourceQueueId` goal metadata for queued starts.
4. Add queue revision and scoped repair helpers in `queue-state.ts`.
5. Expand continuation ticket/envelope to carry queued payload and revision.
6. Add terminal workflow repair barrier after post-completion actions and before queue handoff dispatch.
7. Add queue-steer generation/revision validity and stale steer suppression.
8. Defer terminal workflow navigation out of `update_goal` tool execution.
9. Update docs/live probe protocol.
10. Run deterministic, quality, and live validation.

Validation/proof sequence:

1. `sentrux gate --save .pi/extensions/goal` before implementation.
2. `node .ai/validation/goal-context-reset-clear-default-off-probe.mjs`.
3. `node .ai/validation/goal-context-reset-queue-payload-repair-probe.mjs`.
4. `node .ai/validation/goal-queue-steer-generation-probe.mjs`.
5. `node .ai/validation/goal-queue-manual-tree-replay-probe.mjs`.
6. `node .ai/validation/goal-model-tool-enqueue-start-once-probe.mjs`.
7. Existing post-completion regression probes named in `05-proof-plan.md`.
8. `npm run typecheck:goal`.
9. `! rg -n 'as unknown as|as any' .pi/extensions/goal`.
10. `npm run quality:goal`.
11. Fresh live summarize queue-stack probe with no Codex `No tool call found...`, queued count-to-2 starts exactly once, no stale queue-steer loop, and cleanup.

Blocker/fallback policy:

- Stop if a fix requires private Pi internals or TypeScript escape-hatch casts.
- Stop if queue repair duplicates queued items or reorders a different current head.
- Stop if `update_goal` still triggers `navigateTree` before the tool result settles.
- Stop if live probe still shows Codex tool-call desync or repeated `pi-goal-queue-steer` branches.
- Do not re-enable clear by default in this issue.

Deslop/production-hardening guidance:

- Use `08-deslop-guidance-map.md` during implementation.
- Pause after phases 2, 4, 6, 7, and 8 for internal deslop review.
- Especially check TypeScript hazards: escape-hatch casts, optional-call no-op success assumptions, loose queue/ticket object typing, duplicated queue event parsing, and hidden success logs.

Handoff notes:

- First implementation action: run `git status --short --untracked-files=all` and `sentrux gate --save .pi/extensions/goal`.
- Start with probes and flag behavior; do not edit live lifecycle navigation first.
- Preserve manual tree replay semantics; repair only pi-goal initiated automated reset continuation state.
- Treat summarize queue-stack live proof as mandatory; deterministic probes are not enough.



## Implementation closeout

Implementation status: fixed — implemented and validated.

Closeout artifact:

- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/10-implementation-closeout.md`

Validation evidence:

- Deterministic validation logs: `/tmp/issue045-validation-20260515T110936Z/validation.log`, `/tmp/issue045-validation-rerun-20260515T111443Z/validation.log`.
- Fresh live probe transcript: `/tmp/issue045-summarize-queue-stack-live-probe-fresh-20260515T111920Z/`.
- Final quality gate: `npm run quality:goal` passed.

Key live result: summarize queue stack completed without Codex `No tool call found for function call output`, queued `count to 2` started once in focused output and completed, no stale queue-steer loop markers appeared in focused raw output, and cleanup left no queued goals.

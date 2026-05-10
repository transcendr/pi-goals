# ISSUE-036 — Minimum goal spend floors

Status: open — execution-ready
Priority: P1
Owner: pi-goal automation
Created: 2026-05-10
Next best session: focused implementation/validation pass for minimum spend floors
Next best session rationale: The product/API fork is locked to hard pre-wrap-up gates with qualitative anti-churn steering. The implementation spans state, tools, lifecycle prompts, monitor, UI, README, and live validation, so it needs a focused behavior-changing pass with deterministic probes plus live `pi-goals-live-probe` evidence.
Target bucket: open
Issue kind: feature
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/issues/fixed/ISSUE-007-goal-budget-warning-and-hard-stop.md`
- `.ai/issues/fixed/ISSUE-009-goal-budget-edit-status-recompute.md`
- `.ai/issues/fixed/ISSUE-012-goal-budget-limited-resume-and-wrapup-gaps.md`
Related:
- `.ai/issues/fixed/ISSUE-020-goal-churn-monitor.md`
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`
- `.ai/docs/pi-goals-live-probe-testing.md`

## Goal

Add minimum goal spend floors: optional minimum token and/or time thresholds that must be satisfied before a goal can begin normal wrap-up or be marked complete. The floors are the semantic opposite of existing maximum token/time budgets: max budgets say "stop at or before this cap," while min floors say "do not wrap up before at least this much goal-directed work has been spent."

The feature must not encourage aimless quota filling. When an agent attempts to stop before the floor is met, `pi-goals` must steer it toward materially valuable additional work: alternate-perspective review, deeper research, stronger validation, proof threat modeling, simplification/deslop, compatibility/security/performance review, documentation/handoff improvement, or another concrete pass that qualitatively improves the deliverable.

## Problem/context

Existing `pi-goals` supports maximum `tokenBudget` and `timeBudgetSeconds` fields. They warn, wrap up, and eventually stop when the goal spends too much time or token budget. There is no corresponding way to require a minimum amount of goal-directed effort before the agent begins wrap-up.

This gap matters for goals where premature completion is more harmful than extra bounded work. A user may want the agent to spend at least 30 minutes researching alternatives, at least 200K tokens exploring a design space, or at least a short sustained pass improving a deliverable before summarizing or calling the goal done.

A display-only minimum is insufficient. The owner explicitly chose hard gates and emphasized that the central behavior is effective steering when an agent tries to stop too early, without devolving into low-quality churn.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/06-final-audit.md`
- Owner feedback follow-up: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/07-owner-feedback-followup.md`
- BCU + ChatGPT research evidence: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/08-bcu-chatgpt-research.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/raw/commands.log`
- Raw copied ChatGPT response: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/raw/chatgpt-response-round1.txt`
- Raw grounded ChatGPT Round 2 prompt: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/raw/chatgpt-round2-grounded-prompt.txt`
- Raw grounded ChatGPT Round 2 response: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/raw/chatgpt-response-round2-grounded.txt`
- Raw ChatGPT Round 3 execution-risk prompt: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/raw/chatgpt-round3-execution-angle-prompt.txt`
- Raw ChatGPT Round 3 execution-risk response: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/raw/chatgpt-response-round3-execution-angle.txt`
- Raw ChatGPT Round 3B adversarial prompt: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/raw/chatgpt-round3b-adversarial-followup-prompt.txt`
- Raw ChatGPT Round 3B current page text: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/raw/chatgpt-response-round3b-adversarial-current-text.txt`

## Desired behavior

### Floor configuration

Users/agents can configure optional minimum floors when creating or updating a goal:

- minimum tokens before wrap-up;
- minimum time seconds before wrap-up.

When both floors are set, all configured floors must be met before normal completion is allowed.

### Hard pre-wrap-up gate

If an agent calls `update_goal(status: "complete")` before configured floors are satisfied:

- the tool **defers** completion instead of accepting the update;
- goal state remains active or otherwise unchanged;
- the tool response identifies unmet floor(s) with current usage vs threshold;
- the response begins with `Completion deferred by goal floor. The goal remains active.` rather than a generic error;
- the response returns structured details including `completion_blocked_by_floor: true`, the floor evaluation, and `next_floor_pass`;
- the response tells the agent to continue with materially valuable work, not filler;
- no queue-complete steering is emitted from the deferred completion attempt.

### Autonomous floor-value continuation design

The qualitative steering must be implemented as concrete shared logic, not only hand-written prompt prose. Add narrow design surfaces:

1. `.pi/extensions/goal/floor.ts` owns pure completion-floor evaluation and min/max validation helpers.
2. `.pi/extensions/goal/completion-gate.ts` owns completion decisions and is called by `update_goal(status:"complete")` after candidate validation but before any completion side effects, continuation/monitor cancellation, or state persistence.
3. `.pi/extensions/goal/floor-steering.ts` owns catalog-backed floor work selection and prompt/refusal text.

Internally, prefer the terms `completion floor` or `premature wrap-up floor` over `minimum spend`; the public tool fields can remain `min_*_before_wrap_up` for clarity, but implementation comments should stress that floors are not quotas.

`completion-gate.ts` should expose:

- `type CompletionDecision = { kind: "allow" } | { kind: "defer_and_steer"; card: FloorWorkCard; floor: CompletionFloorEvaluation; message: string } | { kind: "allow_with_reason"; reason: NoMoreValuableWorkReason | "max_budget_requires_wrap_up"; floor: CompletionFloorEvaluation }`;
- `decideGoalCompletion(input: { currentGoal; candidateGoal; telemetry; recentMonitorPatterns }): CompletionDecision`;
- `buildCompletionGateResult(decision)` / `floorCompletionDeferredResult(...)` for tool details and prompt text.

The gate must evaluate floors against the **current** goal, not a candidate already changed to `status: "complete"`. It must run before `update_goal` cancels continuations/monitors or persists a non-active status.

`floor-steering.ts` should expose:

- `type FloorValuePassId` for stable pass ids;
- `type FloorWorkCard` for bounded useful-work cards;
- `FLOOR_VALUE_PASS_CATALOG`, a structured table of autonomous value-adding passes;
- `selectFloorWorkCard(goal, telemetry, floor, recentEvidence)` with repeat/churn penalties;
- `buildFloorContinuationGuidance(goal, telemetry, context)` for continuation/monitor prompt text;
- `buildFloorCompletionRefusal(goal, telemetry)` for deferred-completion tool responses;
- helper formatting for unmet floor deltas and the next-pass selection rules.

Add floor-work history to telemetry so the selector and monitor can avoid repetition:

- `lastFloorCardId?: FloorValuePassId`;
- `completedFloorCardIds?: FloorValuePassId[]`;
- `floorSteerCount?: number`;
- `floorChurnSteerCount?: number`;
- `floorQualityState?: "inactive" | "eligible" | "steering" | "qualityWarning" | "exhausted" | "overriddenByMaxBudget"`;
- `noMoreValuableWorkReason?: "objective_fully_satisfied" | "no_safe_autonomous_work" | "max_budget_requires_wrap_up" | "user_requested_stop"`.

Important: when useful autonomous work is exhausted, the system should allow completion with a recorded `noMoreValuableWorkReason` / `floorQualityState: "exhausted"` rather than manufacture work just to satisfy a numeric floor. Round 2 research refined this further: `noMoreValuableWorkReason` is a **recorded outcome**, not a model-granted permission. A first early completion attempt cannot bypass floors merely by supplying `no_more_valuable_work_reason`; the gate should honor it only after max-budget exhaustion, monitor/telemetry-backed floor exhaustion, explicit user floor removal/change, or an exhausted selector after concrete floor work.

Minimum first-pass catalog:

| Pass id | Choose when | Concrete first actions | Required evidence/artifact | Avoid |
| --- | --- | --- | --- | --- |
| `requirement_gap_audit` | Deliverable may not cover every explicit requirement | Re-read objective, map requirements to artifacts/proofs, inspect missing or weak rows | checklist delta, added/fixed artifact, or precise gap closure | restating the same checklist without inspecting evidence |
| `adversarial_review` | Existing solution may false-green or miss edge cases | Attack assumptions, enumerate failure modes, add/adjust proof threat model or tests | new risk, test, validation row, or mitigation | generic “looks good” review |
| `alternate_perspective` | Design/product/API may have unexamined tradeoffs | Review from user/operator/maintainer/runtime perspectives and reconcile consequences | design adjustment, rejected alternative, or documented invariant | brainstorming with no decision/writeback |
| `research_expansion` | More external/contextual evidence can improve quality | Inspect relevant docs, code, web/GitHub/open-source examples when available | cited finding with impact on artifact/design | unrelated browsing or source dumping |
| `validation_expansion` | Proof coverage is thin | Add/run targeted test/probe/replay/live validation or improve proof commands | command output, new probe, stronger pass condition | rerunning unrelated green checks only |
| `simplification_deslop` | Artifact/code/design is overcomplex or AI-sloppy | Remove duplication, tighten wording/API, simplify flow, improve maintainability | concrete diff or simplified section with behavior preserved | style-only churn |
| `compatibility_review` | Change may affect replay, queue, budgets, UI, safety, security, performance, or accessibility | Inspect cross-surface compatibility and add guardrails | compatibility finding, invariant, or acceptance criterion | speculative concern with no action |
| `docs_handoff_evidence` | Work is technically done but hard to verify or continue | Improve README, issue, comments, closeout, proof links, or handoff evidence | clearer handoff/evidence artifact | summary-only final answer |

Prompt algorithm for unmet floors:

1. State that floor(s) are unmet and normal wrap-up/completion is blocked by a completion floor, not by a quota target.
2. Instruct the worker to choose exactly one `next_floor_pass` / `FloorWorkCard` from the catalog before more work.
3. Choose by priority: unresolved explicit requirement > weak proof/validation > unresolved design/research uncertainty > quality/simplification gap > docs/handoff/evidence gap.
4. Require at least one concrete tool-backed inspection/edit/proof when tools are available.
5. Require a tangible new evidence/artifact delta before another completion attempt.
6. Avoid repeating the same pass twice in a row unless new evidence changes the reason; use `lastFloorCardId` and `completedFloorCardIds` to enforce this.
7. Forbid repetitive summaries, quota-filling, and low-value churn.
8. If no card can safely produce new objective-linked evidence, return/record `noMoreValuableWorkReason: "no_safe_autonomous_work"` and allow completion rather than inventing busywork.

### Autonomous-by-default rule

Do not ask the user merely because a floor is unmet or because the next valuable pass is not obvious. Unless the goal objective explicitly permits or requests user decisions, floor-unmet behavior must be autonomous.

If the worker cannot identify an obvious high-value pass, it must use this autonomous fallback ladder instead of asking the user:

1. requirement/gap audit;
2. validation/proof expansion;
3. alternate-perspective or adversarial review;
4. deeper local/external research when available;
5. simplification/deslop/maintainability pass;
6. documentation, handoff, and evidence hardening.

The only exception is an independent safety/destructive-action boundary that requires explicit user authorization. Floor-unmet state by itself is not such a boundary.

Add a conservative helper such as `objectiveAllowsUserFloorFallback(objective: string)` for this rule. It should match explicit phrases like `ask me`, `confirm with me`, `wait for my decision`, `let me choose`, or `before choosing`, and must not treat vague words like `discuss`, `explore`, or `recommend` as permission to ask the user for floor-unmet direction.

### Floor-aware monitor design

The churn monitor should be the primary quality backstop for floor-driven work.

Extend `GoalMonitorReport` with a floor object shaped like:

```ts
floor: {
  minTokensBeforeWrapUp?: number;
  minTimeSecondsBeforeWrapUp?: number;
  tokensRemainingBeforeWrapUp?: number;
  timeSecondsRemainingBeforeWrapUp?: number;
  tokenFloorMet: boolean;
  timeFloorMet: boolean;
  allFloorsMet: boolean;
  completionBlockedByFloor: boolean;
}
```

Render this state in `monitor-prompts.ts` alongside goal/budget/telemetry fields. Update the monitor prompt with explicit floor-unmet decision rules:

- return `watch` when the worker is doing a concrete value pass from the catalog and recent context shows new evidence or artifact movement;
- return `steer` when the worker attempts early wrap-up, repeats summaries, avoids tools/evidence, or appears to burn time/tokens without improving the deliverable;
- do not return `escalate` just because floors are unmet or no obvious next pass appears;
- use `escalate` only when the objective explicitly allows user input or a separate safety/authorization blocker requires it.

Stable floor-related monitor pattern names:

- `floor_ignored_early_wrapup`
- `quota_filling_churn`
- `repeated_floor_pass_no_new_evidence`
- `productive_floor_deepening`
- `floor_blocked_autonomous_fallback_needed`
- `floor_quality_exhausted`

Monitor steering text must name one next value pass and one concrete next action, for example: `Switch to validation_expansion: add or run one probe that would fail if the current artifact missed the main invariant.` It must not merely say “keep going until the floor is met.”

The monitor should score floor work by objective-linked evidence deltas, not by elapsed tokens/time. Strong floor-work evidence includes changed files, new proof commands/output, new issue/doc rows, new compatibility findings, or a precise no-gap finding tied to inspected files. Churn evidence includes repeated same-file reads, repeated same commands, summary-only turns, cosmetic edits, unrelated refactors, validation theater, asking the user without permission, completion retries without new work, and tool loops with no state delta.

After repeated bad/no-evidence floor work, the monitor should set or recommend `floorQualityState: "exhausted"` / pattern `floor_quality_exhausted` so the completion gate can allow completion with `no_more_valuable_work_reason` instead of trapping the worker in churn.

### Maximum budget precedence

Existing maximum budgets remain safety caps. If a maximum token/time budget is reached before a minimum floor is satisfied, the goal still follows existing `budgetLimited` behavior. Minimum floors must never force work beyond a maximum budget or hard stop.

### User escape hatches

First release does not add a force-complete override. A user can end early by:

- lowering or removing the floor through `update_goal`;
- pausing the goal;
- clearing/replacing the goal;
- accepting a maximum-budget-limited wrap-up as incomplete progress when a cap is reached first.

## Grounded research findings

Full research is in `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/02-grounded-research.md`.

Key code facts:

- `.pi/extensions/goal/types.ts` defines `GoalState` with max budgets and usage counters but no minimum floor fields.
- `.pi/extensions/goal/state.ts` persists branch-replayable custom `pi-goal-state` events; optional floor fields can be backward-compatible because goal parsing is permissive.
- `.pi/extensions/goal/budget.ts` centralizes max budget warning/reached/hard-stop logic and should stay authoritative for caps.
- `.pi/extensions/goal/tools.ts` is the critical model-tool path for create/update/complete behavior; `update_goal(status:"complete")` currently has no floor gate.
- `.pi/extensions/goal/command.ts` and `.pi/extensions/goal/queue-tools.ts` create and start goals through `createGoalState()` and queue metadata; these paths must preserve floor settings where supported.
- `.pi/extensions/goal/prompts.ts` owns continuation and budget wrap-up prompts; it is the natural home for qualitative floor guidance.
- `.pi/extensions/goal/monitor-prompts.ts` and `.pi/extensions/goal/monitor.ts` run the third-party churn monitor; reports currently include max budgets, usage, and telemetry but no min-floor state.
- `.pi/extensions/goal/format.ts`, `.pi/extensions/goal/widget.ts`, and `.pi/extensions/goal/ui.ts` render status, summaries, widget bars, and footer text; they must display floors differently from max budgets.
- `package.json` already defines `npm run quality:goal` as the required implementation gate.
- `.ai/docs/pi-goals-live-probe-testing.md` requires real Pi live probe validation for behavior-changing goal runtime work unless explicitly skipped with a strong reason.
- `sentrux check .pi/extensions/goal` passed during planning (`33 rules checked`, quality `6243`).
- BCU + ChatGPT Round 2 reviewed the grounded repo/module context and added concrete design refinements: a pure `floor.ts`, careful completion-gate insertion order, non-error completion deferral text, narrow user-fallback detection, telemetry mutation helpers, soft final-answer bypass handling, and a skeptical no-value escape.
- BCU + ChatGPT Round 3 reviewed implementation execution risk and added patch-order/insertion locks: same-call floor removal plus completion is blocked, `createGoalState` uses an options object, budget wrap-up prompts stay floor-free, replay is defensive, and monitor telemetry mutation is stale-guarded.

## Locked design choices

Full design lock is in `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/03-design-lock.md`.

### Chosen product/API behavior

Use hard gates with qualitative continuation steering.

Rejected alternatives:

- Soft guidance only: rejected because fields/prompt text without a completion gate would false-green the main invariant.
- Hybrid override: deferred because reliably distinguishing model initiative from explicit user force-complete intent needs additional API semantics. First release keeps simpler proof semantics.

### Field naming

Use behavior-specific names to avoid confusing floors with existing max budgets:

- `GoalState.minTokensBeforeWrapUp?: number`
- `GoalState.minTimeSecondsBeforeWrapUp?: number`
- `QueuedGoal.minTokensBeforeWrapUp?: number`
- `QueuedGoal.minTimeSecondsBeforeWrapUp?: number`

Agent-facing model tool parameters:

- `min_tokens_before_wrap_up`
- `min_time_seconds_before_wrap_up`

Update tool parameters accept `null` to remove a configured floor, matching existing max-budget edit conventions. However, a single `update_goal` call must not both remove/lower an unmet completion floor and set `status:"complete"`; first release requires two separate updates so the completion gate evaluates current persisted floors and cannot be bypassed by same-call floor removal.

### Satisfaction rule

- Token floor is met when `tokensUsed >= minTokensBeforeWrapUp`.
- Time floor is met when `timeUsedSeconds >= minTimeSecondsBeforeWrapUp`.
- If both floors are set, both must be met.
- Floors must be positive integers.
- If a max budget exists for the same resource, the minimum floor must be less than or equal to the max budget. Reject impossible configurations at create/update/enqueue time.

### Status model

Do not add a new `GoalStatus` in the first release. Preserve:

- `active`
- `paused`
- `budgetLimited`
- `complete`

Floor readiness is derived from goal fields and usage, not encoded as a status.

### Execution-risk locks from Round 3 BCU research

Round 3 BCU + ChatGPT research reviewed the design from a maintainer/test-engineer patch-risk angle. Carry these locks into implementation:

- Completion floors are evaluated against the **current persisted goal**, not a candidate goal already edited to remove/lower floors or set `status:"complete"`.
- Completion deferral must reject the completion mutation but return a successful structured deferral result, not a generic `Error:` result.
- Completion deferral must not cancel continuations, cancel monitors, persist `complete`, or emit queue-complete steering.
- `noMoreValuableWorkReason` is an internal recorded outcome on telemetry/tool details, not a first-release model-granted bypass parameter.
- Max token/time budgets always override min floors; budget-limited wrap-up must not schedule or prompt floor-value work.
- Agent-end continuation suppression must not swallow floor-unmet steering unless budget is exhausted, floor quality is exhausted, or existing safety caps apply.
- Floor monitor pattern decisions may mutate telemetry only for the matching current active goal while `completionBlockedByFloor` is true.
- Tool input validation is strict; replay/loading of optional historical floor fields is defensive and must not crash on missing or malformed values.
- Floor settings must propagate through create, template, update, enqueue, queued persistence, queue display, and start-queued-goal paths.
- `createGoalState` must use a named options object for max budgets and min floors rather than adding more optional positional arguments.
- Floor history telemetry must be default-safe, unique/bounded, and optional for backward compatibility.

## Implementation checklist

- [ ] Run `sentrux gate --save .pi/extensions/goal` before substantial implementation.
- [ ] Add optional minimum floor fields to `GoalState`, queued goal state, explicit tool detail types, and state/replay helpers; replay must ignore/sanitize malformed optional floor fields while tool input remains strict.
- [ ] Add `.pi/extensions/goal/floor.ts` with pure floor evaluation and validation helpers:
  - no floors;
  - token floor met/unmet;
  - time floor met/unmet;
  - both floors;
  - remaining floor deltas;
  - impossible min > max validation.
- [ ] Add `completion-gate.ts` so `update_goal(status:"complete")`, soft wrap-up detection, and monitor floor decisions share one completion decision path.
- [ ] Change `createGoalState()` to accept a named options object (`objective`, max budgets, min floors, optional `now`) and update tool/template/queue create paths to accept and preserve floors.
- [ ] Extend model tool schemas/descriptions for `create_goal`, `create_goal_from_template`, `enqueue_goal`, and `update_goal` with floor parameters.
- [ ] Add update handling for setting/removing floors and recomputing floor readiness without changing paused/complete semantics unexpectedly; block same-call floor removal/lowering plus `status:"complete"` while current persisted floors are unmet.
- [ ] Gate `update_goal(status:"complete")` so unmet floors defer completion after candidate validation and active-resume budget checks but before `cancelContinuation`, `cancelMonitor`, completion persistence, or queue-complete steering, with actionable high-value continuation guidance and structured `completion_blocked_by_floor` details.
- [ ] Add the concrete floor-steering module/catalog and reuse it from continuation prompts, completion-refusal text, and monitor steering.
- [ ] Add floor-work telemetry/history (`lastFloorCardId`, `completedFloorCardIds`, floor/churn steer counts, `floorQualityState`, `noMoreValuableWorkReason`) plus mutation helpers (`noteFloorCompletionDeferred`, `noteProductiveFloorWork`, `noteFloorChurnSteer`, `noteFloorQualityExhausted`).
- [ ] Update continuation prompts with floor state, the pass-selection algorithm, the autonomous fallback ladder, no-user-question rule, and no-safe-autonomous-work completion escape; keep budget-limited wrap-up prompts floor-free except for explanatory status.
- [ ] Update budget/floor interactions so max budget reached/hard-stop behavior remains authoritative in the completion gate, continuation scheduling, and prompt building.
- [ ] Add monitor report floor fields, floor pattern names, evidence-delta scoring, floor-quality exhaustion, and prompt decision rules for `watch` vs `steer` vs tightly limited `escalate`; stale-guard floor telemetry mutation by current goal id and `floor.completionBlockedByFloor`.
- [ ] Add `agent_end` / turn-end soft-wrap-up detection so final-answer-style wrap-up without `update_goal(status:"complete")` is steered when floors remain unmet.
- [ ] Update UI/tool formatting to show floors separately from max budgets.
- [ ] Update README user-facing docs with floor semantics, examples, and escape hatches.
- [ ] Add deterministic focused probes for floor helpers, tool validation, completion deferral/acceptance, wrong insertion order, same-call floor removal plus completion, stale monitor pattern poisoning, agent-end suppression, queue preservation, prompt text, and max-budget precedence.
- [ ] Run `npm run quality:goal`.
- [ ] Run the mandatory live probe using `.ai/docs/pi-goals-live-probe-testing.md` and record evidence in implementation closeout.

## Acceptance criteria

- A goal can be created through model tools with `min_tokens_before_wrap_up` and/or `min_time_seconds_before_wrap_up`.
- A template-created goal can receive the same minimum floor settings.
- A queued goal can preserve floor settings through enqueue and `start_queued_goal`.
- Updating a goal can set, change, or remove floors using positive integers or `null`, but same-call floor removal/lowering plus `status:"complete"` is blocked while the current persisted floor is unmet.
- Invalid floors are rejected:
  - non-integer values;
  - non-positive values;
  - min token floor greater than token budget when both are configured;
  - min time floor greater than time budget when both are configured.
- `update_goal(status:"complete")` is deferred while any configured floor is unmet.
- The deferral identifies unmet floors and instructs the agent to do materially valuable additional work rather than filler.
- Completion deferral is a successful structured blocked-update result and does not cancel continuations, cancel monitors, persist complete status, or emit queue-complete steering.
- Completion succeeds once all configured floors are met and the objective audit passes.
- Existing maximum budget reached/hard-stop behavior still takes precedence and cannot be bypassed by floors; budget-limited wrap-up prompts do not include floor-value pass instructions.
- A concrete floor-steering catalog exists and is reused by continuation prompts, early-completion refusal, and monitor steering.
- A shared completion gate decides allow/defer/allow-with-reason before completion state mutation.
- Prompt text includes floor state, next-pass selection rules, required evidence/artifact deltas, and the autonomous fallback ladder.
- The agent does not ask the user for floor-unmet direction unless the goal objective explicitly allows user decisions or a separate safety/authorization boundary requires it.
- Churn monitor reports/prompts include floor state, classify floor-driven work quality, and can steer quota-filling churn to one concrete next value pass.
- After repeated no-evidence floor work, the system can record floor-quality exhaustion and allow completion with `no_more_valuable_work_reason` rather than manufacturing work, but a first early completion attempt cannot self-authorize this escape.
- Soft final-answer wrap-up without `update_goal(status:"complete")` is detected and steered when floors are unmet; no-tool `agentEnd` suppression does not swallow floor steering unless budget is exhausted, floor quality is exhausted, or existing safety caps apply.
- UI/tool summaries distinguish floors from max budgets/caps.
- Old sessions/goals without floor fields replay without errors, and malformed optional floor fields in replay are ignored/sanitized rather than crashing; malformed tool inputs are still rejected.
- Floor-related monitor decisions mutate telemetry only for the matching current active goal while `floor.completionBlockedByFloor` is true.
- `createGoalState` uses a named options object so create/template/queue paths cannot silently swap max-budget and min-floor arguments.
- `npm run quality:goal` passes.
- Live probe evidence shows an early-stop attempt before floor satisfaction is blocked or avoided and results in concrete valuable extra work, not repetitive filler.

## Proof threat model

Full proof threat model is in `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/04-proof-threat-model.md`.

Primary invariant: a configured minimum token/time spend floor is a real pre-wrap-up gate. While any configured floor is unmet, the goal cannot be marked complete through normal agent/tool completion, and the agent is steered toward materially valuable additional work rather than quota-filling churn.

False-green risks:

- Schema-only implementation accepts floor fields but does not gate completion.
- Prompt-only implementation mentions floors but still allows early completion.
- Numeric blocking works but causes filler/churn.
- Minimum floors cause max-budget bypasses.
- Queue/template paths drop floor settings.
- Replay/UI/monitor surfaces omit or mislabel floors.
- Deterministic tests pass but live Pi behavior still completes too early or fails to steer well.
- Soft final-answer wrap-up without `update_goal(status:"complete")` bypasses the completion gate.
- `no_more_valuable_work_reason` becomes a first-attempt bypass instead of a monitor/telemetry-backed recorded outcome.
- Same-call floor removal/lowering plus `status:"complete"` bypasses the current-goal floor gate.
- Completion deferral runs after cancellation/persistence side effects, leaving an active floor-unmet goal with canceled monitor/continuation.
- Stale monitor floor patterns poison telemetry after the goal is no longer active or floor-blocked.
- Malformed optional floor fields in replay crash state reconstruction.

## TOON synthesis

```toon
toon.version: 1
issue{id,title,status,goal}:
  "ISSUE-036","Minimum goal spend floors","open — execution-ready","add optional minimum token/time floors before pi-goals can wrap up or complete"
locked_requirements[11]{id,requirement}:
  "lr1","optional min token/time floors are persisted on goal state and queued goals"
  "lr2","create_goal create_goal_from_template enqueue_goal start_queued_goal and update_goal preserve floor settings"
  "lr3","all configured floors must be satisfied before update_goal status complete succeeds"
  "lr4","unmet-floor completion deferral keeps state unchanged and gives actionable floor deltas"
  "lr5","unmet-floor steering uses a concrete shared value-pass catalog and forbids quota filling"
  "lr6","floor-unmet workflow is autonomous by default and does not ask users unless the objective explicitly allows it or safety requires it"
  "lr7","maximum budgets and hard stops remain authoritative and cannot be bypassed by floors"
  "lr8","monitor reports and prompts are floor-aware and steer quota-filling churn to a concrete next value pass"
  "lr9","UI tool output and README distinguish minimum floors from maximum budgets"
  "lr10","old sessions and malformed optional floor fields replay defensively without crashes"
  "lr11","live probe validates valuable autonomous continuation rather than filler"
implementation_surfaces[10]{surface,path,notes}:
  "types_state",".pi/extensions/goal/types.ts .pi/extensions/goal/state.ts","optional floor fields and replay-compatible parsing"
  "floor_logic",".pi/extensions/goal/floor.ts .pi/extensions/goal/budget.ts","floor readiness remaining deltas impossible min/max validation and max-budget precedence"
  "completion_gate",".pi/extensions/goal/completion-gate.ts","shared allow defer steer allow-with-reason decision before completion state mutation"
  "floor_steering",".pi/extensions/goal/floor-steering.ts","FloorWorkCard catalog selector completion-refusal text continuation guidance and monitor steering snippets"
  "tools",".pi/extensions/goal/tools.ts .pi/extensions/goal/queue-tools.ts","schemas validation create update complete gate and queue preservation"
  "queue_state",".pi/extensions/goal/queue-state.ts","persist and replay queued floor metadata"
  "prompts",".pi/extensions/goal/prompts.ts","floor-aware continuation pass-selection algorithm autonomous fallback and anti-churn rules"
  "monitor",".pi/extensions/goal/monitor-prompts.ts .pi/extensions/goal/monitor-report.ts .pi/extensions/goal/monitor.ts .pi/extensions/goal/telemetry.ts","floor report object pattern names watch/steer/escalate decision rules and telemetry mutation from monitor decisions"
  "ui",".pi/extensions/goal/format.ts .pi/extensions/goal/widget.ts .pi/extensions/goal/ui.ts","floor summaries distinct from max-budget caps"
  "docs_validation","README.md .ai/docs/pi-goals-live-probe-testing.md","user docs and live probe evidence path"
invariants[12]{id,invariant}:
  "inv1","no early completion while any configured floor is unmet"
  "inv2","floor pursuit must produce concrete qualitative improvement not filler"
  "inv3","all configured floors are conjunctive"
  "inv4","min floors never override max budget reached or hard stop behavior"
  "inv5","single active goal and queue FIFO invariants remain unchanged"
  "inv6","optional fields keep old branch replay compatible"
  "inv7","no TypeScript escape-hatch casts are introduced"
  "inv8","completion floors are evaluated against the current persisted goal and cannot be bypassed by same-call floor removal plus complete"
  "inv9","completion deferral does not cancel continuation or monitor machinery persist complete status or emit queue-complete steering"
  "inv10","budget-limited wrap-up remains floor-free and max budgets dominate floor steering"
  "inv11","floor monitor telemetry mutation is stale-guarded by current goal id and completionBlockedByFloor"
  "inv12","tool floor validation is strict while replay of optional floor fields is defensive"
verification_checks[7]{id,check,evidence}:
  "v1","floor helper and validation edge cases pass","deterministic probe"
  "v2","completion is deferred before floors and accepted after floors or after monitor-backed floor-quality exhaustion with reason","tool probe"
  "v3","queue/template paths preserve floor settings","queue probe"
  "v4","prompt monitor and UI surfaces include floor semantics","static and targeted prompt probe"
  "v5","soft final-answer wrap-up without update_goal is detected and steered while floors are unmet","lifecycle probe"
  "v6","project quality gate passes","npm run quality:goal"
  "v7","live Pi probe shows early stop blocked or avoided and valuable extra work performed","pi-goals-live-probe transcript"
```

## Required proofs

```toon
toon.version: 1
required_proofs[7]{name,source,command,pass_condition,scope,notes}:
  "sentrux_baseline","issue doc","sentrux gate --save .pi/extensions/goal","exit 0",run,"pre-implementation architecture sensor per repo rule"
  "floor_gate_probe","issue doc","node .ai/validation/goal-min-spend-floors-probe.mjs","exit 0 and probe output shows create/update validation floor helper cases completion deferral before floors completion acceptance after floors or monitor-backed floor-quality exhaustion fake no-more-work bypass prevention same-call floor removal plus complete blocked wrong-insertion-order side effects absent and max-budget precedence",run,"implementation should add this focused deterministic probe or amend this proof path with reason"
  "floor_steering_probe","issue doc","node .ai/validation/goal-floor-steering-probe.mjs","exit 0 and probe output shows shared value-pass catalog rows prompt/refusal text require a next_floor_pass concrete evidence deltas autonomous fallback no-user rule objectiveAllowsUserFloorFallback monitor watch/steer/escalate/floor_quality_exhausted cases and stale floor-pattern guard",run,"proves the owner-highlighted steering design is implemented concretely not as vague prose"
  "prompt_surface_probe","issue doc","rg -n \"floor-steering|FLOOR_VALUE_PASS_CATALOG|next_floor_pass|quota_filling_churn|floor_ignored_early_wrapup|productive_floor_deepening|floor_quality_exhausted|objectiveAllowsUserFloorFallback|noMoreValuableWorkReason|completion_blocked_by_floor|min_tokens_before_wrap_up|min_time_seconds_before_wrap_up\" .pi/extensions/goal README.md","exit 0 with matches in shared steering module prompts monitor report/prompt tool schemas UI/format and README",run,"static smoke check that floor semantics and monitor steering are not helper-only"
  "quality_goal","issue doc","npm run quality:goal","exit 0",run,"required project gate after implementation"
  "live_probe_min_floor","issue doc","Follow .ai/docs/pi-goals-live-probe-testing.md: resolve pi-goals-live-probe from current Solo context reload create a disposable goal with min_time_seconds_before_wrap_up or min_tokens_before_wrap_up attempt an immediate simple completion inspect output then clean up","transcript shows the floor is unmet completion is blocked or avoided the agent performs a named concrete next_floor_pass with higher-quality additional work instead of filler does not ask the user for floor-unmet direction and cleanup leaves no disposable goal or queue residue",run,"mandatory behavior proof for live steering quality"
  "artifact_closeout","issue doc","test -f .ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/07-implementation-closeout.md && rg -n \"floor_gate_probe|floor_steering_probe|live_probe_min_floor|npm run quality:goal|pi-goals-live-probe\" .ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/07-implementation-closeout.md","exit 0",run,"closeout records deterministic and live evidence"
```

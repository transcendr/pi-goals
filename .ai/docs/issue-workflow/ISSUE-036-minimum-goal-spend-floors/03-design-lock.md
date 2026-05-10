# 03 — Design lock

## Owner decision

Decision boundary: schema/API and product semantics for the new floor feature.

After grounded research, I asked one focused owner decision question: whether minimum spend floors should be hard gates, soft guidance, or hybrid. The owner selected **Hard gates (recommended)** and added the critical success condition:

> the most important aspect of this feature will be how effectively the agent is steered ... when it attempts to stop without having met the minimum token/time budget, and ensuring it is not just aimlessly churning trying to meet the budget but doing real, additional valuable work ... with a strong but mostly generic/universal heuristic ... like looking at the issue/feature from different perspectives/angles, doing more research (web research, open source, github repos, or other) ... any other technique or strategy that would add to the work qualitatively.

This issue therefore locks hard completion gates plus qualitative anti-churn steering as first-class requirements.

Follow-up owner feedback further locked that the steering must be specified as a concrete implementation design before implementation starts, that floor-unmet behavior must not ask the user unless the goal objective explicitly allows it, and that the churn monitor should be treated as a primary quality enforcement layer.

## Meaningful options considered

### Option A — Hard gates with qualitative continuation steering (chosen)

- Add optional minimum floor fields to state/tool/queue surfaces.
- A goal cannot be marked `complete` while any configured floor remains unmet.
- The refusal path must steer the agent toward valuable additional work, not quota-filling.
- User can end early by lowering/removing floors, pausing, or clearing the goal; no first-release force-complete override.

Why chosen:

- Matches the user's explicit decision.
- Best matches the phrase "minimum ... before work on a goal can begin to wrap up".
- Prevents shallow false greens where the fields exist but do not affect behavior.
- Creates a clear proof target: an early completion attempt must fail and produce useful continuation behavior.

### Option B — Soft guidance only (rejected)

- Floors appear in prompts/UI but `update_goal(status:"complete")` still succeeds early.

Why rejected:

- Would not enforce the core invariant.
- Easy to false-green with display-only changes.
- User explicitly chose hard gates.

### Option C — Hybrid with explicit user override (deferred)

- Block automatic/model completion but allow explicit user-complete requests to bypass floors.

Why deferred:

- Current goal completion happens through the same `update_goal` tool path; reliably distinguishing model initiative from user intent would require more API/prompt semantics.
- First release can support early exit by lowering/removing floors or clearing the goal, preserving simpler proof semantics.
- A later issue can add explicit override if usage proves it necessary.

## Locked first-release design

### Naming and data model

Use "before wrap-up" names to avoid confusing floors with maximum budgets:

- `GoalState.minTokensBeforeWrapUp?: number`
- `GoalState.minTimeSecondsBeforeWrapUp?: number`
- `QueuedGoal.minTokensBeforeWrapUp?: number`
- `QueuedGoal.minTimeSecondsBeforeWrapUp?: number`

Agent-facing tool parameters:

- `min_tokens_before_wrap_up`
- `min_time_seconds_before_wrap_up`

Update-tool parameters additionally allow `null` to remove a configured floor, matching existing max-budget edit semantics. A single `update_goal` call must not both remove/lower an unmet completion floor and set `status:"complete"`; first release requires two separate updates so the gate evaluates current persisted floors.

Rationale:

- The existing `tokenBudget` / `timeBudgetSeconds` fields are maximum budgets/caps.
- `minimum_token_budget` would be shorter but ambiguous because "budget" already means cap in this extension.
- "before wrap-up" names state the product behavior directly and are safer for model tool selection.

### Floor satisfaction rule

- A floor is met when current usage is greater than or equal to the floor:
  - `tokensUsed >= minTokensBeforeWrapUp`
  - `timeUsedSeconds >= minTimeSecondsBeforeWrapUp`
- If both floors are configured, **all configured floors must be met** before completion/wrap-up may begin.
- If no floors are configured, existing behavior is unchanged.
- Floors are positive integers when present.
- If a maximum budget and a minimum floor are configured for the same resource, the floor must be `<=` the maximum budget at create/update/enqueue time. Reject impossible configurations instead of letting a goal become unable to satisfy both min and max semantics.

### Interaction with maximum budgets

- Existing maximum budget behavior remains authoritative.
- If a maximum budget is reached before a minimum floor is met, the goal still becomes `budgetLimited` and follows the existing budget wrap-up/hard-stop path.
- Minimum floors must never force work beyond a maximum budget or hard stop.
- Completion remains allowed for an actually complete `budgetLimited` goal only if the floor gate is satisfied; otherwise the user can clear/lower floors or accept the budget-limited wrap-up as incomplete progress.
- `buildBudgetLimitPrompt(...)` and budget-limited continuation paths must not ask the worker to choose floor-value passes; budget wrap-up summarizes progress and max-budget state rather than trying to satisfy floors.

### Completion gate

`update_goal(status:"complete")` must check floor readiness before accepting completion:

- If any configured floor is unmet, return a structured completion-deferral tool result and leave the goal active.
- The deferral must begin with `Completion deferred by goal floor. The goal remains active.` and include:
  - which floor(s) remain,
  - current usage vs floor,
  - a short instruction to continue with materially valuable work rather than filler,
  - structured `completion_blocked_by_floor: true` and `next_floor_pass` details,
  - suggested categories for productive continuation.
- The gate applies regardless of whether the completion attempt comes from direct natural language or an automatic continuation.
- No `force` parameter in the first release.

### Concrete prompt and steering lock

Prompts are not decorative for this feature. The first release must add a shared concrete floor-steering implementation, not only abstract prompt bullets.

Carry forward the BCU/ChatGPT research finding from `08-bcu-chatgpt-research.md`: internally treat this as **premature completion prevention** / a **completion floor**, not “minimum spend.” Floors are completion skepticism, not quotas.

Add three concrete modules:

- `.pi/extensions/goal/floor.ts` for pure completion-floor evaluation and min/max validation helpers;
- `.pi/extensions/goal/completion-gate.ts` for the shared completion decision before state mutation;
- `.pi/extensions/goal/floor-steering.ts` for catalog-backed useful-work selection and prompt/refusal text.

Also change `createGoalState` to accept a named options object (`objective`, max budgets, min floors, optional `now`) rather than adding more optional positional arguments; this avoids silent argument swaps across create/template/queue paths.

`completion-gate.ts` should expose:

- `type CompletionDecision = { kind: "allow" } | { kind: "defer_and_steer"; card: FloorWorkCard; floor: CompletionFloorEvaluation; message: string } | { kind: "allow_with_reason"; reason: NoMoreValuableWorkReason | "max_budget_requires_wrap_up"; floor: CompletionFloorEvaluation }`;
- `decideGoalCompletion(input: { currentGoal; candidateGoal; telemetry; recentMonitorPatterns })`;
- `buildCompletionGateResult(decision)` / `floorCompletionDeferredResult(...)` for tool details and steering text.

Round 2/3 BCU/ChatGPT research tightened the gate ordering: run it after candidate validation/building and active-resume budget checks, but before non-active status side effects such as continuation/monitor cancellation, `status: "complete"` persistence, or queue-complete steering. Evaluate floors against `currentGoal`, not a candidate already mutated to complete or edited to remove/lower floors.

`floor-steering.ts` should expose:

- `type FloorValuePassId` for stable pass ids;
- `type FloorWorkCard` for bounded useful-work cards;
- `FLOOR_VALUE_PASS_CATALOG` as a structured table;
- `selectFloorWorkCard(goal, telemetry, floor, recentEvidence)`;
- `buildFloorContinuationGuidance(goal, telemetry, context)`;
- `buildFloorCompletionRefusal(goal, telemetry)`;
- shared formatting for unmet floor deltas and pass-selection instructions.

The first catalog must include these pass ids:

```text
requirement_gap_audit
adversarial_review
alternate_perspective
research_expansion
validation_expansion
simplification_deslop
compatibility_review
docs_handoff_evidence
```

Each catalog row must specify:

- when to choose it;
- first concrete actions;
- required evidence/artifact output;
- anti-patterns to avoid.

Continuation and completion-refusal text must implement this algorithm:

1. State the unmet floor(s) and that normal wrap-up/completion is blocked by a completion floor, not a quota target.
2. Require the worker to choose exactly one `next_floor_pass` / `FloorWorkCard` from the catalog.
3. Choose by priority: unresolved explicit requirement > weak proof/validation > unresolved design/research uncertainty > quality/simplification gap > docs/handoff/evidence gap.
4. Require at least one concrete tool-backed inspection/edit/proof when tools are available.
5. Require a tangible new evidence/artifact delta before another completion attempt.
6. Avoid repeating the same pass twice in a row unless new evidence changes the reason.
7. Forbid pure quota-filling, repetitive summaries, broad status-only replies, or aimless churn.
8. If no card can safely produce new objective-linked evidence, record `noMoreValuableWorkReason: "no_safe_autonomous_work"` and allow completion rather than manufacturing work.

Round 2 refinement: `noMoreValuableWorkReason` is a recorded outcome, not a model-granted permission. A worker may report it, but a first early completion attempt must not self-authorize a floor bypass. First release should not expose it as a completion-bypass model tool parameter. The gate should honor it only after max-budget exhaustion, explicit prior user floor removal/change, monitor-backed `floorQualityState: "exhausted"`, or an exhausted selector after concrete floor work.

### Autonomous-by-default lock

Do not ask the user merely because a floor is unmet or because the next useful pass is not obvious. Unless the goal objective explicitly permits or requests user decisions, floor-unmet behavior must stay autonomous.

Autonomous fallback ladder when no obvious pass is available:

1. requirement/gap audit;
2. validation/proof expansion;
3. alternate-perspective or adversarial review;
4. deeper local/external research when available;
5. simplification/deslop/maintainability pass;
6. documentation, handoff, and evidence hardening.

The only exception is an independent safety/destructive-action boundary that requires explicit user authorization. Floor-unmet state by itself is not such a boundary.

Add `objectiveAllowsUserFloorFallback(objective: string)` with intentionally narrow phrase matching (`ask me`, `confirm with me`, `wait for my decision`, `let me choose`, `before choosing`). Do not treat vague objective words like `discuss`, `explore`, or `recommend` as permission to ask the user for floor-unmet direction.

Telemetry should persist floor-work history so the autonomous selector can avoid loops:

- `lastFloorCardId?: FloorValuePassId`;
- `completedFloorCardIds?: FloorValuePassId[]`;
- `floorSteerCount?: number`;
- `floorChurnSteerCount?: number`;
- `floorQualityState?: "inactive" | "eligible" | "steering" | "qualityWarning" | "exhausted" | "overriddenByMaxBudget"`;
- `noMoreValuableWorkReason?: "objective_fully_satisfied" | "no_safe_autonomous_work" | "max_budget_requires_wrap_up" | "user_requested_stop"`.

Telemetry mutation points must be explicit: `noteFloorCompletionDeferred`, `noteProductiveFloorWork`, `noteFloorChurnSteer`, and `noteFloorQualityExhausted`. The monitor should call the productive/churn/exhausted helpers after parsing decisions so history drives subsequent card selection. Floor history arrays such as `completedFloorCardIds` must be unique and bounded to the catalog size or a fixed small cap.

### Concrete churn monitor lock

The churn monitor must be floor-aware and act as the primary quality backstop for floor-driven work.

Implementation requirements:

- Extend `GoalMonitorReport` with a `floor` object containing configured floor values, remaining floor deltas, per-resource met flags, `allFloorsMet`, and `completionBlockedByFloor`.
- Render the `floor` object in `monitor-prompts.ts` alongside goal/budget/telemetry fields.
- Add monitor prompt rules:
  - return `watch` when recent worker context shows a concrete value pass and new evidence/artifact movement;
  - return `steer` when the worker attempts early wrap-up, repeats summaries, avoids tools/evidence, or burns time/tokens without improving the deliverable;
  - do not return `escalate` just because floors are unmet or no obvious next pass appears;
  - use `escalate` only when the objective explicitly allows user input or a separate safety/authorization blocker requires it.
- Add stable floor-related monitor patterns:
  - `floor_ignored_early_wrapup`
  - `quota_filling_churn`
  - `repeated_floor_pass_no_new_evidence`
  - `productive_floor_deepening`
  - `floor_blocked_autonomous_fallback_needed`
  - `floor_quality_exhausted`
- Monitor steering text must name one next value pass and one concrete action. It must not merely say “keep going until the floor is met.”

The monitor should score floor work by objective-linked evidence deltas, not by elapsed tokens/time. Strong evidence includes changed files, proof command output, new issue/doc rows, compatibility findings, or a precise no-gap finding tied to inspected files. Churn evidence includes repeated same-file reads, repeated commands, summary-only turns, cosmetic edits, unrelated refactors, validation theater, asking the user without permission, completion retries without new work, and tool loops with no state delta.

Floor-related monitor decisions may mutate floor telemetry only when the report goal id still matches the current active goal and `floor.completionBlockedByFloor` is true. Stale monitor floor patterns must not poison telemetry after the goal is complete, paused, budget-limited, absent, or no longer floor-blocked.

After repeated bad/no-evidence floor work, the monitor should set/recommend `floorQualityState: "exhausted"` or pattern `floor_quality_exhausted` so the completion gate can allow completion with `noMoreValuableWorkReason` instead of trapping the worker in churn.

Existing safety pause counters remain active and are not relaxed merely because a floor is unmet.

Soft final-answer wrap-up is part of the completion surface: if `agentEnd` occurs while floors are unmet and the model produced a final-answer-style wrap-up without calling `update_goal`, lifecycle suppression must not silently swallow floor steering unless floor quality is already exhausted or a steer limit has been reached.

### UI / output lock

- `/goal` summary, tool output, footer/widget, and monitor report should differentiate maximum budgets from minimum floors.
- Minimum floor display must use floor language, not cap language. Examples: `Min before wrap-up: 1.2k / 5k tokens`, `Wrap-up floor: 40s / 2m`.
- Tool details should include remaining floor fields separate from max-budget remaining fields.
- Existing status labels remain unchanged; do not add a new `floorLimited` status for first release.

### Scope boundaries

In scope:

- State/types for floors, with strict tool validation and defensive replay that treats missing or malformed optional historical floor fields as absent instead of crashing.
- Model tools: create, create-from-template, enqueue, start-queued-goal, update, plus exact floor propagation through queued persisted metadata and queue display.
- Shared floor helpers.
- Completion gate in `update_goal`.
- Shared completion gate.
- Shared floor-steering module/catalog.
- Floor-work telemetry/history.
- Continuation prompt and early-completion refusal text.
- Soft final-answer wrap-up detection when floors are unmet.
- Autonomous fallback/no-user-question floor-unmet behavior.
- Monitor report/prompt awareness with concrete floor-quality decision rules and floor-quality exhaustion.
- UI/tool summaries for floors.
- Deterministic and live probe validation.
- README update for user-facing semantics.

Out of scope for first release:

- Direct `/goal --min-*` flag parsing; natural language and model tools are sufficient for parity with current budget entry paths.
- Force-complete override.
- New goal status values.
- Floor-driven automatic pausing beyond existing no-progress/safety pause logic.

## Execution-readiness assessment

Execution-ready: yes.

The meaningful product/API choice was locked by owner input. Implementation still has normal engineering choices, but the issue no longer asks the implementer to decide whether floors are hard gates, how they should be named, or what prompt quality standard matters.

## Downstream proof consequences

Required proofs must fail if:

- fields are accepted but completion still succeeds before floors are met;
- same-call floor removal/lowering plus `status:"complete"` bypasses the current persisted floor gate;
- deferral runs after cancellation/persistence side effects, leaving an active floor-unmet goal with canceled monitor or continuation;
- completion is blocked but the agent receives only numeric quota text and churns aimlessly;
- the agent asks the user for floor-unmet direction even though the goal objective did not explicitly allow user decisions;
- soft final-answer wrap-up bypasses the completion gate because the agent never calls `update_goal(status:"complete")`;
- the system manufactures work even after all safe valuable autonomous work is exhausted;
- maximum budgets can be bypassed by minimum floors or budget-limited prompts ask for more floor work;
- queued goals lose floor settings;
- monitor/UI surfaces omit floor state;
- monitor steering says only “keep going” instead of naming one next value pass and concrete action;
- stale monitor floor decisions mutate telemetry after the goal is no longer current and floor-blocked;
- replay of malformed optional floor fields crashes state reconstruction;
- live probe shows a simple early-stop goal finishing before its floor or producing only filler work.

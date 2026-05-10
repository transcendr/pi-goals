# 07 — Owner feedback follow-up

## Feedback received

After the first issue draft, the owner accepted the overall direction but asked for three refinements before implementation starts:

1. The high-value continuation heuristic was too abstract; it needs a concrete implementation design.
2. The feature must not ask the user unless the goal objective explicitly allows it. Floor-unmet behavior should be autonomous by default.
3. The churn monitor likely has the most value for this feature and needs a concrete implementation design, not just a general requirement.

## Design updates made

### 1. Concrete autonomous value-pass design

The issue now requires a concrete `floor-steering` design rather than generic bullet points:

- Add a small shared module, likely `.pi/extensions/goal/floor-steering.ts`, that exports:
  - a stable `FloorValuePassId` union;
  - a `FLOOR_VALUE_PASS_CATALOG` table;
  - `buildFloorContinuationGuidance(goal, telemetry, context)`;
  - `buildFloorCompletionRefusal(goal, telemetry)`.
- The catalog must be explicit and structured, not freeform prose hidden in the prompt. First-pass rows:
  - `requirement_gap_audit`
  - `adversarial_review`
  - `alternate_perspective`
  - `research_expansion`
  - `validation_expansion`
  - `simplification_deslop`
  - `compatibility_review`
  - `docs_handoff_evidence`
- Each row must include:
  - when to choose it;
  - first concrete actions;
  - required evidence/artifact output;
  - anti-patterns to avoid.
- The continuation prompt must make the worker choose exactly one pass, perform at least one concrete tool-backed action where possible, and produce new evidence/artifact deltas before trying completion again.

### 2. Autonomous-by-default rule

The issue now explicitly locks:

- Do not ask the user merely because a floor is unmet.
- Do not ask the user because no obvious continuation idea appears.
- Ask the user only when the goal objective itself explicitly permits/requests user decisions, or when an independent safety/destructive-action boundary requires explicit user authorization.
- Otherwise use an autonomous fallback ladder:
  1. unresolved requirement/gap audit;
  2. validation/proof expansion;
  3. alternate-perspective/adversarial review;
  4. deeper local or external research when available;
  5. simplification/deslop/maintainability pass;
  6. documentation, handoff, and evidence hardening.

### 3. Concrete monitor implementation design

The issue now treats the monitor as an active floor-quality enforcement layer:

- Extend `GoalMonitorReport` with a `floor` object containing floor configured/met/remaining values and completion-blocked state.
- Render floor state in `monitor-prompts.ts`.
- Add monitor prompt decision rules for floor-unmet behavior:
  - `watch` when the worker is doing a concrete value pass with new evidence;
  - `steer` when the worker attempts early wrap-up or does quota-filling/filler;
  - avoid `escalate` for floor-unmet behavior unless objective text explicitly authorizes user input or a separate safety boundary requires it.
- Add stable monitor pattern names:
  - `floor_ignored_early_wrapup`
  - `quota_filling_churn`
  - `repeated_floor_pass_no_new_evidence`
  - `productive_floor_deepening`
  - `floor_blocked_autonomous_fallback_needed`
- Monitor steering should name one next value pass from the catalog and one concrete action, not broadly tell the worker to "keep going".

## Files updated by this follow-up

- `.ai/issues/open/ISSUE-036-minimum-goal-spend-floors.md`
- `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/03-design-lock.md`
- `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/04-proof-threat-model.md`
- `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/06-final-audit.md`
- `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/raw/commands.log`

## Implementation-readiness impact

The issue remains execution-ready, now with a stronger implementation contract for the owner-highlighted core behavior. The implementer should not improvise prompt strategy or monitor semantics; those are now specified as concrete module/function/catalog/report changes with proof expectations.

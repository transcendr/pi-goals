# ISSUE-036 implementation closeout

Date: 2026-05-10

## Implementation summary

Implemented hard completion floors for `pi-goals`. After validation, the issue doc was moved from `.ai/issues/open/ISSUE-036-minimum-goal-spend-floors.md` to `.ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md` and marked `Status: fixed`.

Implemented behavior:

- Added persisted goal/queue fields for `minTokensBeforeWrapUp` and `minTimeSecondsBeforeWrapUp`.
- Added floor modules:
  - `.pi/extensions/goal/floor.ts`
  - `.pi/extensions/goal/completion-gate.ts`
  - `.pi/extensions/goal/floor-steering.ts`
- Added completion-gate enforcement before `update_goal(status: "complete")` side effects.
- Added structured deferred-completion tool details including `completion_blocked_by_floor`, `floor`, and `next_floor_pass`.
- Added floor-aware continuation guidance, monitor reports/prompts, telemetry mutation helpers, widget/status/README rendering, and queue preservation.
- Added deterministic validation probes:
  - `.ai/validation/goal-min-spend-floors-probe.mjs`
  - `.ai/validation/goal-floor-steering-probe.mjs`

## Proof commands run

```bash
node .ai/validation/goal-min-spend-floors-probe.mjs
node .ai/validation/goal-floor-steering-probe.mjs
rg -n "floor-steering|FLOOR_VALUE_PASS_CATALOG|next_floor_pass|quota_filling_churn|floor_ignored_early_wrapup|productive_floor_deepening|floor_quality_exhausted|objectiveAllowsUserFloorFallback|noMoreValuableWorkReason|completion_blocked_by_floor|min_tokens_before_wrap_up|min_time_seconds_before_wrap_up" .pi/extensions/goal README.md .ai/validation
sentrux gate --save .pi/extensions/goal
sentrux check .pi/extensions/goal
npm run quality:goal
```

Results:

- Deterministic probes: passed.
- Required `rg`: passed with expected implementation/docs/probe hits.
- Sentrux gate/check: passed, no rule violations; saved baseline at `.pi/extensions/goal/.sentrux/baseline.json`.
- `npm run quality:goal`: passed (Sentrux gate/check, slop guard, TypeScript strict check, Pi extension load validation).

## Live probe evidence

Used existing Solo process `pi-goals-live-probe` in project 2.

Commands/evidence:

- Sent `/reload`; `search_output` found `Reloaded keybindings, extensions, skills, prompts, themes`.
- Sent validation instruction to create `ISSUE-036 live probe floor gate` with `min_tokens_before_wrap_up: 1000000`, then immediately attempt `update_goal(status: "complete")`.
- Live output showed:
  - `create_goal` result with `Token wrap-up floor: 0 / 1000000 (1000000 remaining)`.
  - `update_goal` result beginning `Completion deferred by goal floor. The goal remains active.`
  - `Unmet completion floor(s): - tokens before wrap-up: 0 / 1M`.
  - `Next value pass: validation_expansion (Validation expansion)`.
  - Concrete next action and anti-churn guidance.
- Sent validation cleanup instruction; `search_output` found final `Goal cleared` at the probe output.

## Remaining risk

- No force-complete override was intentionally added in this first release.
- Slash-command creation still creates plain goals; floor configuration is exposed through model tools, queue metadata, and updates per the issue acceptance scope.

## Files changed

Primary implementation:

- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/floor.ts`
- `.pi/extensions/goal/completion-gate.ts`
- `.pi/extensions/goal/floor-steering.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/tool-results.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/monitor-report.ts`
- `.pi/extensions/goal/monitor-prompts.ts`
- `.pi/extensions/goal/monitor.ts`
- `.pi/extensions/goal/telemetry.ts`
- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/widget.ts`
- `README.md`
- `.ai/validation/goal-min-spend-floors-probe.mjs`
- `.ai/validation/goal-floor-steering-probe.mjs`
- `.ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md`

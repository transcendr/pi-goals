# ISSUE-005 — Clarify goal widget resource labels and add time budget support

Status: fixed — implemented and validated
Priority: medium
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: implemented modular `pi-goal` runtime under `.pi/extensions/goal/`
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Next best session: resource accounting/UI implementation pass
Goal: Replace ambiguous widget `Usage:` labeling with explicit time/token resource lines and add first-class optional time budget support.

## Problem

The widget currently renders elapsed time as `Usage: 1m`, but in goal accounting “usage” primarily means tokens. The UI should show time and tokens explicitly. The runtime also supports token budgets only, leaving no first-class way to limit autonomous goal pursuit by elapsed time.

## Research evidence

Current implementation facts:

- `GoalState` includes `tokenBudget?: number`, `tokensUsed`, and `timeUsedSeconds`.
- `ui.ts` widget currently emits one ambiguous line: `Usage: ${formatElapsed(...)} ... tokens`.
- `lifecycle.ts` already accounts elapsed wall-clock seconds on `turn_end`.
- `persistAccountGoal()` and replay already persist complete `GoalState` objects, so adding an optional field is compatible with append-only state events.
- Tool schemas can be extended in `tools.ts` with validated optional numeric inputs.

## Design locks

- Widget/resource language:
  - always show `Time:` for elapsed time;
  - always show `Tokens:` for token usage;
  - include budgets inline as `used / budget` on the same resource line.
- Add `timeBudgetSeconds?: number` to `GoalState`.
- Public status remains `budgetLimited` for either token or time exhaustion.
- Add telemetry metadata to distinguish budget reason: `lastBudgetLimitReason?: "tokenBudget" | "timeBudget"`.
- Tool API accepts `time_budget_seconds` as the first supported time-budget parameter because it is unambiguous and maps directly to state.
- Do not add duration-string parsing or slash-command budget syntax in this issue; that UX can be a later issue.
- Generalize the budget-limit prompt to “resource budget limit” and include which resource was exhausted.

## Desired widget examples

```text
pi-goal: active
Objective: ...
Time: 1m
Tokens: 2.7m
Commands: /goal pause, /goal clear
```

With budgets:

```text
Time: 8m / 20m
Tokens: 12k / 50k
```

## Execution TOON

```toon
issue: ISSUE-005
status: execution-ready
locks[7]:
  - explicit-time-line
  - explicit-token-line
  - timeBudgetSeconds-state-field
  - public-status-budgetLimited
  - telemetry-budget-reason
  - tool-param-time_budget_seconds
  - no-slash-duration-parser-first-pass
files[8]: types.ts, format.ts, ui.ts, tools.ts, state.ts, lifecycle.ts, prompts.ts, telemetry.ts
validation[7]: widget-no-usage-time, token-budget-display, time-budget-display, replay-time-budget, tool-validation, time-limit-wrap-up, sentrux-gate-check
```

## Implementation path

1. Add shared formatting helpers in `format.ts`:
   - `formatTimeResource(goal)` -> `Time: used` or `Time: used / budget`;
   - `formatTokenResource(goal)` -> `Tokens: used` or `Tokens: used / budget`.
2. Update `ui.ts` widget lines to replace `Usage:` with separate `Time:` and `Tokens:` lines.
3. Extend `GoalState` in `types.ts` with `timeBudgetSeconds?: number`.
4. Extend telemetry types/helpers with optional `lastBudgetLimitReason`.
5. Extend `createGoalState()` and persistence/replay handling to preserve `timeBudgetSeconds` when supplied.
6. Extend `create_goal` schema in `tools.ts` with optional `time_budget_seconds`; validate it as a positive integer.
7. Include time budget details in `get_goal`, `create_goal`, `update_goal` results and `/goal` summary lines.
8. Update `lifecycle.ts` budget-limit transition:
   - after accounting elapsed time, if active and `timeBudgetSeconds` is present and `timeUsedSeconds >= timeBudgetSeconds`, set `status: "budgetLimited"`;
   - set telemetry budget reason to `timeBudget`;
   - schedule budget/resource-limit wrap-up once.
9. Preserve existing token budget behavior and set telemetry budget reason to `tokenBudget` when token budget is reached.
10. Update `prompts.ts` continuation and budget-limit prompts to include both resource facts when present and identify the exhausted resource.
11. Add mock harness coverage for token-only, time-only, both budgets, replay, and validation rejection for non-positive time budget.
12. Run `sentrux gate .pi/extensions/goal` and `sentrux check .pi/extensions/goal`.
13. Validate live widget display if an interactive Pi TUI is available.

## Acceptance criteria

- Widget no longer renders elapsed time as `Usage: ...`.
- Widget shows `Time:` and `Tokens:` as separate explicit resource lines.
- Existing token budget display still works and is clearer than before.
- Time budget can be represented in goal state and persisted/replayed.
- Time budget is validated as positive when supplied.
- Time budget is accounted from `timeUsedSeconds`.
- Reaching a time budget stops further automatic continuation and triggers budget/resource-limit wrap-up behavior.
- Continuation and wrap-up prompts include time budget facts when present.
- Tool results and `/goal` summaries expose time budget information when present.
- Sentrux gate/check pass for `.pi/extensions/goal` after implementation.

## Non-goals

- Do not add natural-language duration parsing.
- Do not add slash-command time-budget syntax in the first pass.
- Do not introduce a new public status for time budget exhaustion.


## Implementation closeout

Implemented by playbook execution commits:

- ISSUE-003: `0b4446b fix: guard paused goal continuations`
- ISSUE-002: `443fb5b fix: stop active goal turn on pause`
- ISSUE-005: `24496c6 feat: add goal time budget support`
- ISSUE-004: `83ce87d feat: autocomplete goal subcommands`

Validation summary:

- `sentrux gate .pi/extensions/goal` passed.
- `sentrux check .pi/extensions/goal` passed.
- `pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models` loaded the extension.
- `tsc` validation was attempted but unavailable in this environment (`tsc: command not found`).
- Solo implementation todos for ISSUE-002..005 were completed with evidence comments.

# 02 — Grounded research

## Commands / sources inspected

Command transcript highlights are appended in `raw/commands.log`:

- `git status --short --untracked-files=all`
- issue inventory / next issue number discovery
- `rg -n "budget|token_budget|time_budget|wrap|complete|status|telemetry|elapsed|goal" .pi/extensions/goal package.json .ai/docs/pi-goals-live-probe-testing.md`
- `find .pi/extensions/goal -maxdepth 1 -type f | sort`
- `npm pkg get scripts --json`
- `sentrux check .pi/extensions/goal`
- `find . -maxdepth 4 -type f | rg "(test|spec|probe|quality|goal)" ...`
- `rg -n "budget|budgetLimited|token_budget|time_budget_seconds|quality:goal|createGoalState|evaluateBudgetPressure" . ...`

Files read directly:

- `README.md`
- `.ai/docs/pi-goals-live-probe-testing.md`
- `.ai/issues/fixed/ISSUE-007-goal-budget-warning-and-hard-stop.md`
- `.ai/issues/fixed/ISSUE-009-goal-budget-edit-status-recompute.md`
- `.ai/issues/fixed/ISSUE-012-goal-budget-limited-resume-and-wrapup-gaps.md`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/budget.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/widget.ts`
- `.pi/extensions/goal/ui.ts`
- `.pi/extensions/goal/constants.ts`
- `.pi/extensions/goal/telemetry.ts`
- `.pi/extensions/goal/monitor-prompts.ts`
- `.pi/extensions/goal/monitor.ts`
- `.pi/extensions/goal/model-output.ts`
- `.pi/extensions/goal/index.ts`

## Current architecture facts

### State and persistence

- `GoalState` currently has `tokenBudget?: number`, `timeBudgetSeconds?: number`, `tokensUsed`, and `timeUsedSeconds`; it has no minimum-spend fields.
- State is branch-replayable through custom `pi-goal-state` events in `state.ts` and `types.ts`.
- `createGoalState(objective, tokenBudget?, timeBudgetSeconds?)` initializes maximum budgets and usage counters; it would be the central place to add min floor fields to new goals.
- `isGoalState()` is intentionally permissive and checks only core shape, so adding optional fields can be backward-compatible with prior events.

### Existing maximum budget behavior

- `budget.ts` owns maximum budget pressure detection:
  - warnings near target (`TOKEN_BUDGET_WARNING_REMAINING = 100_000`, `TIME_BUDGET_WARNING_REMAINING_SECONDS = 60`),
  - target reached,
  - hard stop at `BUDGET_HARD_STOP_MULTIPLIER = 1.1`.
- `lifecycle.ts` accounts assistant turn time/tokens at turn end and also uses streaming `message_update` estimates to warn or hard-stop mid-response.
- Reaching a maximum target transitions the goal to `budgetLimited`, cancels normal continuation/monitoring, and schedules a one-time budget wrap-up prompt.
- Hard stop cancels/aborts immediately and does not keep doing goal work.
- `canActivateGoal()` and related command/tool checks prevent exhausted maximum budgets from being bypassed through `/goal resume` or `update_goal(status:"active")`.

### Completion and wrap-up behavior today

- `buildContinuationPrompt()` instructs the agent to complete only after a rigorous completion audit, but it has no minimum-spend concept.
- `update_goal(status:"complete")` is accepted whenever status is one of `active|paused|complete`; there is no guard that can reject early completion based on floors.
- Completion evidence is currently semantic/objective-driven, not effort/floor-driven.
- The requested feature specifically needs a new completion/wrap-up gate, not just a new display field.

### Commands and model tools

- Model tools expose `create_goal`, `create_goal_from_template`, and `update_goal` with `token_budget` and `time_budget_seconds` inputs; those schemas/descriptions need matching minimum fields.
- `/goal <objective>` does not parse budget flags itself; reusable templates and natural language tool calls are the current budget-entry path.
- `/goal queue` can carry resolved template/objective state, while `queue-steering.ts` already has a budget-line concept for queued goals. Minimum floors should not be accidentally dropped if queue/tool surfaces are extended later.

### Prompt / steering surfaces

- `prompts.ts` is the main worker-facing continuation and budget-wrap-up prompt module.
- `buildContinuationPrompt()` already includes a completion-audit section; that is the natural insertion point for minimum-floor instructions.
- The user explicitly chose hard gates and added that the critical behavior is not aimless churn: when an agent tries to stop before floors, steering should push it toward qualitatively valuable work such as alternate-perspective review, deeper research, independent validation, code/design critique, or other high-value improvement loops.
- `monitor-prompts.ts` currently tells the third-party monitor to detect generic churn. It reports max budget fields but no min-floor fields; it should receive floor state/progress so it can distinguish productive floor pursuit from aimless quota-filling.

### UI / output surfaces

- `format.ts`, `widget.ts`, and `ui.ts` render status labels, budget summaries, footer text, resource bars, command hints, and goal summaries.
- Current resource bars interpret `budget` as a maximum. Minimum floors need different language, e.g. `Min tokens: used / floor`, to avoid implying that a floor is a cap.
- Tool `resultForGoal()` currently reports `remaining_tokens` / `remaining_time_seconds` for max budgets only. Minimum fields need separate details such as `minimum_tokens_remaining` and `minimum_time_seconds_remaining`.

### Validation / quality surfaces

- `package.json` has the required `quality:goal` script:
  - `sentrux gate .pi/extensions/goal`
  - `sentrux check .pi/extensions/goal`
  - slop guard for `as unknown as|as any`
  - strict TypeScript validation over `.pi/extensions/goal/*.ts`
  - Pi extension load validation.
- There are no obvious committed test/spec files for the extension; prior issues relied on focused probes plus `npm run quality:goal` and live probe evidence.
- `sentrux check .pi/extensions/goal` passed during this planning workflow: `33 rules checked`, quality `6243`, all rules pass.
- The live probe guide says behavior-changing `pi-goals` work should usually validate through the existing `pi-goals-live-probe` Solo process, using process name discovery rather than hard-coded ids.

## Stable facts to carry forward

- Keep `GoalStatus` unchanged for first release: `active`, `paused`, `budgetLimited`, `complete`.
- Maximum budgets remain authoritative safety limits. A maximum budget reached before a minimum floor is satisfied must still stop/wrap up; minimum floors must never force work past a maximum hard stop.
- State additions should be optional and replay-compatible.
- Budget/floor logic should live in shared helpers rather than duplicating command/tool/lifecycle checks.
- The implementation must preserve module boundaries and avoid TypeScript escape-hatch casts in `.pi/extensions/goal`.

## Missing feature pieces

- Optional minimum floor fields on `GoalState` and tool/queue input surfaces.
- A shared helper that evaluates floor progress and answers whether wrap-up/completion may begin.
- A hard gate in `update_goal(status:"complete")` that refuses completion while floor requirements remain unmet.
- Worker-facing prompt text that explains what to do when a floor remains: choose high-value additional work instead of quota-filling.
- A steering prompt for attempted early completion or floor-unmet continuation, likely separate from maximum-budget wrap-up.
- UI/tool summaries that differentiate maximum budgets from minimum floors.
- Monitor report/prompt additions so churn detection can evaluate floor-driven work fairly and prevent aimless churn.
- Deterministic probes for floor math, update tool completion blocking, prompt content, and state replay.
- Live probe design exercising an actual early-stop attempt before minimum floors are met.

## Research conclusion

The feature fits the existing architecture if implemented as optional, replay-compatible minimum floor fields plus shared floor-evaluation helpers. The highest-risk seam is prompt/agent steering: a purely numeric hard gate would cause low-quality churn, so the implementation issue must require qualitative continuation guidance and monitor awareness alongside the hard completion gate.

# 02 — Grounded research

Issue: ISSUE-013 — `/goal update` natural-language goal updates
Date: 2026-05-10

## Sources inspected

Issue/context:

- `.ai/issues/refine/ISSUE-013-goal-update-natural-language.md`
- `.ai/issues/fixed/ISSUE-010-goal-update-telemetry-completion-semantics.md`
- `.ai/issues/open/ISSUE-014-goal-progress-estimates.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`
- `README.md`

Code:

- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/ui.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/tool-results.ts`
- `.pi/extensions/goal/completion-gate.ts`
- `.pi/extensions/goal/prompts.ts`

Raw logs:

- `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/raw/pre-refinement-nl-update-invariant-probe.log`
- `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/raw/research-rg.log`
- `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/raw/sentrux-gate.log`

## Current behavior facts

- `command.ts` registers `/goal` with subcommands `pause`, `resume`, `clear`, and `queue`; there is no `update` subcommand today.
- Non-empty `/goal <args>` that is not a control subcommand resolves as a template or a new objective. This means adding `/goal update ...` must be handled before objective creation to avoid accidentally creating/replacing a goal whose objective starts with `update`.
- When a goal already exists, `/goal <objective>` asks the user to choose `Replace`, `Queue`, or `Cancel`. This is replacement/new-goal UX, not field-edit UX.
- `tools.ts` exposes structured `update_goal` with optional `status`, `objective`, `token_budget`, `time_budget_seconds`, `min_tokens_before_wrap_up`, and `min_time_seconds_before_wrap_up`.
- `update_goal` validation already rejects invalid status values and invalid budget/floor numbers, recomputes active/budget-limited state after budget edits, blocks resume when budgets remain exhausted, and prevents floor edits plus status completion in one call.
- `update_goal(status: "complete")` flows through `decideGoalCompletion(...)` and can be deferred by hard completion floors.
- Completion deferral returns the required exact message `Completion deferred by goal floor. The goal remains active.` and keeps the current active goal in the result details.
- Successful completion returns the exact prefix `Goal achieved.` from `buildGoalUpdate(...)`.
- ISSUE-010 fixed lifecycle telemetry so only actual successful `update_goal` results with `details.goal.status === "complete"` count as completion.
- `GoalState` currently has objective, status, token/time budgets, wrap-up floors, and accounting fields. ISSUE-014 will add advisory `progressPercent`, `progressNote`, and `progressUpdatedAt` fields plus `update_goal` progress params.
- README currently tells users to use natural language instructions to the agent for goal management, but there is no direct slash-command natural-language field-update surface.
- `ui.ts` has `ctx.ui.select(...)` precedent for interactive confirmation through replacement choices and paused-goal prompts.
- `format.ts` already owns objective validation and summary formatting; implementation should add parsing/formatting helpers in a separate small module or carefully scoped helpers rather than bloating `command.ts`.

## Dependency facts from promoted issues

- ISSUE-014 locks progress estimates as advisory-only. `progress_percent: 100` must not mark complete, progress-only updates must not count as productive work, and progress edits should be explicit.
- ISSUE-021 plans proof gates. `/goal update complete` must not become a shortcut around proof/floor gates; it should reuse the same update/completion path.
- ISSUE-024 plans `/goal audit` as the qualitative pre-completion review surface. Completion through `/goal update` should either be disallowed in first pass or require explicit confirmation and the same completion gate, not perform its own audit bypass.

## Planning sensor result

`raw/sentrux-gate.log` records:

- `sentrux gate --save .pi/extensions/goal`
- exit `0`
- quality baseline saved at `.pi/extensions/goal/.sentrux/baseline.json`

No code was changed in this planning pass.

## Key risk surfaced by research

The dangerous seam is command dispatch: without an explicit `update` branch, `/goal update ...` is currently interpreted as a new objective. The implementation must reserve `update` as a control subcommand and route parsing through a bounded deterministic proposal/confirmation path before applying the same structured update semantics as `update_goal`.

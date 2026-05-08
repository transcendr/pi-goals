# pi-goal ISSUES-007..010 implementation playbook prompt

Use this prompt at the start of an implementation session for the current open `pi-goal` runtime issues.

```md
You are implementing the open execution-ready `pi-goal` issues:

- `.ai/issues/open/ISSUE-007-goal-budget-warning-and-hard-stop.md` — P0 budget warning, budget-reached labels, and 110% hard stop.
- `.ai/issues/open/ISSUE-008-goal-objective-limit-15k.md` — raise objective limit to 15K.
- `.ai/issues/open/ISSUE-009-goal-budget-edit-status-recompute.md` — recompute status after budget edits.
- `.ai/issues/open/ISSUE-010-goal-update-telemetry-completion-semantics.md` — fix `update_goal` completion/progress telemetry semantics.

Refine-only issue, do not implement in this run:

- `.ai/issues/refine/ISSUE-011-goal-widget-real-component-and-narrow-width.md` — UI component/card/narrow-width strategy. Only inspect if needed to avoid touching UI scope accidentally.

Authoritative project instructions:

- `AGENTS.md`
- `.pi/extensions/goal/.sentrux/rules.toml`
- `.ai/docs/codex-goal-command-research.md` if Codex behavior needs re-checking
- Pi docs only when API behavior is unclear:
  - `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
  - `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/tui.md`

Primary implementation area:

```text
.pi/extensions/goal/
  constants.ts
  types.ts
  state.ts
  telemetry.ts
  lifecycle.ts
  continuation.ts
  prompts.ts
  format.ts
  ui.ts
  tools.ts
  command.ts only if slash-command behavior must change
```

Mission:

Implement all open execution-ready issues while preserving the existing modular design, branch-local persistence, status vocabulary, and runtime behavior outside the requested fixes. The highest-priority outcome is that token/time budgets warn before target, mark the exact budget reached at target, and hard-stop at 110% over budget.

## Non-negotiables

- Preserve statuses: `active`, `paused`, `budgetLimited`, `complete`.
- Do not continue active goal work while paused or budget-limited.
- Do not implement ISSUE-011 UI/card work in this run.
- Do not suppress Sentrux; fix structural causes before claiming completion.
- Run Sentrux against `.pi/extensions/goal`, never the repo root.
- Keep source modular. Prefer small helpers/modules over growing `lifecycle.ts` or `tools.ts` past Sentrux limits.
- Preserve null-goal clearing behavior in `syncGoalUi(ctx, null)`.
- Keep uppercase `M` token formatting.
- Treat `tsc: command not found` as an environment limitation only after attempting it.
- Add Solo evidence comments before completing todos.
- Commit each completed issue separately unless a coupled implementation makes that unsafe; if combined, explain why in commit message and Solo evidence.

## Required Solo todo usage

Solo instance/project:

```bash
solo-mcp --instance solo-pi_goals todos --project 2 --status open --fields id,title,tags,is_blocked
```

Current todo map:

```toon
solo_todos[16]{role,id,title,issue}
  epic,50,"ISSUE-007 Budget warning and hard stop","007"
  leaf,51,"007.1 Add budget threshold/reason helpers","007"
  leaf,52,"007.2 Implement warning threshold detection","007"
  leaf,53,"007.3 Implement target reached state and labels","007"
  leaf,54,"007.4 Enforce 110 percent hard stop","007"
  leaf,55,"007.5 Validate budget lifecycle","007"
  epic,56,"ISSUE-008 Raise objective limit to 15K","008"
  leaf,57,"008.1 Update and validate objective limit","008"
  epic,58,"ISSUE-009 Recompute status after budget edits","009"
  leaf,59,"009.1 Implement budget edit recompute helper","009"
  leaf,60,"009.2 Wire tool update status/scheduling","009"
  leaf,61,"009.3 Validate budget edit recompute","009"
  epic,62,"ISSUE-010 Fix update_goal telemetry semantics","010"
  leaf,63,"010.1 Refactor completion/progress telemetry","010"
  leaf,64,"010.2 Validate update_goal telemetry","010"
  refine,65,"ISSUE-011 Refine widget component/layout strategy","011"
```

Rules:

1. Treat `#50`, `#56`, `#58`, and `#62` as issue-level epics. Complete each only after its leaf todos, issue acceptance criteria, validation, issue move-to-fixed, and commit are done.
2. Treat `#65` as refine-only. Do not complete it during implementation unless the user explicitly asks to refine UI strategy.
3. Before starting a leaf, add a start comment:

   ```bash
   solo-mcp --instance solo-pi_goals todo comment add <todo_id> --project 2 --body "Starting <issue/slice>: files=<paths>; validation=<commands/probes>."
   ```

4. Before completing a leaf, add evidence:

   ```bash
   solo-mcp --instance solo-pi_goals todo comment add <todo_id> --project 2 --file /tmp/<evidence>.md
   solo-mcp --instance solo-pi_goals todo complete <todo_id> --project 2
   ```

5. Evidence must include files changed, commands run, pass/fail results, probes, acceptance criteria covered, and remaining limitations.
6. Do not complete an epic until `git status --short`, issue location/status, Solo leaves, and validation all support closeout.

## Required Sentrux gates

Before non-trivial implementation work and before each issue slice:

```bash
sentrux gate --save .pi/extensions/goal
```

After each coherent implementation slice and before any Solo completion:

```bash
sentrux gate .pi/extensions/goal
sentrux check .pi/extensions/goal
```

If Sentrux fails:

1. Read the failure as structural feedback.
2. Refactor ownership/import direction/function size/layer classification.
3. Rerun both commands.
4. Do not complete related todos until green unless the user explicitly accepts a documented tradeoff.

## Global validation commands

Run after each issue, and again at final closeout:

```bash
sentrux gate .pi/extensions/goal
sentrux check .pi/extensions/goal
pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models
tsc --noEmit --target ES2022 --module ESNext --moduleResolution node --strict --skipLibCheck .pi/extensions/goal/*.ts
```

If `tsc` is unavailable, record the exact failure, usually:

```text
/bin/bash: tsc: command not found
```

Use focused Node/jiti probes where possible for pure helpers. Do not let helper probes replace Pi extension load validation.

## Execution order

Recommended order:

1. ISSUE-010 telemetry semantics first, because clean progress/completion accounting makes later budget behavior easier to verify.
2. ISSUE-009 budget edit status recompute, because budget status consistency affects warning/reached tests.
3. ISSUE-008 objective limit, small independent fix.
4. ISSUE-007 budget warning and hard stop, highest priority and broadest runtime change.

If implementation reveals ISSUE-007 should introduce shared budget helpers needed by ISSUE-009, it is acceptable to implement ISSUE-009 and ISSUE-007 in a coordinated branch, but still close and commit issue evidence separately if possible.

## ISSUE-010 playbook — update_goal telemetry semantics

Todos: `#63`, `#64`, epic `#62`.

Files likely touched:

- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/tools.ts` only if result details need a stronger success shape
- test/probe files if added

Implementation requirements:

- Remove pre-result completion marking from `handleToolCall()`.
- Do not mark `activeTurn.completedGoal` for arbitrary successful `update_goal` calls.
- Mark completion only when evidence shows the current or returned goal status is `complete` and no tool error occurred.
- If needed, rename or split telemetry fields:
  - `goalCompleted` for completion.
  - `goalMutated` or equivalent for successful non-completion goal updates.
- Ensure failed/no-op goal updates do not reset no-progress counters incorrectly.

Validation probes:

- Failed `update_goal(status: complete)` does not set completion telemetry.
- Budget-only `update_goal` does not set completion telemetry.
- Successful `update_goal(status: complete)` sets completion telemetry.
- Existing safety pause/no-progress behavior remains coherent.

Closeout:

- Move `.ai/issues/open/ISSUE-010-goal-update-telemetry-completion-semantics.md` to `.ai/issues/fixed/` with implementation notes.
- Complete `#63`, `#64`, then `#62` with evidence comments.
- Commit, suggested message:

  ```bash
  git commit -m "fix: correct goal update telemetry semantics"
  ```

## ISSUE-009 playbook — budget edit status recompute

Todos: `#59`, `#60`, `#61`, epic `#58`.

Files likely touched:

- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/lifecycle.ts` if shared status helper moves there or into new module
- `.pi/extensions/goal/telemetry.ts` / `types.ts` if budget reason recording is improved

Implementation requirements:

- Add or reuse a helper that evaluates current usage against token/time budgets.
- On budget edits with no explicit status:
  - `budgetLimited -> active` when current usage is now below all configured budgets.
  - `active -> budgetLimited` immediately when edited budget is below/equal current usage.
  - preserve `paused` and `complete` unless explicit status is provided.
- Record token/time budget reason when entering `budgetLimited`.
- If recompute resumes a budget-limited goal to active, schedule continuation as resumed.
- If recompute makes an active goal budget-limited, cancel continuation and schedule budget-limit wrap-up only if appropriate.

Validation probes:

- Raise token budget above current usage: `budgetLimited -> active`.
- Lower token budget below current usage: `active -> budgetLimited`.
- Equivalent time-budget cases.
- Budget-only edit does not resume paused goal.
- Budget-only edit does not reopen complete goal.

Closeout:

- Move `.ai/issues/open/ISSUE-009-goal-budget-edit-status-recompute.md` to `.ai/issues/fixed/` with implementation notes.
- Complete `#59`, `#60`, `#61`, then `#58` with evidence comments.
- Commit, suggested message:

  ```bash
  git commit -m "fix: recompute goal status after budget edits"
  ```

## ISSUE-008 playbook — 15K objective limit

Todos: `#57`, epic `#56`.

Files likely touched:

- `.pi/extensions/goal/constants.ts`
- validation probe only if added

Implementation requirements:

- Change `MAX_OBJECTIVE_CHARS` from `4000` to `15000`.
- Keep existing trimming and long-objective hint behavior.
- Ensure error message reports `15000`.

Validation probes:

- 4,241-character objective accepted by `validateObjective`.
- 15,001-character objective rejected with message containing `15000`.
- Existing empty-objective validation still works.

Closeout:

- Move `.ai/issues/open/ISSUE-008-goal-objective-limit-15k.md` to `.ai/issues/fixed/` with implementation notes.
- Complete `#57`, then `#56` with evidence comments.
- Commit, suggested message:

  ```bash
  git commit -m "fix: raise goal objective limit"
  ```

## ISSUE-007 playbook — budget warning and hard stop

Todos: `#51`, `#52`, `#53`, `#54`, `#55`, epic `#50`.

Files likely touched:

- `.pi/extensions/goal/constants.ts`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/telemetry.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/ui.ts`
- `.pi/extensions/goal/widget.ts` only for text labels, not layout/card strategy
- possibly a new small module such as `.pi/extensions/goal/budget.ts` if Sentrux/function size benefits

Implementation requirements:

### Threshold constants

Add explicit constants, names can vary:

```ts
TOKEN_BUDGET_WARNING_REMAINING = 100_000
TIME_BUDGET_WARNING_REMAINING_SECONDS = 60
BUDGET_HARD_STOP_MULTIPLIER = 1.1
```

### Budget evaluation

Centralize evaluation into a helper that can return:

```toon
budget_state[6]{kind,meaning}
  none,"no budget pressure"
  tokenWarning,"token budget target within 100K"
  timeWarning,"time budget target within 60 seconds"
  tokenReached,"tokensUsed >= tokenBudget"
  timeReached,"timeUsedSeconds >= timeBudgetSeconds"
  tokenHardStop,"tokensUsed >= ceil(tokenBudget * 1.1)"
  timeHardStop,"timeUsedSeconds >= ceil(timeBudgetSeconds * 1.1)"
```

If both token and time apply, choose the most severe state first: hard stop > reached > warning. Preserve enough reason detail for UI/telemetry.

### Warning behavior

When warning threshold is crossed:

- Notify visibly with remaining budget.
- Record telemetry so the warning is not spammed every turn.
- Keep status `active`.
- Continuation prompt should steer toward wrap-up if warning metadata is active.

Expected warning examples:

```text
Token budget warning: 83k tokens remaining before target. Start wrapping up.
Time budget warning: 45 seconds remaining before target. Start wrapping up.
```

### Target reached behavior

When target budget is reached:

- Set `status: "budgetLimited"`.
- Set/record reason as token or time.
- Cancel normal continuation.
- Schedule at most one budget-limit wrap-up.
- UI/status/widget should say `token budget reached` or `time budget reached`, not generic `budget limited`.

### Hard stop behavior

When usage reaches 110% of budget:

- Cancel all goal continuations/wrap-ups for that goal.
- Abort/interrupt active goal turn if the API path is available from the lifecycle context.
- Notify visibly that hard stop was enforced.
- Do not schedule additional substantive wrap-up work after hard stop. A minimal stop notice is acceptable.

### Natural-language budget behavior

The model tools already support natural-language creation with `token_budget`. Ensure the runtime behavior actually constrains the resulting goal after accounting. Add a probe/harness case equivalent to:

```text
create a goal to review the code so far with a 200K token budget
```

Then simulate accounting past budget and assert `budgetLimited`/stop behavior without manual intervention.

Validation probes:

- Token warning at `budget - 100000` or less.
- Time warning at `budget - 60s` or less.
- Token target reached sets `budgetLimited` and token-specific label/reason.
- Time target reached sets `budgetLimited` and time-specific label/reason.
- Token hard stop at `ceil(budget * 1.1)` cancels continuation/does not schedule work.
- Time hard stop at `ceil(budget * 1.1)` cancels continuation/does not schedule work.
- Budget-limit wrap-up sent once.
- Continuation is suppressed after budget target/hard stop.

Closeout:

- Move `.ai/issues/open/ISSUE-007-goal-budget-warning-and-hard-stop.md` to `.ai/issues/fixed/` with implementation notes.
- Complete `#51`, `#52`, `#53`, `#54`, `#55`, then `#50` with evidence comments.
- Commit, suggested message:

  ```bash
  git commit -m "feat: enforce pi-goal budget guardrails"
  ```

## Final completion audit

Before marking the implementation goal complete, verify all of the following with concrete evidence:

```toon
completion_audit[12]{item,evidence_required}
  open_issues,"ISSUE-007..010 moved from .ai/issues/open to .ai/issues/fixed with closeout notes"
  refine_issue,"ISSUE-011 remains in .ai/issues/refine unless explicitly handled separately"
  solo,"todos #50..#64 complete with evidence comments; #65 not completed unless refined"
  sentrux,"sentrux gate/check passed after final code state"
  pi_load,"pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models passed"
  typescript,"tsc attempted; either passed or exact missing-tsc failure recorded"
  budget_warning,"token/time warning threshold probes passed"
  budget_reached,"token/time reached status and labels passed"
  hard_stop,"110 percent hard-stop probes passed"
  budget_edits,"budget edit status recompute probes passed"
  telemetry,"update_goal completion telemetry probes passed"
  objective_limit,"4241 accepted and 15001 rejected objective probes passed"
```

Only after every applicable audit item is satisfied:

1. Confirm `git status --short` is clean after commits.
2. Confirm no unexpected open implementation todos remain.
3. Call `update_goal` with `status: "complete"` if an active pi-goal is tracking this playbook execution.
4. Report commits, validation commands, and any remaining known limitations.
```

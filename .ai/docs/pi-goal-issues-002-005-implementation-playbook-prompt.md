# pi-goal ISSUE-002..005 implementation playbook prompt

Use this prompt at the start of an implementation session for the execution-ready `pi-goal` follow-up issues.

```md
You are implementing the execution-ready `pi-goal` follow-up issues ISSUE-002 through ISSUE-005.

Authoritative docs:

- `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md` — implemented baseline; read only for baseline behavior and constraints.
- `.ai/issues/open/ISSUE-002-goal-pause-active-turn-interrupt.md`
- `.ai/issues/open/ISSUE-003-paused-goal-continuation-guard.md`
- `.ai/issues/open/ISSUE-004-goal-subcommand-fuzzy-autocomplete.md`
- `.ai/issues/open/ISSUE-005-goal-widget-labels-and-time-budget.md`
- `.ai/docs/pi-goal-follow-up-dependency-map.md`
- `AGENTS.md`
- `.pi/extensions/goal/.sentrux/rules.toml`

Primary implementation target:

```text
.pi/extensions/goal/
  index.ts
  command.ts
  constants.ts
  continuation.ts
  format.ts
  lifecycle.ts
  prompts.ts
  state.ts
  telemetry.ts
  tools.ts
  types.ts
  ui.ts
```

Mission:

Implement the ISSUE-002..005 follow-ups as small, verified slices while preserving the modular `pi-goal` runtime architecture. Use the existing Solo todo hierarchy as the operational source of work sequencing, and use Sentrux as a required structural quality gate before claiming any implementation slice complete.

## Non-negotiables

- Do not reopen product/design forks already locked in ISSUE-002..005 unless implementation proves a locked decision impossible; if that happens, stop and document the evidence before changing direction.
- Do not introduce new public goal statuses. Preserve `active`, `paused`, `budgetLimited`, and `complete` only.
- Keep `paused` authoritative over stale continuation text.
- Keep Solo/todo operational details out of product code and user-facing extension strings.
- Preserve module responsibilities from `AGENTS.md`.
- Do not create cross-module shortcuts that violate `.pi/extensions/goal/.sentrux/rules.toml`.
- Do not treat Sentrux as a test substitute; also run TypeScript/Pi/mocking/manual validation where available.
- Do not mark a Solo todo complete until the todo body’s definition of done and the issue acceptance criteria for that slice have real evidence.

## Required Solo todo usage

Solo instance/project:

```bash
solo-mcp --instance solo-pi_goals todos --project 2 --status open --fields id,title,is_blocked
```

Work one leaf todo at a time:

1. List open todos and choose the first unblocked leaf for the issue being implemented.
2. Read the todo body before coding:

   ```bash
   solo-mcp --instance solo-pi_goals todo view <todo_id> --project 2 --full
   ```

3. Add a start comment naming the files and validation plan:

   ```bash
   solo-mcp --instance solo-pi_goals todo comment add <todo_id> --project 2 --body "Starting: <brief plan>. Validation: sentrux gate/check plus <tests/manual scenario>."
   ```

4. Implement only that todo’s slice unless two adjacent leaves must be changed atomically; if so, comment on both todos before proceeding.
5. After validation, add a completion-evidence comment with:
   - files changed;
   - commands run;
   - pass/fail results;
   - remaining limitations;
   - issue acceptance criteria touched.
6. Mark the leaf complete only after evidence exists:

   ```bash
   solo-mcp --instance solo-pi_goals todo complete <todo_id> --project 2
   ```

7. Do not complete an epic todo until all child leaves are complete and the issue doc acceptance criteria have been audited.
8. Before final closeout, list todos again and verify no completed leaf is missing evidence comments.

Existing hierarchy:

```toon
solo_todos[20]{issue,role,id,title,blocked_by}
  ISSUE-002,epic,24,"Pause active goal turn promptly","25,26,27,28"
  ISSUE-002,leaf,25,"002.1 Verify active-turn control surface",""
  ISSUE-002,leaf,26,"002.2 Add pause cancellation and active-run steering","25"
  ISSUE-002,leaf,27,"002.3 Harden lifecycle handling for pause state","26"
  ISSUE-002,leaf,28,"002.4 Validate active pause and resume behavior","27"
  ISSUE-003,epic,29,"Guard paused goals from stale continuations","30,31,32,33"
  ISSUE-003,leaf,30,"003.1 Add goal-scoped continuation cancellation API",""
  ISSUE-003,leaf,31,"003.2 Apply cancellation from command and lifecycle mutations","30"
  ISSUE-003,leaf,32,"003.3 Make context filtering status-aware","31"
  ISSUE-003,leaf,33,"003.4 Validate stale-message regression","32"
  ISSUE-004,epic,34,"Fuzzy autocomplete for /goal subcommands","35,36,37,38"
  ISSUE-004,leaf,35,"004.1 Add declarative goal subcommand table",""
  ISSUE-004,leaf,36,"004.2 Register command-local argument completions","35"
  ISSUE-004,leaf,37,"004.3 Implement scoped fuzzy matching guard","36"
  ISSUE-004,leaf,38,"004.4 Validate autocomplete UX","37"
  ISSUE-005,epic,39,"Resource labels and time budget support","40,41,42,43"
  ISSUE-005,leaf,40,"005.1 Replace ambiguous widget resource labels",""
  ISSUE-005,leaf,41,"005.2 Add timeBudgetSeconds state and tool validation","40"
  ISSUE-005,leaf,42,"005.3 Enforce time-budget accounting and prompts","41"
  ISSUE-005,leaf,43,"005.4 Validate resource budgets end-to-end","42"
```

## Required Sentrux gates

Before non-trivial code changes in `.pi/extensions/goal`:

```bash
sentrux gate --save .pi/extensions/goal
```

After every coherent implementation slice and before completing a Solo leaf:

```bash
sentrux gate .pi/extensions/goal
sentrux check .pi/extensions/goal
```

If either command fails:

1. Read the failure as structural feedback, not noise.
2. Fix the architectural cause: import direction, ownership boundary, file growth, cycle, or coupling.
3. Rerun both commands.
4. Do not complete the Solo todo until the gate/check pass or the user explicitly accepts the tradeoff.

## Recommended implementation sequence

Follow this default order because ISSUE-003 supplies cancellation/context safeguards used by ISSUE-002:

1. ISSUE-003 — stale continuation guard and cancellation runtime.
2. ISSUE-002 — active-turn pause steering/abort using the cancellation runtime.
3. ISSUE-005 — explicit resource labels and time-budget accounting.
4. ISSUE-004 — command-local autocomplete; independent and can move earlier if a small low-risk win is needed.

## ISSUE-003 implementation playbook

Issue doc: `.ai/issues/open/ISSUE-003-paused-goal-continuation-guard.md`
Solo todos: epic `#29`, leaves `#30..#33`.

### Todo #30 — Add goal-scoped continuation cancellation API

Files likely touched:

- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/types.ts`
- possibly `.pi/extensions/goal/telemetry.ts`

Implementation requirements:

- Track scheduled continuation metadata `{ goalId, reason }` instead of only a bare timer.
- Track budget wrap-up timer metadata so stale wrap-ups can be cancelled or ignored.
- Export a small cancellation API such as `cancelGoalContinuation(goalId?: string, reason?: string)`.
- Preserve existing `resetContinuationRuntime()` behavior.

Validation:

- Mock/unit check cancellation clears pending timers.
- `sentrux gate/check` pass.

### Todo #31 — Apply cancellation from command and lifecycle mutations

Files likely touched:

- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/continuation.ts`

Implementation requirements:

- Call cancellation from `/goal pause`.
- Call cancellation from `/goal clear`.
- Call cancellation before replacing an existing goal.
- Call cancellation from safety pause.
- Ensure stale budget wrap-up paths no-op after state changes.

Validation:

- Mock cases for pause, clear, replace, and safety pause cancel pending continuation.
- Resume still schedules a fresh continuation.
- `sentrux gate/check` pass.

### Todo #32 — Make context filtering status-aware

Files likely touched:

- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/types.ts`
- possibly `.pi/extensions/goal/constants.ts`

Implementation requirements:

- Keep `pi-goal-continuation` only for matching current `goalId` with `status: "active"`.
- Keep `pi-goal-budget-limit` only for matching current `goalId` with `status: "budgetLimited"`.
- Drop all goal steering messages for absent, cleared, replaced, paused, or complete states.
- If ISSUE-002 pause steering is implemented in the same branch, keep pause steering only while matching current goal is paused.

Validation:

- Inject stale continuation/budget messages into context event fixtures.
- Verify provider-bound context drops incompatible messages.
- `sentrux gate/check` pass.

### Todo #33 — Validate stale-message regression

Validation requirements:

- Regression case: continuation-style input/message while `get_goal` reports paused must not trigger substantive goal work.
- Clear/replaced goal stale messages are dropped.
- Budget-limit messages are kept only for budget-limited goals.
- `/goal resume` emits a fresh valid continuation.
- Record exact commands and any manual Pi TUI scenarios in the todo comment.

## ISSUE-002 implementation playbook

Issue doc: `.ai/issues/open/ISSUE-002-goal-pause-active-turn-interrupt.md`
Solo todos: epic `#24`, leaves `#25..#28`.

### Todo #25 — Verify active-turn control surface

Before coding, inspect or cite Pi surfaces:

- `ctx.isIdle()`
- `ctx.abort()`
- `pi.sendMessage(..., { deliverAs: "steer" })`
- command execution behavior while streaming, if manually testable

Add a todo comment summarizing whether active steer, abort fallback, or both will be implemented.

### Todo #26 — Add pause cancellation and active-run steering

Files likely touched:

- `.pi/extensions/goal/constants.ts`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/continuation.ts`

Implementation requirements:

- Add a pause custom message type if using a distinct steering message.
- `/goal pause` must persist paused before any active-run intervention.
- Cancel pending continuation for the goal.
- If `!ctx.isIdle()`, send a hidden pause steering message with `deliverAs: "steer"`.
- Use `ctx.abort()` fallback if validation shows steering does not stop promptly; document the behavior.

Validation:

- Idle pause still behaves as before.
- Active pause sends steering and/or aborts.
- UI notice says the goal is paused and resumable.
- `sentrux gate/check` pass.

### Todo #27 — Harden lifecycle handling for pause state

Files likely touched:

- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/continuation.ts`

Implementation requirements:

- Safety pause cancels pending continuations.
- Context filtering handles pause steering validity if added.
- Prompt fallback says paused/different goal id means stop and wait for `/goal resume`.

Validation:

- No auto-continuation after pause.
- Resume schedules a fresh continuation.
- `sentrux gate/check` pass.

### Todo #28 — Validate active pause and resume behavior

Validation requirements:

- Start a goal with visible multi-step work.
- Run `/goal pause` while it is active.
- Confirm active turn stops substantive goal work promptly.
- Confirm no further automatic continuation while paused.
- Run `/goal resume`; confirm it resumes without a separate user message.
- Record whether active steer alone worked or abort fallback was required.

## ISSUE-005 implementation playbook

Issue doc: `.ai/issues/open/ISSUE-005-goal-widget-labels-and-time-budget.md`
Solo todos: epic `#39`, leaves `#40..#43`.

### Todo #40 — Replace ambiguous widget resource labels

Files likely touched:

- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/ui.ts`
- possibly `.pi/extensions/goal/tools.ts`

Implementation requirements:

- Add shared helpers for explicit resource lines:
  - `Time: used` or `Time: used / budget`
  - `Tokens: used` or `Tokens: used / budget`
- Widget must never render elapsed time as `Usage:`.
- Preserve compact widget readability.

Validation:

- Widget examples for no budget and token budget.
- Existing token budget display remains clear.
- `sentrux gate/check` pass.

### Todo #41 — Add `timeBudgetSeconds` state and tool validation

Files likely touched:

- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/format.ts`

Implementation requirements:

- Add `timeBudgetSeconds?: number` to `GoalState`.
- Preserve field through persisted `pi-goal-state` events and replay.
- Extend `create_goal` schema with `time_budget_seconds`.
- Validate as a positive integer.
- Include time budget in tool results and summaries where useful.

Validation:

- Positive value accepted.
- Zero/negative/non-integer rejected.
- Replay preserves time budget.
- `sentrux gate/check` pass.

### Todo #42 — Enforce time-budget accounting and prompts

Files likely touched:

- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/telemetry.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/types.ts`

Implementation requirements:

- Add telemetry budget reason: `tokenBudget` or `timeBudget`.
- When active and `timeUsedSeconds >= timeBudgetSeconds`, transition to `budgetLimited`.
- Preserve token-budget behavior.
- Generalize budget-limit prompt to resource budget limit and include exhausted resource.
- Continuation prompt should include time budget facts when present.

Validation:

- Token budget still triggers budget-limited behavior.
- Time budget triggers budget-limited behavior.
- Budget/resource-limit wrap-up scheduled once.
- `sentrux gate/check` pass.

### Todo #43 — Validate resource budgets end-to-end

Validation requirements:

- Widget no longer says `Usage:` for elapsed time.
- Widget shows `Time:` and `Tokens:` lines.
- Token-only budget display works.
- Time-only budget display works.
- Both budgets display correctly.
- Tool result exposes time budget.
- Replay restores time budget.
- Invalid time budget input is rejected.
- Time-budget exhaustion stops continuation and triggers wrap-up.

## ISSUE-004 implementation playbook

Issue doc: `.ai/issues/open/ISSUE-004-goal-subcommand-fuzzy-autocomplete.md`
Solo todos: epic `#34`, leaves `#35..#38`.

### Todo #35 — Add declarative goal subcommand table

Files likely touched:

- `.pi/extensions/goal/command.ts`
- possibly `.pi/extensions/goal/types.ts`

Implementation requirements:

- Add table for `pause`, `resume`, `clear` with descriptions.
- Keep exact command semantics unchanged.

### Todo #36 — Register command-local argument completions

Implementation requirements:

- Add `getArgumentCompletions(argumentPrefix)` to `registerCommand("goal", ...)`.
- Do not use a global autocomplete provider.

### Todo #37 — Implement scoped fuzzy matching guard

Implementation requirements:

- Empty input returns all subcommands.
- Prefix matches rank first.
- Substring and ordered-character matches rank after prefix matches.
- Multi-word/objective-like input returns `null`.
- Do not autocomplete objective text.

### Todo #38 — Validate autocomplete UX

Validation requirements:

- `/goal p` suggests `pause`.
- `/goal res` suggests `resume`.
- `/goal c` suggests `clear`.
- Fuzzy examples such as `clr` or `ea` work as designed.
- `write tests` returns no subcommand suggestions.
- Existing `/goal` command behavior remains unchanged.
- Manual Pi TUI validation if available.
- `sentrux gate/check` pass.

## Required validation beyond Sentrux

Run what is available in the environment, and record unavailable tools explicitly:

```bash
# Structural gates
sentrux gate .pi/extensions/goal
sentrux check .pi/extensions/goal

# TypeScript or syntax validation, if available
# Example; adapt to available package tooling:
tsc --noEmit --target ES2022 --module ESNext --moduleResolution node --strict --skipLibCheck .pi/extensions/goal/*.ts

# Pi extension load validation
pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models
```

If `tsc` or another validator is unavailable, record the exact command and failure such as `tsc: command not found`; do not pretend it passed.

## Final completion audit

Before claiming the implementation complete:

1. Restate the issue(s) implemented and every acceptance criterion.
2. Map each criterion to evidence: file diff, test/mock result, Sentrux output, Pi load output, or manual scenario notes.
3. Verify Solo todo state:

   ```bash
   solo-mcp --instance solo-pi_goals todos --project 2 --status open --fields id,title,is_blocked
   ```

4. Ensure every completed leaf has a completion-evidence comment.
5. Complete issue epic only when all leaves are complete and acceptance criteria pass.
6. Run final Sentrux gate/check.
7. Run `git status --short` and report all changed files.
8. If committing is requested, stage and commit only after the audit is green.

Final report must include:

- issues implemented;
- Solo todos completed and remaining;
- files changed;
- Sentrux commands and results;
- TypeScript/Pi/manual validation commands and results;
- known limitations or deferred follow-ups;
- final git status or commit hash if committed.
```

# ISSUE-006 — Demo-worthy `pi-goal` widget card UI

Status: fixed — implemented and validated
Priority: medium
Next best session: focused Pi extension UI implementation session
Next best session rationale: The runtime behavior is complete; this issue is a contained UI polish pass over the existing widget surface, with Sentrux boundaries and live TUI validation as the main risks.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:

- `.ai/issues/fixed/ISSUE-005-goal-widget-labels-and-time-budget.md`
- current `pi-goal` widget rendering in `.pi/extensions/goal/ui.ts`
- Pi TUI `ctx.ui.setWidget` component/factory support

Goal: Replace the plain-text `pi-goal` widget with a compact, themed goal-card presentation that looks demo-worthy while preserving current goal runtime behavior and clear no-stale-widget semantics.

## Problem

The current `pi-goal` widget is functional but visually plain:

```text
pi-goal: active
Objective: ...
Time: 1m
Tokens: 10M
Commands: /goal pause, /goal clear
```

That is acceptable for debugging, but it looks underwhelming in a demo. The extension now has enough runtime polish that the visible widget should feel productized: status badge, objective treatment, resource rows, progress bars when budgets exist, and command chips.

## Why it matters

`pi-goal` is a user-facing Pi extension. The widget is the main persistent visual proof that goal mode is running. A polished widget improves:

- demo impact;
- readability during long-running autonomous goal work;
- confidence that budgets/time/token state are first-class;
- clarity across `active`, `paused`, `budgetLimited`, and `complete` states.

## Desired behavior

The widget should render as a compact goal card above the editor. Example direction:

```text
╭─ 🎯 pi-goal ───────────────── active ─╮
│ Implement natural-language goal tools  │
│ ⏱ Time    ██████░░░░  12m / 20m   60% │
│ ◈ Tokens  ██░░░░░░░░  8.4k / 50k  17% │
│ next: auto-continue    /goal pause     │
╰────────────────────────────────────────╯
```

No-budget compact form should still look intentional:

```text
╭─ 🎯 pi-goal ─ active ─╮
│ Refactor goal tools   │
│ ⏱ 42m   ◈ 10M tokens  │
│ /goal pause  /goal clear
╰───────────────────────╯
```

Status variants:

- `active`: `🎯 active`, accent/success leaning.
- `paused`: `⏸ paused`, warning/yellow leaning.
- `budgetLimited`: `⚠ budget limited`, warning/error leaning.
- `complete`: `✓ complete`, success/green leaning.

## Current planning status

This issue is execution-ready. The implementation path is locked to a theme-aware widget component/factory with pure rendering helpers, not to a larger runtime redesign.

## Grounded research and workflow loop log

### Loop 1 — Current widget and formatter inventory

Evidence inspected:

- `.pi/extensions/goal/ui.ts`
- `.pi/extensions/goal/format.ts`
- current issue tree and Solo project state

Findings:

- `syncGoalUi()` currently calls `ctx.ui.setWidget(WIDGET_UI_KEY, widgetLines(goal), { placement: "aboveEditor" })`.
- `widgetLines()` returns plain `string[]` lines.
- Existing formatting helpers already expose the data needed for a card: objective excerpt, time resource, token resource, status label, command hint.
- All prior implementation issues are fixed; there are no open Solo todos.

Loop decision:

- Keep runtime/accounting state untouched; this issue is strictly display/UI polish.

### Loop 2 — Pi TUI widget API research

Evidence inspected:

- Pi TUI docs: `docs/tui.md`, especially Pattern 5: Widgets Above/Below Editor.
- Pi extension docs: widget/status/footer examples.
- Pi extension generated types around `setWidget`.
- `examples/extensions/widget-placement.ts`.

Findings:

- `ctx.ui.setWidget` accepts either `string[]` or a component factory.
- Component factory shape is `(_tui, theme) => Component & { dispose?(): void }`.
- Component `render(width)` returns string lines and must not exceed width.
- Theme functions such as `theme.fg("accent", text)`, `theme.fg("success", text)`, `theme.fg("warning", text)`, `theme.fg("muted", text)`, and `theme.fg("dim", text)` are valid in examples.
- Current `widget-placement.ts` is minimal; docs are the stronger source for component factory behavior.

Design fork surfaced:

- Option A: keep `string[]` and only add box-drawing text.
- Option B: use a theme-aware component factory.
- Option C: replace footer/header instead of widget.

Loop decision:

- Choose Option B. It gives better demo polish while preserving the widget surface and avoiding footer/header scope creep.

### Loop 3 — Sentrux and module-boundary research

Evidence inspected:

- `.pi/extensions/goal/.sentrux/rules.toml`
- current module layout from `AGENTS.md`

Findings:

- `ui.ts` is a surface module.
- Adding card rendering directly to `ui.ts` risks growing the file/function surface over time.
- A new widget renderer module should be classified with UI/surface rules so Sentrux understands the boundary.

Design fork surfaced:

- Option A: implement all card rendering inside `ui.ts`.
- Option B: add a dedicated `.pi/extensions/goal/widget.ts` module and update Sentrux rules to include it in the `surfaces` layer.

Loop decision:

- Choose Option B. `ui.ts` should remain responsible for syncing Pi UI; `widget.ts` should own card rendering helpers/component factory.

### Loop 4 — Visual design and behavior locking

Locked design:

- Widget remains above editor by default.
- Use a fixed compact card, not a collapsible/interactive overlay.
- Show objective as one clean truncated line.
- Show progress bars only when a corresponding budget exists.
- If no budget exists, show compact resource values without fake percentages.
- Keep command hints as chip-like text; do not add clickable behavior.
- Preserve existing footer status text.
- Preserve `/goal` summary output as full-detail text; only the persistent widget becomes card-like.

Rejected/deferred alternatives:

- Footer replacement is rejected for this issue because it risks clobbering Pi's default footer/token/status information.
- Full interactive dashboard/overlay is deferred; this issue is persistent-widget polish only.
- Demo-mode toggle is deferred; default widget should be attractive without adding configuration.

### Loop 5 — Validation/readiness pass

Readiness findings:

- Implementation surfaces are known and bounded: `ui.ts`, new `widget.ts`, `.sentrux/rules.toml`, maybe `format.ts` for tiny reusable helpers.
- Sentrux quality gates are already required by project docs.
- Visual correctness needs both static checks and a bounded live/manual TUI validation because pure non-interactive load cannot prove the card looks good.

Execution-ready decision:

- No meaningful design forks remain. Implementer should not choose between plain strings, component factories, footer replacement, or overlays; the chosen path is the widget component factory/card.

## Locked planning truth

### Implementation shape

- Add `.pi/extensions/goal/widget.ts`.
- Export a widget factory/helper from `widget.ts`, for example `goalWidgetFactory(goal: GoalState)` or `renderGoalWidget(goal, theme, width)`.
- Update `ui.ts` to call `ctx.ui.setWidget(WIDGET_UI_KEY, goalWidgetFactory(goal), { placement: "aboveEditor" })`.
- Update `.pi/extensions/goal/.sentrux/rules.toml` so `widget.ts` is in the `surfaces` layer with `ui.ts`.
- Keep status/footer behavior unchanged.

### Card design requirements

- Use box-drawing borders where width permits.
- Render safely at narrow terminal widths; lines must not exceed `render(width)`.
- Include status badge with icon and color by status.
- Include objective line with ellipsis truncation.
- Include `Time` and `Tokens` resource rows.
- Show progress bars and percentages only when budgets exist.
- Use `k` and uppercase `M` token formatting via existing `formatTokensCompact`.
- Show commands/chips appropriate to current status.
- Clear widget on no goal exactly as today.

### Runtime invariants

- Do not change goal persistence/replay semantics.
- Do not change continuation scheduling.
- Do not change model tools or slash-command semantics.
- Do not reintroduce stale widget behavior after `clear_goal` or `/goal clear`.
- Do not make widget rendering depend on global mutable state beyond the supplied `GoalState`.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,priority,goal,next_session}:
  "ISSUE-006","open-execution-ready","medium","replace plain pi-goal widget with themed goal-card UI","focused Pi extension UI implementation"
feature_memory[5]{id,fact}:
  "fm1","current ui.ts uses ctx.ui.setWidget with string[] lines"
  "fm2","Pi setWidget accepts a theme-aware component factory"
  "fm3","format.ts already exposes objective/time/token/status helpers"
  "fm4","Sentrux surfaces layer currently includes ui.ts command.ts tools.ts"
  "fm5","previous issues 001-005 are fixed; this is UI-only polish"
locked_requirements[8]{id,requirement}:
  "lr1","use component-factory widget card rather than plain string[] widget"
  "lr2","add dedicated widget.ts rendering module and classify it as surface in Sentrux rules"
  "lr3","show status badge with icon and status-specific theme color"
  "lr4","show objective as one truncated card line"
  "lr5","show Time and Tokens rows with progress bars only when budgets exist"
  "lr6","preserve footer status slash commands model tools persistence and continuation behavior"
  "lr7","clear widget completely when no goal is set"
  "lr8","keep rendered lines within terminal width"
invariants[5]{id,invariant}:
  "inv1","GoalState remains the only widget input"
  "inv2","no new goal status values are introduced"
  "inv3","widget rendering is display-only and never mutates state"
  "inv4","clear_goal and /goal clear still remove status and widget"
  "inv5","token compact millions use uppercase M"
implementation_surfaces[4]{path,change}:
  ".pi/extensions/goal/widget.ts","new card renderer and component factory"
  ".pi/extensions/goal/ui.ts","delegate widget content to widget.ts while preserving syncGoalUi behavior"
  ".pi/extensions/goal/.sentrux/rules.toml","add widget.ts to surfaces layer"
  ".pi/extensions/goal/format.ts","only tiny reusable helper additions if needed"
verification_checks[7]{id,check,evidence}:
  "v1","Sentrux gate passes","sentrux gate .pi/extensions/goal"
  "v2","Sentrux rules pass","sentrux check .pi/extensions/goal"
  "v3","extension loads","pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models"
  "v4","no plain elapsed Usage widget remains","rg static source check"
  "v5","widget clears on null goal","mock or manual /goal clear / clear_goal scenario"
  "v6","budgeted rows show bars and percentages","render snapshot or live TUI observation"
  "v7","narrow width lines do not overflow","render helper snapshot at bounded widths"
```

## Proof threat model

Primary user-visible invariant:

- The persistent `pi-goal` widget looks like a polished goal card and still accurately reflects/clears the current goal state.

Likely false-green outcomes:

- Code loads but widget is still plain text.
- Card renders pretty at wide width but overflows or garbles narrow terminals.
- Progress bars show misleading percentages without budgets.
- Widget card persists after `/goal clear` or `clear_goal`.
- The implementation changes runtime behavior while trying to polish UI.

Deterministic vs live adequacy:

- Static and render-helper checks are sufficient for module boundaries, source shape, and line-width constraints.
- A bounded live/manual Pi TUI validation is still required for visual quality because ANSI/theme appearance and editor placement are user-visible.

Proof implications:

- Sentrux proves structural health, not visual quality.
- Pi load proves extension registration, not widget appearance.
- Static grep can catch old plain `Usage:` widget regressions, not card aesthetics.
- A live screenshot or operator note should be captured during implementation closeout.

## Required proofs

```toon
toon.version: 1
required_proofs[5]{name,source,command,pass_condition,scope,notes}:
  "sentrux_gate","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && sentrux gate .pi/extensions/goal","exit 0",run,"structural regression gate"
  "sentrux_check","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && sentrux check .pi/extensions/goal","exit 0",run,"all Sentrux rules pass including widget.ts layer"
  "pi_extension_load","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models >/tmp/pi-goal-widget-load.txt","exit 0",run,"extension loads with widget module"
  "no_plain_usage_widget","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && ! rg 'Usage: \\${formatElapsed|ctx\\.ui\\.setWidget\\(WIDGET_UI_KEY, widgetLines' .pi/extensions/goal","exit 0",run,"old plain widget pattern is absent"
  "live_widget_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && printf '%s\n' 'MANUAL: run pi TUI, create a budgeted goal, verify themed card/bars/clear behavior, attach screenshot or transcript note'","operator evidence attached",manual,"bounded live visual validation required"
```

## Execution checklist

1. Save Sentrux baseline before code changes:

   ```bash
   sentrux gate --save .pi/extensions/goal
   ```

2. Add `.pi/extensions/goal/widget.ts` with pure rendering helpers and a component factory.
3. Update `.pi/extensions/goal/ui.ts` to use the widget factory for non-null goals and keep clearing behavior unchanged for `null`.
4. Update `.pi/extensions/goal/.sentrux/rules.toml` to include `widget.ts` in the `surfaces` layer.
5. Implement resource rows:
   - time row with bar/percent only when `timeBudgetSeconds` exists;
   - token row with bar/percent only when `tokenBudget` exists;
   - compact value-only display when no budget exists.
6. Implement status theme/icon mapping.
7. Validate line width behavior for narrow terminals.
8. Run required proofs and capture manual live widget evidence.
9. Commit with an issue-scoped message, for example:

   ```bash
   git commit -m "feat: render pi-goal widget card"
   ```

## Acceptance criteria

- The persistent widget renders as a themed card instead of plain text lines.
- Active, paused, budget-limited, and complete states have distinct badges/icons/colors.
- Objective line is readable and truncated cleanly.
- Time and token rows are explicit and visually aligned.
- Time/token budgets show progress bars and percentages when present.
- No-budget goals show compact resource values without misleading fake progress.
- Widget lines do not exceed terminal width in normal/narrow widths.
- `/goal clear` and `clear_goal` fully remove the widget.
- Existing footer status, `/goal` summaries, slash commands, model tools, persistence, continuation, and telemetry behavior are unchanged.
- `sentrux gate .pi/extensions/goal` and `sentrux check .pi/extensions/goal` pass.
- Pi extension load validation passes.
- Live/manual TUI validation records visual evidence or a screenshot note.

## Solo todo plan

Create one epic and ordered leaves:

```toon
toon.version: 1
solo_plan[6]{order,title,scope,blocks_after}:
  1,"ISSUE-006 epic","complete only after all leaves and acceptance criteria pass","2,3,4,5,6"
  2,"006.1 Implement widget card renderer","widget.ts component factory, status badge, width-safe frame",""
  3,"006.2 Wire widget card into ui sync","ui.ts setWidget factory, null clear unchanged","2"
  4,"006.3 Add resource bars and no-budget display","time/token rows, percentages, uppercase M token formatting","3"
  5,"006.4 Update Sentrux rules and static validation","widget.ts surface layer, rg/static checks, Sentrux gate/check","4"
  6,"006.5 Live/demo validation and closeout","Pi TUI visual probe, clear behavior, issue evidence, commit","5"
```

## Solo todos created

```toon
toon.version: 1
solo_todos[6]{role,id,title,blocked_by}:
  "epic",44,"ISSUE-006 — Demo-worthy pi-goal widget card UI","45,46,47,48,49"
  "leaf",45,"006.1 Implement widget card renderer",""
  "leaf",46,"006.2 Wire widget card into UI sync","45"
  "leaf",47,"006.3 Add resource bars and no-budget display","46"
  "leaf",48,"006.4 Update Sentrux rules and static validation","47"
  "leaf",49,"006.5 Live/demo validation and closeout","48"
```

## Open questions

None. The design is locked for implementation.


## Implementation closeout

Implemented by commit to be created in this closeout: `feat: render pi-goal widget card`.

Files changed:

- `.pi/extensions/goal/widget.ts` — new pure widget card renderer/component factory with status badges, box frame, objective truncation, resource rows, budget bars, percentages, no-budget compact rows, and width-safe rendering.
- `.pi/extensions/goal/ui.ts` — delegates non-null widget rendering to `goalWidgetFactory(goal)` while preserving null-goal status/widget clearing.
- `.pi/extensions/goal/.sentrux/rules.toml` — classifies `widget.ts` in the `surfaces` layer.

Validation summary:

- `sentrux gate .pi/extensions/goal` passed.
- `sentrux check .pi/extensions/goal` passed.
- `pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models` passed.
- Static old-widget grep passed: no `widgetLines` setWidget path or elapsed `Usage:` widget pattern remains.
- Render-helper evidence covered no-budget, token-budget, time-budget, both-budget, paused, complete, and budget-limited cards.
- Narrow-width visible width probe at width 32 returned all rendered lines at visible width 32.
- `tsc` validation was attempted but unavailable in this environment (`tsc: command not found`).
- Live/manual Pi TUI visual validation was not run in this non-interactive shell; static render evidence was recorded in Solo todo `#49` instead.

Solo closeout:

- Completed leaf todos `#45`–`#49` with evidence comments.
- Completed epic todo `#44` after leaf closeout.

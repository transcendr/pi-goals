# pi-goal ISSUE-006 implementation playbook prompt

Use this prompt at the start of an implementation session for ISSUE-006, the demo-worthy `pi-goal` widget card UI.

```md
You are implementing ISSUE-006: replace the plain `pi-goal` widget with a compact, themed goal-card UI.

Authoritative docs:

- `.ai/issues/open/ISSUE-006-goal-widget-card-ui.md`
- `.ai/issues/fixed/ISSUE-005-goal-widget-labels-and-time-budget.md`
- `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md` for baseline runtime constraints
- `.ai/docs/pi-goal-follow-up-dependency-map.md` only for prior issue context
- `AGENTS.md`
- `.pi/extensions/goal/.sentrux/rules.toml`
- Pi docs/examples if API details are needed:
  - `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/tui.md`
  - `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
  - `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/widget-placement.ts`

Primary implementation target:

```text
.pi/extensions/goal/
  ui.ts
  widget.ts          # new
  format.ts          # only tiny reusable helper additions if needed
  .sentrux/rules.toml
```

Mission:

Implement a demo-worthy persistent goal card above the editor without changing `pi-goal` runtime behavior. The widget must look productized, remain width-safe, show budget progress only when real budgets exist, and clear completely when the goal is absent.

## Non-negotiables

- Preserve all goal runtime behavior: state replay, slash commands, model tools, continuation scheduling, telemetry, and footer status.
- Do not add goal statuses; preserve `active`, `paused`, `budgetLimited`, and `complete`.
- Do not reintroduce stale widget behavior after `/goal clear` or `clear_goal`.
- Do not fake progress bars for no-budget resources.
- Use uppercase `M` for million token formatting through existing `formatTokensCompact`.
- Keep widget rendering pure: `GoalState` in, render output out; no state mutation in widget rendering.
- Keep `ui.ts` as the sync/notification surface and move card rendering complexity into `widget.ts`.
- Update Sentrux rules so `widget.ts` is explicitly in the `surfaces` layer.
- Do not complete Solo todos without evidence comments.
- Stage and commit after ISSUE-006 is fully implemented and audited.

## Required Solo todo usage

Solo instance/project:

```bash
solo-mcp --instance solo-pi_goals todos --project 2 --status open --fields id,title,is_blocked
```

Use the existing ISSUE-006 hierarchy; do not create a duplicate hierarchy:

```toon
solo_todos[6]{role,id,title,blocked_by}
  epic,44,"ISSUE-006 — Demo-worthy pi-goal widget card UI","45,46,47,48,49"
  leaf,45,"006.1 Implement widget card renderer",""
  leaf,46,"006.2 Wire widget card into UI sync","45"
  leaf,47,"006.3 Add resource bars and no-budget display","46"
  leaf,48,"006.4 Update Sentrux rules and static validation","47"
  leaf,49,"006.5 Live/demo validation and closeout","48"
```

For each leaf todo:

1. Confirm it is unblocked before starting.
2. Read the todo body:

   ```bash
   solo-mcp --instance solo-pi_goals todo view <todo_id> --project 2 --full
   ```

3. Add a start comment with files and validation plan:

   ```bash
   solo-mcp --instance solo-pi_goals todo comment add <todo_id> --project 2 --body "Starting: <brief plan>. Validation: sentrux gate/check plus <static/render/live check>."
   ```

4. Implement only that slice unless adjacent slices must be atomic; if combining adjacent leaves, comment on every affected todo first.
5. Add a completion-evidence comment before marking complete. Include:
   - files changed;
   - commands run;
   - pass/fail results;
   - static/render/manual visual evidence;
   - acceptance criteria touched;
   - remaining limitations.
6. Complete the leaf only after evidence exists:

   ```bash
   solo-mcp --instance solo-pi_goals todo complete <todo_id> --project 2
   ```

7. Complete epic `#44` only after leaves `#45..#49`, acceptance criteria, required proofs, and closeout commit are done.

## Required Sentrux gates

Before code changes:

```bash
sentrux gate --save .pi/extensions/goal
```

After each coherent slice and before completing a Solo leaf:

```bash
sentrux gate .pi/extensions/goal
sentrux check .pi/extensions/goal
```

If Sentrux fails:

1. Treat the failure as structural feedback.
2. Fix the import direction, ownership boundary, file/function size, or layer classification cause.
3. Rerun both commands.
4. Do not complete the relevant Solo todo until the gate/check pass or the user explicitly accepts a documented tradeoff.

## Required implementation sequence

### Slice 0 — Baseline and API confirmation

Todos: preparation before `#45`.

Actions:

- Read `.ai/issues/open/ISSUE-006-goal-widget-card-ui.md` completely.
- Re-read `ui.ts`, `format.ts`, and `.sentrux/rules.toml`.
- Confirm Pi `ctx.ui.setWidget` component/factory shape from docs or examples if any API uncertainty remains.
- Save Sentrux baseline.

Evidence:

- Inline or Solo comment note with baseline command and current unblocked todo.

### Slice 1 — Todo #45: implement widget card renderer

Files:

- `.pi/extensions/goal/widget.ts` new.

Implementation requirements:

- Export a component/factory helper, for example `goalWidgetFactory(goal: GoalState)`.
- Keep helper input limited to supplied `GoalState`.
- Render a compact card with:
  - box-drawing frame where width permits;
  - status badge with icon;
  - objective line with clean ellipsis;
  - command/chip row;
  - width-safe line truncation/padding.
- Keep pure rendering helpers small enough for Sentrux function limits.
- Avoid Pi runtime mutation or session access.

Suggested status badges:

```toon
status_badges[4]{status,icon,label,theme}
  active,"🎯","active","accent/success"
  paused,"⏸","paused","warning"
  budgetLimited,"⚠","budget limited","warning/error"
  complete,"✓","complete","success"
```

Validation for #45:

- Static render helper review/snapshot if practical.
- Sentrux gate/check.
- Evidence comment on todo `#45`.

### Slice 2 — Todo #46: wire widget card into UI sync

Files:

- `.pi/extensions/goal/ui.ts`
- `.pi/extensions/goal/widget.ts`

Implementation requirements:

- Replace `widgetLines(goal)` usage with the widget factory for non-null goals.
- Preserve exact null-goal behavior:

  ```ts
  ctx.ui.setStatus(STATUS_UI_KEY, undefined);
  ctx.ui.setWidget(WIDGET_UI_KEY, undefined);
  ```

- Keep footer status and notification behavior unchanged.
- Remove dead plain-widget helper code after migration.

Validation for #46:

- Static grep proves old plain widget pattern is gone.
- Pi extension load succeeds.
- Sentrux gate/check.
- Evidence comment on todo `#46`.

### Slice 3 — Todo #47: add resource bars and no-budget display

Files:

- `.pi/extensions/goal/widget.ts`
- `.pi/extensions/goal/format.ts` only if tiny reusable helpers are needed.

Implementation requirements:

- Time row:
  - if `timeBudgetSeconds` exists, show progress bar, `used / budget`, and percentage;
  - if no time budget, show value only, e.g. `⏱ 42m`.
- Token row:
  - if `tokenBudget` exists, show progress bar, `used / budget`, and percentage;
  - if no token budget, show value only, e.g. `◈ 10M tokens`.
- Clamp percentages to `0..100` for bar fill display.
- Do not display fake `0%` bars when budgets are absent.
- Preserve uppercase `M` from `formatTokensCompact`.

Validation for #47:

- Render/static evidence for:
  - no-budget goal;
  - token-budget goal;
  - time-budget goal;
  - both-budget goal;
  - over-budget clamping.
- Sentrux gate/check.
- Evidence comment on todo `#47`.

### Slice 4 — Todo #48: Sentrux rules and static validation

Files:

- `.pi/extensions/goal/.sentrux/rules.toml`
- any validation artifact if created.

Implementation requirements:

- Add `widget.ts` to the `surfaces` layer:

  ```toml
  paths = ["ui.ts", "widget.ts", "command.ts", "tools.ts"]
  ```

- Add boundary rules only if needed by Sentrux behavior; prefer keeping `widget.ts` as a pure surface module that imports only domain formatting/types.
- Run required static/source checks:

  ```bash
  sentrux gate .pi/extensions/goal
  sentrux check .pi/extensions/goal
  ! rg 'Usage: \${formatElapsed|ctx\.ui\.setWidget\(WIDGET_UI_KEY, widgetLines' .pi/extensions/goal
  pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models >/tmp/pi-goal-widget-load.txt
  ```

- Attempt TypeScript validation if available:

  ```bash
  tsc --noEmit --target ES2022 --module ESNext --moduleResolution node --strict --skipLibCheck .pi/extensions/goal/*.ts
  ```

  If unavailable, record the exact failure (`tsc: command not found`).

Validation for #48:

- Sentrux gate/check pass with `widget.ts` included.
- Static old-widget grep passes.
- Pi extension load passes.
- Evidence comment on todo `#48`.

### Slice 5 — Todo #49: live/demo validation and closeout

Files:

- issue doc closeout if implementation is complete;
- no code unless fixing validation findings.

Required checks:

- Live/manual Pi TUI probe if available:
  - create an active no-budget goal;
  - create or simulate token/time budgeted goal;
  - inspect active, paused, budget-limited, and complete card states if feasible;
  - run `/goal clear` or `clear_goal` and verify widget disappears;
  - capture screenshot path or transcript note.
- If live TUI is not available, record limitation and provide static/render evidence instead; do not claim live validation happened.
- Update `.ai/issues/open/ISSUE-006-goal-widget-card-ui.md` with implementation closeout if fully complete, then move it to `.ai/issues/fixed/` if project convention is to close fixed issues immediately.
- Complete todo `#49` and epic `#44` only after evidence comments exist.

Commit:

```bash
git add -A
git status --short
git commit -m "feat: render pi-goal widget card"
git status --short
git log --oneline -1
```

## Required proofs from ISSUE-006

Run or explicitly record why unavailable:

```bash
sentrux gate .pi/extensions/goal
sentrux check .pi/extensions/goal
pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models >/tmp/pi-goal-widget-load.txt
! rg 'Usage: \${formatElapsed|ctx\.ui\.setWidget\(WIDGET_UI_KEY, widgetLines' .pi/extensions/goal
```

Manual proof requirement:

```text
MANUAL: run Pi TUI, create a budgeted goal, verify themed card/bars/clear behavior, attach screenshot or transcript note.
```

If manual proof cannot be done in the session, record that limitation in Solo todo `#49`, the issue closeout, and final report.

## Acceptance-criteria audit checklist

Before claiming complete, map each criterion to evidence:

```toon
acceptance_audit[10]{criterion,evidence_required}
  "themed-card-widget","screenshot/render/static source showing component factory card"
  "status-variants","render/live evidence for active paused budgetLimited complete badges"
  "objective-truncation","render/static evidence of ellipsis handling"
  "resource-rows","render/live evidence of aligned Time and Tokens rows"
  "budget-bars","render/live evidence of progress bars and percentages when budgets exist"
  "no-budget-display","render/live evidence of compact no-budget resources without fake bars"
  "width-safe","render helper evidence at normal and narrow widths"
  "clear-removes-widget","manual/mock evidence for null goal setWidget undefined"
  "runtime-unchanged","diff audit: no state/tool/lifecycle/continuation semantic changes except UI imports"
  "sentrux-pass","gate/check command output"
```

## Final report requirements

Final response must include:

- ISSUE-006 implementation summary;
- Solo todos completed and any remaining;
- files changed;
- Sentrux gate/check results;
- Pi load and TypeScript validation results;
- static/render/manual widget evidence;
- known limitations, especially if live TUI proof was unavailable;
- commit hash;
- final `git status --short` result.
```

# ISSUE-011 — Goal widget component/layout strategy

Status: open
Priority: P2
Owner: unassigned
Created: 2026-05-08
Promoted: 2026-05-10
Kind: feature
Next best session: implement deterministic bordered/compact goal widget rendering
Next best session rationale: Pi TUI strategy is now locked; implementation can harden the current widget without searching for a nonexistent card component.
Target repo roots: `~/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Unblocks: `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md`
Related: `.ai/issues/fixed/ISSUE-025-goal-line-breaks-widget-rendering.md`

## Problem

The current `pi-goal` widget is a custom renderer that returns terminal lines for `ctx.ui.setWidget(..., { placement: "aboveEditor" })`. It uses Pi TUI width helpers, but it still has unresolved layout/card terminology and a narrow-width threshold bug:

- the implementation calls framed mode a `card`, but current Pi TUI exports do not provide a generic Card component;
- `MIN_CARD_WIDTH = 28` is too small for the `budget-limited` header if full status labels are kept;
- below the viable framed width, the widget should switch cleanly to compact unframed rows rather than truncating border/header chrome;
- future issues such as progress estimates need a stable widget layout contract before adding more status data.

## Grounded findings

Workflow artifacts:

- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/00-request.md`
- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/01-protocol-read.md`
- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/02-grounded-research.md`
- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/03-design-lock.md`
- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/04-proof-threat-model.md`
- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/05-issue-writeback.md`
- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/06-final-audit.md`
- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/07-acceptance-traceability.md`
- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/08-implementation-handoff.md`
- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/09-stack-continuation-note.md`

Key evidence logs:

- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/raw/tui-component-source-excerpts.log`
- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/raw/framed-width-thresholds.log`
- `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/raw/reference-inventory-pre.log`

Findings:

- `@earendil-works/pi-tui` exports `Component`, `Container`, `Box`, `Text`, `TruncatedText`, `visibleWidth`, and `truncateToWidth`.
- No generic `Card` or side-bordered card component is exported by pi-tui.
- Pi coding-agent exports `DynamicBorder`, but it renders only a horizontal line and is not a full card/frame.
- `Box` and `Container` are useful composition primitives but do not solve side borders or header thresholds for this fixed-height status widget.
- Current framed header minimums using `visibleWidth` are: active 25, paused 24, budget-limited 32, complete 26.

## Locked design

Implement this as a **Pi TUI `Component`-contract bordered text widget** with deterministic compact fallback.

Required design choices:

1. Use the public `Component` contract from `@earendil-works/pi-tui` for the widget factory/component return type.
2. Keep rendering pure and deterministic through `renderGoalWidget(goal, theme, width)`.
3. Continue using `visibleWidth` and `truncateToWidth` for all width-sensitive operations.
4. Do not depend on private/internal Pi component paths.
5. Do not rewrite the widget around `Box`, `Text`, or `Container` unless a specific use reduces code and keeps fixed row counts.
6. Rename implementation/user-facing terminology from `card` to `frame`, `framed`, or `bordered widget`.

## Layout specification

### Framed mode

- `MIN_FRAMED_WIDTH = 32`
- `MAX_FRAMED_WIDTH = 72`
- if `width < MIN_FRAMED_WIDTH`, render compact mode;
- if `width >= MIN_FRAMED_WIDTH`, render framed mode with `frameWidth = Math.min(MAX_FRAMED_WIDTH, width)`;
- top and bottom border lines must not contain ellipsis;
- all statuses must preserve their full labels in framed mode: `active`, `paused`, `budget-limited`, `complete`;
- every rendered line must satisfy `visibleWidth(line) <= Math.min(width, MAX_FRAMED_WIDTH)`.

### Compact mode

For widths below `32`, render unframed rows:

1. `<icon> <status-label> <objective excerpt>`
2. `⏱ <used>[/<budget>]  ◈ <used>[/<budget>]`
3. `floor none` or compact configured floor parts, including both time and token floors when both are configured
4. command hints without the `Commands:` prefix

Compact rows may truncate content with an ellipsis, but compact mode must never render partial borders or framed chrome.

## Implementation plan

1. Update `.pi/extensions/goal/widget.ts` constants and names:
   - `MIN_CARD_WIDTH` → `MIN_FRAMED_WIDTH = 32`
   - `MAX_CARD_WIDTH` → `MAX_FRAMED_WIDTH = 72`
   - `cardWidth` → `frameWidth`
2. Type the widget as a public Pi TUI `Component` instead of a local duplicate shape.
3. Keep `GoalWidget.render(width)` delegating to `renderGoalWidget(goal, theme, width)`.
4. Update compact floor rendering so both minimum floors are visible when both are configured, subject to truncation.
5. Add or update deterministic render validation under `.ai/validation/`.
6. Update README/docs if they mention card semantics.
7. Run required proofs and record logs under the issue workflow artifact directory.

## Acceptance criteria

- [ ] No implementation/user-facing code uses misleading `card` terminology for the goal widget.
- [ ] Framed mode starts only at width `32` or greater.
- [ ] Widths below `32` render compact unframed rows.
- [ ] Top/bottom border lines never truncate with ellipsis in framed mode.
- [ ] Render probes cover `active`, `paused`, `budgetLimited`, and `complete` at narrow and normal widths.
- [ ] All rendered lines are ANSI-/emoji-visible-width safe.
- [ ] Compact mode includes configured minimum floor information without broken borders.
- [ ] `npm run quality:goal` passes.

## Proof threat model

See `.ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/04-proof-threat-model.md`.

```toon
required_proofs[]:
  - id: sentrux_gate_goal
    command: sentrux gate --save .pi/extensions/goal
    must_pass: true
    evidence: .ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/raw/sentrux-gate-impl.log
  - id: widget_render_probe
    command: node .ai/validation/goal-widget-render-probe.mjs
    covers: [active, paused, budgetLimited, complete, widths_8_12_20_24_28_31_32_33_72_100]
    assertions: [visible_width_lte_render_width, compact_below_32, framed_at_or_above_32, no_border_ellipsis_in_framed_mode]
    must_pass: true
    evidence: .ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/raw/widget-render-probe.log
  - id: static_card_language_probe
    command: rg -n "MIN_CARD_WIDTH|MAX_CARD_WIDTH|card" .pi/extensions/goal README.md .ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md
    expected: no implementation/user-facing card terminology except explicit historical/context notes
    must_pass: true
    evidence: .ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/raw/static-card-language-probe.log
  - id: quality_goal
    command: npm run quality:goal
    must_pass: true
    evidence: .ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/raw/quality-goal.log
  - id: artifact_visibility
    command: git status --short --untracked-files=all && git check-ignore -v .ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/00-request.md || true
    must_pass: true
    evidence: .ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/raw/artifact-visibility.log
  - id: live_probe_widget_scope
    command: follow .ai/docs/pi-goals-live-probe-testing.md or record deterministic-coverage skip reason
    must_pass: true
    evidence: .ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/raw/live-probe-widget-scope.log
```

## Non-goals

- Do not implement progress percentages; see `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md`.
- Do not design a subgoal/parallel dashboard in this issue.
- Do not introduce wrapping prose in the persistent widget first pass.
- Do not import Pi's internal theme singleton.

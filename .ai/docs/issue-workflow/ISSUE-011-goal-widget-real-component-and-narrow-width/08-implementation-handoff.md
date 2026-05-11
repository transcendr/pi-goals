# 08 — Implementation handoff

Issue: ISSUE-011 — goal widget component/layout strategy
Date: 2026-05-10

## Recommended first implementation sequence

1. Open `.pi/extensions/goal/widget.ts`.
2. Replace local component-shape duplication with the public `Component` type from `@earendil-works/pi-tui`.
3. Rename frame constants and locals:
   - `MIN_CARD_WIDTH` → `MIN_FRAMED_WIDTH = 32`
   - `MAX_CARD_WIDTH` → `MAX_FRAMED_WIDTH = 72`
   - `cardWidth` → `frameWidth`
4. Keep existing pure helper structure; do not introduce a large component hierarchy.
5. Update compact floor rendering to include both configured floors when both are set.
6. Add `.ai/validation/goal-widget-render-probe.mjs` or an equivalent deterministic probe.
7. Run required proofs and record logs in this issue workflow directory.

## Probe fixture requirements

The render probe should build four `GoalState` fixtures:

- active, with budgets and both completion floors configured;
- paused, with no budgets;
- budgetLimited, with token/time budget pressure fields sufficient for label rendering;
- complete, with budgets consumed.

Probe widths:

- `8`, `12`, `20`, `24`, `28`, `31`, `32`, `33`, `72`, `100`.

Assertions:

- for every line, `visibleWidth(line) <= Math.min(width, MAX_FRAMED_WIDTH)` when framed, and `visibleWidth(line) <= width` when compact;
- widths `< 32` do not contain `╭`, `╮`, `╰`, `╯`, or side border `│`;
- widths `>= 32` contain framed top and bottom borders;
- framed top/bottom border lines contain no `…`;
- budget-limited at width `32` keeps full `budget-limited` label.

## Avoid

- importing Pi's internal `theme` singleton;
- using private `dist/modes/interactive/components/*` imports from Pi;
- wrapping status rows with `Text` if it changes row count unpredictably;
- accepting a proof that only checks normal terminal width.

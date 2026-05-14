# 02 — Grounded research

Issue: ISSUE-011 — goal widget component/layout strategy
Date: 2026-05-10

## Current `pi-goal` widget state

Current implementation evidence from `.pi/extensions/goal/widget.ts`:

- `goalWidgetFactory()` returns a custom object with `render(width): string[]` and `invalidate()`.
- `renderGoalWidget()` has `MIN_CARD_WIDTH = 28` and `MAX_CARD_WIDTH = 72`.
- widths below `MIN_CARD_WIDTH` use `compactLines()`.
- framed output is handcrafted with `topBorder()`, `contentLine()`, and `bottomBorder()`.
- framed output currently uses card terminology in constants even though it is not backed by a card component.

Source evidence: `raw/tui-component-source-excerpts.log`.

## Pi TUI public API facts

From `@earendil-works/pi-tui` public types:

- `Component` is the core rendering contract: `render(width): string[]`, `invalidate(): void`.
- `Container`, `Box`, `Text`, `TruncatedText`, `visibleWidth`, and `truncateToWidth` are public exports.
- `Box` provides padding/background and child rendering, not a bordered card.
- `Text` wraps text, which is useful for prose but not ideal for a fixed-height status widget whose rows must stay predictable near the editor.
- `Container` composes children vertically and does not add frame semantics.

Source evidence:

- `node_modules/@earendil-works/pi-tui/dist/index.d.ts`
- `node_modules/@earendil-works/pi-tui/dist/tui.d.ts`
- `node_modules/@earendil-works/pi-tui/dist/components/box.d.ts`
- `node_modules/@earendil-works/pi-tui/dist/components/text.d.ts`
- `node_modules/@earendil-works/pi-tui/dist/components/truncated-text.d.ts`

## Pi coding-agent component facts

Pi coding-agent exports `DynamicBorder` and `BorderedLoader`, but neither is a general bordered/card widget:

- `DynamicBorder.render(width)` returns a single full-width horizontal line of `─` characters.
- `BorderedLoader` composes `DynamicBorder` with loader/spacer/text for async custom UI; it is loader-specific.
- Pi docs recommend `DynamicBorder` for framing selector/custom UI, not as a complete side-bordered card.

Source evidence:

- `~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/components/dynamic-border.js`
- `~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/components/bordered-loader.js`
- `~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/tui.md`
- examples: `plan-mode/index.ts`, `widget-placement.ts`, `preset.ts`, `qna.ts`, `custom-footer.ts`

## Negative finding: no generic card component

Search across pi-tui public exports and components found no exported `Card`, generic `Border`, or side-bordered card component. Border-related hits are limited to component-specific internals like Markdown tables/code blocks and Editor borders.

Evidence: `raw/tui-component-source-excerpts.log`.

## Width threshold research

Using `visibleWidth` from `@earendil-works/pi-tui`, the current framed header needs these minimum widths if it keeps full status labels and at least one horizontal fill character:

- active: 25
- paused: 24
- budget-limited: 32
- complete: 26

Evidence: `raw/framed-width-thresholds.log`.

Current `MIN_CARD_WIDTH = 28` is therefore unsafe for `budgetLimited` if the label remains `budget-limited`. This explains the unresolved narrow-width fork in the refine issue.

## Reference inventory

Pre-promotion references to the refine path were found in canonical docs and downstream issue docs. Non-raw canonical references should be updated to the open issue path during promotion; raw logs should remain immutable evidence.

Evidence: `raw/reference-inventory-pre.log`.

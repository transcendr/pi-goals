# 03 — Design lock

Issue: ISSUE-011 — goal widget component/layout strategy
Date: 2026-05-10

## Locked decision

Implement ISSUE-011 as a **real Pi TUI `Component`-contract bordered text widget**, not as a nonexistent generic card component.

The widget should keep the existing pure render-function architecture, but make the component contract explicit and remove misleading card terminology:

- import/use the public `Component` type from `@earendil-works/pi-tui` for the widget factory return shape;
- continue using `visibleWidth` and `truncateToWidth` for ANSI-/emoji-safe width handling;
- do not introduce `Box`, `Text`, or `Container` unless they reduce complexity in a specific subpart;
- do not import Pi's internal `theme`; only use the theme provided by `ctx.ui.setWidget`;
- rename user/developer language from `card` to `bordered widget`, `frame`, or `framed mode`.

## Why not a built-in Card/Box/Container design?

Rejected options:

1. **Use a generic card component** — rejected because current pi-tui exports do not include one.
2. **Use `DynamicBorder` as the whole frame** — rejected because it provides horizontal borders only and cannot render side borders/content rows by itself.
3. **Wrap everything in `Box`/`Text`/`Container`** — rejected for the first pass because the goal widget is a compact status surface with fixed rows. `Text` wrapping would make height less predictable, and `Box`/`Container` do not solve side borders/header thresholding.
4. **Compact-only rendering** — rejected because framed mode remains useful when there is enough width and already has working structure after threshold fixes.

## Width and layout rules

### Framed mode

Use a single conservative framed threshold:

- `MIN_FRAMED_WIDTH = 32`
- `MAX_FRAMED_WIDTH = 72`
- if `width < MIN_FRAMED_WIDTH`, render compact unframed rows;
- if `width >= MIN_FRAMED_WIDTH`, render framed rows with `frameWidth = Math.min(MAX_FRAMED_WIDTH, width)`;
- top and bottom border lines must never use ellipsis;
- framed mode must preserve full labels for all statuses, including `budget-limited`;
- every rendered line must satisfy `visibleWidth(line) <= Math.min(width, MAX_FRAMED_WIDTH)`.

### Compact mode

For widths below `32`, render unframed rows only. Exact first-pass rows:

1. status/objective row: `<icon> <status-label> <objective excerpt>` truncated to terminal width;
2. usage row: `⏱ <used>[/<budget>]  ◈ <used>[/<budget>]` truncated to terminal width;
3. floor row: `floor none`, `floor ⏱ <used>/<min>`, `floor ◈ <used>/<min>`, or both floor parts when both floors are configured, truncated to terminal width;
4. command row: command hints without the `Commands:` prefix, truncated to terminal width.

Compact mode may truncate content with an ellipsis, but it must not render broken borders or claim to be framed.

## Implementation seams

Expected files:

- `.pi/extensions/goal/widget.ts`
- possibly `.pi/extensions/goal/format.ts` only if wording helpers need small adjustments
- `README.md` only if user-facing widget wording mentions card/framed thresholds
- new deterministic validation probe under `.ai/validation/` if no suitable probe exists

## Non-goals

- No progress percentage implementation; that remains ISSUE-014.
- No subgoal/parallel dashboard redesign; those are separate issues.
- No multi-line wrapping in the persistent widget first pass.
- No dependency on Pi internal/private component paths.

## Locked outcome

The open issue should ask implementers to harden the current widget, not replace it with an unavailable component. The success condition is deterministic, width-safe rendering across statuses and terminal widths.

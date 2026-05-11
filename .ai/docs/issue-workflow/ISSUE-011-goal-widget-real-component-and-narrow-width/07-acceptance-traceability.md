# 07 — Acceptance traceability

Issue: ISSUE-011 — goal widget component/layout strategy
Date: 2026-05-10

## Traceability matrix

| Open issue acceptance criterion | Design / proof source | Executor proof expected |
|---|---|---|
| No misleading `card` terminology in implementation/user-facing docs | `03-design-lock.md`, open issue “Locked design” | `static_card_language_probe` |
| Framed mode starts only at width `32` or greater | `02-grounded-research.md` width calculation; `03-design-lock.md` | `widget_render_probe` widths 31/32/33 |
| Widths below `32` render compact unframed rows | `03-design-lock.md` compact mode spec | `widget_render_probe` widths 8/12/20/24/28/31 |
| Top/bottom border lines never truncate with ellipsis | `04-proof-threat-model.md` false-green risks | `widget_render_probe` framed border assertions |
| Render probes cover all statuses | `04-proof-threat-model.md` proof rows | `widget_render_probe` statuses active/paused/budgetLimited/complete |
| All lines are visible-width safe | Pi TUI docs and `visibleWidth` research | `widget_render_probe` `visibleWidth(line) <= expectedWidth` |
| Compact mode includes configured floor info | `03-design-lock.md` compact row spec | `widget_render_probe` fixture with time+token floors |
| `npm run quality:goal` passes | project quality protocol | `quality_goal` proof |

## Executor notes

The main implementation trap is treating `string.length` as terminal width. All proof scripts should import/use `visibleWidth` from `@earendil-works/pi-tui` for assertions.

The second implementation trap is proving only the common active status. `budgetLimited` is the forcing case for the threshold because its `budget-limited` label requires width 32 with the current header structure.

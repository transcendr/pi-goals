# 05 — Issue writeback

Issue: ISSUE-011 — goal widget component/layout strategy
Date: 2026-05-10

## Canonical writeback

Promoted canonical issue draft written to:

- `.ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md`

Source refine issue to remove after reference cleanup:

- `.ai/issues/refine/ISSUE-011-goal-widget-real-component-and-narrow-width.md`

## Locked deltas from refine draft

The refine draft had five open design questions. They are now resolved as follows:

| Refine question | Locked answer |
|---|---|
| Does Pi TUI have a real bordered/card component? | No generic public Card/side-bordered component was found. |
| Use `Box`/`Text`/`Container`, custom border rendering, or compact-only? | Keep a public `Component`-contract custom bordered text widget; use pi-tui width utilities; do not force Box/Text/Container. |
| Stop claiming “card”? | Yes. Use framed/bordered widget terminology. |
| Minimum framed width per status? | Use one conservative `MIN_FRAMED_WIDTH = 32`, sufficient for `budget-limited`. |
| Exact compact layout? | Four unframed rows: status/objective, usage, floors, commands. |

## Execution-ready properties added

- explicit target files and implementation plan
- acceptance criteria with status/width coverage
- proof threat model
- TOON-style `required_proofs[]`
- live probe stance for UI rendering changes
- artifact links back to this workflow directory

## Promotion cleanup still required

Before completing this refinement goal:

- update non-raw references from `.ai/issues/refine/ISSUE-011-goal-widget-real-component-and-narrow-width.md` to `.ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md` where they point to canonical issue location;
- remove the old refine issue file;
- run final quality and artifact visibility checks;
- record closeout in `06-final-audit.md`.

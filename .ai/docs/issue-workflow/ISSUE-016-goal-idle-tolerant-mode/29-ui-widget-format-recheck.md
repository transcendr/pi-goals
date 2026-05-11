# 29 — UI/widget/format source recheck

## Sources inspected

- `.pi/extensions/goal/ui.ts`
- `.pi/extensions/goal/widget.ts`
- `.pi/extensions/goal/format.ts`

## Findings

- `ui.ts` delegates footer and summary strings to `format.ts`, and widget rendering to `widget.ts`.
- `widget.ts` renders status, objective, time, token, floor, and command hints. There is no active-waiting row.
- `format.ts` maps `active` to generic `Pursuing goal` and `/goal pause, /goal clear`; there is no active-but-waiting wording.

## Implementation requirement

Add compact active-waiting rendering without introducing a new public status:

- footer/status example: `Goal waiting: <reason> (nudge in 90s)` or compact equivalent;
- summary line: `Auto-continue: idle nudge after 90s — <reason>`;
- widget line: replace or supplement floor line only if width is constrained enough; avoid bloating the card;
- command hint remains compatible (`/goal pause`, `/goal clear`), and may mention update/resume only if implemented.

## Proof impact

Deterministic probes should assert strings or helper outputs for immediate, idle_nudge, and manual modes so UI/tool visibility cannot silently regress.

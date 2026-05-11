# 35 — Format source recheck

## Source inspected

- `.pi/extensions/goal/format.ts`

## Finding

Formatting helpers currently derive footer/status/summary text from top-level status, objective, budget, token/time usage, and completion floors. There is no helper for subgoal counts, active child labels, or unresolved child blockers.

## Impact

ISSUE-015 implementation should add focused formatting helpers for subgoal summary text rather than embedding ad-hoc child rendering in `ui.ts`, `widget.ts`, `tool-results.ts`, and monitor output.

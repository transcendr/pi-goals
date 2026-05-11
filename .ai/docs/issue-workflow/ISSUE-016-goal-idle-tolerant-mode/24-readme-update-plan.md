# 24 — README update plan

## Source inspected

- `README.md`

## Finding

README currently documents goal creation/control, queue, natural-language management, completion floors, reusable prompts, churn monitoring, and compact widget integration. It does not document active idle waiting or delayed nudges.

## Implementation closeout requirement

After implementing ISSUE-016, add README documentation covering:

- `immediate`, `idle_nudge`, and `manual` auto-continuation modes;
- when to use idle-nudge vs pause;
- wait reason and delayed nudge behavior;
- stale-guard behavior at a high level;
- model tool parameters and UI wording.

## Impact

No README edit is made during this planning promotion pass.

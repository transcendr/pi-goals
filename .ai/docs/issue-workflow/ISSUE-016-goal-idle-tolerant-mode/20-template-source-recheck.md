# 20 — Template source recheck

## Source inspected

- `.pi/extensions/goal/templates.ts`

## Finding

Template resolution returns objective, flags, and args for top-level goal creation. It does not carry goal runtime policy metadata today.

## Impact

If `create_goal_from_template` accepts idle policy fields, those should remain tool parameters around the resolved objective rather than embedded in template body text. Template semantics should not need to change for the first idle-nudge pass.

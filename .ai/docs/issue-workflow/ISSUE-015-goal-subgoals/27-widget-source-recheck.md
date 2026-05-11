# 27 — Widget source recheck

## Source inspected

- `.pi/extensions/goal/widget.ts`

## Finding

The widget currently has fixed rows for objective, time, tokens, floor, and command hints, with compact mode already constrained to four truncated lines. It does not have spare vertical space for verbose child details.

## Impact

ISSUE-015's compact rendering boundary remains correct: show at most a short current-child/count row in the widget/footer and keep detailed child lists in tool output. Implementation should avoid widening the widget or regressing no-subgoal rendering.

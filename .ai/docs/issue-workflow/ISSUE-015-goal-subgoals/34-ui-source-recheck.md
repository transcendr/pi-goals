# 34 — UI source recheck

## Source inspected

- `.pi/extensions/goal/ui.ts`

## Finding

UI sync currently passes the full top-level `GoalState` to `footerStatusText()` and `goalWidgetFactory()`. Notifications and summaries also consume only top-level goal formatting helpers.

## Impact

ISSUE-015 implementation can preserve the UI API shape if subgoal data is normalized onto `GoalState`, but formatting helpers must learn how to render compact active-child state. No separate widget state channel is required for the first pass.

# 24 — State source recheck

## Source inspected

- `.pi/extensions/goal/state.ts`

## Finding

State replay flows through `replayGoalState()` → `entryToGoalEvent()` → `applyEvent()` → `toGoalState()`. `toGoalState()` currently accepts a broad object once `goalId`, `objective`, and `status` are strings, then spreads it into `GoalState` while normalizing only wrap-up floors.

## Impact

ISSUE-015 implementation should not rely on the broad spread alone for child state safety. Add explicit subgoal normalization in or near `toGoalState()` so replayed child fields are bounded, status-validated, and safe for completion gating/UI.

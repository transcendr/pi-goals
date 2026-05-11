# 23 — Floor source recheck

## Source inspected

- `.pi/extensions/goal/floor.ts`

## Finding

Completion floors are independent from auto-continuation scheduling. They block completion before minimum work is met but do not decide when to wake an idle goal.

## Impact

Idle-nudge implementation should not reuse floor fields or floor completion-deferred steering for wait policy. Floors can still apply normally if the agent tries to complete an idle-nudge goal early.

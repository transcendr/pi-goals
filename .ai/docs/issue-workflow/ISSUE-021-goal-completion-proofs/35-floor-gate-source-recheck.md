# 35 — Floor gate source recheck

## Source inspected

- `.pi/extensions/goal/completion-gate.ts`

## Finding

`decideGoalCompletion()` only evaluates completion gates when `candidateGoal.status === "complete"`; otherwise it allows the update. This confirms ISSUE-021's planned proof-blocking seam should also live on the completion path and return the current active goal when blocked, mirroring floor completion behavior.

## Impact

No design change. The existing issue's high-risk seam remains correct: proof-blocked completion must not return a completed candidate goal, or lifecycle telemetry can false-green the turn.

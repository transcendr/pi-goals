# 14 — Non-implementation boundary

## Boundary

This stack item promoted and tightened the ISSUE-015 planning document. It did not implement nested subgoal runtime code.

## Files intentionally not created yet

- `.pi/extensions/goal/subgoal-tools.ts`
- `.ai/validation/goal-subgoal-replay-probe.mjs`
- `.ai/validation/goal-subgoal-completion-block-probe.mjs`
- `.ai/validation/goal-subgoal-template-child-probe.mjs`
- `.ai/validation/goal-subgoal-live-probe-closeout.md`

## Why this matters

The open issue's required proof commands reference future implementation deliverables. Their absence is expected before the implementation pass and should not be interpreted as a planning/promotion failure.

## Stop point

The next session for ISSUE-015 should implement and validate nested child subgoals from `.ai/issues/open/ISSUE-015-goal-subgoals.md`, not further refine the issue unless new contradictory code evidence appears.

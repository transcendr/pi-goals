# 17 — Non-implementation boundary

## Boundary

This goal refined and promoted ISSUE-024. It did not implement `/goal audit`.

## Source files read but not intentionally edited

- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/completion-gate.ts`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/constants.ts`
- `.pi/extensions/goal/tool-results.ts`
- `.pi/extensions/goal/model-output.ts`
- `.pi/extensions/goal/monitor.ts`
- `.pi/extensions/goal/monitor-prompts.ts`

## Files intentionally changed by this planning goal

- Added `.ai/issues/open/ISSUE-024-goal-audit-command.md`.
- Removed `.ai/issues/refine/ISSUE-024-goal-audit-command.md`.
- Added visible workflow artifacts under `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/`.
- Updated stale ISSUE-024 references in promoted/related issue docs and leverage-order docs.

## Reason

Keeping implementation out of the planning goal avoids partial feature code without the required deterministic and live probes.

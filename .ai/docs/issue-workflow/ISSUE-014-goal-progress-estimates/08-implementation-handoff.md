# 08 — Implementation handoff

Issue: ISSUE-014 — agent-estimated goal progress percentage
Date: 2026-05-10

## Recommended implementation order

1. Add optional progress fields to `.pi/extensions/goal/types.ts`.
2. Extend `.pi/extensions/goal/state.ts` parsing so replay preserves only valid progress fields:
   - integer `progressPercent` in `0..100`;
   - optional non-empty `progressNote`;
   - positive integer `progressUpdatedAt`.
3. Extend `.pi/extensions/goal/tools.ts`:
   - add `progress_percent` / `progress_note` params;
   - normalize/validate percent, note, clear, note-only, and no-op behavior;
   - classify update changes as progress-only vs substantive.
4. Extend `.pi/extensions/goal/tool-results.ts` and `.pi/extensions/goal/format.ts` for summary/footer output.
5. Extend `.pi/extensions/goal/widget.ts` after or alongside ISSUE-011 implementation so progress rows obey `MIN_FRAMED_WIDTH = 32` / compact mode.
6. Extend `.pi/extensions/goal/lifecycle.ts` so progress-only updates do not increment productive progress counters.
7. Add validation probes named in the required proof block.
8. Update README wording for progress metadata.

## Suggested update metadata shape

One simple implementation path:

- extend internal `GoalUpdateResult` with `changeKinds: Array<"status" | "objective" | "budget" | "floor" | "progress">`;
- include a public tool detail such as `goal_update: { change_kinds: string[], progress_only: boolean, counts_as_turn_progress: boolean }`;
- update `noteGoalUpdateResult()` to skip `progressCount++` when `progress_only` is true.

This avoids guessing in lifecycle and provides inspectable proof output for agents.

## Edge cases to cover

- `progress_note` before any percent exists: reject.
- same percent/note as current state: reject as no-op.
- `progress_percent: null` plus `progress_note`: clear the entire estimate; do not keep orphan notes.
- `status: complete` plus progress fields: completion gates still decide completion.
- budget-limited and paused goals can still carry progress estimates, but progress does not resume them.
- progress note truncation should be validation/rejection, not silent destructive truncation, unless implementation deliberately records a clear warning.

## Coordination with ISSUE-011

If ISSUE-011 has not been implemented yet, either implement its width constants first or make the progress render probe assert against the final combined expected layout. Do not add progress rows on top of the old `MIN_CARD_WIDTH = 28` behavior without addressing the dependency.

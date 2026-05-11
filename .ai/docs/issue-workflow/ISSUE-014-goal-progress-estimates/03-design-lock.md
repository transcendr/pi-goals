# 03 — Design lock

Issue: ISSUE-014 — agent-estimated goal progress percentage
Date: 2026-05-10

## Locked design summary

Add **optional agent-updated progress estimates as user-visible goal state**, not telemetry and not a separate first-pass event stream.

Progress estimates are advisory metadata:

- hidden until explicitly set;
- updated through `update_goal`;
- persisted/replayed branch-locally as part of `GoalState`;
- rendered in footer/widget/summary only when present;
- never accepted as completion proof;
- progress-only updates do not count as productive work for no-progress safety counters.

## Locked schema

Add optional progress fields to `GoalState`:

```typescript
progressPercent?: number;
progressNote?: string;
progressUpdatedAt?: number;
```

Rationale:

- flat optional fields match the existing small `GoalState` shape and avoid a nested migration just for first release;
- `progressUpdatedAt` enables later stale-age display without requiring expiry now;
- optional fields keep hidden-by-default behavior simple: no fields means no progress UI.

## `update_goal` contract

Add tool params:

- `progress_percent?: number | null`
- `progress_note?: string | null`

Validation:

- `progress_percent` must be an integer `0..100` or `null`;
- `progress_note` when provided must trim to at most 160 characters;
- empty string or `null` clears the note but keeps the percent if `progress_percent` is not `null`;
- `progress_percent: null` clears the entire estimate (`progressPercent`, `progressNote`, `progressUpdatedAt`);
- `progress_note` without an existing or same-call `progress_percent` is rejected because a note without a percentage has no display anchor;
- no-op progress updates are rejected.

Semantics:

- `progress_percent: 100` is allowed but remains an estimate, rendered as `est 100%` and never changing completion status;
- same-call `status: complete` still goes through existing completion gates and floors;
- floor edits and status completion remain separate as already required by current code.

## UI rendering

Progress is hidden by default.

When set:

- footer status appends compact `est <percent>%` after existing usage text where space/wording allows;
- `/goal` summaries and tool output include `Progress estimate: <percent>%` plus ` — <note>` when note exists;
- widget framed mode adds one conditional row after the objective row: `↗ est <percent>%` plus the note when it fits;
- widget compact mode adds one conditional row after the status/objective row: `↗ est <percent>%` plus the note when it fits;
- all widget rendering must inherit ISSUE-011 visible-width and framed/compact rules.

No stale/expired visual state in first release. `progressUpdatedAt` is stored and exposed for future use, but the UI does not expire estimates automatically.

## Safety/no-progress semantics

Progress-only `update_goal` calls must **not** count as productive work for no-progress safety counters.

Implementation consequence:

- `update_goal` result details should include enough structured metadata for lifecycle to distinguish progress-only updates from substantive goal updates;
- lifecycle should increment `progressCount` for status/objective/budget/floor changes, but not for progress-only estimate changes;
- status complete still sets `completedGoal` only through existing status handling.

## Rejected alternatives

| Alternative | Rejection reason |
|---|---|
| Store progress in telemetry | Telemetry is internal runtime accounting; user-facing estimate should replay with goal state and appear in `get_goal` details. |
| Separate progress event stream first | Adds replay complexity without first-pass need; `GoalState` update events already provide branch-local persistence and reactive UI. |
| Require note for every update | Useful but too heavy for quick estimates; optional note with max length preserves low-friction UX. |
| Restrict active goals to `0..99` | Adds confusing validation edge cases; `100%` remains visibly labeled as an estimate and completion gates remain authoritative. |
| Expire stale estimates automatically | Requires time-based UI semantics and replay/display questions that are not needed for first release. Store timestamp for later. |
| Count progress-only estimates as productive work | Would let an agent avoid no-progress safety by changing subjective estimates without real task progress. |

## Execution-ready conclusion

The meaningful product/API forks are now locked. Implementation can proceed without deciding state ownership, range semantics, UI placement, or safety-counter meaning.

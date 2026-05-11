# 27 — Entrypoint and schema recheck

## Sources inspected

- `.pi/extensions/goal/index.ts`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/tools.ts`

## Findings

- `index.ts` wires the continuation scheduler into command and model-tool runtimes; it is the seam where new delayed-nudge scheduler/canceller dependencies must remain simple.
- `types.ts` currently has `GoalStatus`, `GoalState`, `ContinuationReason`, `ContinuationSkipReason`, steering details, telemetry, and monitor report types, but no idle policy union or wait metadata.
- `tools.ts` TypeBox parameter schemas for `create_goal`, `create_goal_from_template`, and `update_goal` include budget/floor fields but no idle policy fields.

## Implementation implications

- Add a small `GoalAutoContinueMode` union near `GoalStatus` and optional fields directly on `GoalState`.
- Extend `ContinuationSkipReason` only if the implementation needs explicit observability for `manual`/`idle_nudge`; do not report intentional suppression as a safety/no-progress skip.
- Extend TypeBox schemas for create/update/template tools with bounded fields:
  - `auto_continue_mode?: "immediate" | "idle_nudge" | "manual"`
  - `idle_nudge_after_seconds?: number | null` on update
  - `idle_wait_reason?: string | null` on update
- Preserve entrypoint modularity by keeping timer logic inside `continuation.ts` rather than adding policy branching in `index.ts`.

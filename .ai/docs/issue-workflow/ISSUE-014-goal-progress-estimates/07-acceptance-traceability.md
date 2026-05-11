# 07 — Acceptance traceability

Issue: ISSUE-014 — agent-estimated goal progress percentage
Date: 2026-05-10

## Traceability matrix

| Acceptance criterion | Locked design source | Required proof |
|---|---|---|
| Unset goals show no progress placeholder | `03-design-lock.md` hidden-by-default UI | `progress_render_probe` unset fixture |
| `progress_percent: 35` persists and updates UI | `03-design-lock.md` `GoalState` ownership and UI behavior | `progress_update_validation_probe`, `progress_replay_probe`, `progress_render_probe` |
| Optional note stores/renders within length bounds | `03-design-lock.md` update API validation | `progress_update_validation_probe`, `progress_render_probe` |
| Invalid values are rejected | `03-design-lock.md` validation rules | `progress_update_validation_probe` |
| `progress_percent: null` clears estimate | `03-design-lock.md` update API clear semantics | `progress_replay_probe`, `progress_render_probe` |
| `progress_percent: 100` remains advisory | `03-design-lock.md` advisory-only semantics | `progress_completion_boundary_probe` |
| Progress-only updates do not reset no-progress safety | `03-design-lock.md` safety/no-progress semantics | `progress_safety_counter_probe` |
| Widget respects ISSUE-011 widths/statuses | ISSUE-011 dependency + `03-design-lock.md` UI behavior | `progress_render_probe` |
| Project quality passes | `AGENTS.md` quality gate | `quality_goal` |

## Fake-green guardrails

The implementation should not accept a green result that only checks TypeScript shape. At least one behavior probe must execute helper paths or tool/runtime seams for each of update validation, replay, completion boundary, safety accounting, and rendering.

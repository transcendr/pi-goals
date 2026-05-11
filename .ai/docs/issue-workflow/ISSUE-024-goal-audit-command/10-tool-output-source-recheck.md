# 10 — Tool output source recheck

## Source inspected

- `.pi/extensions/goal/tool-results.ts`

## Finding

`ToolDetails` currently carries goal, telemetry, budget/floor data, templates, errors, completion floor deferral metadata, and no-more-valuable-work reasons. There is no audit metadata field.

## Implementation impact

`audit_goal` should return structured details that identify an audit was requested/sent, including goal id, status at audit time, prompt id/message type, and optional persisted audit record id. Do not fake completion details or reuse `completion_blocked_by_floor`.

## Proof implication

`audit_tool_probe` should inspect tool details or static source to prove audit has an audit-specific result path and does not masquerade as completion/update output.

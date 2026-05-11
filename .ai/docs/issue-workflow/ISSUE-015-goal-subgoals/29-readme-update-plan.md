# 29 — README update plan

## Source inspected

- `README.md`

## Finding

The README currently documents features through queue, natural-language goal management, completion floors, reusable prompts, churn monitor, and compact widget integration. It does not document subgoals because ISSUE-015 is not implemented yet.

## Implementation closeout requirement

When ISSUE-015 is implemented, update README to add a concise section covering:

- one active parent goal with nested child subgoals;
- model tools for listing/creating/entering/updating/removing subgoals;
- template-backed child workflows staying nested rather than creating top-level goals;
- parent completion blocking on unresolved blocking children;
- compact widget/tool-output behavior.

## Impact

No README edit is made in the planning promotion pass. The open issue's README checklist item remains valid.

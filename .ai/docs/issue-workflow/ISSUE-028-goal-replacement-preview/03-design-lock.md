# 03 — Design lock

Options considered:

1. Add a separate `notifyInfo()` preview before `ctx.ui.select()`.
   - Pro: minimal.
   - Con: may separate preview from the decision UI and can be missed in noisy UI.

2. Include the resolved objective preview directly in the `ctx.ui.select()` prompt.
   - Pro: restores the user's described behavior: read resolved text immediately above selectable options.
   - Pro: keeps the preview coupled to the decision.
   - Con: long objectives may need truncation or readable formatting.

3. Revert to old binary Replace/Cancel flow.
   - Rejected: queue option is desired and should remain.

Locked choice:
- Use option 2. The Replace/Queue/Cancel select prompt should include a readable preview of the resolved objective that will be replaced or queued.

Design details:
- The preview must be the post-template, post-inline-command, validated objective text, not the raw slash input.
- The prompt should make the action clear, e.g. `Goal already active. New resolved goal:\n\n<objective>\n\nChoose action:`.
- Preserve Queue and Cancel options.
- If truncation is needed, prefer a deterministic max length with an explicit truncated marker rather than silently clipping.

Execution-ready: yes. The behavior and code surface are clear.

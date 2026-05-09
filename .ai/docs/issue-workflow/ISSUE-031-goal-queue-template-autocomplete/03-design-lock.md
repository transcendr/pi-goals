# 03 — Design lock

Options considered:

1. Special-case `argumentPrefix.startsWith("queue ")` before the whitespace bailout and run template matching on the suffix.
   - Pro: small and direct.
   - Con: can duplicate root template matching logic.

2. Extract reusable template completion helper and call it from both root and queue contexts.
   - Pro: preserves identical fuzzy behavior for `/goal <template>` and `/goal queue <template>`.
   - Pro: easier to probe and maintain.
   - Chosen.

3. Keep returning `null` after whitespace and rely on manual typing.
   - Rejected: user explicitly wants autocomplete for queue template intent.

Locked choice:
- Add subcommand-aware autocomplete: when the first token is `queue`, use the trailing text as the template query and return reusable template completions whose `value` includes the `queue ` prefix.

Design details:
- `/goal que` should still autocomplete the `queue` subcommand.
- `/goal queue` and `/goal queue ` should offer reusable templates.
- `/goal queue cre` should fuzzy-match templates/aliases exactly like root `/goal cre`.
- Completion `value` should be directly insertable as the full goal argument, e.g. `queue create-issue-doc` rather than only `create-issue-doc`.
- Root autocomplete behavior must remain unchanged.

Execution-ready: yes.

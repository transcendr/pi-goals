# 02-grounded-research — NL reusable goal prompts

## Files inspected

- `.ai/.pi-goals/create-issue-doc.md`
- `.pi/extensions/goal/templates.ts`
- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/tools.ts`
- `.ai/issues/fixed/ISSUE-017-reusable-goal-prompt-docs.md`
- `.ai/issues/open/ISSUE-013-goal-update-natural-language.md`
- `.gitignore`

## Current reusable-template behavior

`templates.ts` already implements deterministic template discovery/resolution:

- Recursively discovers `.pi-goals/` directories, skipping `.git`, `node_modules`, `references`, and common build/cache dirs.
- Template name is the extensionless relative path inside `.pi-goals`; aliases come from frontmatter.
- Supports frontmatter: `description`, `aliases`, `allow_commands`, `command_timeout_ms`, `command_output_limit`.
- Supports `{{flag}}`, `{{args}}`, and bounded inline command interpolation with ``!`command` `` when `allow_commands: true`.
- `resolveGoalTemplateInvocation(input)` expects command-like syntax where the first token is an exact template name or alias.

`command.ts` wires this into `/goal`:

- `/goal <template-name> [--flag value...] [-- trailing prose]` resolves templates before freeform objective creation.
- Autocomplete suggests template names/aliases on the first token.
- If the first token is not a template/alias, existing freeform objective creation is preserved.

## Current tool behavior

`tools.ts` registers `create_goal`, but it only accepts a fully explicit `objective` string plus optional budgets. Tool guidance says to use `create_goal` only when the user explicitly asks for a persistent goal.

There is no model-facing tool for:

- listing/discovering reusable goal templates;
- resolving a named template with structured flag/arg values;
- returning missing placeholders/required inputs in a machine-actionable way;
- creating a goal from a resolved template in one safe path.

## Existing planning relation

`ISSUE-017` implemented reusable `.pi-goals` prompt docs for slash-command usage. It did not implement natural-language model/tool discovery or argument filling.

`ISSUE-013` covers natural-language updates to existing goals. This new issue is different: it concerns natural-language creation/start from reusable prompt templates.

## User-facing gap

The desired user request shape is natural language, e.g.:

> create a goal for the create-issue-doc prompt in open that's a new feature that xyz...

Today the model would need to infer the exact template invocation syntax, manually construct `/goal issue-doc --bucket open --kind feature --title ... -- ...`, or manually call `create_goal` with a fully expanded objective. There is no reliable API for resolving `.pi-goals` templates from natural language while preserving explicit goal intent and template validation.

## Planning facts

- The deterministic resolver should remain the source of truth for actual template expansion.
- Natural-language interpretation should produce a structured candidate invocation or explicit missing-input error; it should not bypass template validation.
- The model should not silently create goals from vague task requests. The explicit user phrase “create/start a goal for <template>” is the intent boundary.
- Existing template metadata is light; if natural-language resolution needs required arguments, issue implementation may need to infer placeholders from `{{name}}` or extend metadata in a backward-compatible way.

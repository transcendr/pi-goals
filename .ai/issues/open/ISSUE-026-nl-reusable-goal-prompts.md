# ISSUE-026 — NL reusable goal prompts

Status: open — execution-ready
Priority: P1
Owner: unassigned
Created: 2026-05-09
Next best session: focused implementation/validation pass for natural-language template goal creation
Next best session rationale: Reusable `.pi-goals` command syntax already exists; this issue locks a model-facing tool path that lets explicit natural-language requests resolve templates deterministically and create persistent goals without bypassing guardrails.
Target bucket: open
Issue kind: feature
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/issues/fixed/ISSUE-017-reusable-goal-prompt-docs.md`
Related:
- `.ai/issues/refine/ISSUE-013-goal-update-natural-language.md`
- `.ai/.pi-goals/create-issue-doc.md`

Goal: Let the agent create/start a persistent goal from any `.pi-goals/` reusable prompt using explicit natural language, with the model filling structured template arguments and the extension resolving the final objective through the existing deterministic template resolver.

## Problem/context

Users can currently start reusable goal prompts through explicit slash syntax such as:

```text
/goal issue-doc --bucket open --kind feature --title "Example" -- trailing context
```

The desired user experience is more natural:

```text
create a goal for the create-issue-doc prompt in open that's a new feature that xyz...
```

In that flow, the agent should identify the requested reusable prompt, fill necessary arguments, resolve the prompt, and create the fully resolved prompt as the new persistent goal.

Today there is no reliable model-facing tool path for this. The model must manually infer slash syntax or manually expand a template into `create_goal`, which is brittle and can bypass template validation, aliases, inline-command policy, and missing-placeholder errors.

## Transcript artifacts

This issue was created through the visible issue-workflow protocol. Artifacts:

- Request intake: `.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/raw/commands.log`

## Research findings

Current implementation facts:

- `.pi/extensions/goal/templates.ts` already discovers `.pi-goals/` templates recursively.
- Template names are extensionless paths relative to `.pi-goals`; aliases come from frontmatter.
- `resolveGoalTemplateInvocation()` already supports `{{flag}}`, `{{args}}`, and bounded inline command interpolation with opt-in `allow_commands: true`.
- `.pi/extensions/goal/command.ts` already resolves `/goal <template-name> [--flag value...] [-- trailing prose]` before falling back to freeform objective creation.
- `.pi/extensions/goal/tools.ts` currently exposes `create_goal`, but only with a fully explicit objective string.
- No model-facing tool lists templates, resolves a template from structured params, reports missing placeholders, or creates a goal from a resolved template.

Existing planning:

- ISSUE-017 implemented reusable prompt docs for slash-command usage.
- ISSUE-013 concerns natural-language updates to an existing goal; this issue concerns natural-language creation/start from reusable templates.

## Desired behavior

When the user explicitly asks to create/start a goal from a reusable prompt in natural language, the model should be able to:

1. Discover available reusable goal templates and aliases.
2. Select the requested template by name or alias.
3. Fill structured flags and trailing args from the user's prose.
4. Ask for missing required values instead of guessing when needed.
5. Resolve the template through the existing deterministic resolver.
6. Create the persistent goal using existing validation, state, telemetry, UI, monitor scheduling, and continuation behavior.

Example desired model/tool flow:

```text
User: create a goal for the create-issue-doc prompt in open that's a new feature about NL reusable goal prompts
Agent/tool params:
  template: issue-doc
  flags:
    bucket: open
    kind: feature
    title: NL reusable goal prompts
  args: I want the agent to be able to resolve and start goals from any .pi-goals/ reusable prompt with natural language...
```

## Locked design choices

Choose a dedicated model-facing template-goal creation path backed by existing deterministic `.pi-goals` discovery/resolution.

First-pass implementation should add tools or equivalent model-facing APIs such as:

- `list_goal_templates`: compact inventory of template names, aliases, descriptions, paths, and detectable required placeholders.
- `create_goal_from_template`: accepts template name/alias, structured `flags`, trailing `args`, optional budgets; resolves through `resolveGoalTemplateInvocation()`; validates objective; creates the goal through the same runtime path as `create_goal`.

The model may translate natural language into structured params, but the extension must keep deterministic expansion authoritative.

## Intent and safety boundary

- Use only when the user explicitly asks to create/start a persistent goal from a reusable prompt/template.
- Do not infer goals from ordinary task requests.
- Do not silently guess missing required placeholders.
- Return clear structured errors for missing values or ambiguous template names.
- Preserve existing `/goal <freeform objective>` and `/goal <template>` behavior.

## Rejected alternatives

- Prompt-guidelines-only: too brittle and not a real feature.
- Directly calling `create_goal` with a model-expanded prompt: bypasses template validation and policy.
- Fully freeform LLM template expansion inside the extension: too much trust in generated text; deterministic resolver must remain the source of truth.
- Automatic goal creation from any template mention: violates explicit persistent-goal policy.

## Implementation checklist

- [ ] Add template metadata helper for model-facing inventory, including required placeholder detection where practical.
- [ ] Add model tool/API to list reusable goal templates compactly.
- [ ] Add model tool/API to create a goal from a template name/alias plus structured flags/args/budgets.
- [ ] Ensure template creation reuses existing `resolveGoalTemplateInvocation()`, `validateObjective()`, state persistence, telemetry creation, UI sync, monitor scheduling, and continuation scheduling.
- [ ] Return actionable structured errors for missing placeholders, ambiguous/unknown template names, disabled inline command attempts, and existing-goal replacement constraints.
- [ ] Preserve existing slash-command template behavior and autocomplete.
- [ ] Add focused probes for inventory, creation, missing input, and existing template regression.
- [ ] Run `npm run quality:goal`.

## Acceptance criteria

- The model can list reusable goal templates with enough metadata to choose and fill them from a user's explicit natural-language goal request.
- The model can create a persistent goal from a reusable template using structured params without manually expanding the template text.
- Required placeholder values that cannot be filled fail clearly and do not create a goal.
- Existing goal replacement constraints are preserved; the tool must not silently replace an active goal.
- Inline command policy remains unchanged: commands execute only when template frontmatter allows them and within configured bounds.
- Existing `/goal <template>` syntax continues to work.
- Ordinary non-goal task requests are not treated as persistent goal creation.
- `npm run quality:goal` passes.

## Proof threat model

Primary invariant: explicit natural-language requests to create/start a goal from a reusable prompt resolve through deterministic template machinery into a validated persistent goal, while vague task requests and missing template inputs do not create goals.

Likely false greens:

- Manual slash syntax still works but no model-facing natural-language tool path exists.
- Tool creates a goal by bypassing template resolver and directly accepting expanded prompt text.
- Missing placeholders are guessed silently.
- Existing template alias/inline-command behavior regresses.
- The tool description encourages inferred goal creation from ordinary tasks.

## Required proofs

required_proofs[6]{name,command,condition}:
  template_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-template-probe.cjs",exit 0; existing slash-template behavior remains green
  nl_template_inventory_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-nl-template-inventory-probe.cjs",exit 0; model-facing inventory includes names aliases descriptions and placeholder hints
  nl_template_create_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-nl-template-create-probe.cjs",exit 0; structured natural-language-derived params resolve and create a goal
  nl_template_missing_input_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-nl-template-missing-input-probe.cjs",exit 0; missing placeholders fail without goal creation
  quality_goal,"npm run quality:goal",exit 0; Sentrux slop TypeScript and Pi load gates pass
  no_escape_hatches,"npm run slop:goal",exit 0; no TypeScript escape-hatch casts in goal extension

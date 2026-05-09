# 03-design-lock — NL reusable goal prompts

## Design landscape

Research exposed three viable implementation shapes:

1. **Teach the model via prompt guidelines only**
   - Add tool/command docs telling the model to construct `/goal <template> ...` manually.
   - Low implementation cost but brittle: the model must remember syntax, discover templates indirectly, and manually fill placeholders.

2. **Add separate discover/resolve tools, then use existing `create_goal`**
   - Model calls a tool to list templates, another to resolve a template invocation, then `create_goal` with the resolved objective.
   - Reuses existing creation semantics but creates a multi-step path with more chances to bypass confirmation/validation or lose metadata.

3. **Add a dedicated natural-language template goal tool/path**
   - Model provides explicit template identity plus structured flags/args or a natural-language request; runtime resolves through the existing deterministic template resolver, validates, and creates the goal.
   - Best aligns with user request and existing guardrails if it requires explicit goal intent and returns structured missing-input errors.

## Locked choice

Choose option 3 for the first execution-ready implementation: add a dedicated model-facing goal-template creation path backed by existing deterministic `.pi-goals` discovery/resolution.

The first pass should expose enough tool surface for natural-language use while keeping deterministic expansion authoritative:

- `list_goal_templates` or equivalent: compact template inventory with name, aliases, description, path, required placeholders when detectable.
- `create_goal_from_template` or equivalent: accepts a template name/alias, structured `flags`, trailing `args`, and optional budgets; resolves via existing template resolver; validates objective; creates the goal through existing state/telemetry/UI/runtime scheduling path.

The model can translate natural language into structured tool params, but template expansion remains deterministic and bounded.

## Intent and safety boundary

The tool must be described so it is used only when the user explicitly asks to create/start a persistent goal from a reusable prompt/template. Ordinary task requests must not become goals automatically.

If required placeholders cannot be filled confidently, the tool should fail with a clear structured error describing missing values rather than guessing. This follows AXI-style actionable errors and preserves the existing explicit-goal policy.

## Rejected alternatives

- Prompt-guidelines-only: rejected as too brittle and not a real feature.
- Directly calling `create_goal` with a model-expanded prompt: rejected because it bypasses reusable-template discovery, placeholder validation, and inline command policy.
- Fully freeform LLM template filling inside the extension: rejected for first pass. The model may map user language to structured params, but extension expansion must remain deterministic.
- Automatic goal creation from any mention of a template: rejected. Explicit create/start goal intent is required.

## Execution readiness

This issue is execution-ready. The product behavior, runtime/tool boundary, implementation surfaces, and proof shape are locked. Remaining details such as exact tool names and TypeBox schema field names can be chosen during implementation without changing product/API direction if they satisfy the locked behavior above.

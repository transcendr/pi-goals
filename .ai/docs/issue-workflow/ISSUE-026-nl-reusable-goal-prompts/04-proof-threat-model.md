# 04-proof-threat-model — NL reusable goal prompts

## Primary invariant

A user can explicitly ask in natural language to create/start a goal from a `.pi-goals` reusable prompt, and the agent can reliably resolve that request through deterministic template discovery/resolution into a validated persistent goal, without guessing missing required args or bypassing goal creation guardrails.

## Likely false greens

- The model can sometimes manually type `/goal <template> ...`, but no tool/API exists for reliable natural-language template resolution.
- A tool creates goals from arbitrary vague task requests, violating explicit persistent-goal intent policy.
- Template expansion bypasses `resolveGoalTemplateInvocation()` and therefore fails to honor aliases, disabled command interpolation, output caps, or missing-placeholder errors.
- The list/discovery path omits aliases/descriptions/required placeholder hints, leaving the model unable to fill args reliably.
- Missing placeholder values are guessed silently instead of returning an actionable error.
- Existing `/goal <freeform objective>` behavior or slash-template behavior regresses.

## Proof strategy

Deterministic probes are sufficient for first-pass behavior because the core runtime behavior is template discovery/resolution and tool dispatch. A live LLM probe is not required to prove the API surface, but a prompt/tool-guideline inspection should verify the model has clear usage guidance.

Required proof classes:

- Template inventory probe: verifies templates and aliases are visible to model tools with descriptions/placeholder hints.
- Template create probe: verifies structured params produce the same resolved objective as command syntax and create a goal with telemetry/UI scheduling hooks.
- Missing-input probe: verifies unresolved placeholders fail clearly and do not create a goal.
- Guardrail probe: verifies ordinary non-goal task text is not enough for the tool by description/guideline and that the direct tool requires explicit template identity.
- Regression probe: existing `/goal <template>` resolver continues to pass.

## Required proofs TOON

required_proofs[6]{name,command,condition}:
  template_probe,"NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-template-probe.cjs",exit 0; existing slash-template behavior remains green
  nl_template_inventory_probe,"NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-nl-template-inventory-probe.cjs",exit 0; model-facing inventory includes names aliases descriptions and placeholder hints
  nl_template_create_probe,"NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-nl-template-create-probe.cjs",exit 0; structured natural-language-derived params resolve and create a goal
  nl_template_missing_input_probe,"NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-nl-template-missing-input-probe.cjs",exit 0; missing placeholders fail without goal creation
  quality_goal,"npm run quality:goal",exit 0; Sentrux slop TypeScript and Pi load gates pass
  no_escape_hatches,"npm run slop:goal",exit 0; no TypeScript escape-hatch casts in goal extension

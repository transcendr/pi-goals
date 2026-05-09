# ISSUE-017 — Refine reusable goals from `.pi-goals` prompt docs

Status: fixed — implemented and validated
Priority: P1
Owner: unassigned
Created: 2026-05-08
Next best session: focused implementation/validation pass for reusable goal prompt docs
Next best session rationale: Design is locked for a project-local Markdown template resolver with bounded inline command interpolation, preview, autocomplete, and create-goal integration.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: `.ai/issues/fixed/ISSUE-004-goal-subcommand-fuzzy-autocomplete.md`

Goal: Design reusable goal prompt documents discovered from `.pi-goals` directories, with fuzzy autocomplete, prose/flag arguments, and safe inline command interpolation.

## Problem

Some goals will be reused often: release checks, issue implementation, deslop passes, audit workflows, migration playbooks, etc. Users should not have to paste long prompts each time. A project-local `.pi-goals` directory tree could provide named durable goal templates.

## Desired behavior sketch

- Recursive search for `.pi-goals` directories anywhere in the project.
- Fuzzy autocomplete for reusable goal names:
  - `/goal my-reusable-goal -- issue 001-008`
- Prompt docs may accept freeform trailing prose appended to the resolved goal prompt.
- Prompt docs may accept named flags:
  - `/goal release-audit --commit abc123 -- include docs`
- Prompt docs may include placeholders such as `{{commit}}`.
- Prompt docs may include embedded command substitutions such as:
  - ``!`git diff --cached` ``
  - ``!`git show {{commit}}` ``
- Placeholders are resolved before embedded commands execute, and command output is injected into the final objective.

## Open design questions

1. What file naming convention maps docs to goal names?
2. What frontmatter schema is needed for arguments, descriptions, and safety policy?
3. Should embedded commands be allowed by default, require frontmatter opt-in, or require user confirmation?
4. How are command timeouts, output size caps, stderr, and non-zero exits handled?
5. How does autocomplete remain fast while recursively scanning project trees?
6. How should prompt docs be trusted when they live in a repo checkout that may be untrusted?

## Candidate acceptance criteria after refinement

- Reusable goals are discovered deterministically from `.pi-goals` dirs.
- Fuzzy autocomplete shows names and short descriptions without autocompleting arbitrary objective prose.
- Freeform prose arguments and named flags are resolved predictably.
- Embedded commands have explicit safety limits: timeout, output cap, working directory, and failure behavior.
- Resolved objective is previewable/auditable before goal creation when commands or flags are used.
- Prompt resolution cannot silently execute unbounded or interactive commands.

## Non-goals for first refinement

- Remote prompt registries.
- Arbitrary scripting language inside prompt docs.
- Cross-project global goal templates before project-local semantics are stable.

## Refinement todos

- [ ] Define `.pi-goals` directory and file naming convention.
- [ ] Define frontmatter and argument schema.
- [ ] Decide command interpolation security/confirmation policy.
- [ ] Define autocomplete indexing/cache behavior.
- [ ] Specify preview, error, and output-cap UX.


## Design lock

- Discover Markdown files under any `.pi-goals/` directory below the project root, skipping `node_modules`, `.git`, `references`, and common build/cache directories.
- Template name is the extensionless relative path inside `.pi-goals`, normalized with `/`; aliases come from optional frontmatter `aliases`.
- Optional YAML-ish frontmatter supports `description`, `aliases`, `allow_commands`, `command_timeout_ms`, and `command_output_limit`.
- Inline command interpolation syntax is exactly ``!`command` `` and is disabled unless frontmatter `allow_commands: true` is present.
- Placeholder interpolation uses `{{name}}`; values come from parsed `--flag value` pairs and `{{args}}` for trailing prose after `--`.
- Flag placeholders are substituted before inline commands execute.
- Commands execute from the project root with shell semantics, a timeout, and an output cap. Non-zero exit or timeout fails goal creation with a clear message.
- `/goal <template-name> [--flag value...] [-- trailing prose]` resolves a template when the first token matches a discovered template or alias; otherwise existing freeform objective behavior is preserved.
- Autocomplete suggests subcommands and template names only for first-token input.
- Resolved objectives are validated through existing `validateObjective()` and then use the existing goal creation path.

## Implementation checklist

- [ ] Add a template discovery/resolution module.
- [ ] Extend `/goal` autocomplete to include reusable template names and descriptions.
- [ ] Resolve matching template invocations before freeform objective creation.
- [ ] Implement placeholder interpolation, bounded inline command execution, and clear errors.
- [ ] Preserve existing `/goal <freeform objective>` behavior when no template matches.
- [ ] Add focused probes for discovery, aliases, flags, prose args, command interpolation, disabled command rejection, and autocomplete.
- [ ] Run Sentrux gate/check, Pi load validation, and TypeScript attempt.

## Required proofs

required_proofs[5]{name,command,condition}:
  discover_templates,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-template-probe.cjs",exit 0
  sentrux_gate,"sentrux gate .pi/extensions/goal",exit 0
  sentrux_check,"sentrux check .pi/extensions/goal",exit 0
  pi_load,"pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models",exit 0
  tsc_attempt,"tsc --noEmit --target ES2022 --module ESNext --moduleResolution node --strict --skipLibCheck .pi/extensions/goal/*.ts",record result


## Implementation closeout

Implemented reusable `.pi-goals` prompt docs:

- Added `.pi/extensions/goal/templates.ts`.
- Discovers Markdown/text templates under recursive `.pi-goals/` directories while skipping heavy/cache directories.
- Template names are extensionless paths relative to `.pi-goals`; optional `aliases` and `description` are parsed from frontmatter.
- `/goal <template-name> [--flag value...] [-- trailing prose]` resolves matching templates before falling back to freeform objective creation.
- Supports `{{flag}}` and `{{args}}` placeholder interpolation.
- Supports bounded inline command interpolation with ``!`command` `` only when `allow_commands: true` is present.
- Adds template names to `/goal` argument autocomplete alongside control subcommands.
- Resolved objectives use the existing validation/create/replace flow.

Validation:

- `/tmp/pi-goal-template-probe.cjs` passed discovery, alias, nested template, flag interpolation, prose args, inline command interpolation, missing-placeholder failure, and disabled-command rejection.
- `sentrux gate .pi/extensions/goal` passed.
- `sentrux check .pi/extensions/goal` passed.
- `pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models` passed.
- `tsc` attempted but unavailable: `/bin/bash: tsc: command not found`.

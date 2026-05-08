# ISSUE-017 — Refine reusable goals from `.pi-goals` prompt docs

Status: refine — needs design decision before execution
Priority: P1
Owner: unassigned
Created: 2026-05-08
Next best session: design refinement pass for reusable goal prompt docs
Next best session rationale: Prompt discovery, argument interpolation, and command execution have security and UX forks.
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

# 01 — Protocol Read

## Files read fully

- `AGENTS.md`
- `~/.codex/feature-workflow-pipelines/SKILL.md`
- `~/.codex/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `~/.codex/feature-workflow-pipelines/references/research-pass.md`
- `~/.codex/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `~/.codex/feature-workflow-pipelines/references/design-locking-patterns-and-interview-rules.md`
- `~/.codex/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `~/.codex/feature-workflow-pipelines/references/pipelines.md`
- `~/.agents/skills/axi/SKILL.md`

## Extracted requirements

### Project-local requirements from `AGENTS.md`

- Primary implementation code is under `.pi/extensions/goal/`.
- Canonical planning/research lives under `.ai/issues/`, `.ai/docs/`, and `.ai/.pi-goals/`.
- Extension architecture should stay modular and preserve separation among command/tools, lifecycle/runtime, state/telemetry, prompts, UI/widget, monitor, and shared helpers.
- Substantial implementation must run `sentrux gate --save .pi/extensions/goal` before work and `npm run quality:goal` after implementation.
- Do not use TypeScript escape-hatch casts in `.pi/extensions/goal`.
- Issue-doc workflow artifacts must be visible under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/` and verified with `git status --short --untracked-files=all` plus `git check-ignore -v <artifact-path> || true`.

### Feature workflow requirements

- Use the issue-first canonical-doc pipeline for this task.
- Make the issue doc the canonical planning doc.
- Ground claims in live code/repo research before writing final issue truth.
- Lock meaningful design choices; do not leave product/API/architecture alternatives for implementers to choose accidentally.
- Add a TOON synthesis section using real TOON syntax.
- Add a proof threat model before finalizing proof rows.
- For Solo/TLO execution, include importable `required_proofs[]` rows with concrete commands and pass conditions.
- Execution-ready means design-ready, not just proof-shaped.

### Research-pass requirements

- Check the live code against the planning draft.
- Record concrete files inspected and live behavior.
- Identify stable, missing, and next-plan-update facts.
- Stop when the issue can be described from code without guessing.

### Design-locking requirements

- Run a design-locking pass when research exposes meaningful forks.
- Lock high-value choices such as visible product surface ownership, runtime ownership, context/input shape, output contract, first-pass scope, and rollout posture.
- Record rejected alternatives and proof consequences.
- Ask the owner only if a fork changes planning shape and cannot be resolved from evidence; no clarification was required here because the user explicitly chose prose-first, no parser, few tools.

### TOON/AXI requirements

- TOON blocks must be valid TOON, not Markdown bullets under a TOON heading.
- Include `toon.version: 1`.
- Prefer concrete row tables for requirements, invariants, surfaces, and verification checks.
- Required proofs must be concrete and runnable when the issue is intended for Solo/TLO.
- For agent-facing tool behavior, outputs/guidance should be concise, actionable, non-interactive, and should preserve flexible workflows rather than over-prescribing brittle parsing.

## Protocol conclusion

The requested issue should be created as `ISSUE-032` in `.ai/issues/open/`, with visible transcript artifacts, grounded code findings, locked prose-first design choices, TOON synthesis, proof threat model, and concrete required proofs.

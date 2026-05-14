# 01-protocol-read — mandatory workflow docs

## Files read

- `AGENTS.md`
- `~/.codex/feature-workflow-pipelines/SKILL.md`
- `~/.codex/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `~/.codex/feature-workflow-pipelines/references/research-pass.md`
- `~/.codex/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `~/.codex/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `~/.agents/skills/axi/SKILL.md`

## Extracted requirements

From `AGENTS.md`:

- Keep `.pi/extensions/goal/` modular.
- For implementation issues, use `npm run quality:goal` as the combined gate.
- Do not use TypeScript escape-hatch casts under `.pi/extensions/goal`.
- For issue docs, produce visible artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/` and verify they are trackable.

From `$feature-workflow-pipelines`:

- Use the issue-first canonical-doc pipeline.
- Ground planning against live code before locking design choices.
- Do not mark an issue execution-ready while meaningful product/API/architecture forks remain unresolved.
- Add a proof threat model before finalizing proof rows.
- Use concrete `required_proofs[]` rows when proof-driven execution is expected.

From canonical issue docs / TOON synthesis:

- Front matter should orient: status, priority, next best session, goal, dependencies/related issues when useful.
- Issue doc should hold the planning truth, design locks, acceptance criteria, and proof threat model.
- `required_proofs[]` rows must be concrete and aligned to the locked design.

From grounded research pass:

- Inspect current planning docs and live code surfaces.
- Record what live code already does, what is missing, and what can be reused.
- Write findings into the canonical planning doc.

From design locking:

- Identify real design forks from research.
- Choose one path or explicitly reject/defer alternatives before execution.
- Ensure acceptance criteria/proofs validate the chosen path, not multiple incompatible paths.

From TOON planning guidance:

- Use valid TOON syntax when a TOON section/required proofs is included.
- Keep rows concrete, boundary-focused, and useful for execution.

From AXI:

- Agent-facing flows should be explicit, token-efficient, non-interactive where possible, and provide structured, actionable errors.
- Natural-language surfaces should not create ambiguous hidden side effects without a clear confirmation/intent boundary.

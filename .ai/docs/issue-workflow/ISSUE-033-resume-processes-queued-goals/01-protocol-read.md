# 01 — Protocol read

## Files read

- `AGENTS.md`
- `.ai/.pi-goals/create-issue-doc.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/research-pass.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`

## Extracted requirements

- Keep `.ai/issues/` as the canonical planning home.
- Use visible workflow artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/`.
- Ground the issue in live code before writing final planning truth.
- Lock meaningful design choices instead of leaving implementation sessions to choose behavior accidentally.
- Include proof threat model and importable `required_proofs[]` TOON when the issue should drive Solo/TLO execution.
- For this repo, run Sentrux against `.pi/extensions/goal` before substantial implementation and `npm run quality:goal` after implementation.
- No TypeScript escape-hatch casts in `.pi/extensions/goal`.
- Queue steering is agent-side semantic resolution; do not add brittle extension-side prose parsing.

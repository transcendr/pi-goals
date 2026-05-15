# 01 — Protocol read

## Files read fully in this session

- `AGENTS.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/research-pass.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `/Users/bryan/.agents/skills/axi/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/sentrux/SKILL.md`

Line counts are recorded in `raw/commands.log`.

## Extracted requirements

### Project-local requirements

- Issue docs and workflow artifacts belong under `.ai/issues/` and `.ai/docs/issue-workflow/<issue>/`.
- For issue creation, follow `.ai/.pi-goals/create-issue-doc.md` exactly.
- Workflow artifacts must be visible to git/status review and not hidden by ignore rules.
- For `.pi/extensions/goal`, preserve modular boundaries between command/tools, lifecycle/runtime, state/telemetry, prompts, UI/widget, monitor, and shared domain helpers.
- For implementation later, run `sentrux gate --save .pi/extensions/goal` before substantial implementation and `npm run quality:goal` after implementation.

### Feature workflow requirements

- Use issue-first canonical-doc pipeline.
- Ground the issue against live code and artifacts before finalizing.
- Lock meaningful design choices; do not leave implementation to choose between product/API/architecture alternatives.
- Add proof threat model before final proof rows.
- If execution likely uses Solo/TLO proof closeout, include importable `required_proofs[]` TOON with concrete commands and pass conditions.
- Execution-ready means the next session can implement without choosing architecture or owner-level product direction.

### Research/design/proof requirements

- Research must state what live code already does, what is legacy/placeholder, what seams exist, and what must be added.
- Design lock must record chosen path, rejected alternatives, consequences, and proof implications.
- Proofs must be adversarial: they should fail if the user-visible queue/context-reset behavior is still broken.
- Live runtime/control helpers generally require bounded live-probe validation plus cleanup; deterministic probes alone are insufficient for this issue.

### TOON/AXI requirements

- TOON blocks must be real TOON, not markdown bullets under a TOON heading.
- Minimum TOON: `toon.version: 1`, real table rows, concrete fields.
- Required proof rows must be runnable or explicitly identify live/manual evidence artifacts when full automation is impossible.

### Sentrux requirements

- Sentrux is a planning/quality sensor, not an oracle.
- Use Sentrux for architecture-sensitive implementation planning and before/after non-trivial code changes.
- Docs-only issue creation does not require changing Sentrux baseline.

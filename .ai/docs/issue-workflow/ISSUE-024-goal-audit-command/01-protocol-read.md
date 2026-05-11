# 01 — Protocol read

## Files read in full or freshly loaded in current context

- `AGENTS.md`
- `.ai/.pi-goals/create-issue-doc.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/research-pass.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/pipelines.md`
- `/Users/bryan/.agents/skills/axi/SKILL.md`

## Extracted requirements

- Make the issue doc the canonical planning home before execution.
- Ground the draft against live code and docs, then write findings back into the issue.
- Lock meaningful design choices; execution-ready issues must not leave product/API/runtime forks for the implementer to choose.
- Add a proof threat model before final proof rows.
- Add valid TOON syntax where TOON is used, including `toon.version: 1`.
- Include importable `required_proofs[]` rows when the issue is proof-driven or expected to run through Solo/TLO.
- Keep artifacts visible under `.ai/docs/issue-workflow/**` and verify with `git status --short --untracked-files=all` plus `git check-ignore -v`.
- Use Sentrux as a planning sensor for architecture-sensitive pi-goal changes.
- Do not implement the feature during this issue-doc refinement goal.

## Planning sensor

Ran `sentrux gate --save .pi/extensions/goal`; output is in `raw/sentrux-gate.log`.

# 01 — Protocol read for ISSUE-022

## Files read

- `AGENTS.md`
- `.ai/.pi-goals/create-issue-doc.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/pipelines.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/research-pass.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `/Users/bryan/.agents/skills/axi/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/sentrux/SKILL.md`
- TOON spec URL probed from `https://toonformat.dev/reference/spec.html` (see `raw/commands.log`).

## Extracted workflow requirements

- Use the issue-first canonical-doc pipeline for existing issue refinement.
- The issue doc must become the canonical planning home and include clear front matter, goal, problem/context, desired behavior, grounded research, locked design choices, checklist, acceptance criteria, proof threat model, TOON synthesis, and `required_proofs[]` if the issue is proof-driven/Solo-ready.
- Execution-ready means design-ready: meaningful product/API/architecture forks must be chosen or explicitly rejected/deferred.
- Grounded research must inspect live code and write findings back into the issue, not rely on memory.
- Design locking must align acceptance criteria and proofs to the chosen design.
- TOON blocks must be real TOON, not markdown bullets under a TOON label; include `toon.version: 1` and concrete row tables.
- Required proofs must be runnable, concrete, and adversarial: they should fail if the primary invariant is still broken.
- For architecture-sensitive planning, Sentrux may be used as a planning sensor; docs-only edits do not require post-code Sentrux gates beyond the planning sensor unless code is changed.
- Artifacts must be visible under `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/` and verified with `git status --short --untracked-files=all` plus `git check-ignore -v`.

## Project-specific requirements

- Preserve `.pi/extensions/goal/` modular architecture boundaries.
- Run Sentrux against `.pi/extensions/goal`, not the repo root, when using it.
- For issue docs, follow `.ai/.pi-goals/create-issue-doc.md` exactly.
- Do not dequeue the parent orchestration item until every stack issue is open/execution-ready.

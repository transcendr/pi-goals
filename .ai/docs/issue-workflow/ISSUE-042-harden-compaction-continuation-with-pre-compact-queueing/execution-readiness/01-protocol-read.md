# 01 — Protocol read

Files read completely or freshly present:
- `AGENTS.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/research-pass.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`

Extracted requirements:
- Create issue docs under `.ai/issues/<bucket>/` and make the issue doc the canonical planning doc.
- Create visible workflow artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/execution-readiness/`.
- Ground the plan in live code and docs rather than memory.
- Lock meaningful design choices before marking execution-ready.
- Include a TOON synthesis that is real TOON, not markdown pretending to be TOON.
- Include an adversarial proof threat model before finalizing required proofs.
- For Solo/TLO execution, include importable `required_proofs[]` rows with concrete commands and pass conditions.
- For `.pi/extensions/goal`, run `sentrux gate --save .pi/extensions/goal` before substantial implementation and `npm run quality:goal` after implementation.
- Do not use TypeScript escape-hatch casts such as `as unknown as` or `as any` in `.pi/extensions/goal`.
- Live runtime/control-helper fixes usually need a bounded disposable live probe unless deterministic coverage is direct and unambiguous.

Relevant project constraints carried into issue:
- Preserve extension modularity across lifecycle, continuation/runtime, state/telemetry, queue-state/queue-steering, tools, prompts, and UI surfaces.
- Treat queue orchestration carefully; do not discard queued work.
- Acceptance-pipeline prompt hardening is related but should remain a separate stack item unless the implementation issue explicitly chooses to include it.

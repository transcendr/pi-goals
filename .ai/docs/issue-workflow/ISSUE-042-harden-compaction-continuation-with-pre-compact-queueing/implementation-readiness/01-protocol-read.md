# 01 — Protocol read

Files/resources read for implementation readiness:
- `AGENTS.md`
- `.ai/issues/open/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing.md`
- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/02-grounded-research.md`
- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/03-design-lock.md`
- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/04-proof-threat-model.md`
- `$feature-workflow-pipelines` skill and references, freshly present from the immediately preceding issue-doc creation pass:
  - `SKILL.md`
  - `references/canonical-issue-docs-and-toon-synthesis.md`
  - `references/research-pass.md`
  - `references/design-landscape-exploration-and-choice-locking.md`
  - `references/toon-for-issues-and-execution-planning.md`
- Additional implementation-readiness reference read:
  - `references/execution-planning-vs-implementation-planning.md`

Extracted implementation-readiness requirements:
- Name exact implementation surfaces and functions when knowable.
- Lock patch order, validation order, rollback/fallback notes, and stop conditions.
- Do not leave meaningful architecture/API choices to the implementation agent.
- For `.pi/extensions/goal`, preserve modularity and avoid TypeScript escape-hatch casts.
- Run `sentrux gate --save .pi/extensions/goal` before substantial implementation and `npm run quality:goal` after implementation.
- For live runtime helpers, deterministic tests are not enough unless they directly exercise the runtime boundary and the live skip rationale is explicit.

Prompt-template authoring docs:
- Not read in this pass because ISSUE-042 implementation itself does not require editing `.ai/.pi-goals/*`. The acceptance-pipeline prompt hardening side-note is queued as a separate stack item and should read `.ai/docs/prompt-template-authoring.md` before editing templates.

# 01 Protocol Read — ISSUE-046

## Files/resources read

- `/Users/bryan/dev/personal/experiments/pi-goals/AGENTS.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/research-pass.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `/Users/bryan/.agents/skills/axi/SKILL.md`
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`
- `.ai/issues/fixed/ISSUE-034-prevent-unsatisfied-queued-goal-discard.md`
- `.ai/issues/fixed/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode.md`
- `package.json`
- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/queue-steering.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/command.ts`

## Extracted project requirements

- Use `.ai/.pi-goals/create-issue-doc.md` semantics: produce visible issue workflow artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/execution-readiness/`.
- Keep issue docs canonical and execution-ready only when design choices, acceptance criteria, and proof rows align to a chosen behavior.
- For queue-related changes, preserve the one-active-goal model and existing queue safety semantics.
- For pi-goals implementation work, run `sentrux gate --save .pi/extensions/goal` before substantial implementation and `npm run quality:goal` after implementation. This issue-creation pass does not implement code.
- Do not use TypeScript escape-hatch casts in `.pi/extensions/goal`.
- Verify issue workflow artifacts are trackable.

## Extracted workflow requirements

- Ground research in live code and session evidence, not memory.
- Lock meaningful design choices before calling the issue execution-ready.
- Add TOON synthesis and required proof rows when proof-driven execution is expected.
- Include a proof threat model before final proof rows.
- Keep required proofs concrete, runnable, and aligned with the locked behavior.

## Extracted AXI requirements

The issue touches agent-facing tool output. AXI guidance implies:

- Default list output should stay compact.
- Long-form content belongs in detail/full modes, but should not be impossible for agents to access.
- Truncation should disclose that truncation happened and provide an escape hatch.
- Outputs should include enough identifiers and hints for agents to decide the next action without spelunking hidden state.
- Avoid unbounded default output that can blow token budgets.

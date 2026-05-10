# 01 — Protocol read

## Files read completely or freshly present in context

- `AGENTS.md`
  - Project-local rules for `pi-goals`.
  - Primary code path is `.pi/extensions/goal/`.
  - Keep extension modular across entrypoint, command/tools, lifecycle/runtime, state/telemetry, prompts, UI/widget, monitor, and shared domain helpers.
  - For issue docs, use `.ai/.pi-goals/create-issue-doc.md` and produce visible artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/`.
  - For `pi-goals` behavior changes, usually include live probe validation from `.ai/docs/pi-goals-live-probe-testing.md` unless a deterministic-only reason is documented.
- `.ai/.pi-goals/create-issue-doc.md`
  - Required inputs are `--bucket`, `--kind`, `--title`, and trailing context.
  - Must create transcript artifacts before writing the final issue doc.
  - Minimum artifacts: `00-request.md`, `01-protocol-read.md`, `02-grounded-research.md`, `03-design-lock.md`, `04-proof-threat-model.md`, `05-issue-writeback.md`, `06-final-audit.md`, and `raw/commands.log`.
  - Must verify artifacts are visible with `git status --short --untracked-files=all` and `git check-ignore -v <artifact> || true`.
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/SKILL.md`
  - Use the issue-first canonical-doc pipeline by default.
  - A doc is not execution-ready while meaningful product/API/architecture alternatives remain unresolved.
  - Run grounded research, then design choice locking, then TOON synthesis/checklist.
  - Include a proof threat model before final proof rows.
  - Include importable `required_proofs[]` rows for Solo/TLO proof-driven execution.
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
  - Issue docs are canonical planning docs, not ticket stubs.
  - Front matter should orient the next session: status, priority, next best session/rationale, goal, dependencies when relevant.
  - TOON should capture feature memory, requirements, invariants, implementation surfaces, and verification checks.
  - Required proofs must align to the locked design and proof threat model.
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/research-pass.md`
  - Ground planning against live code and write findings back to the canonical issue doc.
  - Inspect planning, lineage when relevant, concrete code layers, and proof/test surfaces.
  - Record stable, legacy, missing, and next plan update facts.
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
  - After research, lock meaningful choices that otherwise leak into implementation.
  - Record chosen path, rejected alternatives, downstream proof/validation consequences, and unresolved forks.
  - Use owner input only for decisions that alter planning, issue shape, or execution order.
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
  - TOON blocks must be valid, concrete, and useful to the next execution session.
  - Include identity, feature memory, locked requirements, invariants, implementation surfaces, and verification checks.
  - For proof-driven execution, include importable `required_proofs[]` rows with runnable commands and pass conditions.
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/pipelines.md`
  - Shared artifact chain is issue doc → grounded research → locked planning truth → TOON synthesis/checklist → validation artifacts.
  - Use issue-first flow when work can start cleanly from an issue doc.
- `/Users/bryan/.agents/skills/axi/SKILL.md`
  - Relevant because `/goal` commands and tool outputs are agent-facing surfaces.
  - Agent-facing CLI/tool output should be compact, structured, no hidden prompts, no ambiguous empty states, and actionable on errors.
  - TOON syntax matters when labeling structured sections as TOON.
- `/Users/bryan/.pi/agent/.cache/codex-skills/sentrux/SKILL.md`
  - Relevant as an architectural quality sensor for multi-file feature work in `.pi/extensions/goal/`.
  - For implementation, run `sentrux gate --save .pi/extensions/goal` before substantial edits and `npm run quality:goal` after; for this planning issue, Sentrux can inform structural surfaces but no code edits are being made.

## Extracted requirements for this workflow

1. Create a new issue in `.ai/issues/open/` as `ISSUE-036-minimum-goal-spend-floors.md`.
2. Treat the issue doc as the canonical planning artifact for the feature.
3. Ground the issue in live code by inspecting goal budget, telemetry, command/tool, continuation, prompt, widget/UI, and validation surfaces.
4. Lock the feature design so implementers do not need to choose product/API semantics for minimum token/time thresholds.
5. Include a proof threat model that would catch false greens where minimum floors are accepted syntactically but do not actually affect wrap-up behavior.
6. Include a live probe validation agent test design because the feature changes slash commands, goal steering, status/budget behavior, and live runtime wrap-up semantics.
7. Keep artifacts under `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/` visible to git/status review.
8. Do not edit implementation code in this planning workflow.

## Protocol-read conclusion

The issue-first canonical-doc pipeline is the correct path. No user clarification is needed because the concrete template goal supplied bucket, kind, title, and context. The feature is architecture-sensitive, but this session is planning-only; implementation quality gates are recorded in the issue rather than executed as code-change gates.

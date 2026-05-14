# 01 — Protocol read

Issue: ISSUE-014 — agent-estimated goal progress percentage
Date: 2026-05-10

## Files read

Mandatory workflow/project docs read in full this pass:

- `AGENTS.md`
- `.ai/.pi-goals/create-issue-doc.md`
- `~/.codex/feature-workflow-pipelines/SKILL.md`
- `~/.codex/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `~/.codex/feature-workflow-pipelines/references/research-pass.md`
- `~/.codex/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `~/.codex/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `~/.codex/feature-workflow-pipelines/references/pipelines.md`
- `~/.agents/skills/axi/SKILL.md`
- `~/.codex/sentrux/SKILL.md`

Issue/code context read:

- `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md`
- `.ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md`
- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/tool-results.ts`
- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/telemetry.ts`
- `.pi/extensions/goal/widget.ts`
- `.pi/extensions/goal/ui.ts`
- `.pi/extensions/goal/completion-gate.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `README.md`

## Extracted requirements

From `$feature-workflow-pipelines` and `.ai/.pi-goals/create-issue-doc.md`:

- keep the issue doc as the canonical execution-planning source;
- do grounded research against live code before writeback;
- lock meaningful design choices instead of leaving implementation to choose among state/telemetry/event-stream options;
- add proof threat model before required proof rows;
- include importable TOON-style `required_proofs[]` for proof-driven execution;
- create visible artifacts `00-request.md` through `06-final-audit.md` plus `raw/commands.log`;
- verify artifact visibility with `git status --short --untracked-files=all` and `git check-ignore -v <artifact> || true`;
- use real TOON syntax where a block is labeled TOON.

From `AGENTS.md` and `$sentrux`:

- preserve `.pi/extensions/goal/` modular architecture;
- run Sentrux against `.pi/extensions/goal`, not the repo root, for architecture-sensitive work;
- final implementation issue must require `npm run quality:goal`.

From `$axi`:

- agent-facing surfaces should remain explicit, compact, and non-interactive;
- structured output/proof rows should be concrete enough for agents to act without guessing;
- progress metadata must not create ambiguous empty states or misleading status signals.

## Applicability to ISSUE-014

ISSUE-014 has real unresolved design forks:

- state vs telemetry vs separate event stream;
- numeric range semantics;
- note/evidence requirements;
- stale display behavior;
- widget/footer placement;
- whether progress updates count as no-progress safety progress.

Therefore it is not execution-ready until those forks are locked and acceptance/proofs align to the chosen design.

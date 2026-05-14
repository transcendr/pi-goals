# 01 — Protocol read

Issue: ISSUE-011 — goal widget component/layout strategy
Date: 2026-05-10

## Read before writeback

Read or re-read the mandatory workflow and project references for this refinement pass:

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
- `~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/tui.md`
- relevant Pi TUI and Pi interactive component source/type exports
- current `.pi/extensions/goal/widget.ts` and `.pi/extensions/goal/ui.ts`

## Applicable protocol constraints

- Ground claims in current repository/docs/source inspection, not memory.
- Lock the design choice before moving from `refine` to `open`.
- Include a proof threat model and TOON-style `required_proofs[]`.
- Keep artifacts visible and trackable; verify with `git status --short --untracked-files=all` and `git check-ignore -v <artifact> || true`.
- Because this issue changes an agent-facing TUI surface, apply AXI/TUI ergonomics: narrow output must be deterministic, concise, and not produce misleading/truncated chrome.
- Because implementation will edit `.pi/extensions/goal`, require Sentrux and `npm run quality:goal` validation.

## Raw evidence logs

- `raw/pre-refinement-widget-gap.log`
- `raw/tui-source-discovery.log`
- `raw/tui-component-source-excerpts.log`
- `raw/framed-width-thresholds.log`
- `raw/sentrux-gate-pre.log`
- `raw/reference-inventory-pre.log`
- `raw/commands.log`

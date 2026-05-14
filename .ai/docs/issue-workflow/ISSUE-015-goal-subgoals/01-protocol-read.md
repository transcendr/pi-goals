# 01 — Protocol read

## Files read in full or current read context

- `AGENTS.md`
- `.ai/.pi-goals/create-issue-doc.md`
- `~/.codex/feature-workflow-pipelines/SKILL.md`
- `~/.codex/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `~/.codex/feature-workflow-pipelines/references/research-pass.md`
- `~/.codex/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `~/.codex/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `~/.agents/skills/axi/SKILL.md`

## Extracted requirements

- Keep the issue doc as the canonical planning artifact.
- Ground claims in live code/docs and write findings back into the issue.
- Lock meaningful design choices; do not mark execution-ready while major product/API/architecture forks remain open.
- Add TOON synthesis using real TOON syntax, not decorative bullets.
- Add proof threat model before final required proofs.
- Include importable `required_proofs[]` rows when the issue is intended for Solo/TLO execution.
- Preserve visible workflow artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/`.
- Verify artifacts are visible to git/status review and not hidden by `.gitignore`.
- For pi-goals architecture: preserve modular separation under `.pi/extensions/goal/`; use Sentrux as a quality sensor for architecture-sensitive planning.

## Protocol implications for ISSUE-015

- The refinement must lock first-pass subgoal storage, tool surface, UI rendering, completion semantics, and reusable-template child-workflow boundaries.
- Parent/child workflow semantics must not depend on top-level goal replacement or queue delay.
- Proof rows must catch false-green completion where a parent finishes while blocking subgoals remain incomplete or unresolved.

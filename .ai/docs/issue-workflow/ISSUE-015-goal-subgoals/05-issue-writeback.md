# 05 — Issue writeback

Canonical issue updated: `.ai/issues/refine/ISSUE-015-goal-subgoals.md`.

## Sections written back

- Front matter/status: moved from design-needed to execution-ready for a bounded first nested-child implementation pass.
- Goal/problem/context: reframed around parent/child workflow semantics and the `deslop-pipeline` → `dirty-worktree-cleanup` reference case.
- Transcript artifacts: linked `00` through `06` plus raw logs.
- Desired behavior: specified parent/child runtime, reusable child workflows, completion/audit semantics, and UI/tool output.
- Grounded research findings: summarized live code facts from state/tools/completion/UI/queue/template surfaces.
- Locked design choices: recorded owner-selected nested child runtime and rejected alternatives.
- Schema sketch: added first-pass subgoal status/record shape.
- Model-tool surface: proposed separate subgoal tools rather than overloading `update_goal`.
- Implementation checklist: mapped expected edit surfaces.
- Acceptance criteria: made completion blockers, template containment, replay, UI, and validation concrete.
- Proof threat model: added primary invariant and false-green modes.
- TOON synthesis: added valid TOON rows for requirements, invariants, surfaces, and verification.
- Required proofs: added importable `required_proofs[]` rows for Solo/TLO-style closeout.
- Non-goals: bounded scope away from arbitrary nesting, slash commands, parallel agents, and independent proof engine.

## Important design changes from prior draft

- Existing dependencies on ISSUE-011 and ISSUE-014 were downgraded to related issues because first release only needs compact child rendering/counts and does not require progress-percent or widget-card redesign first.
- A high-impact owner decision selected nested child runtime inside the parent, so the issue no longer leaves that architecture fork to implementers.
- Queue/top-level child goal reuse was explicitly rejected as a false solution for blocking prerequisites.

## Evidence sources

- Protocol read: `01-protocol-read.md`.
- Research facts: `02-grounded-research.md`, `raw/research-rg.log`, `raw/sentrux-gate.log`.
- Owner decision and design lock: `03-design-lock.md`.
- Proof threat model: `04-proof-threat-model.md`.

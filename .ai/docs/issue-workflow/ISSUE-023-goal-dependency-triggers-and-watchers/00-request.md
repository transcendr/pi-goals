# 00 — Request intake for ISSUE-023

## Parsed request

- Target bucket: `open`
- Issue kind: `feature`
- Requested title: `goal dependency triggers and external watchers`
- Existing issue to refine: `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`
- Target issue path: `.ai/issues/open/ISSUE-023-goal-dependency-triggers-and-watchers.md`
- Artifact directory: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/`

## User/context requirements

Refine existing ISSUE-023 until it is execution-ready, then move the canonical issue doc from `issues/refine` to `issues/open`.

Required coordination:

- Treat `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md` as the dependency baseline.
- Coordinate with `.ai/issues/open/ISSUE-019-parallel-multiple-goals.md` for multi-goal/worktree boundaries.
- Resolve stale dependency paths during refinement.

Design choices to lock:

- first-version watcher types;
- execution ownership;
- persistence/reload behavior;
- stale guards;
- timeout/resource limits;
- UI/list/cancel surface;
- worktree/multi-goal boundaries;
- validation proofs.

Required artifacts:

- visible workflow artifacts under this directory;
- proof threat model;
- TOON `required_proofs[]` block;
- raw command transcript;
- artifact visibility and ignore checks before completion.

## Assumptions

- The explicit existing issue number `ISSUE-023` is preserved.
- No clarification is needed because target bucket, kind, title, and source issue are explicit.
- This is a planning/doc-refinement goal, not runtime implementation.

## Initial validation expansion

A pre-refinement invariant gap probe was run before drafting final issue content:

- `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/pre-refinement-invariant-gap.log`

It confirms the refine issue names the important watcher safety invariants but still has unresolved forks around watcher types, execution owner, persistence, and multi-goal/worktree boundaries. The promoted issue must lock those forks.

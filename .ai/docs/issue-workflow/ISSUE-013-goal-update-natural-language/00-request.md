# 00 — Request intake

Issue: ISSUE-013 — `/goal update` natural-language goal updates
Date: 2026-05-10

## User request

Refine existing `.ai/issues/refine/ISSUE-013-goal-update-natural-language.md` into an execution-ready canonical issue doc, then promote it to `.ai/issues/open/`, following `$feature-workflow-pipelines` visibly.

Required visible artifacts:

- `00-request.md`
- `01-protocol-read.md`
- `02-grounded-research.md`
- `03-design-lock.md`
- `04-proof-threat-model.md`
- `05-issue-writeback.md`
- `06-final-audit.md`
- `raw/commands.log`

Required content/proof:

- protocol reads;
- grounded research;
- design lock;
- proof threat model;
- TOON `required_proofs[]` in the promoted issue;
- validation probes for parser, trust-boundary, confirmation, completion, budget, and progress invariants;
- artifact visibility checks;
- prompt-to-artifact completion audit.

## Target paths

- Source refine issue: `.ai/issues/refine/ISSUE-013-goal-update-natural-language.md`
- Promoted canonical issue: `.ai/issues/open/ISSUE-013-goal-update-natural-language.md`
- Artifact directory: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/`

## Non-implementation boundary

This pass is a planning/refinement promotion pass. It locks design choices and makes the issue execution-ready, but does not implement `/goal update` yet.

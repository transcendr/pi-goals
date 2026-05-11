# 12 — Validation expansion

Selected floor pass: `validation_expansion`.

Concrete probe: a Node-based issue-doc audit saved output to `raw/validation-expansion-probe.log`.

## What the probe checks

The probe fails if the main issue-doc workflow invariant is not met:

- canonical ISSUE-021 file exists;
- required canonical sections exist;
- every workflow artifact named by this refinement exists;
- the canonical issue links those artifacts;
- required proof probes are present;
- TOON blocks are present;
- workflow artifacts are visible to git and not hidden by `.gitignore`.

## First run result

The first run failed usefully:

- `11-proof-condition-matrix.md` existed but was not linked from the canonical issue;
- the initial proof-row counter was too narrow because it counted only rows whose `source` was `"issue doc"`, while one valid required proof row is sourced from `AGENTS.md`.

Corrective action: link `11-proof-condition-matrix.md` and this validation artifact from the issue, then rerun the probe with a total required-proof row count.

## Final run result

After the runner-safety research artifact was added, the probe was strengthened again to discover all numbered workflow artifacts dynamically. The final run passed and verified artifact links through `13-runner-safety-research.md` plus `raw/commands.log`.

## Why this covers the invariant

The active goal is not to implement proof gates yet; it is to refine ISSUE-021 through the create-issue-doc workflow. The highest-risk false-green for this goal is a plausible issue doc that misses required workflow artifacts, artifact links, required proof rows, or git visibility. This probe directly checks those properties and fails on omissions.

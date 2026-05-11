# 03 — Design lock

## Meaningful options

### Storage

1. Store proof gates directly on `GoalState`.
2. Store proof gates only in prompt template metadata/frontmatter.
3. Store proof gates in external issue docs or comments only.

Chosen: store effective proof gates on `GoalState`, with template/frontmatter/user tools allowed to populate them later. `GoalState` is the completion gate's source of truth, is replayable, and survives context shifts.

### Execution owner

1. Model manually runs commands and reports results.
2. Extension runtime executes bounded proof commands.
3. External verifier process executes proofs.

Chosen first release: extension runtime executes explicitly configured proof commands through bounded `pi.exec`/tool-owned runner semantics. Model-manual proof remains supporting evidence but cannot satisfy durable gates by itself.

### Condition DSL

Chosen first release:
- `exit_zero`
- `stdout_contains`
- `stderr_contains`
- `output_contains`
- `stdout_regex` only if safely bounded and using JavaScript RegExp without eval-like dynamic code.

Reject arbitrary shell/eval condition DSL in first release.

### Freshness

Chosen first release:
- Proof result records command/config hash, goal `updatedAt`, cwd, started/completed timestamps, exit code, and bounded output excerpt.
- Proof is stale if gate definition changes, goal objective/proof config changes, or repo state fingerprint changes when `freshness: "worktree"` is configured.
- First release can use a simple fingerprint command such as `git status --short --untracked-files=all` plus relevant file mtime/hash only if needed; avoid overbuilding full provenance.

### Overrides

Chosen first release: no model force-complete override for failed required proofs. User can remove/disable proof gate or clear/replace goal; such changes are auditable through goal state events.

## Execution readiness

This issue is now execution-ready for a first implementation pass because core product/architecture choices are locked. Deeper CI integration and cryptographic attestation remain deferred.

## Scope boundary locked after related-issue pass

- Do not merge `/goal audit` into ISSUE-021. Audit remains a qualitative command in ISSUE-024 and may display proof states later.
- Do not delegate required proof pass/fail to the churn monitor. Churn monitor remains a model-judgment backstop; proof gates are deterministic runtime gates.
- Do add proof-blocked completion metadata to tool result details, analogous to floor-blocked completion metadata, so future telemetry and UI can reason about blocked completion precisely.

## Architecture constraint after Sentrux sensor

The current goal extension has no cycles or god files. ISSUE-021 should keep proof condition evaluation, proof command execution, and tool-result formatting in separate modules. If `tools.ts` starts approaching Sentrux line/coupling limits during execution, extraction is mandatory rather than optional.

## Coordination boundary with subgoals/checkpoints/watchers

- First release gates only top-level goal completion. Subgoal-level proof gates are a future extension after ISSUE-015's schema is locked.
- Proof results should be compact enough for ISSUE-022 checkpoints to summarize later, but checkpoint generation is not part of ISSUE-021.
- Do not merge proof-runner and watcher semantics prematurely. A shared bounded runner may be extracted later, but proof commands are not persistent wait conditions.

## Runner safety lock

Proof command execution may use existing bounded execution patterns (`pi.exec` or `/bin/bash -lc` with timeout/output caps), but only for explicit proof gates persisted on the goal. Template inline commands and monitor judgments are not proof authority.

# 06 — Issue writeback

## Issue doc updated

Path:

```text
.ai/issues/open/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks.md
```

Status decision: implementation-ready.

## Front matter changes

```toon
toon.version: 1
front_matter_changes[3]{field,before,after}:
  "Status","execution-ready","implementation-ready"
  "Next best session","implementation-ready-issue","execute-issue-stack"
  "Next best session rationale","produce exact patch/proof plan","architecture, surfaces, patch order, validation order, rollout flag contract, and proofs are locked"
```

## Sections added/updated

```toon
sections[7]{section,change,notes}:
  "Implementation-ready plan",added,"artifact links, exact surfaces, locked implementation choices, patch summary, validation sequence, blocker policy, handoff notes"
  "TOON synthesis issue row",updated,"status implementation-ready and target_session execute-issue-stack"
  "Exact implementation surfaces",added,"new modules and edited modules named with planned change"
  "Locked implementation choices",added,"tool schema fields, action persistence, flag contract, ticket durability, failure behavior"
  "Patch sequence summary",added,"10-step summary tied to detailed 04-patch-sequence.md"
  "Validation/proof sequence",added,"deterministic probes, quality gate, and live probe"
  "Deslop/production-hardening guidance",added,"links 08-deslop-guidance-map.md and tells implementers when to use it"
```

## Implementation-ready artifacts linked

```toon
artifacts[10]{path,status}:
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/00-intake.md",linked
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/01-protocol-read.md",linked
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/02-live-surface-research.md",linked
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/03-implementation-design-lock.md",linked
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/04-patch-sequence.md",linked
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/05-proof-plan.md",linked
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/06-issue-writeback.md",linked
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/07-final-audit.md",linked
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/08-deslop-guidance-map.md",linked
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/raw/commands.log",linked
```

## TOON validation

All TOON blocks in the ISSUE-044 issue doc and both execution-readiness/implementation-readiness artifact sets were extracted to `/tmp` and decoded with:

```bash
npx -y @toon-format/cli --decode <block>.toon >/dev/null
```

Final successful implementation-readiness run decoded 54 TOON blocks before the deslop map was added. The deslop map was later validated separately with 2 decoded TOON blocks, and the template/issue update rerun decoded the changed template/issue TOON blocks. Earlier validation exposed two pre-existing/created syntax defects (`issue{...}` and `sentrux[4]` with two rows); both were corrected and rerun successfully.

## Cardinality reconciliation

```toon
cardinality[3]{count_name,expected,actual,status}:
  "resolved_count",1,1,pass
  "issue_writeback_count",1,1,pass
  "final_audit_issue_rows",1,1,pass
```

## Commands recorded

See [`raw/commands.log`](raw/commands.log) for:

- live surface research commands;
- Sentrux sensor commands;
- TOON validation attempts and successful rerun;
- later final visibility checks.

# 00 — Intake

Issue: `ISSUE-045`
Issue path: `.ai/issues/open/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode.md`
Implementation-readiness directory: `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/implementation-readiness/`
Resolved stack id: `implementation-ready-ISSUE-045`
Resolved count: `1`

## Execution-ready gate

Status: pass.

Evidence:

- Issue status before this pass: `execution-ready`.
- Scope is locked: summarize queue stacks are the supported main path; clear is default-off behind explicit gate.
- Non-goals/constraints are locked: do not make queue state globally durable across manual tree navigation; do not silently downgrade clear to summarize; do not treat Codex desync as unrelated.
- Acceptance criteria and required proofs are present.
- Linked execution-readiness artifacts exist under `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/`.

## Implementation-readiness target

Bring the issue to implementation-ready by designing exact patch boundaries, edit order, validation order, and deslop review map for:

1. Clear-specific default-off gate.
2. Safe summarize queue stack handoff across automated context-reset navigation.
3. Stale queue-steer suppression.
4. Avoiding tool-call desync by not navigating during tool execution.

## Cardinality

```toon
toon.version: 1
cardinality[1]{selector,resolved_count,issues_processed}:
  ".ai/issues/open/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode.md",1,1
```

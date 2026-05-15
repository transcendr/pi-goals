# 05 — Issue writeback

Canonical issue doc written:

- `.ai/issues/open/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode.md`

## Sections written

- Front matter: status, priority, owner, created/updated dates, next best session, target bucket/kind, target repo root, dependencies/related files.
- Goal.
- Transcript artifact links.
- Problem/context.
- Why it matters.
- Desired behavior for summarize queue stacks and clear gating.
- Grounded research findings with TOON facts.
- Locked design choices and rejected alternatives.
- Execution checklist.
- Acceptance criteria.
- Proof threat model summary.
- Importable `required_proofs[]` TOON block.
- TOON synthesis.

## Planning truth written back

```toon
toon.version: 1
writeback_facts[6]{id,fact}:
  "wb1","ISSUE-045 is execution-ready, not implementation-ready"
  "wb2","next best session is implementation-ready-issue to produce exact patch/proof sequencing"
  "wb3","summarize queue stacks are explicitly the supported main use case"
  "wb4","clear context reset is locked as default-off behind a new explicit gate"
  "wb5","queue repair is scoped to pi-goal automated reset, not global queue durability"
  "wb6","live Codex tool-call desync is treated as feature-caused/exposed until disproven"
```

## Required proof coverage written back

The issue doc includes deterministic probes for:

- clear default-off behavior;
- queue payload repair after automated reset navigation;
- stale queue-steer generation/consumption suppression;
- manual tree replay semantics;
- model-tool enqueue/start one-shot consumption;
- existing post-completion action regressions;
- Sentrux baseline, no TypeScript escape hatches, and `npm run quality:goal`.

The issue doc also requires a fresh live summarize queue-stack probe with no Codex `No tool call found...` error and no stale queue-steer loop.

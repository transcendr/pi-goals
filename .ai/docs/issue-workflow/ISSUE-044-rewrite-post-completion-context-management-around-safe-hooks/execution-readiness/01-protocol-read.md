# 01 — Protocol read

## Files read

```toon
toon.version: 1
docs_read[9]{id,path,purpose}:
  "d1","AGENTS.md","project issue workflow, artifact hygiene, quality gates, queue semantics"
  "d2","~/.codex/feature-workflow-pipelines/SKILL.md","governing issue-first canonical-doc workflow"
  "d3","~/.codex/feature-workflow-pipelines/references/execution-planning-vs-implementation-planning.md","execution-ready boundary and implementation-detail delegation"
  "d4","~/.codex/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md","issue doc structure, proof threat model, required_proofs[]"
  "d5","~/.codex/feature-workflow-pipelines/references/research-pass.md","grounded code research loop"
  "d6","~/.codex/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md","design fork locking"
  "d7","~/.codex/feature-workflow-pipelines/references/design-locking-patterns-and-interview-rules.md","bounded owner interview and writeback rules"
  "d8","~/.codex/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md","TOON execution-planning content guidance"
  "d9","~/.agents/skills/axi/SKILL.md","TOON/AXI output syntax discipline required by issue TOON blocks"
```

Also read:

```toon
additional_docs[1]{path,purpose}:
  "~/.codex/sentrux/SKILL.md","architecture sensor guidance; docs-only issue creation does not require gate, but implementation issue must require it before edits"
```

## Extracted requirements

```toon
requirements[10]{id,source,requirement}:
  "r1","feature-workflow-pipelines","issue doc becomes canonical planning doc before execution"
  "r2","feature-workflow-pipelines","execution-ready means meaningful product/API/architecture forks are locked or explicitly rejected/deferred"
  "r3","feature-workflow-pipelines","run grounded research against live code before finalizing planning truth"
  "r4","feature-workflow-pipelines","record locked design choices, rejected alternatives, and downstream consequences"
  "r5","feature-workflow-pipelines","include proof threat model before final proof rows"
  "r6","feature-workflow-pipelines","include importable required_proofs[] TOON when Solo/TLO proof closeout is expected"
  "r7","toon reference","TOON blocks must be real TOON syntax with toon.version: 1 and structured rows"
  "r8","AGENTS.md","visible issue-workflow artifacts under .ai/docs/issue-workflow are allowed and required by workflow"
  "r9","AGENTS.md","for .pi/extensions/goal implementation, require sentrux gate --save before substantial implementation and npm run quality:goal after implementation"
  "r10","feature-workflow-pipelines","for live runtime/control helpers, deterministic probes are not enough; require bounded disposable live probe plus cleanup unless explicitly planning-only"
```

## Pipeline selected

Issue-first canonical-doc pipeline.

Rationale: the requested output is a new canonical feature issue under `.ai/issues/open/`, grounded against existing code but designed as a rewrite from first principles. This is not implementation work in this session.

## Owner decision state

One design-locking interview already happened in the active conversation before this goal was created. The owner selected a two-stage plan for the template-directive bug and structured hooks/tool API direction, then asked this queue item to re-process the feature rewrite issue from scratch around the broader architecture. No additional owner question is needed unless new research reveals an unclosed fork.

## Sentrux handling

This pass creates planning docs only. It does not edit `.pi/extensions/goal` implementation code, so Sentrux is not a gate for this session. The generated issue must require future implementation sessions to run:

```bash
sentrux gate --save .pi/extensions/goal
npm run quality:goal
```

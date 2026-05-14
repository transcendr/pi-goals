# 01 — Protocol read

## Files/resources read

```toon
toon.version: 1
protocol_docs[10]{id,path,purpose}:
  "p1","AGENTS.md","project quality gates, artifact hygiene, queue semantics, live probe rule"
  "p2",".ai/.pi-goals/implementation-ready-issue.md","governing implementation-readiness workflow"
  "p3","~/.codex/feature-workflow-pipelines/SKILL.md","canonical issue workflow, design-locking and TOON requirements"
  "p4","~/.codex/feature-workflow-pipelines/references/execution-planning-vs-implementation-planning.md","boundary between execution-ready and implementation-ready"
  "p5","~/.codex/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md","issue writeback and required_proofs[] requirements"
  "p6","~/.codex/feature-workflow-pipelines/references/research-pass.md","live-code grounding requirements"
  "p7","~/.codex/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md","implementation fork handling"
  "p8","~/.codex/feature-workflow-pipelines/references/design-locking-patterns-and-interview-rules.md","bounded owner interview protocol"
  "p9","~/.codex/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md","TOON content and proof rows"
  "p10","~/.agents/skills/axi/SKILL.md","valid compact TOON and structured output discipline"
```

Additional technical references:

```toon
technical_docs[5]{path,purpose}:
  "~/.codex/sentrux/SKILL.md","structural quality sensor usage"
  "~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md","extension capabilities and imports"
  "~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/settings.md","settings resource paths; no per-extension settings API evidence"
  "~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts","ExtensionContext/ExtensionCommandContext capabilities"
  ".ai/docs/pi-goals-live-probe-testing.md","live probe process and evidence standards"
```

Issue and transcript artifacts read:

```toon
issue_artifacts[8]{path,purpose}:
  ".ai/issues/open/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks.md","canonical issue input"
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/00-request.md","owner request and locked context"
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/01-protocol-read.md","execution-readiness protocol constraints"
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/02-grounded-research.md","current implementation facts and gaps"
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/03-design-lock.md","locked architecture choices"
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/04-proof-threat-model.md","primary invariant, false-greens, proof rows"
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/05-issue-writeback.md","canonical issue writeback checklist"
  ".ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/06-final-audit.md","execution-readiness audit"
```

Related planning docs read:

```toon
related_docs[2]{path,purpose}:
  ".ai/issues/open/ISSUE-043-per-goal-post-completion-context-reset.md","legacy implementation context and preserved semantics"
  ".ai/docs/pi-goals-live-probe-testing.md","future live proof protocol"
```

## Extracted implementation-readiness requirements

```toon
requirements[11]{id,requirement}:
  "r1","read the selected issue and all linked transcript artifacts"
  "r2","verify the issue is execution-ready before marking implementation-ready"
  "r3","ground exact live implementation surfaces instead of relying on planning prose"
  "r4","lock exact implementation approach, including files/modules/functions and meaningful alternatives"
  "r5","ask one focused owner question for any implementation fork affecting behavior/API/proof shape"
  "r6","write ordered patch sequence with dependencies, validation points, rollback/recovery notes, and stop conditions"
  "r7","harden proof plan so every high-risk false-green has a failing proof"
  "r8","add/update implementation-ready plan in the issue doc and update status only if gates pass"
  "r9","validate changed TOON blocks with a TOON decoder"
  "r10","verify artifact visibility with git status and git check-ignore"
  "r11","cardinality must reconcile: resolved_count=1, issue writeback count=1, final audit issue rows=1"
```

## Project constraints carried forward

```toon
project_constraints[5]{id,constraint}:
  "pc1","before substantial implementation, run sentrux gate --save .pi/extensions/goal"
  "pc2","after implementation, run npm run quality:goal"
  "pc3","do not use TypeScript escape-hatch casts in .pi/extensions/goal, especially as unknown as or as any"
  "pc4","usually run a live probe for pi-goals behavior changes affecting commands/queue/resume/status/runtime"
  "pc5","repo-tracked issue workflow artifacts under .ai/docs/issue-workflow are allowed/required for this workflow"
```

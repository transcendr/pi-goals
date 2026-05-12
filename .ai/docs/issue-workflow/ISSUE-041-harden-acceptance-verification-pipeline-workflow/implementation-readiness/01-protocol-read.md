# 01 — Protocol read

## Files/resources read

```toon
toon.version: 1
protocol_reads[22]{id,path,purpose}:
  "r1","AGENTS.md","project rules: modular extension architecture, Sentrux/quality gate, issue workflow artifacts, live probes, Solo context"
  "r2",".ai/issues/open/ISSUE-041-harden-acceptance-verification-pipeline-workflow.md","resolved issue source of truth"
  "r3",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/execution-readiness/00-request.md","original remediation request and point list"
  "r4",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/execution-readiness/01-protocol-read.md","prior protocol read for issue creation"
  "r5",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/execution-readiness/02-grounded-research.md","root-cause facts and inspected surfaces"
  "r6",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/execution-readiness/03-design-lock.md","locked design choices and rejected alternatives"
  "r7",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/execution-readiness/04-proof-threat-model.md","false-green risks and required proofs"
  "r8",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/execution-readiness/05-issue-writeback.md","issue writeback facts"
  "r9",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/execution-readiness/06-final-audit.md","issue creation audit"
  "r10",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/execution-readiness/07-followup-rerun-observation.md","follow-up no-batch/mid-run/model observation"
  "r11",".ai/issues/open/ISSUE-037-goal-queue-auto-continuation-after-complete.md","dependency for complete-status queue handoff"
  "r12",".ai/issues/open/ISSUE-040-verify-acceptance-pipeline-goal-templates.md","parent workflow/template intent"
  "r13",".ai/docs/pi-goals-live-probe-testing.md","live probe process and cleanup rules"
  "r14","/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/SKILL.md","governing planning workflow; already freshly present in context"
  "r15","/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md","canonical issue and proof/TOON rules; freshly present"
  "r16","/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/execution-planning-vs-implementation-planning.md","implementation-planning distinction"
  "r17","/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/research-pass.md","grounded research method; freshly present"
  "r18","/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md","design lock method; freshly present"
  "r19","/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md","TOON issue-planning guidance; freshly present"
  "r20",".ai/docs/prompt-template-authoring.md","template authoring standards because ISSUE-041 changes .ai/.pi-goals templates"
  "r21","/Users/bryan/.agents/skills/axi/SKILL.md","AXI rules for agent-facing CLI/helper output and structured errors"
  "r22","/Users/bryan/.pi/agent/.cache/codex-skills/axi-toon-cli/SKILL.md","AXI/TOON CLI validation and transcript standards"
```

## Extracted implementation-planning requirements

```toon
implementation_requirements[12]{id,requirement}:
  "ir1","Keep extension code modular and preserve separation among lifecycle, tools, queue, prompts/templates, validation, and telemetry surfaces."
  "ir2","Before substantial implementation, run `sentrux gate --save .pi/extensions/goal`; after implementation, run `npm run quality:goal`."
  "ir3","Do not use TypeScript escape hatches `as unknown as` or `as any` in `.pi/extensions/goal`."
  "ir4","Implementation-ready plan must name exact files/functions, patch order, validation order, rollback/fallback, and handoff notes."
  "ir5","Template changes require reading `.ai/docs/prompt-template-authoring.md`, resolver smoke tests, `list_goal_templates`, and read-only inline command safety."
  "ir6","Live runtime/control behavior requires a bounded live probe unless explicitly skipped with rationale; ISSUE-041 must not skip because the bug is live acceptance-worker behavior."
  "ir7","TOON blocks added/changed in issue docs or artifacts must be valid and decoded before closeout."
  "ir8","Agent-facing CLI/helper output should stay compact, structured, non-interactive, and validation transcripts should prove exact commands."
  "ir9","Do not silently broaden ISSUE-041 into unrelated queue redesign; patch only queue terminal handoff, budgetLimited replacement, acceptance templates, and validation probes."
  "ir10","Use Solo process send semantics safely: separate slash commands, status/output readiness checks, no timer helpers for the acceptance pipeline."
  "ir11","Worker profile/model setup must be explicit and verified before prompt send: `--profile solo-researcher-strong` and `/model opencode-go/glm-5.1`."
  "ir12","Cardinality closeout must reconcile resolved_count=1, issue writeback count=1, and final audit issue rows=1."
```

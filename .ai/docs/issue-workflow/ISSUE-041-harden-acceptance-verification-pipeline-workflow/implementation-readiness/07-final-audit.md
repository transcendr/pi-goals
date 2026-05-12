# 07 — Final audit

## Objective restatement

Take resolved ISSUE-041 from execution-ready to implementation-ready by creating durable implementation-readiness artifacts, grounding live implementation surfaces, locking patch/proof plans, writing an Implementation-ready plan back to the issue doc, validating changed TOON/artifact visibility, and reconciling cardinality.

## Prompt-to-artifact checklist

```toon
toon.version: 1
prompt_artifact_checklist[17]{requirement,evidence,status}:
  "process every resolved issue row","resolved context has one row for ISSUE-041 and artifacts/writeback target ISSUE-041 only","pass"
  "read AGENTS and issue doc","01-protocol-read.md lists AGENTS.md and .ai/issues/open/ISSUE-041-harden-acceptance-verification-pipeline-workflow.md","pass"
  "read linked transcript artifacts and related planning docs","01-protocol-read.md lists ISSUE-041 issue-workflow artifacts, ISSUE-037, ISSUE-040, live probe docs, and follow-up rerun observation","pass"
  "use feature-workflow-pipelines references","01-protocol-read.md lists governing skill and references for canonical docs, implementation planning, research, design locking, and TOON","pass"
  "read prompt-template authoring guide because .ai/.pi-goals are planned edit surfaces","01-protocol-read.md lists .ai/docs/prompt-template-authoring.md","pass"
  "use AXI/TOON expectations for agent-facing helpers","01-protocol-read.md lists axi and axi-toon-cli skills and requirements","pass"
  "00-intake.md exists",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/00-intake.md","pass"
  "01-protocol-read.md exists",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/01-protocol-read.md","pass"
  "02-live-surface-research.md exists",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/02-live-surface-research.md","pass"
  "03-implementation-design-lock.md exists",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/03-implementation-design-lock.md","pass"
  "04-patch-sequence.md exists",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/04-patch-sequence.md","pass"
  "05-proof-plan.md exists",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/05-proof-plan.md","pass"
  "06-issue-writeback.md exists",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/06-issue-writeback.md","pass"
  "07-final-audit.md exists","this file","pass"
  "raw commands log exists",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/raw/commands.log","pass"
  "issue doc updated with Implementation-ready plan",".ai/issues/open/ISSUE-041-harden-acceptance-verification-pipeline-workflow.md status is open — implementation-ready and contains Implementation-ready plan","pass"
  "artifact visibility verified","git status shows workflow phase artifacts as untracked and git check-ignore non-ignore confirmed through the existing issue-workflow exception","pass"
```

## Implementation-ready gate audit

```toon
implementation_ready_gate_audit[8]{id,gate,evidence,status}:
  "g1","execution-ready input","00-intake.md records execution-ready gate pass and issue doc contains locked scope, non-goals, design choices, acceptance criteria, and required proofs","pass"
  "g2","surface map","02-live-surface-research.md names runtime, template, validation, package, and Solo live surfaces with edit/create/read-only classifications","pass"
  "g3","patch order","04-patch-sequence.md gives ordered runtime, template, probe, quality, live-probe, and closeout steps with dependencies","pass"
  "g4","validation order","05-proof-plan.md lists deterministic probes, quality gate, TOON decode, artifact visibility, and bounded live acceptance probe in order","pass"
  "g5","false-green coverage","05-proof-plan.md maps ten likely false-green outcomes to specific catching proofs","pass"
  "g6","blocker policy","04-patch-sequence.md stop conditions and issue Implementation-ready plan blocker/fallback policy cover Solo profile/model, runtime API widening, and ambiguous live evidence","pass"
  "g7","artifact visibility",".gitignore exposes .ai/docs/issue-workflow/** and git status shows the phase-scoped artifacts","pass"
  "g8","handoff clarity","03-implementation-design-lock.md and 04-patch-sequence.md name exact files, functions/modules, boundaries, edit order, rollback, and non-goals","pass"
```

## Cardinality reconciliation

```toon
cardinality_reconciliation[1]{resolved_count,issue_writeback_count,final_audit_issue_rows,status}:
  1,1,1,"pass"
issue_rows[1]{issue,path,readiness_dir,status_decision}:
  "ISSUE-041",".ai/issues/open/ISSUE-041-harden-acceptance-verification-pipeline-workflow.md",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness","implementation-ready"
```

## Validation performed

```toon
validation_performed[3]{name,command,result}:
  "TOON decode","extracted 39 ISSUE-041 TOON blocks from the issue doc and phase-scoped artifacts then ran npx -y @toon-format/cli --decode for each","pass"
  "artifact visibility","git status --short --untracked-files=all","pass; workflow phase artifacts visible through the existing issue-workflow .gitignore exception"
  "ignore check","git check-ignore .ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/00-intake.md","pass; exit 1 means representative artifact is not ignored"
```

## Files changed by this implementation-readiness pass

```toon
files_changed[10]{path,purpose}:
  ".ai/issues/open/ISSUE-041-harden-acceptance-verification-pipeline-workflow.md","status and Implementation-ready plan writeback; TOON status/schema adjusted to decode"
  ".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/00-intake.md","intake and execution-ready gate"
  ".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/01-protocol-read.md","protocol/resource read record and extracted requirements"
  ".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/02-live-surface-research.md","live code/docs/tooling surface research"
  ".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/03-implementation-design-lock.md","locked implementation approach and alternatives"
  ".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/04-patch-sequence.md","ordered patch plan and rollback/stop conditions"
  ".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/05-proof-plan.md","proof threat model, validation sequence, and required proofs"
  ".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/06-issue-writeback.md","writeback record"
  ".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/07-final-audit.md","final audit and cardinality reconciliation"
  ".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/implementation-readiness/raw/commands.log","discovery and validation command transcript"
```

## Final decision

ISSUE-041 is implementation-ready. No unresolved blocker remains for implementation planning. Future implementation should follow `04-patch-sequence.md` and `05-proof-plan.md` before changing runtime/template code.

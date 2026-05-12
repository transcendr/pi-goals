# 00 — Request intake

## Parsed request

Create an execution-ready issue doc in `.ai/issues/open/` for remediation after the first live run of the ISSUE-040 acceptance-verification templates.

## Inputs

```toon
toon.version: 1
request{id,bucket,kind,title,issue_number,issue_path,artifact_dir}:
  "REQ-041","open","remediation","Harden acceptance verification pipeline workflow","ISSUE-041",".ai/issues/open/ISSUE-041-harden-acceptance-verification-pipeline-workflow.md",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow"
remediation_points[4]{id,summary}:
  "P1","Acceptance worker created first per-criterion goal with arbitrary 20K token ceiling; when hit, queue processing stopped idle instead of continuing to next queue item."
  "P2","Worker enqueued item goals but then substituted one big all-items check and emitted false-green TOON, violating head-to-tail item-goal workflow."
  "P3","After the big TOON, no pi-goal-queue-steer continuation arrived until the user manually instructed the worker not to stop."
  "P4","After restart, worker initially created/dequeued goals ceremoniously from prior aggregate result, then later did individual checks with thin/minimal Python snippets."
```

## Assumptions

- This is a new follow-up issue, not a modification of ISSUE-040.
- Target bucket is `open` because remediation work remains.
- Issue kind is `remediation` because the target is hardening behavior that exists but produced poor live execution.
- The issue should explicitly connect to ISSUE-040 and the first ISSUE-036 acceptance-pipeline run.
- If a later symptom is likely caused by an earlier root issue, the issue doc should document the causal relationship instead of proposing redundant fixes.

## Clarification result

No clarification was needed: the user supplied the target workflow, concrete symptoms, and desired planning outcome.

## Number/path choice

`ISSUE-041` was selected from the next issue number hint and verified with `find .ai/issues -type f -name 'ISSUE-*.md'`.

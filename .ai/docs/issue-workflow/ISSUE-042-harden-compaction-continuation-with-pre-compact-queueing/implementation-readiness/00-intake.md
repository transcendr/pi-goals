# 00 — Implementation-readiness intake

Resolved issue row:

```toon
toon.version: 1
issues[1]{issue,bucket,path,slug,readiness_dir}:
  "ISSUE-042","open",".ai/issues/open/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing.md","harden-compaction-continuation-with-pre-compact-queueing",".ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/implementation-readiness"
```

Execution-ready gate:
- Status before this pass: `open — execution-ready`.
- Scope is locked: remediate ISSUE-039 live failure without Pi core changes.
- Primary design is locked: pre-compaction queued continuation/handoff relying on Pi's queued-message resume semantics.
- Fallback design is locked: bounded post-compaction retry for transient readiness skips.
- Acceptance criteria and required proofs exist.
- No user clarification required.

Implementation-readiness task:
- Convert the execution-ready plan into exact implementation surfaces, patch sequence, validation order, and handoff notes.

Artifact directory:
- `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/implementation-readiness/`

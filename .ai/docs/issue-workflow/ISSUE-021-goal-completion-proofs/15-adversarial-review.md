# 15 — Adversarial review

## Review question

If an executor used ISSUE-021 as written, what could still produce a false-green implementation or unsafe proof-runner design?

## Findings

### 1. Proof-runner trust boundary could be under-specified

Risk: an implementation might auto-execute commands discovered in prompt/template text rather than explicit persisted proof gates.

Mitigation already added: issue states proof commands must be explicit goal proof configuration and prompt-template frontmatter auto-execution is deferred.

### 2. Contains conditions could mask non-zero exits

Risk: `output_contains: PASS` could pass even when a command exits non-zero and prints stale/partial output.

Mitigation already added: condition matrix says contains/regex conditions should require exit zero by default unless explicitly disabled, and runner records both exit code and condition result.

### 3. State growth could become unbounded

Risk: storing full proof outputs in `GoalState` could bloat branch entries/provider context.

Mitigation already added: output excerpts, output caps, max retained results per gate, and compact checkpoint coordination are documented.

### 4. Proof gates could incorrectly stale on usage accounting

Risk: token/time accounting updates could invalidate otherwise fresh proof results, causing useless reruns.

Mitigation already added: condition matrix says token/time usage accounting alone should not stale proof results.

### 5. Completion side effects could happen before proof deferral

Risk: `update_goal(status:"complete")` could cancel monitor/continuation or persist complete state before proof gate evaluation.

Mitigation already added: dataflow/seam notes and issue implementation checklist require proof deferral before cancellation/persistence side effects.

### 6. The model could configure weak proofs

Risk: if the same model that wants to complete can freely configure proof gates, it could add a weak gate such as `true` and then satisfy it. Proof gates prevent unsubstantiated claims, but they are only as strong as the configured proof requirements.

Mitigation: issue execution must extract exact required proofs from the issue doc/objective, and proof gate edits/removals require explicit auditable operations. This feature does not solve malicious/self-dealing proof selection by itself; trusted issue docs, user instructions, and review remain the source of proof obligations.

## Net assessment

The issue is execution-ready for a first proof-gate implementation. Remaining risks are now explicit enough to be handled by required probes and implementation review rather than more issue refinement.

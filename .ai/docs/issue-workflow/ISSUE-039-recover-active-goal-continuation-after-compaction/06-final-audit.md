# 06 — Final audit

Protocol compliance matrix:

| Requirement | Evidence |
| --- | --- |
| Queue item classified before start | `00-request.md` records reusable-template check, missing `create-skill-doc`, and user clarification to use `create-issue-doc`; `start_queued_goal` was not called for this orchestration item. |
| Required inputs parsed | `00-request.md` records bucket `open`, kind `fix`, title, context, issue number/path. |
| Protocol docs read | `01-protocol-read.md` lists AGENTS, create-issue-doc, feature workflow skill, references, and AXI. |
| Issue bucket selected | `.ai/issues/open/ISSUE-039-recover-active-goal-continuation-after-compaction.md`. |
| Next issue number determined | `00-request.md` and `raw/commands.log` record `ISSUE-039`. |
| Transcript directory created | `.ai/docs/issue-workflow/ISSUE-039-recover-active-goal-continuation-after-compaction/`. |
| Raw command transcript captured | `raw/commands.log`. |
| Grounded research performed | `02-grounded-research.md` plus copied command outputs; inspected pi-goals continuation/lifecycle/types/telemetry, Pi compaction docs, extension docs, and Pi core agent-session implementation. |
| Design choices locked | `03-design-lock.md` chooses pi-goals compaction-aware continuation and rejects Pi-core-only/prompt-only/fixed-delay alternatives. |
| Proof threat model written | `04-proof-threat-model.md` identifies primary invariant, false-green risks, and proof strategy. |
| Canonical issue doc written | `.ai/issues/open/ISSUE-039-recover-active-goal-continuation-after-compaction.md`. |
| Issue links to artifacts | Issue doc `Transcript artifacts` section links to every required artifact. |
| TOON required proofs included | Issue doc includes valid `required_proofs[5]{...}` TOON block. |
| Artifact visibility checked | `raw/commands.log` includes `git status --short --untracked-files=all` and `git check-ignore -v ... || true`; status shows artifacts as untracked and check-ignore shows explicit unignore rule for issue workflow artifacts. |

Completion assessment:

The create-issue-doc workflow is complete. The resulting issue is execution-ready and grounded in inspected code/docs.

Unresolved questions: none.

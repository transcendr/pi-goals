---
description: Create or refine an issue doc using the full feature-workflow-pipelines protocol with visible transcript artifacts
aliases: issue-doc,new-issue,plan-issue
usage: /goal issue-doc --bucket open --kind feature --title "Short issue title" -- Explain the issue context, motivation, constraints, and desired outcome here
examples: /goal issue-doc --bucket refine --kind idea --title "Goal audit command" -- Add a /goal audit command that reviews goal completion evidence; /goal new-issue --bucket open --kind fix --title "Budget resume gap" -- Fix budget-limited resume/wrap-up behavior
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
Create a new issue doc, or refine the target issue doc if one is explicitly named in the arguments, by following the `$feature-workflow-pipelines` protocol fully and visibly.

<issue_request>
  <target_bucket>{{bucket}}</target_bucket>
  <issue_kind>{{kind}}</issue_kind>
  <requested_title>{{title}}</requested_title>
  <context>{{args}}</context>
</issue_request>

Use `$feature-workflow-pipelines` as the governing workflow. If the task touches agent-facing CLI ergonomics, also use `$axi`. If the task is architecture-sensitive, use `$sentrux` as a planning/quality sensor where appropriate.

Mandatory protocol-read rule: unless the full contents are already freshly present in the current context, read the full `$feature-workflow-pipelines` `SKILL.md` and the relevant issue-doc creation references before drafting. This is not optional and not based on whether the agent thinks it remembers the workflow. At minimum, for issue-doc creation/refinement, read the full text of the relevant references for canonical issue docs, grounded research, design locking, and TOON/required-proof synthesis. Record the exact files read and extracted requirements in `01-protocol-read.md`.

Do not simulate the workflow. Produce durable transcript artifacts that prove each loop and sub-step was actually performed. Artifact creation is not optional, and the artifacts must be visible to git/status review rather than hidden by ignore rules.

Start with this embedded repository context, then inspect files directly before writing the issue:

<repo_status>
!`git status --short`
</repo_status>

<issue_buckets>
!`find .ai/issues -maxdepth 2 -type d | sort`
</issue_buckets>

<recent_issue_inventory>
!`find .ai/issues/open .ai/issues/refine .ai/issues/fixed .ai/issues/defer .ai/issues/closed -maxdepth 1 -type f -name 'ISSUE-*.md' 2>/dev/null | sort | tail -80`
</recent_issue_inventory>

<next_issue_number_hint>
!`find .ai/issues -type f -name 'ISSUE-*.md' 2>/dev/null | sed -E 's#.*/ISSUE-([0-9]+).*#\1#' | sort -n | tail -1 | awk '{printf("ISSUE-%03d", $1+1)}'`
</next_issue_number_hint>

Required inputs:
- `--bucket`: target issue bucket, usually `open`, `refine`, `defer`, `fixed`, or `closed`.
- `--kind`: issue context kind, such as `feature`, `fix`, `idea`, `refine`, `research`, `remediation`, or `docs`.
- `--title`: short human-readable issue title.
- trailing `-- {{args}}`: context, motivation, constraints, known files, desired behavior, acceptance criteria, or rough notes.

If any required input is missing or ambiguous, ask exactly one focused clarification before creating files.

Workflow requirements:
1. Read `AGENTS.md`, the full `$feature-workflow-pipelines` `SKILL.md`, and the relevant feature-workflow reference docs before drafting, unless those exact full contents are freshly present in current context. This is mandatory, not discretionary.
2. Choose the correct issue bucket from `--bucket`; create the directory if missing.
3. Determine the next issue number unless the arguments explicitly name an existing issue file.
4. Create a transcript artifact directory under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/`.
5. Before writing the final issue doc, run each workflow loop for real and write its transcript artifact immediately. Do not batch-create generic artifacts after the fact. Minimum required artifacts:
   - `00-request.md`: parsed request, inputs, assumptions, issue number/path choice, and clarification result if any.
   - `01-protocol-read.md`: exact workflow/project docs read, confirmation that the full skill/reference docs were read or freshly present in context, and the requirements extracted from them.
   - `02-grounded-research.md`: live code/docs/repo/screenshot research with commands/files inspected, findings, and root-cause or planning facts.
   - `03-design-lock.md`: meaningful options considered, chosen design, rejected alternatives, unresolved forks, and why execution-ready status is or is not justified.
   - `04-proof-threat-model.md`: primary invariant, false-green risks, deterministic/live proof strategy, and required proof rows.
   - `05-issue-writeback.md`: what was written back to the canonical issue doc, including section checklist and artifact links.
   - `06-final-audit.md`: final protocol compliance matrix proving every required sub-step has a concrete artifact.
   - `raw/commands.log`: command transcript or copied command outputs for the main discovery/proof commands used during issue creation.
6. Create or update the issue doc in `.ai/issues/{{bucket}}/ISSUE-NNN-<slug>.md` after the research/design/proof artifacts exist.
7. The issue doc must be canonical and execution-ready when possible. If not execution-ready, mark exactly what is blocked or needs refinement.
8. Include links to every transcript artifact inside the issue doc.
9. Include a TOON-style `required_proofs[]` block when the issue is intended for Solo/TLO or proof-driven execution.
10. Do not invent implementation facts. Ground claims in inspected files, commands, screenshots, or explicitly marked assumptions.
11. Verify artifact visibility before completion with `git status --short --untracked-files=all` and `git check-ignore -v <one artifact path> || true`. If `.ai/docs/issue-workflow/**` is ignored, update ignore rules so these workflow artifacts are trackable.

Issue doc structure:
- Title: `# ISSUE-NNN — <title>`
- Status, Priority, Owner, Created, Next best session, Next best session rationale
- Target bucket and issue kind
- Parent/Depends on/Related when known
- Goal
- Problem/context
- Desired behavior
- Research findings with links to transcript artifacts
- Locked design choices and rejected alternatives
- Implementation or execution checklist
- Acceptance criteria
- Proof threat model
- Required proofs TOON block when applicable

Completion standard:
- The requested issue doc exists in the requested bucket.
- Transcript artifacts exist for request intake, protocol read, grounded research, design lock, proof threat model, issue writeback, final audit, and raw command output.
- Transcript artifacts visibly correspond to actual sub-steps, not generic boilerplate or simulated claims.
- Transcript artifacts are visible to git/status review and not hidden by `.gitignore`.
- The issue doc links to every transcript artifact.
- The final response reports the issue path, transcript directory, artifact visibility check, commands/files inspected, and any unresolved questions.

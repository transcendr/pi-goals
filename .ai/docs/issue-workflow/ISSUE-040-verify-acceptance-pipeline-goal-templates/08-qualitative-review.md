# ISSUE-040 qualitative review after initial implementation

This review was performed after the first working version of `verify-acceptance-pipeline` and `verify-acceptance-item` existed. It was driven by the user's 11-minute time-floor instruction: do not idle, use remaining time for material qualitative review/improvement, and only touch adjacent templates if fully understood and justified.

## Holistic review

| Area | Finding | Action |
| --- | --- | --- |
| Scope | Implementation stayed in `.ai/.pi-goals/` and issue workflow docs; no `.pi/extensions/goal` code was changed. | Kept scope unchanged. |
| Independence | Pipeline clearly spawns a separate Solo/Pi acceptance agent and forbids main-agent self-review as replacement. | Kept and validated by static contract check. |
| Delegation style | Template uses direct prompt delivery through `process send`, not alternate slash delegation. | Kept; forbidden pattern proof guards this. |
| Monitoring | Pipeline specifies `sleep 90`, status-first checks, and bounded output tails. | Kept; static proof guards these strings. |
| Queue discipline | Acceptance prompt requires all item goals to be enqueued first and then executed head-to-tail, but initial wording did not force a count/completeness check. | Added extracted-row count, zero-row blocker handling, id/objective count equality, and final report completeness checks. |
| Remediation loop | Main agent owns remediation and sends corrected item ids back to same worker. | Kept; added final output capture path for auditability. |
| Template rendering | Both templates resolve through the actual `templates.ts` resolver when transpiled to CommonJS for a smoke test. | Kept and logged. |
| Report validity | Initial report rows did not explicitly warn about quotes/punctuation in TOON cells. | Added quote/escape/single-line guidance to pipeline and item outputs. |

## Section-by-section review: `verify-acceptance-pipeline`

| Section | Review | Improvement made |
| --- | --- | --- |
| Frontmatter | Names, aliases, usage, examples, `allow_commands`, timeout and output cap match authoring guide. | None. |
| Resolved context | Issue selector resolution is bounded to issue buckets and exact path; Solo project resolution is read-only. | Worker name now includes timestamp to avoid process-name collisions. |
| Ready commands | Commands are concrete for spawn/send/status/output. Initial version sent immediately after spawn with only `--allow-recent-spawn`. | Added `capture_final_output` command to preserve final report under `/tmp`; later added `verify_worker_status_after_spawn` so the process exists and is an agent before prompt delivery. |
| Direct prompt | Prompt instructs issue read, acceptance extraction, item enqueue, template routing, queue execution, and structured report. | Added TOON quote/escape/single-line guidance plus extraction/count completeness rules so criteria cannot be silently skipped. |
| Sparse polling | Uses only `sleep 90`, `process status`, and bounded `process output`. | Confirmed forbidden timer/delegation patterns absent. |
| Remediation loop | Main agent remediates red/blocked rows and sends corrected acceptance items. | No further change needed. |
| Completion audit | Requires worker id, prompt files, polling, report, remediation, validation, worktree, all-green state. | Added final output capture path to audit list. |

## Section-by-section review: `verify-acceptance-item`

| Section | Review | Improvement made |
| --- | --- | --- |
| Frontmatter | Names, aliases, flags, and required placeholders are discoverable. | None. |
| Initial context | Inline command is read-only and validates `--issue`, `--item-id`, and criterion text. | Simplified acceptance-section helper to a compact `rg -n -A 80` command. |
| Issue/invariant read | Requires enough issue context to avoid isolated criterion misread. | None. |
| Evidence mapping | Encourages targeted file/proof/log inspection rather than broad wandering. | None. |
| False-green checks | Explicitly attacks docs-only, stale proof, weak proof, live/static mismatch, and queue/template bypass risks. | None. |
| Status decision | Green/red/blocked distinctions were concrete, but green did not explicitly require naming a false-green risk ruled out. | Strengthened green: it must name at least one direct evidence source and one false-green risk ruled out. |
| Final TOON row | Requires parseable item result. | Added quote/escape/single-line guidance for TOON validity. |

## Adjacent template review decision

Adjacent templates reviewed for style/implications:

- `.ai/.pi-goals/deslop-pipeline.md`
- `.ai/.pi-goals/deslop-commit-range.md`
- `.ai/.pi-goals/enqueue-goal-stack.md`
- `.ai/.pi-goals/release-readme-review.md`
- `.ai/.pi-goals/repo-commit-audit.md`

Decision: no adjacent template modifications.

Reasoning: the improvements found were specific to the new acceptance templates. Existing adjacent templates encode distinct workflows and some intentionally use patterns that are wrong for ISSUE-040 but correct for their own domain, such as `deslop-pipeline` using a different delegation mechanism and monitoring strategy. Changing adjacent templates would require separate issue-level review of their workflow semantics.

## Monitor-steered section review addendum

After monitor steering, I stopped closeout/status checking and re-reviewed the `verify-acceptance-pipeline` direct acceptance-agent prompt against ISSUE-040 acceptance criteria 267-273. Finding: the section covered extraction, queueing, item-template routing, report output, and remediation, but it did not explicitly force cardinality/completeness between extracted criteria, queued objectives, and final report rows. That was a real false-green risk: an acceptance agent could skip a criterion while still returning a plausible all-green report.

Concrete improvement applied:

- Added an extracted-row count before queueing.
- Added a zero-row blocked outcome instead of inventing criteria.
- Required `AC-N` ids and queued objectives to exactly equal the extracted row count.
- Required final `acceptance_summary.total` to equal both the extracted row count and the number of `acceptance_results` rows.
- Required the main agent to reject incomplete acceptance reports before trusting item statuses.

Evidence:

- `raw/implementation-proofs.log` contains the monitor-steered recheck for `Count the extracted rows`, `extracted acceptance-row count`, and `report completeness`.
- The pipeline template resolver still passes after the improvement.
- Forbidden delegation/timer patterns remain absent.

A second item-template section review inspected the `verify-acceptance-item` status decision/final result section. Finding: the template already required concrete evidence, but green results could still be terse. Concrete improvement: green now requires naming both one direct evidence source and one false-green risk ruled out, and final-row evidence guidance gives an example. Resolver smoke still passes after this edit.

A third pipeline section review inspected spawn/prompt delivery. Finding: the rendered commands spawned an agent and sent with `--allow-recent-spawn`, but did not require a status check between spawn and prompt. Concrete improvement: added `verify_worker_status_after_spawn` and instructions to confirm the worker exists and is an agent before sending, with bounded recovery if not. Resolver smoke still passes after this edit.

Final frontmatter/discovery section check found no gap: both new templates include description, aliases, usage, examples, `allow_commands: true`, and bounded command timeout/output limits, matching ISSUE-040 metadata and the prompt-template authoring guide. Evidence is appended to `raw/implementation-proofs.log`.

## Final qualitative conclusion

The templates now satisfy the issue's core workflow contract and are stronger than the initial implementation in collision avoidance, final-output auditability, rendered-command simplicity, spawn-readiness safety, TOON result validity, acceptance-row cardinality/completeness, and item-level anti-false-green evidence quality. Remaining risk is explicitly documented: the full nested acceptance pipeline has not been run live end-to-end against a disposable issue.

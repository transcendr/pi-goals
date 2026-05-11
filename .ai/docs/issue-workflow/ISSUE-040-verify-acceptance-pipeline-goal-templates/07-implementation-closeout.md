# ISSUE-040 implementation closeout

## Implemented files

- `.ai/.pi-goals/verify-acceptance-pipeline.md`
- `.ai/.pi-goals/verify-acceptance-item.md`

No `.pi/extensions/goal` runtime code was changed.

## What changed

### `verify-acceptance-pipeline`

- Accepts an issue selector through `{{args}}`.
- Resolves the issue selector to exactly one issue doc path using read-only inline context.
- Resolves the current Solo instance/project for the repository using read-only inline context.
- Emits ready-to-run commands for:
  - preflight git status;
  - `/tmp` artifact directory creation;
  - independent Solo/Pi acceptance-agent spawn;
  - direct prompt send through `solo-mcp process send`;
  - sparse `sleep 90` + `process status` monitoring;
  - bounded `process output` capture;
  - corrected acceptance item rerun prompts.
- Includes a direct acceptance-agent prompt instructing the worker to read the issue doc, extract `## Acceptance criteria`, enqueue all item-review orchestration goals first, route each through `verify-acceptance-item`, execute head-to-tail, and produce `acceptance_summary` / `acceptance_results` TOON output.
- Includes the main-agent remediation loop: inspect red/blocked rows, fix gaps, validate, send corrected item list, repeat until all green or truly blocked.

### `verify-acceptance-item`

- Accepts `--issue`, `--item-id`, and trailing criterion text.
- Resolves initial issue/item context through read-only inline commands.
- Instructs a read-only, adversarial verification workflow for one criterion:
  - read issue context;
  - restate the invariant;
  - map to implementation/proof surfaces;
  - run targeted non-destructive checks where relevant;
  - attack false-green paths;
  - return exactly one structured `acceptance_item_result` row.

## Material review/improvements after initial implementation

The initial implementation was reviewed holistically and section-by-section against ISSUE-040 and `.ai/docs/prompt-template-authoring.md`. Material improvements made during the review pass:

- Replaced a same-name acceptance-worker process name with a timestamped worker name to avoid process-name collisions across repeated runs.
- Added `capture_final_output` so the pipeline can preserve final acceptance output under the `/tmp` artifact directory instead of relying only on terminal tail history.
- Simplified the item template's rendered acceptance-section helper from a multiline nested heredoc into a compact `rg -n -A 80` command, reducing quoting risk and making rendered context easier for agents to execute.
- Fixed the issue's `item_contract_static` proof command to avoid an invalid regex caused by unescaped `{{issue}}`/`{{item-id}}`/`{{args}}` placeholder braces; the proof now uses `rg -nF` for placeholder checks.
- Rechecked markdown fence structure after adding nested prompt examples.
- Added TOON validity guidance to both final report contracts so acceptance criteria/evidence containing punctuation are quoted/escaped and kept single-line.
- Added acceptance-row cardinality/completeness checks so the worker cannot silently skip criteria while returning a plausible all-green report.
- Strengthened green item results to require both a direct evidence source and a false-green risk ruled out.

No adjacent templates were modified. After reviewing the new templates against adjacent examples, further safe improvements belonged in these new templates rather than in existing workflows; modifying adjacent goal templates was not justified without a separate issue because those workflows have distinct semantics.

## Proofs run

Full proof transcript: `raw/implementation-proofs.log`.

Passed:

- `test -f .ai/.pi-goals/verify-acceptance-pipeline.md && test -f .ai/.pi-goals/verify-acceptance-item.md`
- `! rg -n '/boomerang|timer-pair|tlo timer|timer_pair|check-ms|send-seam' .ai/.pi-goals/verify-acceptance-pipeline.md`
- `rg -n 'verify-acceptance-item|sleep 90|process status|process output|process send|ACCEPTANCE_WORKER_ID|acceptance_summary|corrected acceptance' .ai/.pi-goals/verify-acceptance-pipeline.md`
- `rg -n 'acceptance_item_result|false-green|green|red|blocked|targeted|proof|implementation' .ai/.pi-goals/verify-acceptance-item.md`
- `rg -nF '{{issue}}' .ai/.pi-goals/verify-acceptance-item.md`
- `rg -nF '{{item-id}}' .ai/.pi-goals/verify-acceptance-item.md`
- `rg -nF '{{args}}' .ai/.pi-goals/verify-acceptance-item.md`
- TypeScript-transpiled template resolver smoke test for:
  - `verify-acceptance-pipeline -- ISSUE-040`
  - `verify-acceptance-item --issue .ai/issues/open/ISSUE-040-verify-acceptance-pipeline-goal-templates.md --item-id AC-1 -- test criterion`
- Re-ran the resolver smoke test after review edits; both templates still resolved successfully.
- `list_goal_templates` showed both new templates with expected aliases/placeholders.
- `npm run quality:goal` passed: Sentrux gate/check, slop guard, TypeScript validation, and Pi extension load validation.

## Live probe decision

A full nested `verify-acceptance-pipeline` live probe was intentionally skipped for this implementation pass.

Rationale:

- The new templates are project-local prompt/workflow templates, not extension runtime changes.
- Static contract checks plus actual `list_goal_templates` discovery proved that the extension discovers the templates and required placeholders correctly.
- A resolver smoke test executed both templates' inline read-only commands and proved the rendered objectives are syntactically resolvable for ISSUE-040 and an item invocation.
- Running the full pipeline live would spawn another independent Pi agent and ask it to enqueue and execute item goals over a disposable issue. That would be materially more expensive and risk leaving nested process/goal state behind, while adding limited evidence beyond the validated prompt contract for this template-authoring issue.
- The implementation still preserves a live-probe requirement in the template issue for future behavior-changing refinements or if runtime queue/process behavior is suspected.

## Remaining risks

- The full end-to-end acceptance-agent loop has not yet been exercised against a disposable issue in a live Pi process.
- The pipeline's direct prompt depends on normal agent compliance with queue steering and `create_goal_from_template`; this is consistent with existing project queue semantics but remains a workflow contract rather than extension-enforced behavior.

## Final status

ISSUE-040 is implemented as a project-local goal-template workflow. Static proofs, template discovery, template resolution smoke checks, and the project quality gate passed.

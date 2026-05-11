# ISSUE-040 design lock — Verify acceptance pipeline goal templates

## Design choice summary

The implementation should add two reusable goal templates under `.ai/.pi-goals/`:

1. `verify-acceptance-pipeline.md` — higher-order main-agent workflow that spawns, prompts, monitors, and iterates with an independent acceptance agent.
2. `verify-acceptance-item.md` — inner acceptance-item workflow used by the acceptance agent for one criterion at a time.

This is a prompt/template implementation, not a `.pi/extensions/goal` code change.

## Locked template names and metadata

### `verify-acceptance-pipeline`

Recommended frontmatter:

```markdown
---
description: Spawn and supervise an independent acceptance agent until an implemented issue doc's acceptance criteria all verify green
aliases: acceptance-pipeline,acceptance-verify,verify-acceptance
usage: /goal verify-acceptance-pipeline -- ISSUE-040
examples: /goal verify-acceptance-pipeline -- ISSUE-038; /goal acceptance-pipeline -- .ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 40000
---
```

Required placeholder:

- `{{args}}` — issue selector. It may be an issue number (`40`), issue id (`ISSUE-040`), or concrete issue doc path.

### `verify-acceptance-item`

Recommended frontmatter:

```markdown
---
description: Verify one issue acceptance criterion against implementation evidence with adversarial false-green checks
aliases: acceptance-item,verify-acceptance-criterion,acceptance-check
usage: /goal verify-acceptance-item --issue .ai/issues/open/ISSUE-040-example.md --item-id AC-1 -- acceptance criterion text
examples: /goal acceptance-item --issue .ai/issues/open/ISSUE-038-bound-goal-template-autocomplete-discovery.md --item-id AC-1 -- /goal autocomplete does not recursively scan arbitrary descendants
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
```

Required placeholders:

- `{{issue}}` — issue doc path resolved by the acceptance pipeline.
- `{{item-id}}` — stable item id assigned by the acceptance agent, usually `AC-1`, `AC-2`, etc.
- `{{args}}` — exact acceptance criterion text.

## Locked orchestration model

### Worker model

Chosen: the pipeline spawns one independent Solo Pi acceptance agent, sends it a direct prompt, and supervises it through sparse polling.

Rejected:

- Main agent self-verifies all acceptance criteria: insufficient independence and weaker false-green resistance.
- `/boomerang`: explicitly not relevant to this workflow, and it hides the direct acceptance-agent prompt that the user wants designed.
- Solo timer pairs: user explicitly requested basic sparse polling with 90-second sleeps and process checks.
- Terminal fallback by default: the worker needs its own Pi session and goal queue; terminal fallback loses agent-state confidence.

### Monitoring model

Chosen: 90-second sparse polling loop.

Required monitoring shape in `verify-acceptance-pipeline`:

1. `sleep 90`
2. `solo-mcp --instance <resolved> process status "$ACCEPTANCE_WORKER_ID" --project <resolved_project>`
3. If status suggests idle/completion/error/blocked, read a small output tail:
   - routine: `process output ... --lines 40`
   - diagnostic: `process output ... --lines 120 --full` only when the status/tail indicates a blocker or final report capture needs more context.
4. Do not use `tlo timer-pair`, `solo-mcp timer`, or `tlo send-seam` timer-assisted flows.

Rejected:

- Continuous tight polling: too token/noise heavy.
- Large output reads on every loop: wastes tokens and increases false conclusions from partial output.
- Treating `process send --wait-ms` as proof of readiness/completion: Solo docs explicitly say it is only a bounded preview.

### Acceptance-agent prompt model

Chosen: pipeline template includes a direct prompt body for the main agent to write/send to the worker.

The prompt must instruct the acceptance agent to:

1. Bind/read its Solo context when useful, but keep the task centered on the issue doc.
2. Read the issue doc and extract the `## Acceptance criteria` list.
3. Assign stable ids `AC-1`, `AC-2`, ... in document order.
4. Enqueue every acceptance criterion first using orchestration objectives shaped exactly like:

   ```text
   create a goal from template `verify-acceptance-item` with args `--issue "<issue-doc-path>" --item-id "AC-N" -- <criterion text>`
   ```

5. Only after all criteria are queued, execute the queue head-to-tail.
6. For each queued orchestration item, call `list_goal_templates`, match `verify-acceptance-item`, use `create_goal_from_template`, complete the concrete item goal, then dequeue the orchestration queue item only after the item result exists.
7. Keep item validation read-only unless explicitly instructed otherwise by the main agent.
8. Produce a final report with one row per acceptance criterion and an all-green/red/blocked summary.
9. If the main agent later sends a correction/retry prompt, enqueue and re-run only the listed corrected items unless a shared change invalidates previously green rows.

### Main-agent remediation loop

Chosen: same acceptance agent remains the verifier across iterations.

Loop:

1. Main agent receives final acceptance report.
2. Main agent independently inspects evidence for every red/blocked item; worker prose is a clue, not proof.
3. Main agent remediates concrete misses/gaps in the repo.
4. Main agent runs the relevant validation commands for the remediation.
5. Main agent sends a correction prompt to the same acceptance agent with:
   - changed files/commits or explicit changes;
   - corrected acceptance item ids;
   - any new evidence paths/logs;
   - instruction to enqueue and re-run those items through `verify-acceptance-item` again.
6. Repeat until acceptance agent returns all green or a genuine blocker remains.

Recovery:

- If the acceptance worker crashes or its goal queue is corrupted, spawn a fresh acceptance agent and send a restart prompt including the prior report and corrected item list.
- If an item is blocked by missing credentials/environment or unsafe destructive action, stop and ask the user one focused question rather than inventing proof.

## Locked item verification workflow

`verify-acceptance-item` should instruct the acceptance agent to perform a real validation loop:

1. Restate the acceptance criterion and identify the user-visible invariant it implies.
2. Read the issue doc sections relevant to that criterion:
   - goal/problem/desired behavior;
   - implementation checklist;
   - proof threat model;
   - required proofs;
   - implementation closeout if present.
3. Inspect implementation evidence:
   - current git status and diff if dirty;
   - changed files relevant to the criterion;
   - validation/probe artifacts named by the issue;
   - README/docs only when criterion is docs-facing.
4. Run targeted non-destructive checks when they are available and proportionate.
5. Compare evidence against false-green risks:
   - criterion only mentioned in docs but not implemented;
   - test/probe validates a weaker behavior than the criterion;
   - stale output from before remediation;
   - live behavior omitted where the issue required live proof;
   - issue status marked fixed but acceptance item still unproven.
6. Return a structured result:
   - `green` only with concrete evidence that would fail if the criterion were false;
   - `red` with precise unmet behavior and remediation suggestion;
   - `blocked` with missing authority/environment/evidence and the exact next question or setup needed.

## Locked output contracts

### Item result block

`verify-acceptance-item` final response should include a parseable block like:

```toon
toon.version: 1
acceptance_item_result{id,status,criterion,confidence,evidence,gap,next_action}:
  "AC-1","green","<criterion>","high","<commands/files/probes inspected>","none","none"
```

Allowed `status` values:

- `green`
- `red`
- `blocked`

### Acceptance-agent final report

The acceptance agent final response should include:

```toon
toon.version: 1
acceptance_summary{issue,status,total,green,red,blocked,iteration}:
  ".ai/issues/open/ISSUE-040-example.md","red",5,4,1,0,1
acceptance_results[5]{id,status,criterion,confidence,evidence,gap,next_action}:
  "AC-1","green","...","high","...","none","none"
  "AC-2","red","...","medium","...","missing probe covers queue replay","main agent add/repair validation"
```

Main-agent loop condition:

- stop green only when `status` is `green` and every item row is `green`;
- remediate and rerun when one or more rows are `red`;
- ask a focused user question only when rows are `blocked` by authority/environment/safety that the main agent cannot resolve.

## Rejected alternatives

- One template only: rejected because it would make the acceptance agent's queue items broad, less auditable, and harder to rerun individually.
- A separate parser script for issue acceptance criteria: rejected for first pass because a direct prompt plus markdown extraction rules are sufficient; add a script only if implementation finds the inline prompt too brittle.
- Automatic mutation by acceptance agent: rejected because acceptance worker should be independent verifier; main agent owns remediation.
- Re-running every acceptance item every iteration: rejected as default because it wastes work. Re-run failed/corrected items, but allow all-item rerun when shared changes could invalidate green rows.

## Execution-ready assessment

Execution-ready: yes.

The meaningful choices are locked:

- two-template architecture;
- direct prompt, no `/boomerang`;
- 90-second sparse polling, no timers;
- acceptance agent enqueues all item goals first;
- `verify-acceptance-item` handles item-level proof;
- main agent owns remediation and repeats until all green.

Implementation can proceed without choosing product/workflow direction.

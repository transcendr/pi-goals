# 03 — Design lock

## Design questions surfaced by research

```toon
toon.version: 1
design_questions[4]{id,question,why_it_matters}:
  "dq1","Should budget-limited goals block queued work?","The observed 20K ceiling stopped the worker and left queued acceptance items idle."
  "dq2","How should arbitrary budgets be prevented?","The templates did not specify 20K, but tool schemas allow optional budgets."
  "dq3","How can the acceptance worker be prevented from substituting aggregate verification for per-item goals?","The first live run false-greened until forced per-item processing found a red item."
  "dq4","How much evidence should each item goal require?","Small scripts can be good targeted proofs or weak string-presence checks; the template needs a sufficiency standard."
```

## Locked choices

### Choice 1 — Budget-limited queued work is terminal for queue progression

Chosen: when a goal reaches `budgetLimited` and queued items remain, the extension should treat that status as terminal enough for queue handoff. It should send effective queue steering with a triggered follow-up turn and permit the next queue item to be resolved without manual `clear_goal`.

Scope details:

- Do not mark the budget-limited goal `complete`.
- Do not silently discard the budget-limited goal; preserve existing state/event history and visible budget-limited status in transcript/history.
- For queue progression, allow replacement of a current `budgetLimited` goal through the same controlled queue/template creation paths that already replace completed goals, but only when a queue handoff is in progress or queue is non-empty.
- Empty-queue budget-limited behavior remains unchanged: show/steer budget wrap-up and stop.

Rejected alternatives:

- Require the model to manually call `clear_goal` after budget limits. Rejected because this repeats the live failure: the worker can go idle before processing queued work.
- Treat budget-limited as success/complete. Rejected because budget exhaustion does not prove the objective was achieved.
- Solve only by prompt text. Rejected because `start_queued_goal` and `create_goal_from_template` currently cannot replace non-complete budget-limited goals, so prompt text alone cannot make queue progression reliable.

### Choice 2 — Do not invent budgets for queue/template items

Chosen: harden both prompt surfaces and queue steering so an agent must not pass `token_budget`, `time_budget_seconds`, or floor values when creating a queued/template goal unless those values are explicitly present in queue metadata or the user/template invocation says to use them.

Rationale: the 20K limit appears not to come from the acceptance templates. The safest mitigation is to make budget/floor propagation explicit: carry provided metadata, otherwise omit budget fields entirely.

Rejected alternative:

- Remove budget parameters from `create_goal_from_template`. Rejected because legitimate workflows need budget/floor controls; the problem is invented values, not the feature itself.

### Choice 3 — Acceptance pipeline final report is ledger-gated

Chosen: the acceptance pipeline prompt should define a per-item ledger and make final `acceptance_summary` invalid until every extracted criterion has exactly one captured `acceptance_item_result` from a completed concrete `verify-acceptance-item` goal.

Required ledger state per item:

```toon
acceptance_item_ledger[1]{id,criterion,enqueued,template_matched,concrete_goal_created,item_result_captured,orchestration_dequeued}:
  "AC-N","criterion text",true,true,true,true,true
```

A worker must not produce the final aggregate report while any ledger row is incomplete. An aggregate pre-check may be used only to choose targeted evidence surfaces; it cannot substitute for item goal execution and cannot be the source of green rows.

Rejected alternatives:

- Trust the existing prose `execute the queue head-to-tail`. Rejected because the live run showed it was insufficiently explicit.
- Add an external parser script immediately. Deferred: a script may help, but the immediate issue is workflow substitution and queue continuation; first pass can strengthen prompt/validation contracts.

### Choice 4 — Per-item verification needs an evidence sufficiency standard, not a heavy gate mandate

Chosen: strengthen `verify-acceptance-item` so each item must produce:

- a short proof plan naming the expected evidence surface;
- at least one direct file/command/artifact inspection that would likely fail if the criterion were false;
- a sufficiency sentence explaining why the chosen check is enough for this criterion;
- one false-green risk ruled out;
- a `red` or `blocked` result if only weak string-presence evidence is available while stronger direct evidence exists.

This avoids both extremes: it does not require expensive broad gates for every criterion, but it does reject ceremonial tiny scripts that only prove strings exist.

Rejected alternatives:

- Mandate `npm run quality:goal` or live probes for every item. Rejected as too expensive and often irrelevant for documentation-only or narrowly static criteria.
- Ban small scripts. Rejected because small targeted scripts can be the strongest evidence for structural criteria when they inspect the right surfaces.

### Choice 5 — Strong acceptance-worker runtime and repeated no-batch checkpoints

Chosen: the pipeline should spawn the acceptance worker with `--profile solo-researcher-strong`, send `/model opencode-go/glm-5.1` before the initial acceptance prompt, and verify the process remains alive before continuing. The prompt should also include mandatory no-batch loop language and repeated per-item checkpoints, not only a single instruction near the top.

Rationale: the follow-up rerun showed two important facts: explicit `NO BATCH CHECKS` language improved initial behavior, but batching still recurred around AC-11 of 23; and the stronger `glm 5.1` high-reasoning runtime produced more useful individual review than the earlier low-reasoning worker. Therefore remediation should address both the worker runtime and mid-run instruction drift.

Rejected alternatives:

- Treat model/profile as an operator preference outside the template. Rejected because acceptance quality is part of this pipeline's correctness envelope.
- Use only one up-front no-batch instruction. Rejected because the worker complied initially and then drifted back to batching halfway through.

## Cascading symptom rationale

```toon
cascade_rationale[4]{point,treated_as_root_or_cascade,rationale,fix_relationship}:
  "P1","root","Arbitrary budget plus budgetLimited queue blocking can independently strand the queue.","Fix with no-invented-budget guidance and budget-limited queue handoff."
  "P2","root","Aggregate verification substitution can false-green even if runtime queue handoff works.","Fix with ledger-gated final report and no-aggregate-substitution prompt."
  "P3","cascade plus existing runtime issue","No queue steer after the big TOON overlaps ISSUE-037 complete+queue handoff and P1 budget-limited handoff.","Implement ISSUE-037-style effective queue steering and extend it to budgetLimited; also prevent the aggregate report from being treated as a valid stopping point."
  "P4","cascade plus evidence-depth gap","Ceremonial goal completion followed from treating the aggregate report as authoritative, but item template still needs a stronger sufficiency standard.","Ledger gating invalidates prior aggregate rows; item evidence sufficiency prevents thin per-item green rows."
```

## Execution readiness

This issue is execution-ready: the design locks both runtime and template-level fixes, and no owner product/API decision remains open. Implementation can still decide local helper names and exact test/probe file names if equivalent proof coverage is preserved.

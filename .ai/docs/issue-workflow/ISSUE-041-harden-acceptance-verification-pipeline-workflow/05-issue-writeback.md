# 05 — Issue writeback

## Written issue doc

`.ai/issues/open/ISSUE-041-harden-acceptance-verification-pipeline-workflow.md`

## Sections written

```toon
toon.version: 1
sections[15]{id,section,status}:
  "s1","front matter/status/priority/owner/created","written"
  "s2","next best session and rationale","written"
  "s3","parent/depends/related links","written"
  "s4","goal","written"
  "s5","problem/context with four observed points","written"
  "s6","transcript artifacts links","written"
  "s7","desired behavior","written"
  "s8","grounded research findings","written"
  "s9","locked design choices and rejected alternatives","written"
  "s10","cascading point rationale","written"
  "s11","implementation checklist","written"
  "s12","acceptance criteria","written"
  "s13","proof threat model summary","written"
  "s14","TOON synthesis and required_proofs[]","written"
  "s15","follow-up rerun context: no-batch prompt, mid-run drift, strong worker profile/model","written"
```

## Planning facts written back

```toon
planning_facts[8]{id,fact,source}:
  "pf1","The arbitrary 20K token budget is not present in acceptance templates or ISSUE-040 artifacts.","rg research in raw/commands.log"
  "pf2","Budget-limited goals currently do not queue-steer with non-empty queue and block start_queued_goal because only complete status is replaceable.","lifecycle.ts queue-tools.ts tools.ts inspection"
  "pf3","ISSUE-037 already tracks complete-status queue handoff; ISSUE-041 depends on it and extends terminal-state handling to budgetLimited.","ISSUE-037 read"
  "pf4","Acceptance pipeline prompt lacks a ledger/final-report precondition strong enough to forbid aggregate substitution.","verify-acceptance-pipeline.md inspection"
  "pf5","Item template needs an evidence-sufficiency standard rather than broad mandatory gates or a ban on small scripts.","verify-acceptance-item.md and user Figure 2"
  "pf6","Full live nested acceptance pipeline was known unproven at ISSUE-040 closeout and is now required proof for this remediation.","ISSUE-040 closeout"
  "pf7","Explicit no-batch wording improved a rerun but batching recurred around AC-11 of 23, so proofs must catch mid-run drift.","07-followup-rerun-observation.md"
  "pf8","Acceptance worker should launch with solo-researcher-strong and switch to opencode-go/glm-5.1 before the prompt.","07-followup-rerun-observation.md"
```

## Issue status decision

Marked `open — execution-ready` because:

- root causes are grounded to concrete template/runtime surfaces;
- meaningful design choices are locked;
- cascading points are explicitly mapped to root fixes;
- acceptance criteria and required proofs align to observed failures;
- no owner/product decision remains open.

## Required proof writeback

The issue includes an importable `required_proofs[]` TOON block with eight proof rows covering template contract, strong worker profile/model setup, budget-limited queue handoff, complete queue handoff regression, no arbitrary budgets, quality gate, live acceptance pipeline probe, and artifact visibility.

# 07 — Follow-up rerun observation

## User-provided rerun context

After ISSUE-041 was drafted, the user reran the acceptance agent as a test and reported additional behavior.

### Prompt text that improved behavior

Appending this instruction to the current prompt produced the expected behavior initially:

```text
IMPORTANT: NO BATCH CHECKS. Enqueue each goal, create the first goal, follow the workflow to check the point INDIVIDUALLY. Review all relevant files and mark it RED or GREEN.
Dequeue the goal, mark the goal complete. Then move on to the next one: create -> review point individually and all relevant files -> mark red/green -> dequeue -> mark
complete. REPEAT FOR ALL QUEUED GOALS END TO END.
```

### Mid-run regression

Around AC-11 of 23, the worker began saying it would process AC-11 through AC-23 more efficiently and gather proof for them at once. That was a recurrence of batch inspection/discovery. The user had to interrupt with:

```text
STOP. YOU ARE VIOLATING WORKFLOW. GO BACK TO AC-11 AND DO EACH GOAL INDIVIDUALLY AS PER THE INSTRUCTIONS. THIS IS NOT A SUGGESTION. THIS IS MANDATORY:

IMPORTANT: NO BATCH CHECKS. Enqueue each goal, create the first goal, follow the workflow to check the point INDIVIDUALLY. Review all relevant files and mark it RED or GREEN.
Dequeue the goal, mark the goal complete. Then move on to the next one: create -> review point individually and all relevant files -> mark red/green -> dequeue -> mark
complete. REPEAT FOR ALL QUEUED GOALS END TO END.
```

After the second warning, the worker reportedly finished properly. Individual checks appeared complete and useful, with code review and true consideration for each issue rather than simple surface-level deterministic scripts.

## Model/runtime distinction

The follow-up test used `glm 5.1` on high reasoning. The earlier run used `gpt 5.5` on low reasoning. The user specifically requested remediation include launching the acceptance agent with:

- `--profile solo-researcher-strong`
- then sending `/model opencode-go/glm-5.1` to the agent process before the initial acceptance prompt.

## Planning impact

```toon
toon.version: 1
followup_impacts[5]{id,impact,issue_update}:
  "fu1","Explicit NO BATCH CHECKS wording improves behavior but is not durable for long queues by itself.","Add stronger prompt language and ledger checkpoints that must be repeated per item, not only stated once."
  "fu2","Batch behavior can reappear halfway through a queue even after initial compliance.","Live proof must use enough criteria to catch mid-run batching; at least 12 criteria or a fixture that asserts no AC-N..AC-M batch proof segment appears."
  "fu3","The second warning restored correct individual behavior.","Prompt should use mandatory language and define batching as a workflow violation requiring return to the first unprocessed item."
  "fu4","Strong model/profile may materially improve acceptance quality.","Pipeline should launch acceptance workers with solo-researcher-strong and switch model to opencode-go/glm-5.1 before the prompt."
  "fu5","Useful individual checks were not necessarily huge gates; they reviewed code and considered each point.","Keep the evidence-sufficiency design: require substantive per-item review, not broad gates for every row."
```

## Resulting issue-doc changes

This follow-up should update ISSUE-041 to include:

- an explicit mandatory no-batch prompt clause;
- a per-item loop/checkpoint that repeats after every dequeue before advancing;
- live proof with enough criteria to detect mid-run efficiency batching;
- acceptance-worker launch requirements for `--profile solo-researcher-strong` and `/model opencode-go/glm-5.1` before the initial prompt;
- acceptance criteria and required proofs for model/profile setup and mid-run no-batch behavior.

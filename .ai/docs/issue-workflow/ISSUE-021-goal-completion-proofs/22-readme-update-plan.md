# 22 — README update plan

Grounded in `README.md`.

## Current README structure relevant to ISSUE-021

- Feature list mentions budgets, completion floors, queue, model tools, churn monitor, and widget integration.
- `/goal` command section lists only direct command subcommands.
- Natural language section explains model-tool goal management.
- Completion floors section explains hard completion deferral, structured `completion_blocked_by_floor`, and max-budget precedence.
- Churn monitor section explains sparse monitor state and steering.

## Recommended docs change for proof gates

Add a new section immediately after `## Completion floors`:

```md
## Completion proof gates

Model tools can attach required proof gates to a goal. A proof gate is a bounded command plus pass condition that must have a fresh passing result before `update_goal({ status: "complete" })` can succeed.

Proof gates are for durable evidence such as `npm run quality:goal` or a focused validation probe. Each gate records a trusted source/reference such as an issue `required_proofs[]` row or explicit user instruction. They complement the qualitative completion audit; they do not prove the whole objective by themselves.

If required proofs are missing, stale, timed out, or failed, completion is deferred, the goal remains active, and tool details include `completion_blocked_by_proof` plus the blocking proof id/reason. Run or fix the proof, then retry completion.

Proof commands are explicit trusted goal configuration, not arbitrary prompt text. Commands are timeout-limited and output-capped. Maximum budgets still win: budget-limited goals should wrap up rather than running new proofs past a budget cap.
```

## Feature list update

Add:

```md
- Optional durable completion proof gates for command-backed completion evidence.
```

## Model tools wording

After implementation, update the model tools sentence to mention proof tools explicitly, but do not document `/goal proof` unless that command exists. The first release should avoid implying slash-command proof management. Candidate model tool names from the design are `configure_goal_proof`, `remove_goal_proof`, `list_goal_proofs`, and `run_goal_proof`.

## Avoid

- Do not suggest proof gates replace human/model completion audit.
- Do not imply prompt-template inline commands are proof gates.
- Do not expose full proof stdout/stderr in README examples; keep examples compact.

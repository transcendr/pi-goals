# 16 — Acceptance traceability matrix

| Acceptance criterion | Design / implementation hook | Required proof coverage |
| --- | --- | --- |
| A goal can store required proof gates durably and replay them through session tree replay. | `GoalState` optional proof fields or adjacent replayed proof state; defensive parsing in `state.ts`. | `goal-proof-replay-probe.mjs` |
| A proof runner can execute bounded non-interactive commands and persist structured results. | `proof-runner.ts`; named timeout/output constants; result excerpts. | `goal-proof-runner-probe.mjs` |
| `update_goal(status:"complete")` is deferred when a required proof is missing, stale, timed out, or failed. | `completion-gate.ts` proof deferral before side effects; tool result `completion_blocked_by_proof`. | `goal-proof-gate-decision-probe.mjs` and live probe |
| Completion succeeds when all required proofs are fresh and passing and other gates also allow completion. | aggregate proof readiness evaluator plus existing floor/budget gate composition. | `goal-proof-gate-decision-probe.mjs`, floor regression, live probe |
| Proof results include enough evidence for audit without unbounded output growth. | output caps, stdout/stderr excerpts, bounded retention per gate. | `goal-proof-runner-probe.mjs` |
| Proof gate edits are explicit and auditable. | proof management tools persist state events; each gate has a trusted `source` reference; no implicit prompt-doc execution. | replay probe plus manual/live transcript inspection |
| No arbitrary proof command from an untrusted prompt doc is executed without explicit proof configuration. | template/frontmatter auto-execution deferred; proof gates must be persisted effective config tied to trusted source/objective requirements. | adversarial review, runner safety review, implementation code review |
| Existing floor/budget/queue behavior remains green. | gate composition preserves ISSUE-036 floor behavior and budget hard stops. | `goal-min-spend-floors-probe.mjs` and `npm run quality:goal` |

## Gap check

Every acceptance criterion maps to either a deterministic probe, live probe, or explicit implementation-review requirement. No criterion is left as a pure prose assertion.

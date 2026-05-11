# 30 — Executor handoff

## Canonical issue

- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`

## First implementation pass target

Implement durable completion proof gates for top-level pi-goals.

Do **not** expand first pass into:

- `/goal proof` slash-command UX;
- subgoal-level proof gates;
- watcher/dependency trigger integration;
- arbitrary condition DSLs;
- CI/CD attestation.

## Key locked decisions to preserve

- Store effective proof gates/results on `GoalState` or adjacent replayed goal state.
- Extension runtime executes explicitly configured bounded proof commands.
- Completion blocks on missing, stale, failed, or timed-out required proofs.
- Proof-blocked `update_goal(status:"complete")` returns the current active goal plus structured proof-block metadata, not a candidate complete goal.
- Freshness uses proof config/content fingerprints plus optional `worktree_status`; raw `goal.updatedAt` is too noisy because accounting mutates it.
- First release uses model tools in `proof-tools.ts` wired from `tools.ts`; slash commands are deferred.

## Highest-risk seam

`lifecycle.ts` treats successful `update_goal` details with `goal.status === "complete"` as completion progress. If proof-blocked completion accidentally returns a `goal` object with `status: "complete"`, telemetry can false-green the turn. Mirror `floorCompletionDeferredResult()` and return the current active goal.

## Minimum closeout proof set

Use the canonical `required_proofs[]` rows in the open issue:

- `proof_gate_decision_probe`
- `proof_runner_probe`
- `replay_probe`
- `floor_budget_regression`
- `live_probe`
- `slop_guard`

## Current validation artifacts

- `26-current-code-readiness-audit.md` confirms live code still matches the planned seams.
- `29-required-proof-command-sanity.md` confirms proof rows are coherent and future probe files are expected implementation deliverables.

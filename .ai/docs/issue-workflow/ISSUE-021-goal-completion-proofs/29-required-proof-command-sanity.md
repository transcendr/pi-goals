# 29 — Required proof command sanity audit

## Purpose

Check the `required_proofs[]` block after open promotion for command/path sanity before the issue enters implementation.

## Proof rows reviewed

- `proof_gate_decision_probe`
- `proof_runner_probe`
- `replay_probe`
- `floor_budget_regression`
- `live_probe`
- `slop_guard`

## Findings

- All command rows use the repository root `~/dev/personal/experiments/pi-goals` where a shell command is expected.
- The three `goal-proof-*` probes are future implementation deliverables under `.ai/validation/`; their names align with the acceptance criteria and proof threat model.
- `floor_budget_regression` reuses the existing `goal-min-spend-floors-probe.mjs` plus `npm run quality:goal`, which is appropriate because ISSUE-021 must not regress the floor gate added by ISSUE-036.
- `live_probe` intentionally references `.ai/docs/pi-goals-live-probe-testing.md` as a procedure rather than pretending a deterministic command can fully validate live runtime behavior.
- `slop_guard` uses the existing package script `npm run slop:goal`, matching the AGENTS.md no-escape-hatch constraint.

## Result

The required proof rows are concrete enough for implementation closeout. Future probe file absence is expected before implementation and is explicitly classified as future deliverable in `raw/open-path-audit.log`.

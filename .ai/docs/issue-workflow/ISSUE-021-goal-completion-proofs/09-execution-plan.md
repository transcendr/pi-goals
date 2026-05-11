# 09 — Execution plan for ISSUE-021

## Phase 1 — Pure domain and state

- Add proof gate/result types.
- Add pure hash/freshness/condition evaluators in `proofs.ts` using `21-proof-evaluator-api.md`.
- Add replay-compatible parsing for optional proof state; explicitly validate proof arrays rather than accepting unchecked replay data.
- Use goal content/proof-config fingerprints, not raw `goal.updatedAt`, because accounting updates `updatedAt` every turn.
- Add trusted proof `source` to gate definitions so proofs are tied to issue/user/objective requirements.
- Deterministic probe: construct goal states in memory and assert aggregate proof readiness states.

Exit criteria: no runner/tool integration yet, but missing/stale/failed/pass classifications are deterministic and covered.

## Phase 2 — Bounded runner

- Add `proof-runner.ts` with timeout, output caps, cwd resolution, and structured results.
- Keep command execution non-interactive and bounded.
- Apply output caps in the proof runner; Pi `exec` supports timeout/cwd but not a typed output-cap option.
- Implement `worktree_status` freshness according to `23-worktree-freshness-design.md`: capture post-proof git status fingerprint for the resolved cwd.
- Add constants for timeout/output cap/max retained results.
- Probe timeout, output cap, exit code, stdout/stderr/output contains, and failure excerpt behavior.

Exit criteria: runner probe passes without needing active Pi goal state.

## Phase 3 — Tool surface

- Add proof management tools from `18-tool-api-design.md`: configure, remove, list, and run proof gates.
- Add run proof tool: run one proof or all required proofs, but refuse proof execution when the goal is already budget-exhausted/budget-limited.
- Persist proof gate edits and proof results audibly through state events.
- Return compact tool details that future telemetry can inspect.

Exit criteria: probes can configure/run proof gates through tool handlers or exported test seams.

## Phase 4 — Completion gate integration

- Extend `CompletionDecision` with a proof deferral variant.
- In `update_goal(status:"complete")`, block missing/stale/failed/timed-out required proofs before cancellation and persistence.
- Ensure failed proof-blocked completion does not set completion telemetry.
- Preserve floor gate and max-budget behavior.

Exit criteria: completion probe shows blocked completion before proof pass and allowed completion after fresh pass.

## Phase 5 — Rendering/docs/live probe

- Add compact proof status to tool formatting and widget/summary surfaces using `20-proof-ui-rendering-plan.md`; avoid dumping proof output excerpts into the widget or monitor sparse reports.
- Update README.
- Run `npm run quality:goal`.
- Run live probe using `.ai/docs/pi-goals-live-probe-testing.md`.

Exit criteria: required proofs in the issue pass and live transcript is captured.

## Suggested Solo todo graph

- Epic: ISSUE-021 durable completion proof gates.
- Planning/index todo: encode proof invariant, design locks, and proof rows.
- Implementation phase depends on planning.
- Validation phase depends on implementation.
- Live-probe/closeout phase depends on validation.
- Leaf todos:
  - Domain/state/proofs pure module.
  - Runner/tools/completion gate.
  - UI/docs/probes/live closeout.

## Risks to watch during execution

- Overbroad shell execution: mitigate with explicit configured gates and bounded commands.
- Sentrux file-line degradation in `tools.ts`: extract helpers early instead of expanding the file.
- TypeScript escape hatches: forbidden by project slop guard.
- Completion gate ordering regressions: probes must fail if persistence/cancellation happens before proof deferral.

# 11 — Proof condition matrix

## Condition semantics

| Condition | Exit-code policy | Match target | First-release notes |
| --- | --- | --- | --- |
| `exit_zero` | Must be `0` | none | Default safest condition. |
| `stdout_contains` | Default should require `0` unless `requireExitZero: false` is explicitly configured | stdout excerpt/full captured stdout before cap | Use literal string search, not regex. |
| `stderr_contains` | Default should require `0` unless explicitly disabled | stderr | Useful for tools that report success/warnings to stderr. |
| `output_contains` | Default should require `0` unless explicitly disabled | stdout or stderr | Good for simple probes that print `PASS`. |
| `stdout_regex` | Default should require `0` | stdout | Optional; validate pattern length and flags, cap matched output, and consider deferring regex support if implementation cannot bound pathological patterns safely. |

## Blocking reason mapping

| Result state | Completion blocking reason | User-facing advice |
| --- | --- | --- |
| no result for required gate | `missing` | Run the proof gate. |
| result gate hash differs | `stale` | Re-run proof after gate edit. |
| result goal/proof timestamp stale | `stale` | Re-run proof after goal/proof change. |
| worktree fingerprint differs | `stale` | Re-run proof after worktree change. |
| command timed out | `timeout` | Fix command or increase bounded timeout explicitly. |
| condition false | `failed` | Inspect excerpts and fix implementation or proof condition. |
| runner error | `failed` | Fix command/cwd/environment. |

## Freshness edge cases

- Objective edit after proof pass should stale proof results under `goal_state` freshness.
- Proof gate command/condition/timeout/cwd edit should stale prior results through gate hash mismatch.
- Token/time usage accounting alone should not stale proof results.
- Telemetry-only floor state changes should not stale proof results unless the proof config itself changes.
- Worktree fingerprint freshness should be opt-in because many goals are not repo-backed.

## Result retention

Recommended first release: keep latest N results per gate, default small. Completion only needs latest result per gate, but audit/debug benefits from one or two previous failures. Retention must be bounded to avoid context/state growth.

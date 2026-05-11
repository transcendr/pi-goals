# 07 — Acceptance traceability for ISSUE-023

| Acceptance criterion | Locked design source | Required proof coverage |
| --- | --- | --- |
| Users/agents can add/list/cancel watcher registrations for the four first-version kinds. | `03-design-lock.md` sections `First-version watcher types` and `UI/list/cancel surface` | `watcher_schema_caps_probe`, `watcher_render_cancel_probe` |
| Watchers are opt-in, visible, one-shot, timeout-limited, and cancelable. | `03-design-lock.md` sections `Polling/resource limits`, `Satisfaction and nudge delivery`, and `UI/list/cancel surface` | `watcher_schema_caps_probe`, `watcher_one_shot_delivery_probe`, `watcher_render_cancel_probe` |
| Watcher registrations survive reload without duplicate polling or lost terminal state. | `03-design-lock.md` section `Persistence and reload` | `watcher_replay_reload_probe` |
| Watcher satisfaction produces at most one stale-guarded nudge for the correct active local goal. | `03-design-lock.md` sections `Satisfaction and nudge delivery` and `Worktree and multi-goal boundaries` | `watcher_stale_guard_probe`, `watcher_one_shot_delivery_probe` |
| Watchers do not nudge after pause, clear, complete, budget limit, replacement, pending messages, busy context, timeout, cancel, cwd mismatch, or external-goal ownership. | `03-design-lock.md` sections `Satisfaction and nudge delivery`, `Worktree and multi-goal boundaries`, and `Relationship to ISSUE-016` | `watcher_stale_guard_probe`, `watcher_replay_reload_probe` |
| Command watchers reject shell strings and enforce argv, cwd, timeout, no-stdin, output cap, and expected-exit semantics. | `03-design-lock.md` sections `First-version watcher types`, `Execution ownership`, and `Polling/resource limits` | `watcher_schema_caps_probe`, `watcher_command_safety_probe` |
| File watchers enforce path resolution and read caps. | `03-design-lock.md` sections `First-version watcher types` and `Polling/resource limits` | `watcher_schema_caps_probe` |
| List/cancel output is compact, actionable, and idempotent where safe. | `03-design-lock.md` section `UI/list/cancel surface` | `watcher_render_cancel_probe` |
| Existing single-goal and idle-nudge behavior remains backward compatible. | `03-design-lock.md` section `Relationship to ISSUE-016` and ISSUE-016 dependency | `quality_goal`, ISSUE-016 proof suite during implementation |
| README documents watcher safety boundaries. | Canonical issue implementation checklist | `quality_goal` plus implementation review |

## Traceability conclusion

The proof set is aligned to the highest-risk watcher false greens: unbounded command execution, reload duplication, wrong-goal nudges, repeated delivery, hidden terminal state, and boundary leakage into external/multi-goal automation. The issue is execution-ready because every acceptance criterion maps to a locked design decision and at least one required proof row.

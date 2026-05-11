# 07 — Acceptance traceability for ISSUE-019

This artifact maps the promoted issue's acceptance criteria to the locked design and proof rows so implementers can see why each requirement exists.

| Acceptance criterion | Locked design source | Required proof coverage |
| --- | --- | --- |
| Existing single-goal sessions and `/goal <objective>` behavior remain backward compatible. | `03-design-lock.md` sections `State model` and `Migration and compatibility` | `multi_goal_replay_probe`, `multi_goal_render_probe`, `quality_goal` |
| A multi-goal collection can store multiple named top-level goal records with stable ids and per-goal budgets/floors/status. | `03-design-lock.md` section `State model` | `multi_goal_replay_probe` |
| `/goal list`/`list_goals` shows all goal records with focus/local-active/external ownership state. | `03-design-lock.md` sections `Command/tool surface` and `UI/listing strategy` | `multi_goal_render_probe` |
| Focus changes the default detail target without resuming, continuing, or mutating status. | `03-design-lock.md` sections `Meaning of active/focused/running` and `Focus/context isolation` | `focus_switch_probe`, `continuation_isolation_probe` |
| Switch activates exactly one local goal and cancels/pauses the previous local-active owner safely. | `03-design-lock.md` sections `Sequential mode` and `Focus/context isolation` | `focus_switch_probe`, `continuation_isolation_probe` |
| Continuation, monitor, pause steering, budget wrap-up, and completion operate only on the local-active goal. | `03-design-lock.md` section `Focus/context isolation` | `continuation_isolation_probe`, `mutation_boundary_probe` |
| External goal records can be tracked with session/worktree metadata but are never auto-driven by the current session. | `03-design-lock.md` section `Parallel mode first pass` | `continuation_isolation_probe`, `live_parallel_probe_or_skip` |
| Clearing/updating/completing one goal does not mutate unrelated goals. | `03-design-lock.md` sections `Focus/context isolation` and `Migration and compatibility` | `mutation_boundary_probe` |
| Queue items and subgoals remain separate from top-level multi-goal records. | `03-design-lock.md` sections `State model` and `Budget, proof, and history partitioning` | `queue_subgoal_boundary_probe` |
| Per-goal proof/budget/worktree/checkpoint metadata cannot satisfy or affect another goal. | `03-design-lock.md` sections `Budget, proof, and history partitioning` and `Focus/context isolation` | `continuation_isolation_probe`, `mutation_boundary_probe`, future ISSUE-021/022 integration probes |
| UI/widget rendering remains readable and no-collection rendering stays unchanged. | `03-design-lock.md` section `UI/listing strategy` | `multi_goal_render_probe` |
| README documents the feature and safety boundaries. | Issue implementation checklist | `quality_goal` plus implementation review |

## Traceability conclusion

The required proof set is aligned to the locked design. The strongest anti-false-green coverage is concentrated on replay compatibility, focus/switch isolation, continuation isolation, mutation boundaries, and queue/subgoal separation. These are the behaviors most likely to look green under shallow tests while still leaking goal state or steering across independent top-level goals.

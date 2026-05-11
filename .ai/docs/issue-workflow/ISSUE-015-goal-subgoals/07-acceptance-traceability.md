# 07 — Acceptance traceability

| Acceptance criterion | Design source | Implementation surface | Required proof |
| --- | --- | --- | --- |
| Parent creates/enters blocking child without replacing top-level goal | `03-design-lock.md` nested child decision | `subgoal-tools.ts`, `state.ts`, `prompts.ts` | `subgoal_replay_probe` |
| Template-backed child stays nested | reusable workflow design in canonical issue | `templates.ts`, `subgoal-tools.ts` | `template_child_probe` |
| Replay preserves child state/evidence | research on `state.ts` event replay | `types.ts`, `state.ts` | `subgoal_replay_probe` |
| Parent completion refused with unresolved child | proof threat model primary invariant | `completion-gate.ts`, `tools.ts`, `tool-results.ts` | `completion_block_probe` |
| Tool output exposes child/blockers | UI/tool output desired behavior | `tool-results.ts`, `format.ts` | covered by replay/completion probes plus quality gate |
| Widget/footer compactly render child state | UI research on dense widget | `format.ts`, `widget.ts`, `ui.ts` | add render assertions inside subgoal probes or a focused render probe |
| Parent hard budgets constrain child work | design invariant | `budget.ts`, `tools.ts`, child budget helpers | `quality_goal` plus implementation-specific tests |

## Gap noted for implementer

The canonical `required_proofs[]` block names replay, completion-block, template-containment, quality, and live-probe evidence. During implementation, add a render assertion either to one of the subgoal probes or as an additional focused probe if widget changes are non-trivial.

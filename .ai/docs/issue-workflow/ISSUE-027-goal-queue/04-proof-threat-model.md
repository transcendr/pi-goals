# 04 Proof threat model

Primary invariant: queued goals are durably stored, reviewable, and advanced sequentially without replacing or mutating the current active goal unless the user/agent explicitly chooses that action.

False-green risks:

1. `/goal queue` appears to work in memory but queued goals are lost on reload.
2. Choosing queue from the replace prompt accidentally replaces the active goal.
3. Template resolution differs between `/goal <template>` and `/goal queue <template>`.
4. Auto-advance prompt fires while another active goal exists or for a stale queue item.
5. The agent has no model-facing way to inspect or enqueue queued goals.
6. Queue UI/list output hides enough details that the agent cannot review upcoming work.
7. Queue implementation weakens existing single active goal behavior, pause/resume/clear behavior, budget handling, or monitor scheduling.

Proof strategy:

- Deterministic unit/probe coverage is sufficient for first pass because the feature is state/command/tool orchestration inside the extension.
- Add a bounded command/tool probe using mocked Pi/context APIs to prove persistence, replay, replace-prompt queue branch, and auto-advance injection.
- Run full project quality gate for structural/type/load validation.

Required proof mapping:

- queue_persistence_probe catches reload-loss and durable replay failures.
- queue_command_probe catches `/goal queue`, replace/queue/cancel branch, and template resolution regressions.
- queue_tool_probe catches missing agent-facing inspection/enqueue path.
- queue_advance_probe catches stale/unsafe auto-advance injection.
- existing quality gate catches TypeScript/load/Sentrux/slop regressions.

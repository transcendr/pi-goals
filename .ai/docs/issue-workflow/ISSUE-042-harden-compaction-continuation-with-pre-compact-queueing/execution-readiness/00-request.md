# 00 — Request intake

Issue: ISSUE-042 — Harden compaction continuation with pre-compact queueing

Inputs:
- bucket: open
- kind: fix
- title: Harden compaction continuation with pre-compact queueing
- requester context: ISSUE-039 acceptance was challenged by a live repro where a queued goal remained after compaction but the agent went idle.

Parsed problem:
- ISSUE-039 implemented post-compaction scheduling via `session_before_compact` / `session_compact` and `scheduleMaybeContinueGoal(..., "compacted")`.
- A live `/tree export` showed work on `.ai/.pi-goals/deslop-pipeline.md`, assistant final response, `[compaction: 257k tokens]`, then idle, despite a queued follow-up goal.
- The acceptance agent reported green, but its own gaps showed static/regex proof and unproven runtime continuation delivery.

Requested locked direction:
- No Pi core changes.
- Prefer pre-compaction queueing: before compaction, enqueue a real hidden follow-up when an active goal exists or when a completed goal has queued work.
- Rely on Pi core post-compaction behavior that calls `agent.continue()` when `agent.hasQueuedMessages()` is true.
- Add bounded post-compaction retry/polling as fallback for transient `notIdle` / `pendingMessages` races.
- Add runtime/mocked probes, not static regex-only probes.
- Carry the acceptance-pipeline false-green prompt hardening as a related side-note/follow-up.

Issue path choice:
- next issue number hint: ISSUE-042
- canonical issue path: `.ai/issues/open/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing.md`
- transcript directory: `.ai/docs/issue-workflow/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing/execution-readiness/`

Clarification result:
- No clarification needed. User explicitly locked no-core-change posture and asked to lean on pre-compaction queued-message delivery with retry fallback.

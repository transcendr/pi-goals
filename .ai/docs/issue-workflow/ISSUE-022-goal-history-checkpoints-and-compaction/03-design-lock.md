# 03 — Design lock for ISSUE-022

## Execution-ready decision

ISSUE-022 can be promoted to `open` as execution-ready for a bounded first checkpoint/history implementation pass. The original refine issue listed five architecture questions; the choices below resolve them for first release and align acceptance/proofs to one implementation direction.

## Locked design choices

### 1. Storage location

Chosen: store checkpoints as a separate branch-replayed custom entry stream, e.g. `pi-goal-checkpoint`, with a compact replayed runtime index.

- Do not append long checkpoint prose to every `GoalState` snapshot.
- Do not use markdown files as the primary runtime source of truth.
- Optionally store only a latest checkpoint id/timestamp summary on derived runtime state or tool details; avoid mutating core `GoalState` for every history view.

Rationale: `state.ts` shows branch custom entries are already the extension's replay unit, and ISSUE-024 already chose separate bounded metadata for audit. Separate checkpoint entries preserve `/tree` behavior without bloating goal snapshots.

Rejected:

- `GoalState`-embedded full checkpoint arrays: duplicates summaries on every update and risks context/state bloat.
- Markdown-first checkpoint files: not branch-local and too easy to desync from Pi session replay.
- Telemetry-only checkpoints: too machine-oriented for handoffs.

### 2. Trigger model

Chosen first pass:

- manual `/goal checkpoint [note]` command;
- model tool `create_goal_checkpoint` for explicit agent-created handoff checkpoints;
- auto checkpoints only at clear lifecycle boundaries: pause, budget limit, completion, and compaction-adjacent events.

Automatic checkpoints must be deduplicated per trigger/goal/status transition to avoid churn.

Rejected/deferred:

- every-turn checkpoints;
- timer-based checkpointing;
- monitor-driven checkpointing;
- watcher-triggered checkpointing before ISSUE-023.

### 3. Authorship and summary generation

Chosen: extension-built deterministic summaries are authoritative. A caller may provide an optional bounded note/next action, but checkpoint core fields come from current goal state, telemetry, floor state, compact proof/subgoal summaries when present, and session metadata.

Rationale: deterministic summaries are replay-safe, testable, and less likely to leak full transcript content. Model-written long summaries may be useful later as exported handoff notes but should not be required for first release.

Rejected:

- unbounded model-authored checkpoint prose;
- transcript excerpts as checkpoint source;
- provider-context summaries as the runtime source of truth.

### 4. Context bounds

Chosen: normal continuation/provider context must not receive full history. It may include only latest checkpoint id/trigger/short summary when a prompt explicitly needs handoff context. History listing/export is explicit through command/tool surfaces.

Rationale: ISSUE-022 exists to improve handoff without provider-context bloat. The monitor-report pattern already shows bounded summaries are possible.

### 5. Branch-local vs exported durable history

Chosen: replayed custom entries are the branch-local source of truth. Export is explicit and derived, e.g. `export_goal_history` writes a markdown timeline under a predictable `.ai/docs/...` path only when requested.

Rejected:

- automatic repo-file writes on every checkpoint;
- export files as required for reload/replay correctness.

### 6. Compaction posture

Chosen: use `session_before_compact` / `session_compact` hooks to create a compact deterministic checkpoint around compaction and add only a small latest-checkpoint handoff hint to compaction instructions when possible. Do not replace Pi compaction or archive full history into compaction prompts.

## Downstream consequences

- Add a dedicated module such as `history.ts` / `checkpoints.ts` rather than expanding `state.ts` with unrelated logic.
- Add constants for checkpoint custom entry type, max note chars, max summary chars, and max replayed history count.
- Extend lifecycle registration for compaction and for status transitions that should checkpoint.
- Extend command and tool surfaces without changing existing `/goal` default behavior.
- Extend tool results/formatting with compact latest-checkpoint/history counts only.
- README should document branch-local checkpoints, explicit export, and context-bound guarantees.

## Rejected alternatives summary

```toon
toon.version: 1
rejected_alternatives[5]{id,alternative,reason}:
  "ra1","full checkpoint arrays embedded in GoalState","duplicates history across state snapshots and risks bloat"
  "ra2","markdown files as runtime source of truth","not branch-local and can desync from Pi session replay"
  "ra3","model-authored long checkpoint summaries","harder to bound, verify, and keep non-sensitive"
  "ra4","automatic checkpoints every turn or timer","creates churn and low-signal history"
  "ra5","inject full history into continuation prompts","violates provider context bound invariant"
```

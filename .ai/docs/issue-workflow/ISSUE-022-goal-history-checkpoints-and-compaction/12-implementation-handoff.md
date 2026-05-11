# 12 — Implementation handoff for ISSUE-022

## Recommended first patch order

1. Add checkpoint constants/types/caps.
   - `constants.ts`: `GOAL_CHECKPOINT_ENTRY_TYPE`, schema version, cap constants.
   - `types.ts`: checkpoint trigger/status/record/runtime summary types.
2. Add a dedicated checkpoint module.
   - Suggested file: `.pi/extensions/goal/checkpoints.ts`.
   - Owns cap enforcement, deterministic summary construction, replay, dedupe keys, and markdown export formatting.
3. Wire replay and lifecycle.
   - `lifecycle.ts`: replay checkpoint state on `session_start` and `session_tree`.
   - Register pause/budget/complete/compaction checkpoint hooks without changing continuation semantics.
4. Add UX surfaces.
   - `command.ts`: `/goal checkpoint` and `/goal history`.
   - `tools.ts` or a new tool module: model checkpoint/history/export tools.
5. Add compact output/docs.
   - `tool-results.ts` / formatting helpers: latest checkpoint/count summaries.
   - `README.md`: commands, branch-local behavior, explicit export, no-full-history context guarantee.
6. Add probes and run gates.
   - Add `.ai/validation/goal-checkpoint-*.mjs` scripts matching `required_proofs[]`.
   - Run `npm run quality:goal`.
   - Run/record live probe or deterministic skip.

## Key implementation boundaries

- Do not store unbounded checkpoint arrays on `GoalState`.
- Do not write markdown files during ordinary checkpoint creation.
- Do not inject full history into continuation, monitor, or audit prompts.
- Do not let checkpoint presence satisfy completion gates, proof gates, or subgoal blockers.
- Do not overload queue semantics; checkpoints are state/history, not queued work.
- Do not replace Pi compaction; checkpoint around it and optionally add bounded latest-only hints if API support is proven.

## Suggested helper contracts

```ts
type CreateGoalCheckpointInput = {
  goal: GoalState;
  telemetry: GoalTelemetrySnapshot | null;
  trigger: GoalCheckpointTrigger;
  note?: string;
  now?: number;
};

type GoalCheckpointRuntimeState = {
  checkpoints: GoalCheckpointRecord[];
  latestByGoalId: Map<string, GoalCheckpointRecord>;
};
```

Implementation may tune names, but should preserve these responsibilities:

- creation and cap enforcement are pure/testable;
- persistence is a thin `pi.appendEntry` wrapper;
- replay accepts `unknown` branch entries and rejects invalid records defensively;
- command/tool handlers are small and delegate business logic to the checkpoint module.

## Validation focus for reviewer

Reviewer should first inspect whether the implementation keeps history separate and bounded. If it does, most remaining issues are command/tool polish. If it embeds history in `GoalState` snapshots or prompt context, reject the patch before tuning details.

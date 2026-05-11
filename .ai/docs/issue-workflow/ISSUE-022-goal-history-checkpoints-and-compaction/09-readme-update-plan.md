# 09 — README update plan for ISSUE-022

## README surface inspected

Read `README.md` sections:

- feature list;
- `/goal` command;
- goal queue;
- natural language goal management;
- completion floors;
- reusable prompts;
- automated churn monitor;
- development/status.

## Documentation gap

README currently says `pi-goals` has rewindable `/tree`-compatible state and replayable monitor state, but it has no user-facing section for human-readable checkpoints or history. This means users would not know:

- how to create a checkpoint;
- how to inspect history;
- whether checkpoints are branch-local or repo files;
- whether history affects provider context;
- how export differs from runtime state.

## First-pass README changes after implementation

Add feature-list bullet:

```markdown
- Bounded branch-local goal checkpoints and explicit history export for handoffs and compaction-aware work.
```

Extend `/goal` command examples:

```text
/goal checkpoint [note]
/goal history
```

Add subcommand bullets:

```markdown
- `/goal checkpoint [note]` — create a bounded branch-local checkpoint for the current goal without changing goal status.
- `/goal history` — show a compact checkpoint timeline for the current goal.
```

Add a new section after Goal queue or after Completion floors:

```markdown
## Goal checkpoints and history

`pi-goals` can record bounded human-readable checkpoints in the Pi branch. Checkpoints summarize the current goal status, usage/floor state, latest proof/subgoal state when available, blockers, and next action. They are separate from goal completion proof gates and do not mark work complete.

Checkpoints are branch-local by default and survive reload/tree replay. Full checkpoint history is not injected into normal continuation prompts. Use explicit export when you want a markdown handoff artifact.
```

Mention model tools once names are finalized:

- `create_goal_checkpoint`
- `list_goal_checkpoints` or `get_goal_history`
- `export_goal_history`

## Documentation proof expectation

The `checkpoint_export_probe` and `quality_goal` proofs should be paired with a README text probe or a static assertion inside an existing validation script that fails if `/goal checkpoint`, `/goal history`, branch-local state, and no-full-history context bounds are undocumented.

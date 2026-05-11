# 18 — Closeout summary for ISSUE-022

## Outcome

ISSUE-022 was promoted from refine to open as execution-ready:

- Canonical issue: `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- Old refine issue removed: `.ai/issues/refine/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- Transcript artifacts: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/`

## Locked first-pass design

- Separate replayed checkpoint custom-entry stream.
- Manual checkpoint/history command and model-tool UX.
- Automatic checkpoints only on clear lifecycle boundaries.
- Deterministic bounded summaries with optional capped notes.
- No full history injection into provider context.
- Explicit markdown export only.
- Compaction-aware bounded handoff metadata without replacing Pi compaction.

## Validation evidence

- Sentrux planning baseline saved for `.pi/extensions/goal`.
- `npm run quality:goal` passed; final rerun recorded `final_quality_goal_exit=0`.
- Promotion/path/artifact/link probes passed.
- TOON structural probe passed.
- Final `git diff --check` passed.
- Visibility check for `.ai/docs/issue-workflow/...` artifacts recorded in `raw/commands.log`.

## Next queue action

After the active ISSUE-022 goal is marked complete, continue the parent orchestration stack with ISSUE-018 via `create_goal_from_template` and `min_time_seconds_before_wrap_up=720`. Do not dequeue parent queue item `q-1778452744568-2` yet.

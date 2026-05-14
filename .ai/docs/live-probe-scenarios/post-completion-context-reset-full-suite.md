# Live probe scenario — post-completion context reset full suite

## Purpose

Validate every public ISSUE-043/ISSUE-044 post-completion context reset usage scenario in a real Pi/Solo process.

This suite exists because the original ISSUE-044 live probe covered only a subset of the feature surface. Passing this suite requires live evidence for both `clear` and `summarize`, slash and model-tool ingress, template and direct objectives, and queued handoff behavior.

## Preconditions

- Run from `/Users/bryan/dev/personal/experiments/pi-goals`.
- `npm run quality:goal` has passed for the current implementation.
- Use the running Solo process named `pi-goals-live-probe` in `solo-pi_goals` project `2` unless current Solo context says otherwise.
- Do not hard-code process ids in this durable protocol; resolve the process at run time.
- Capture transcripts under `/tmp`, not in the repo.

## Resolve and reload

```bash
SOLO_INSTANCE="${SOLO_INSTANCE:-solo-pi_goals}"
SOLO_PROJECT="${SOLO_PROJECT:-2}"
solo-mcp --instance "$SOLO_INSTANCE" processes --project "$SOLO_PROJECT"
PROBE_PROCESS="<resolved running pi-goals-live-probe id>"
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/reload'
sleep 3
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 120 --full
```

Expected evidence: reload succeeds with no extension load error.

## Cleanup helper

Before each independent scenario:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal clear'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 120 --full
```

Expected evidence: no unintended active goal remains and queue reports `No queued goals`.

## Scenarios

### S1 — slash direct clear success

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal count to 1 and clear context'
sleep 18
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 220 --full
```

Expected evidence:
- visible objective is `count to 1`;
- goal completes;
- transcript shows `Navigated to selected point`;
- no post-completion reset failure warning.

### S2 — slash direct summarize success

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal count to 1 and summarize context'
sleep 18
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 220 --full
```

Expected evidence: same as S1, with summarize directive stripped from objective and tree navigation succeeding.

### S3 — slash direct clear with queued follow-up

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal count to 1 and clear context'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue count to 2'
sleep 22
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 260 --full
```

Expected evidence:
- active goal objective is `count to 1`;
- queued goal `count to 2` is queued;
- `Navigated to selected point` appears after first goal completion;
- queued goal starts and completes with `1, 2`;
- no reset failure warning.

### S4 — slash direct summarize with queued follow-up

Same as S3, but first command is:

```bash
/goal count to 1 and summarize context
```

Expected evidence: same as S3.

### S5 — slash template summarize success

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal repo-worktree-inventory -- current state and summarize context'
sleep 25
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 260 --full
```

Expected evidence:
- rendered template objective starts and completes;
- raw trailing directive is stripped before template expansion;
- transcript shows `Navigated to selected point`;
- no reset failure warning.

### S6 — slash template clear success

Same as S5, but command is:

```bash
/goal repo-worktree-inventory -- current state and clear context
```

Expected evidence: same as S5, for clear mode.

### S7 — model-tool `create_goal` structured clear success

First ensure command-context capability exists by running one slash-created seed goal after reload:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal count to 1'
sleep 10
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal clear'
sleep 1
```

Then send a prompt that forces model-tool parameters:

```text
Use only pi-goal tools for this live probe. Call create_goal with objective "count to 1" and structured post_completion_context="clear". Complete the goal normally by counting 1 and calling update_goal status="complete". Report whether tree navigation happened and whether any post-completion reset failure warning appeared.
```

Expected evidence:
- `create_goal` is called with structured `post_completion_context="clear"`;
- goal completes;
- transcript shows `Navigated to selected point`;
- no reset failure warning.

### S8 — model-tool `create_goal` structured summarize success

Same as S7, but use `post_completion_context="summarize"`.

### S9 — model-tool `create_goal_from_template` structured context success

Use a seeded command context as in S7, then send:

```text
Use only pi-goal tools for this live probe. Call create_goal_from_template with template "repo-worktree-inventory", args "-- current state", and structured post_completion_context="clear". Execute the resulting goal normally until complete. Report whether tree navigation happened and whether any post-completion reset failure warning appeared.
```

Expected evidence:
- model tool call uses `create_goal_from_template` with structured context parameter;
- template goal completes;
- transcript shows `Navigated to selected point`;
- no reset failure warning.

### S10 — model-tool `enqueue_goal` structured context success

Use a seeded command context as in S7, then send:

```text
Use only pi-goal tools for this live probe. Call enqueue_goal with objective "count to 1" and structured post_completion_context="clear". Then call start_queued_goal, count 1, and call update_goal status="complete". Report whether tree navigation happened and whether any post-completion reset failure warning appeared.
```

Expected evidence:
- `enqueue_goal` is called with structured context parameter;
- queued goal starts;
- goal completes;
- transcript shows `Navigated to selected point`;
- no reset failure warning.

## Pass/fail criteria

```toon
toon.version: 1
live_probe_full_suite_requirements[10]{id,required_evidence}:
  "S1","slash direct clear strips directive, completes, and navigates"
  "S2","slash direct summarize strips directive, completes, and navigates"
  "S3","slash direct clear navigates before queued follow-up completes"
  "S4","slash direct summarize navigates before queued follow-up completes"
  "S5","slash template summarize strips raw directive before expansion and navigates"
  "S6","slash template clear strips raw directive before expansion and navigates"
  "S7","model-tool create_goal structured clear completes and navigates"
  "S8","model-tool create_goal structured summarize completes and navigates"
  "S9","model-tool create_goal_from_template structured context completes and navigates"
  "S10","model-tool enqueue_goal structured context starts, completes, and navigates"
```

A scenario is not green unless the transcript itself shows the public behavior under test. If public output cannot expose an internal field, say that explicitly and tie mode proof to the exact submitted command/tool params plus deterministic code/probe coverage.

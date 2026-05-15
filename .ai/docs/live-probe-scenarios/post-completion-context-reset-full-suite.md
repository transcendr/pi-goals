# Live probe scenario — post-completion context reset default suite

## Purpose

Validate the supported default-environment post-completion context reset surface in a real Pi/Solo process.

After ISSUE-045, `summarize` is the supported queue-stack mode. `clear` mode is intentionally default-off behind `PI_GOAL_CONTEXT_RESET_CLEAR`, so historical clear-navigation success scenarios are obsolete and have been removed from this default live suite. Clear behavior is covered by deterministic default-off probes; if clear navigation needs live validation, run a separate opt-in probe with `PI_GOAL_CONTEXT_RESET_CLEAR=1` and do not mix those results with the default suite.

The focused ISSUE-045 queue-stack closeout probe is:

- `.ai/docs/live-probe-scenarios/post-completion-context-reset-issue045-summarize-queue-stack.md`

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

### S1 — slash direct summarize success

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal count to 1 and summarize context'
sleep 18
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 220 --full
```

Expected evidence:

- visible objective is `count to 1`;
- summarize directive is stripped from objective;
- goal completes;
- transcript shows `Navigated to selected point`;
- no post-completion reset failure warning.

### S2 — slash direct summarize with queued follow-up

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal count to 1 and summarize context'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue count to 2'
sleep 35
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 360 --full
```

Expected evidence:

- active goal objective is `count to 1`;
- queued goal `count to 2` is queued before first completion;
- `Navigated to selected point` appears after first goal completion;
- queued goal starts exactly once and completes with `1, 2`;
- no `No tool call found for function call output` appears;
- no repeated stale `pi-goal-queue-steer` loop appears;
- cleanup leaves no active goal and no queued goals.

### S3 — slash template summarize success

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

### S4 — model-tool `create_goal` structured summarize success

First ensure command-context capability exists by running one slash-created seed goal after reload:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal count to 1'
sleep 10
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal clear'
sleep 1
```

Then send a prompt that forces model-tool parameters:

```text
Use only pi-goal tools for this live probe. Call create_goal with objective "count to 1" and structured post_completion_context="summarize". Complete the goal normally by counting 1 and calling update_goal status="complete". Report whether tree navigation happened and whether any post-completion reset failure warning appeared.
```

Expected evidence:

- `create_goal` is called with structured `post_completion_context="summarize"`;
- goal completes;
- transcript shows `Navigated to selected point`;
- no reset failure warning.

## Removed obsolete clear-navigation scenarios

The former full suite included clear-mode success scenarios for slash direct goals, queued follow-up, templates, `create_goal`, `create_goal_from_template`, and `enqueue_goal`. Those scenarios are obsolete in the default suite because ISSUE-045 intentionally disables clear navigation unless `PI_GOAL_CONTEXT_RESET_CLEAR` is explicitly enabled.

Default clear behavior should be verified with deterministic probes such as:

```bash
node .ai/validation/goal-context-reset-clear-default-off-probe.mjs
```

Expected default clear behavior: skipped action + visible warning + normal goal/queue continuation, with no `navigateTree` call and no silent downgrade to summarize.

## Pass/fail criteria

```toon
toon.version: 1
live_probe_default_suite_requirements[4]{id,required_evidence}:
  "S1","slash direct summarize strips directive, completes, and navigates"
  "S2","slash direct summarize queue stack navigates, preserves queued follow-up, starts it exactly once, and avoids Codex tool-call desync"
  "S3","slash template summarize strips raw directive before expansion and navigates"
  "S4","model-tool create_goal structured summarize completes and navigates"
```

A scenario is not green unless the transcript itself shows the public behavior under test. If public output cannot expose an internal field, say that explicitly and tie mode proof to the exact submitted command/tool params plus deterministic code/probe coverage.

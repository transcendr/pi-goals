# Live probe scenario — post-completion actions safe hooks

## Purpose

Validate ISSUE-044 behavior in a real Pi/Solo process after deterministic probes pass:

- template raw trailing context directive survives template expansion;
- post-completion context reset action can be skipped/disabled without blocking queue continuation;
- visible runtime state/notifications show the action policy;
- cleanup leaves no unintended active goal or queued items.

This scenario is reusable for future post-completion action regressions.

## Preconditions

- Run from `/Users/bryan/dev/personal/experiments/pi-goals`.
- `npm run quality:goal` has passed for the current implementation.
- Use `solo-pi_goals` project `2` unless current Solo context says otherwise.
- Do not hard-code process ids in durable instructions; resolve the running `pi-goals-live-probe` process each run.

## Resolve probe process

```bash
SOLO_INSTANCE="${SOLO_INSTANCE:-solo-pi_goals}"
SOLO_PROJECT="${SOLO_PROJECT:-2}"
solo-mcp --instance "$SOLO_INSTANCE" processes --project "$SOLO_PROJECT"
```

Select the running process named `pi-goals-live-probe`. If none is running, spawn one:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process spawn --project "$SOLO_PROJECT" --kind agent --runtime Pi --name pi-goals-live-probe
```

Store the selected id in a local shell variable only:

```bash
PROBE_PROCESS="<resolved id>"
```

## Protocol

### 1. Reload implementation

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/reload'
sleep 3
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 160 --full
```

Expected evidence:

- reload completed;
- no extension-load error;
- goal tool schemas include the reloaded extension behavior.

### 2. Clean starting state

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal clear'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 160 --full
```

Expected evidence:

- no active goal remains, or goal clear reports no active goal;
- queue is empty, or any stale queue state is deliberately removed by an authorized cleanup step before continuing.

### 3. Template raw directive extraction

Send a real template invocation where `{{args}}` is known to expand before the final template tail:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal repo-worktree-inventory -- current state and summarize context'
sleep 8
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 220 --full
```

Expected evidence:

- active/completed goal objective is the rendered repo-worktree inventory objective, not a raw directive-smuggled objective;
- post-completion context/action behavior is visible as summarize context policy or action state;
- no template expansion bug causes `and summarize context` to be treated as ordinary mid-template text only.

### 4. Disabled/skipped context reset must not block queue continuation

Use default-on kill switch state if available in the probe runtime. If the probe process was not spawned with `PI_GOAL_CONTEXT_RESET=0`, use an action-failure/skipped path that is safe in this runtime, such as missing/cleared command-context capability, but do not intentionally break unrelated state.

Queue a second simple goal behind a post-completion action goal:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue count to 3'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal complete'
sleep 10
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 240 --full
```

Expected evidence:

- any context reset action failure/skipped/disabled state is warned or visible;
- queue handoff still occurs after the terminal goal;
- the queued `count to 3` goal starts or is offered through queue steering;
- action state/failure is not used as a reason to suppress the next queue item.

### 5. Cleanup

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal clear'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 180 --full
```

Expected evidence:

- no unintended active goal remains;
- no unintended queued items remain.

## Pass/fail criteria

Pass only if the captured transcript shows:

```toon
toon.version: 1
live_probe_requirements[5]{id,required_evidence}:
  "lp1","/reload succeeds without extension load error"
  "lp2","template raw directive invocation records summarize-context action/policy after raw arg extraction"
  "lp3","failed/skipped/disabled context reset action is visible"
  "lp4","queue handoff proceeds despite failed/skipped/disabled action"
  "lp5","cleanup leaves no unintended active goal or queued item"
```

If any requirement is ambiguous, mark the live probe inconclusive and keep deterministic evidence separate from live evidence.

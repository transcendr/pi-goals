# Live probe — ISSUE-045 summarize queue-stack safety

## Purpose

Prove the ISSUE-045 live invariant in a real Pi/Solo process: a completed goal may summarize context and still hand off to the next queued goal exactly once, without stale queue-steer replay and without Codex tool-call desynchronization.

This focused probe complements deterministic probes and `npm run quality:goal`; it is mandatory for ISSUE-045 closeout.

## Preconditions

- Run from `/Users/bryan/dev/personal/experiments/pi-goals`.
- `npm run quality:goal` passed for the exact code under probe.
- Use `solo-pi_goals` project `2` unless the active Solo context says otherwise.
- Prefer an existing healthy process named `pi-goals-live-probe`; otherwise spawn a disposable fresh Pi agent with that name.
- Capture all command outputs under `/tmp`, not in the repo.

## Resolve process

```bash
SOLO_INSTANCE="${SOLO_INSTANCE:-solo-pi_goals}"
SOLO_PROJECT="${SOLO_PROJECT:-2}"
RUN_DIR="${RUN_DIR:-/tmp/issue045-summarize-queue-stack-live-probe-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$RUN_DIR"
solo-mcp --instance "$SOLO_INSTANCE" processes --project "$SOLO_PROJECT" --fields id,name,status,pid,command,uptime_seconds >"$RUN_DIR/00-processes.toon"
PROBE_PROCESS="<resolved pi-goals-live-probe process id>"
```

## Reload and cleanup

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/reload' >"$RUN_DIR/01-reload-send.toon"
sleep 3
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 160 --full >"$RUN_DIR/02-after-reload.log"
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal clear' >"$RUN_DIR/03-clear-send.toon"
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue' >"$RUN_DIR/04-queue-check-send.toon"
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 180 --full >"$RUN_DIR/05-clean-state.log"
```

Expected cleanup evidence:

- no active goal, or `/goal clear` reports no active goal;
- `/goal queue` reports `No queued goals`.

## Probe script

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal count to 1 and summarize context' >"$RUN_DIR/06-start-summarize-goal.toon"
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue count to 2' >"$RUN_DIR/07-queue-followup.toon"
sleep 35
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 360 --full >"$RUN_DIR/08-after-handoff.log"
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue' >"$RUN_DIR/09-final-queue-send.toon"
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 240 --full >"$RUN_DIR/10-final-state.log"
```

## Required evidence

```toon
toon.version: 1
required_live_evidence[7]{id,evidence}:
  "e1","first visible objective is directive-stripped: count to 1"
  "e2","queued follow-up count to 2 is accepted before first goal completion"
  "e3","first goal completes and transcript shows Navigated to selected point for summarize reset"
  "e4","no transcript line contains No tool call found for function call output"
  "e5","queued count to 2 starts exactly once and completes after counting 1 and 2"
  "e6","transcript/tree output shows no repeated stale pi-goal-queue-steer chain"
  "e7","final cleanup/check leaves no active goal and no queued goals"
```

## Failure handling

- If `No tool call found for function call output` appears, classify as ISSUE-045 failure until proven otherwise.
- If the queued goal is missing, duplicated, or starts more than once, classify as ISSUE-045 failure.
- If stale `pi-goal-queue-steer` branches replay after completion, classify as ISSUE-045 failure.
- Capture the failing transcript under `/tmp`, remediate, rerun `npm run quality:goal`, and repeat this live probe until green.

## Clear-mode note

ISSUE-045 intentionally gates `clear` mode behind `PI_GOAL_CONTEXT_RESET_CLEAR`, default-off. A default-environment live probe should not require clear-mode navigation. If clear behavior is probed separately, expected default behavior is skip + warning + continuation, not navigation.

# Live probe scenario: terminal goal queue handoff

## Context

Use this scenario when changing `pi-goals` queue steering, queue tools, goal completion, `agent_end`, or runtime continuation behavior.

It validates the regression class where a goal is already terminal (`complete` or `budgetLimited`) while the persistent goal queue still has work. The expected behavior is that queued work continues automatically; the agent must not go idle and require a manual `/goal resume` or unrelated user input.

Related deterministic probe:

```bash
node .ai/validation/goal-complete-queue-handoff-probe.mjs
```

Canonical live probe setup guide: `.ai/docs/pi-goals-live-probe-testing.md`.

## Design rationale

There are two distinct terminal-goal queue handoff paths:

1. **Dequeue-driven handoff**: an orchestration queue head is satisfied and removed with `dequeue_goal`; if another queue item remains, the extension must immediately hand off that next queue head.
2. **Agent-end catch-up handoff**: a turn ends with a terminal current goal and a non-empty queue; the extension must send queue steering after turn teardown so the queued work starts without manual intervention.

Both must be tested in the real Pi/Solo loop because hidden/custom messages, `triggerTurn`, streaming/turn teardown timing, and tool orchestration can behave differently from static or mocked checks.

## Prerequisites

1. Start from a clean repo state or note any intentional dirty changes.
2. Run deterministic validation first when applicable:

   ```bash
   node .ai/validation/goal-complete-queue-handoff-probe.mjs
   npm run quality:goal
   ```

3. Resolve the live probe process using `.ai/docs/pi-goals-live-probe-testing.md`; do not hard-code process ids in durable docs.
4. Reload the extension and clear any existing probe goal:

   ```bash
   solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/reload'
   sleep 2
   solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal clear'
   sleep 2
   ```

If `/goal clear` reports no goal, continue.

## Scenario A: dequeue-driven handoff

### Prompt to send

Send this as one user message to the live probe process:

```text
Run pi-goals live probe Scenario A. Do not edit files.

Use the pi-goal tools to set up a terminal current goal with two queued items, then let queue steering proceed:

1. create_goal with objective: `Scenario A setup goal: prove dequeue-driven queue handoff`.
2. enqueue_goal with objective: `Scenario A orchestration item: this item is satisfied by acknowledging it, then call dequeue_goal exactly once; do not call start_queued_goal for this item.`
3. enqueue_goal with objective: `Scenario A direct item: count to two, then mark the active queued goal complete.`
4. update_goal status complete for the setup goal.

When the queue steering message for item 1 arrives, classify it as orchestration/JIT work, acknowledge it as satisfied, and call dequeue_goal exactly once with clear rationale/authority. Then continue to the next queued item without waiting for user input.
```

### Expected transcript evidence

The transcript must show all of the following in order:

1. setup goal created;
2. two queued goals enqueued;
3. setup goal marked complete;
4. `dequeue_goal` consumes the first/orchestration queue id;
5. without `/goal resume` or another user prompt, `start_queued_goal` starts the second queue id;
6. the second queued goal completes and prints/counts `1, 2`.

### Failure signals

Treat the scenario as failed or ambiguous if:

- the agent goes idle after `dequeue_goal` while the second queue item remains;
- the second queue item starts only after a manual `/goal resume` or unrelated user input;
- the agent incorrectly uses `start_queued_goal` for the orchestration item that told it to dequeue;
- queue ids in the transcript do not show continuity from dequeue to next start.

## Scenario B: agent-end catch-up handoff

### Setup

Clear the completed Scenario A goal before running Scenario B:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal clear'
sleep 2
```

### Prompt to send

Send this as one user message to the live probe process:

```text
Run pi-goals live probe Scenario B. Do not edit files.

Set up terminal-goal-with-queued-work, then stop so the extension's agent_end hook must hand off the queue:

1. create_goal with objective: `Scenario B setup goal: terminal goal before queued work`.
2. update_goal status complete for that setup goal.
3. enqueue_goal with objective: `Scenario B direct item: count to four, then mark the active queued goal complete.`

After enqueue_goal, do not call start_queued_goal, do not call /goal resume, and do not manually process the queued item before this turn ends. Reply only: `Scenario B queued; waiting for agent_end handoff.`
```

### Expected transcript evidence

The transcript must show all of the following in order:

1. setup goal created;
2. setup goal marked complete;
3. queued item enqueued;
4. assistant replies exactly or equivalently that it is waiting for `agent_end` handoff;
5. without `/goal resume` or another user prompt, `start_queued_goal` starts the queued id;
6. the queued goal completes and prints/counts `1, 2, 3, 4`.

### Failure signals

Treat the scenario as failed or ambiguous if:

- the queued item remains idle after the waiting response;
- the queued item starts only after another user message;
- the agent manually starts the queued goal in the same turn before the waiting response;
- queue ids in the transcript do not show continuity from enqueue to start.

## Optional debug-log evidence

If compaction debug logging is enabled for the probe process, useful events include:

- Scenario A:
  - `queueTools.dequeue.queueHandoffDecision`
  - `queueTools.dequeue.queueHandoffSent`
  - `queueHandoff.send.start`
  - `queueHandoff.send.end`
- Scenario B:
  - `lifecycle.agent_end.queueDecision`
  - `lifecycle.agent_end.queueHandoff.scheduled`
  - `lifecycle.agent_end.queueHandoff.dispatch`
  - `queueHandoff.send.start`
  - `queueHandoff.send.end`

Logs are supporting evidence only. The pass/fail source of truth is the live transcript showing the queued work starts without manual resume or unrelated user input.

## Cleanup

After the scenarios, leave the probe in a clean state when possible:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal clear'
```

If queue cleanup is needed, do not discard queued work unless it is clearly test-created work from this scenario or the user explicitly authorized removal.

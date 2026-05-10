# Pi-goals live probe agent testing

This document is the canonical project-local guide for validating `pi-goal` behavior in a real Pi interactive session through Solo. It complements deterministic probes and `npm run quality:goal`; it does not replace them.

## Purpose

Use the live probe surface when a `pi-goal` change affects behavior that only becomes trustworthy in the real Pi TUI/agent loop, such as:

- slash-command dispatch and autocomplete interactions;
- goal widget/status rendering and notifications;
- continuation, resume, queue steering, and agent-side tool orchestration;
- behavior that depends on the live extension runtime after `/reload`;
- Solo process input delivery semantics.

A live probe is usually expected for behavior-changing fixes in `pi-goals` unless the user explicitly says not to run one.

## Relationship to deterministic tests

Live probes are complementary evidence, not a substitute for deterministic tests.

Run deterministic tests first when they can isolate the behavior. The live probe should then validate the end-to-end user-facing path in a real Pi process.

You may skip the live probe only when all of the following are true:

1. the change/fix is small;
2. deterministic coverage is direct, unambiguous, and already executed;
3. the live surface would add little practical evidence relative to time/token cost;
4. you provide a visible, well-reasoned explanation for skipping it in the currently appropriate context, such as the chat closeout, issue closeout notes, or a validation comment.

Do not silently skip the live probe for behavior changes.

## Process identity and discovery

Do not hard-code a live probe process id in docs, scripts, or closeout instructions. Process ids are local runtime state and may change.

Use the current working agent's Solo context for instance/project values. In this repo, `AGENTS.md` records the usual Solo context, but active work may provide a different instance or project. Prefer explicit current-context values over stale examples.

The preferred probe process name is:

```text
pi-goals-live-probe
```

If a running process with that name exists, use it instead of spawning a new one unless the user instructs otherwise.

Suggested discovery pattern:

```bash
SOLO_INSTANCE="${SOLO_INSTANCE:-solo-pi_goals}"
SOLO_PROJECT="${SOLO_PROJECT:-2}"

solo-mcp --instance "$SOLO_INSTANCE" process list --project "$SOLO_PROJECT"
solo-mcp --instance "$SOLO_INSTANCE" process status pi-goals-live-probe --project "$SOLO_PROJECT"
```

If status-by-name is unsupported in the installed CLI, list processes and select the running process named `pi-goals-live-probe`; store its id in a shell variable for the current validation only:

```bash
PROBE_PROCESS="<id-or-name-from-process-list>"
```

Using the process name directly is preferred when supported:

```bash
PROBE_PROCESS="pi-goals-live-probe"
```

## Creating a probe process when absent

Only spawn a new probe when no suitable existing `pi-goals-live-probe` process is alive.

Use a Pi runtime agent process named `pi-goals-live-probe` in the current project:

```bash
SOLO_INSTANCE="${SOLO_INSTANCE:-solo-pi_goals}"
SOLO_PROJECT="${SOLO_PROJECT:-2}"

solo-mcp --instance "$SOLO_INSTANCE" process spawn \
  --project "$SOLO_PROJECT" \
  --kind agent \
  --runtime Pi \
  --name pi-goals-live-probe
```

After spawning, wait until the process is ready before sending commands. Check status/output rather than assuming immediate readiness:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process status pi-goals-live-probe --project "$SOLO_PROJECT"
solo-mcp --instance "$SOLO_INSTANCE" process output pi-goals-live-probe --project "$SOLO_PROJECT" --lines 80
```

## Sending input safely with `solo-mcp`

Canonical command shape:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue count to five'
```

Important learned behavior:

- `process send --input <text>` submits by default.
- For single slash-command inputs, the local `solo-mcp` CLI sends a follow-up raw Enter after a 500ms delay to handle Pi autocomplete consuming the first Enter.
- The follow-up is visible in CLI output as `submit_followup.sent: true`.
- Do not rely on `--wait-ms` for correctness. It only returns a bounded preview and is not proof of command receipt, readiness, or absence of output.
- Prefer separate `process output` or `process raw-output` reads for validation evidence.

Avoid sending multiple slash commands in one input. Split commands into separate sends with a short delay:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/reload'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue count to five'
```

## Handling interactive prompts

Some `/goal` paths can open a TUI confirmation such as Replace / Queue / Cancel when a goal already exists.

When the expected action is the default selected option, send raw Enter:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --bytes 13 --no-submit
```

When a non-default option is required, send arrow-key bytes to move selection, then Enter. Verify the resulting output before proceeding. Do not assume a prompt was handled unless output confirms it.

For stale prompt text, autocomplete overlays, or accidental partial input, prefer clearing the editor before the next scripted command:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --bytes 3 --no-submit   # Ctrl-C
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --bytes 21 --no-submit  # Ctrl-U
```

Use this carefully: Ctrl-C can interrupt active work if the process is not idle.

## Standard validation flows

### Reload after code changes

After implementation changes that affect the extension runtime, reload the probe process:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/reload'
sleep 2
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 120 --full
```

Look for extension reload output and absence of load errors.

### Queue/resume behavior

Use this when validating queue steering or `/goal resume` behavior:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal clear'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue count to five'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal resume'
sleep 8
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 180 --full
```

Expected evidence for no-active-goal resume:

- `No active goal. Resuming queued goal processing for 1 queued goal.`
- `start_queued_goal` starts the queued item.
- the queued goal objective is completed.

To validate completed-goal resume, leave a completed current goal, enqueue another goal, then run `/goal resume`:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue count to five'
sleep 1
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal resume'
sleep 8
solo-mcp --instance "$SOLO_INSTANCE" process output "$PROBE_PROCESS" --project "$SOLO_PROJECT" --lines 180 --full
```

Expected evidence:

- `Goal is complete. Resuming queued goal processing for 1 queued goal.`
- `start_queued_goal` starts the queued item.
- the queued goal objective is completed.

Clean up after queue tests unless the user asks to preserve state:

```bash
solo-mcp --instance "$SOLO_INSTANCE" process send "$PROBE_PROCESS" --project "$SOLO_PROJECT" --input '/goal queue'
```

Confirm no unintended queued items remain. If cleanup requires removing queued items, use explicit user-authorized instructions or the project queue tools with audit rationale/authority.

## Evidence standards

A live probe is complete only when the transcript or output shows the behavior under test. Good evidence includes:

- the exact command sent;
- `submit_followup.sent: true` when validating slash-command send reliability;
- `process output --full` snippets showing the expected notification/tool call/result;
- final queue/goal state when relevant.

Preview output from `process send --wait-ms` is useful for orientation only. It is truncated and explicitly not absence/readiness evidence.

## Common pitfalls and tips

- Prefer existing `pi-goals-live-probe`; do not spawn duplicate probe agents casually.
- Never hard-code process ids in reusable docs or commands. Resolve the process from current context.
- Keep polling sparse. Give the agent enough time to act before reading output.
- Use realistic prompts that exercise the actual user-facing path rather than only synthetic tool calls.
- Preserve the probe process when possible; persistent history helps reproduce regressions.
- Clean up goals/queues deliberately. Do not discard queued work without explicit authorization or a satisfied queue head.
- If a live probe result is ambiguous, say so and fall back to deterministic evidence plus a precise explanation of what could not be proven live.

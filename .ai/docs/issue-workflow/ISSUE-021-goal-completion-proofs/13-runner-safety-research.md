# 13 — Runner safety research

## Files inspected

- `.pi/extensions/goal/monitor.ts`
- `.pi/extensions/goal/constants.ts`
- `.pi/extensions/goal/model-output.ts`
- `.pi/extensions/goal/templates.ts`

## Pi exec API facts

Inspected Pi's extension type definitions:

- `ExtensionAPI.exec(command, args, options)` returns `{ stdout, stderr, code, killed }`.
- `ExecOptions` supports `signal`, `timeout`, and `cwd`.
- There is no typed output-cap option on `pi.exec`; output must be capped by the proof runner after execution and before persistence/tool details.
- The `killed` boolean is the durable signal to map timeout/abort-like runner outcomes to proof result metadata, alongside elapsed time and exit code.

Implementation implication: `proof-runner.ts` should apply its own stdout/stderr excerpt caps and store `timedOut`/`killed` semantics explicitly. Do not assume `pi.exec` will bound output size for proof persistence.

## Existing bounded-execution patterns

### Monitor agent execution

`monitor.ts` invokes a headless Pi monitor process through `pi.exec("pi", [...], { cwd, timeout })` and uses named constants:

- `GOAL_MONITOR_PROCESS_TIMEOUT_MS`
- `GOAL_MONITOR_OUTPUT_CHARS`

It also slices combined stdout/stderr before parsing and stale-guards decisions by goal id/status before injecting steering.

Implication for proof runner: use named constants, bounded output, and stale guards. Do not allow proof results from an old goal/status to satisfy current completion.

### Template inline commands

`templates.ts` supports inline `!\`...\`` commands only when `allow_commands: true`, and executes them with:

- `/bin/bash -lc <command>`;
- `timeout: template.commandTimeoutMs`;
- `maxBuffer: template.commandOutputLimit + 1024`;
- truncation to `commandOutputLimit`.

Implication for proof runner: there is precedent for bounded shell command execution, but template inline commands are not durable proofs. ISSUE-021 should keep proof execution separate, explicit, and persisted.

### Model-output parser

`model-output.ts` extracts tolerant XML from monitor output. Proof result evaluation should not rely on model output parsing for pass/fail. It may reuse general bounded parsing helpers only for future proof-review summaries, not for deterministic proof conditions.

## Locked safety additions for issue execution

- Proof runner constants should live in `constants.ts` or a dedicated proof constants module.
- Proof commands should be explicit goal proof configuration, not silently imported from arbitrary prompt text.
- Proof runner should record both exit code and condition result; contains/regex conditions must not hide non-zero exits unless explicitly configured.
- Proof result acceptance should be stale-guarded by goal id, goal status, gate hash, and freshness policy.
- Timeout and output-cap behavior need deterministic probes.
- If first implementation uses `/bin/bash -lc`, docs should state proof commands are project-local shell commands configured by trusted user/agent tools, not remote/untrusted text execution.
- Default proof `cwd` should be the extension context cwd. If a gate supplies `cwd`, resolve it under the project root unless the user explicitly configures an absolute trusted path; otherwise a proof could quietly validate the wrong checkout or unrelated directory.
- Proof runner should record resolved cwd in `GoalProofResult` so stale/fresh decisions and audits know which worktree was verified.

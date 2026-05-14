---
description: Supervise a Solo deslop-commit-range run, verify results, and drive follow-up issue docs
aliases: deslop-supervise,deslop-tlo,deslop-review-pipeline
usage: /goal deslop-pipeline --rethrow 2 -- 12345678..HEAD
examples: /goal deslop-pipeline --rethrow 2 -- HEAD~5..HEAD; /goal deslop-supervise --rethrow 3 -- 5ed1650..HEAD
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
Run the full supervised deslop pipeline for this commit range:

<commit_range>
{{args}}
</commit_range>

<boomerang_rethrow>
{{rethrow}}
</boomerang_rethrow>

This workflow is exact. Do not silently substitute a different orchestration pattern, runtime, model, monitor cadence, gate, queue behavior, issue bucket, or completion condition. If a blocker prevents completing any required step exactly, stop, escalate, and report the blocker.

Execute each rendered command manually and individually, in the proper workflow sequence, at the moment the workflow requires it. Do not automate the rendered commands with Python, combine them into scripts, batch them together, wrap them in helper programs, or otherwise avoid directly and intentionally running the command yourself.

## Resolved Solo context

This section is rendered at goal-creation time using read-only inline commands. Use these concrete values and ready-to-run commands instead of manually rediscovering the Solo instance/project. If `solo_context_status` is `unresolved`, stop and escalate that blocker rather than guessing.

```toon
!`PI_GOAL_COMMIT_RANGE=$(cat <<'PI_GOAL_COMMIT_RANGE'
{{args}}
PI_GOAL_COMMIT_RANGE
)
PI_GOAL_RETHROW=$(cat <<'PI_GOAL_RETHROW'
{{rethrow}}
PI_GOAL_RETHROW
)
export PI_GOAL_COMMIT_RANGE PI_GOAL_RETHROW
python3 - <<'PY'
import hashlib
import os
import re
import shlex
import subprocess
from datetime import datetime, timezone

repo = os.getcwd()
commit_range = os.environ.get("PI_GOAL_COMMIT_RANGE", "").strip()
rethrow = os.environ.get("PI_GOAL_RETHROW", "").strip()
preferred = [os.environ.get("SOLO_MCP_INSTANCE", ""), "solo-pi_goals", "solo"]

try:
    instances = subprocess.run(["solo-mcp", "instances"], text=True, capture_output=True, timeout=5, check=False).stdout
except Exception as exc:
    print("solo_context_status: unresolved")
    print(f"repo_path: {repo}")
    print(f"blocker: solo-mcp instances failed: {exc}")
    raise SystemExit(0)

for line in instances.splitlines():
    match = re.match(r"^\s{2}([A-Za-z0-9_-]+),", line)
    if match:
        preferred.append(match.group(1))

seen = set()
candidates = []
for name in preferred:
    if name and name not in seen:
        seen.add(name)
        candidates.append(name)

matches = []
checked = []
for instance in candidates:
    try:
        result = subprocess.run(["solo-mcp", "--instance", instance, "projects"], text=True, capture_output=True, timeout=5, check=False)
    except Exception as exc:
        checked.append(f"{instance}: error {exc}")
        continue
    checked.append(f"{instance}: exit {result.returncode}")
    if result.returncode != 0:
        continue
    for raw_line in result.stdout.splitlines():
        parts = [part.strip() for part in raw_line.strip().split(",", 2)]
        if len(parts) == 3 and parts[0].isdigit() and parts[2] == repo:
            matches.append((instance, parts[0], parts[1], parts[2]))
    if matches:
        break

if not matches:
    print("solo_context_status: unresolved")
    print(f"repo_path: {repo}")
    print(f"candidate_instances_checked: {', '.join(checked) if checked else 'none'}")
    print("blocker: no Solo project path matched the current repository")
    raise SystemExit(0)

instance, project_id, project_name, project_path = matches[0]
quote = shlex.quote
range_hash = hashlib.sha256(commit_range.encode("utf-8")).hexdigest()[:12]
stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
artifact_dir = f"/tmp/pi-goals-deslop-pipeline-{stamp}-{range_hash}"
baseline_log = f"{artifact_dir}/sentrux-baseline.log"
baseline_json = f"{artifact_dir}/sentrux-baseline.json"
post_log = f"{artifact_dir}/sentrux-post-deslop.log"
boomerang = f"/boomerang --rethrow {rethrow} create a goal from template deslop-commit-range for the following commit range {commit_range}"
print("solo_context_status: resolved")
print(f"solo_instance: {instance}")
print(f"project_id: {project_id}")
print(f"project_name: {project_name}")
print(f"project_path: {project_path}")
print(f"repo_path: {repo}")
print(f"tmp_artifact_dir: {artifact_dir}")
print(f"candidate_instances_checked: {', '.join(checked)}")
print("ready_to_run_commands:")
print("  preflight_git_status: git status --short --untracked-files=all")
print("  sentrux_baseline_gate: " + f"mkdir -p {quote(artifact_dir)} && bash -o pipefail -c {quote('sentrux gate --save .pi/extensions/goal 2>&1 | tee ' + quote(baseline_log))}")
print("  sentrux_baseline_copy_json: " + f"cp .pi/extensions/goal/.sentrux/baseline.json {quote(baseline_json)}")
print("  spawn_worker: " + " ".join([
    "solo-mcp", "--instance", quote(instance), "process", "spawn",
    "--project", quote(project_id), "--kind", "agent", "--runtime", "Pi",
    "--runtime-args", quote("--profile solo-researcher-strong"),
    "--custom-agent-tool", "materialized", "--materialized-args-mode", "replace",
    "--include-agent-instructions", "false",
]))
print("  set_worker_id_after_spawn: export DESLOP_WORKER_ID=<id from spawn_worker output>")
print("  send_model_switch: " + f"solo-mcp --instance {quote(instance)} process send \"$DESLOP_WORKER_ID\" --project {quote(project_id)} --input {quote('/model opencode-go/deepseek-v4-pro')} --allow-recent-spawn --wait-ms 2000")
print("  verify_model_switch_output: " + f"solo-mcp --instance {quote(instance)} process output \"$DESLOP_WORKER_ID\" --project {quote(project_id)} --lines 40")
print("  send_deslop_boomerang: " + f"solo-mcp --instance {quote(instance)} process send \"$DESLOP_WORKER_ID\" --project {quote(project_id)} --input {quote(boomerang)}")
print("  sparse_poll_status: " + f"sleep 90 && solo-mcp --instance {quote(instance)} process status \"$DESLOP_WORKER_ID\" --project {quote(project_id)}")
print("  sparse_poll_small_output: " + f"solo-mcp --instance {quote(instance)} process output \"$DESLOP_WORKER_ID\" --project {quote(project_id)} --lines 40")
print("  diagnostic_or_final_output: " + f"solo-mcp --instance {quote(instance)} process output \"$DESLOP_WORKER_ID\" --project {quote(project_id)} --lines 120 --full")
print("  capture_final_output: " + f"solo-mcp --instance {quote(instance)} process output \"$DESLOP_WORKER_ID\" --project {quote(project_id)} --lines 160 --full > {quote(artifact_dir + '/deslop-final-output.txt')}")
print("  sentrux_post_deslop_gate: " + f"bash -o pipefail -c {quote('sentrux gate .pi/extensions/goal 2>&1 | tee ' + quote(post_log))}")
print("  verify_review_issue_trackable: git status --short --untracked-files=all && git check-ignore -v .ai/issues/review/<created-issue-file>.md || true")
PY`
```

## Required workflow

### 0. Baseline Sentrux measurement

Before spawning the deslop worker, run the rendered `preflight_git_status` command and inspect the result. If it shows dirty worktree changes, stop and escalate.

Then run the rendered `sentrux_baseline_gate` command, not a bare gate command. It must save the Sentrux baseline and tee the full output into the rendered `/tmp/.../sentrux-baseline.log` path. The rendered command uses `bash -o pipefail` so a failing Sentrux gate still fails the command even though output is piped through `tee`:

```bash
mkdir -p /tmp/<rendered-deslop-artifact-dir> && bash -o pipefail -c 'sentrux gate --save .pi/extensions/goal 2>&1 | tee /tmp/<rendered-deslop-artifact-dir>/sentrux-baseline.log'
```

After the gate succeeds, run the rendered `sentrux_baseline_copy_json` command to copy `.pi/extensions/goal/.sentrux/baseline.json` into `/tmp`, not into the repo/cwd.

Record the current measurement as the baseline for later comparison, including at minimum:

- quality score;
- coupling measurement;
- full command output path under `/tmp`;
- copied `/tmp/.../sentrux-baseline.json` path.

You will need this `/tmp` baseline evidence in step 4 when checking whether the deslop work caused Sentrux degradation.

### 1. Spawn the Solo Pi deslop worker and switch model

Use the `spawn_worker` command from the resolved Solo context above. It already contains the concrete Solo instance and project id for this repository. Do not manually rediscover those values unless the rendered context is unresolved or stale.

Spawn a new Solo agent process using Pi runtime with `--profile solo-researcher-strong`. Use true Solo agent semantics, not a terminal fallback, unless spawning an agent is blocked and you explicitly stop/escalate.

After spawning, set `DESLOP_WORKER_ID` from the spawn output as shown in the resolved context, then send this exact model switch:

```text
/model opencode-go/deepseek-v4-pro
```

Use the rendered `send_model_switch` command for delivery, preserving the slash command exactly. It includes a short bounded wait to reduce racey output checks. Before sending the deslop boomerang, run the rendered `verify_model_switch_output` command and inspect the output for evidence that the model switch completed successfully. If the model switch failed or is unclear, retry `send_model_switch` once and then rerun `verify_model_switch_output`. If the second attempt still fails or remains unclear, do not send the boomerang; escalate with the evidence and ask for direction.

### 2. Send the deslop boomerang command

Send this exact boomerang command to the worker after the model switch. Prefer the rendered `send_deslop_boomerang` command from the resolved context:

```text
/boomerang --rethrow {{rethrow}} create a goal from template deslop-commit-range for the following commit range {{args}}.  Execute the goal immediately after creating it, do not pause or report goal creation to the user.
```

Do not replace this with a direct prompt, direct `/goal`, direct tool call, or a different template. The spawned agent must receive the boomerang command above.

### 3. Sparse polling loop

Monitor the deslop worker with sparse polling only: basic `sleep 90`, then a token-efficient Solo process status check. Do not use Solo timer helpers, timer-pair commands, continuous polling, or large routine output reads.

Use the rendered `sparse_poll_status` command:

```bash
sleep 90
solo-mcp --instance <resolved_instance> process status "$DESLOP_WORKER_ID" --project <resolved_project_id>
```

If the status suggests the worker is still active and healthy, continue the same 90-second cadence. Do not request recap text from a healthy active worker.

If the status suggests idle/completion/error/blocker, or if there is a suspect condition such as stalled state, failed command, unclear completion, repeated identical status, or explicit worker error, run the rendered `sparse_poll_small_output` command. Use the rendered `diagnostic_or_final_output` command only when the bounded tail is insufficient for diagnosis or final report capture. When the worker report is final, prefer the rendered `capture_final_output` command so the report is preserved under the `/tmp` artifact directory.

Repeat until the deslop operation is done, the worker has reported, and the worker has gone idle.

### 4. Review and verify the deslop report/work yourself

After the worker reports completion and goes idle, review the agent report and the actual deslop work/commits yourself. Do not rely on the worker's report as proof.

Minimum review actions:

1. Inspect the worker's final report/output. Prefer the preserved `/tmp/.../deslop-final-output.txt` from `capture_final_output` when available.
2. Inspect the commits and working tree changes produced by the worker.
3. Rerun the Sentrux gate with the rendered `sentrux_post_deslop_gate` command and compare against the step-0 `/tmp` baseline evidence, specifically checking quality score and coupling measurement for degradation:

   ```bash
   bash -o pipefail -c 'sentrux gate .pi/extensions/goal 2>&1 | tee /tmp/<rendered-deslop-artifact-dir>/sentrux-post-deslop.log'
   ```

4. Run any project-required or issue-relevant validation needed to verify the deslop work. For this repo, `npm run quality:goal` is usually required when `.pi/extensions/goal` behavior or TypeScript changed.

If you identify any issues in the worker's work, including bad assumptions, wrong or potentially breaking changes, validation failures, or Sentrux degradation, produce a matrix table with:

| id | issue | severity | confidence | evidence | immediate action |
| --- | --- | --- | --- | --- | --- |

Fix all issues immediately when severity is medium or higher and confidence is medium or higher. Place the list / context of the lower-severity or lower-confidence issues together in single follow-up issue docs under `.ai/issues/review/`.

### 5. Convert non-deslop follow-ups into review issues and/or queued issue-doc goals

Review the deslop agent report for potential follow-up issues that are not deslop fixes, such as bugs, correctness concerns, architectural questions beyond deslop scope, or other items the worker identified but explicitly did not fix.

For each such follow-up:

1. Create a follow-up issue doc directly under `.ai/issues/review/` when enough detail is available to write it now. Create the bucket directory if missing.
2. If the nature of the issue is clear and unambiguously needs attention, queue a goal for it with a concrete `create-issue-doc` template invocation that includes bucket, kind, title, and context. Use this objective shape:

   ```text
   create a goal from template `create-issue-doc` with args `--bucket review --kind <fix|feature|docs|research|remediation> --title "<short title>" -- <clear issue context, evidence, affected files, and desired outcome>`
   ```

   Do not queue underspecified prose such as only `create a goal from template create-issue-doc for the issue ...`; the queued item must carry enough structured inputs for `create-issue-doc` without guessing.

At this point, you should have either created a `.ai/issues/review/` issue doc directly, queued one or more orchestration-type goals (goals where the goal is to create another goal(s)) which would now be present in the `/goal queue` output list, or both. For every review issue doc created directly, run the rendered `verify_review_issue_trackable` command with `<created-issue-file>` replaced by the actual filename so git visibility is verified.

### 5b. No follow-ups case

If the deslop agent identifies no potential follow-up issues, stop after step 4 review/validation and report what was done. In this case the goal is satisfied as complete.

### 6. Execute queued issue-doc goals when present

If this process queued one or more `create-issue-doc` orchestration goals, begin executing them now. Work until the queue is finished and all immediate follow-up docs are completed and execution-ready.

Use the existing goal queue semantics safely:

- do not discard queued work;
- route `create-issue-doc` orchestration through the reusable template rather than treating it as a direct one-off goal;
- dequeue orchestration items only after the corresponding issue-doc work is actually satisfied.

When the queue is finished and all follow-up docs are complete/execution-ready, stop and report what was done. At that point this higher-order goal is satisfied as complete.

## Completion standard

This deslop pipeline goal is complete only after either:

- step 5b applies: no follow-up issues were identified, and step 4 review/validation completed; or
- step 6 applies: all queued follow-up issue-doc goals from this process have been executed, the queue is finished, and all follow-up docs are execution-ready.

Before marking complete, perform a completion audit that maps every step above to concrete evidence: commands run, preflight dirty-worktree status, sparse polling status checks, any bounded output reads and why they were needed, worker process id, final worker report capture path, Sentrux baseline and post-deslop comparison, validation results, commits reviewed, issues fixed, review-bucket docs created, review-doc trackability checks, queue items created/executed, and remaining blockers if any and output as table(s) in chat.

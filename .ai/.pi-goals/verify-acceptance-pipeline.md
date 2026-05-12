---
description: Spawn and supervise an independent acceptance agent until an implemented issue doc's acceptance criteria all verify green
aliases: acceptance-pipeline,acceptance-verify,verify-acceptance
usage: /goal verify-acceptance-pipeline -- ISSUE-040
examples: /goal verify-acceptance-pipeline -- ISSUE-038; /goal acceptance-pipeline -- .ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 40000
---
Run an independent acceptance-verification pipeline for this implemented issue:

<issue_selector>
{{args}}
</issue_selector>

This workflow is exact. The main agent owns orchestration and remediation. The spawned acceptance agent owns read-only independent verification and must not modify repository files.

Do not substitute a self-review for the independent acceptance agent. Do not use alternate delegation slash commands. Do not use Solo timer helpers. Use the sparse polling loop specified here: basic `sleep 90`, then token-efficient Solo process status/output checks.

## Resolved context

This section is rendered at goal-creation time with read-only inline commands. If `acceptance_context_status` is `unresolved`, stop and report the blocker rather than guessing the issue path or Solo project.

```toon
!`PI_GOAL_ISSUE_SELECTOR=$(cat <<'PI_GOAL_ISSUE_SELECTOR'
{{args}}
PI_GOAL_ISSUE_SELECTOR
)
export PI_GOAL_ISSUE_SELECTOR
python3 - <<'PY'
import hashlib
import os
import re
import shlex
import subprocess
from datetime import datetime, timezone
from pathlib import Path

repo = Path.cwd()
selector = os.environ.get("PI_GOAL_ISSUE_SELECTOR", "").strip()
quote = shlex.quote

candidates = []
if selector:
    raw = Path(selector)
    if raw.exists():
        candidates.append(raw)
    else:
        issue_match = re.search(r"(?:ISSUE-)?(\d{1,4})", selector, re.IGNORECASE)
        if issue_match:
            issue_id = f"ISSUE-{int(issue_match.group(1)):03d}"
            for bucket in ["open", "fixed", "refine", "review", "defer", "closed"]:
                bucket_dir = repo / ".ai" / "issues" / bucket
                if bucket_dir.is_dir():
                    candidates.extend(sorted(bucket_dir.glob(f"{issue_id}-*.md")))
                    exact = bucket_dir / f"{issue_id}.md"
                    if exact.exists():
                        candidates.append(exact)

unique = []
seen = set()
for path in candidates:
    resolved = path.resolve()
    if resolved not in seen:
        seen.add(resolved)
        unique.append(path)

if len(unique) != 1:
    print("acceptance_context_status: unresolved")
    print(f"repo_path: {repo}")
    print(f"issue_selector: {selector}")
    print(f"candidate_count: {len(unique)}")
    if unique:
        print("candidates:")
        for path in unique:
            print(f"  - {path}")
    print("blocker: issue selector must resolve to exactly one issue doc")
    raise SystemExit(0)

issue_path = unique[0]
issue_abs = issue_path.resolve()
try:
    issue_rel = issue_abs.relative_to(repo)
except ValueError:
    issue_rel = issue_abs

preferred = [os.environ.get("SOLO_MCP_INSTANCE", ""), "solo-pi_goals", "solo"]
try:
    instances = subprocess.run(["solo-mcp", "instances"], text=True, capture_output=True, timeout=5, check=False).stdout
except Exception as exc:
    print("acceptance_context_status: unresolved")
    print(f"repo_path: {repo}")
    print(f"issue_path: {issue_rel}")
    print(f"blocker: solo-mcp instances failed: {exc}")
    raise SystemExit(0)

for line in instances.splitlines():
    match = re.match(r"^\s{2}([A-Za-z0-9_-]+),", line)
    if match:
        preferred.append(match.group(1))

seen_names = set()
solo_candidates = []
for name in preferred:
    if name and name not in seen_names:
        seen_names.add(name)
        solo_candidates.append(name)

matches = []
checked = []
for instance in solo_candidates:
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
        if len(parts) == 3 and parts[0].isdigit() and Path(parts[2]).resolve() == repo:
            matches.append((instance, parts[0], parts[1], parts[2]))
    if matches:
        break

if not matches:
    print("acceptance_context_status: unresolved")
    print(f"repo_path: {repo}")
    print(f"issue_path: {issue_rel}")
    print(f"candidate_instances_checked: {', '.join(checked) if checked else 'none'}")
    print("blocker: no Solo project path matched the current repository")
    raise SystemExit(0)

instance, project_id, project_name, project_path = matches[0]
stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
issue_key = re.search(r"ISSUE-\d{3}", str(issue_rel))
issue_label = issue_key.group(0) if issue_key else hashlib.sha256(str(issue_rel).encode()).hexdigest()[:8]
artifact_dir = f"/tmp/pi-goals-acceptance-{issue_label}-{stamp}"
prompt_file = f"{artifact_dir}/acceptance-agent-prompt.md"
rerun_file = f"{artifact_dir}/acceptance-rerun-prompt.md"
worker_name = f"acceptance-{issue_label.lower()}-{stamp.lower()}"

print("acceptance_context_status: resolved")
print(f"repo_path: {repo}")
print(f"issue_selector: {selector}")
print(f"issue_path: {issue_rel}")
print(f"issue_abs_path: {issue_abs}")
print(f"solo_instance: {instance}")
print(f"project_id: {project_id}")
print(f"project_name: {project_name}")
print(f"project_path: {project_path}")
print(f"candidate_instances_checked: {', '.join(checked)}")
print(f"tmp_artifact_dir: {artifact_dir}")
print(f"acceptance_prompt_file: {prompt_file}")
print(f"acceptance_rerun_prompt_file: {rerun_file}")
print(f"acceptance_worker_name: {worker_name}")
print("ready_to_run_commands:")
print("  preflight_git_status: git status --short --untracked-files=all")
print("  create_artifact_dir: mkdir -p " + quote(artifact_dir))
print("  write_acceptance_prompt: cat > " + quote(prompt_file) + " <<'ACCEPTANCE_AGENT_PROMPT'")
print("  spawn_acceptance_agent: " + " ".join([
    "solo-mcp", "--instance", quote(instance), "process", "spawn",
    "--project", quote(project_id), "--kind", "agent", "--runtime", "Pi",
    "--runtime-args", quote("--profile solo-researcher-strong"),
    "--custom-agent-tool", "materialized", "--materialized-args-mode", "replace", "--strict-profile",
    "--name", quote(worker_name),
]))
print("  set_worker_id_after_spawn: export ACCEPTANCE_WORKER_ID=<id from spawn_acceptance_agent output>")
print("  verify_worker_status_after_spawn: " + f"solo-mcp --instance {quote(instance)} process status \"$ACCEPTANCE_WORKER_ID\" --project {quote(project_id)}")
print("  send_model_selection: " + f"solo-mcp --instance {quote(instance)} process send \"$ACCEPTANCE_WORKER_ID\" --project {quote(project_id)} --input '/model opencode-go/glm-5.1' --allow-recent-spawn")
print("  verify_worker_status_after_model_selection: " + f"solo-mcp --instance {quote(instance)} process status \"$ACCEPTANCE_WORKER_ID\" --project {quote(project_id)}")
print("  model_selection_output_check: " + f"solo-mcp --instance {quote(instance)} process output \"$ACCEPTANCE_WORKER_ID\" --project {quote(project_id)} --lines 40")
print("  send_acceptance_prompt: " + f"solo-mcp --instance {quote(instance)} process send \"$ACCEPTANCE_WORKER_ID\" --project {quote(project_id)} --input \"$(cat {quote(prompt_file)})\" --allow-recent-spawn")
print("  sparse_poll_status: " + f"sleep 90 && solo-mcp --instance {quote(instance)} process status \"$ACCEPTANCE_WORKER_ID\" --project {quote(project_id)}")
print("  sparse_poll_small_output: " + f"solo-mcp --instance {quote(instance)} process output \"$ACCEPTANCE_WORKER_ID\" --project {quote(project_id)} --lines 40")
print("  diagnostic_or_final_output: " + f"solo-mcp --instance {quote(instance)} process output \"$ACCEPTANCE_WORKER_ID\" --project {quote(project_id)} --lines 120 --full")
print("  capture_final_output: " + f"solo-mcp --instance {quote(instance)} process output \"$ACCEPTANCE_WORKER_ID\" --project {quote(project_id)} --lines 160 --full > {quote(artifact_dir + '/acceptance-final-output.txt')}")
print("  send_corrected_acceptance_items: " + f"solo-mcp --instance {quote(instance)} process send \"$ACCEPTANCE_WORKER_ID\" --project {quote(project_id)} --input \"$(cat {quote(rerun_file)})\"")
PY`
```

## Required workflow

### 0. Preflight

Run the rendered `preflight_git_status` command and inspect the worktree. A dirty worktree is not automatically a blocker because the issue may already have implementation artifacts, but you must understand whether changes are related to the issue before continuing.

If the resolved context is unresolved, stop and report the blocker.

Run the rendered `create_artifact_dir` command. Use the rendered artifact directory for prompt files and captured reports; do not write generated acceptance prompts into the repository.

### 1. Write the direct acceptance-agent prompt

Use the rendered `write_acceptance_prompt` command shape to write the following prompt body into the rendered prompt file. Replace the `<...>` placeholders with resolved values from the context section before sending.

````text
You are an independent acceptance verification agent for pi-goals.

Issue doc to verify: <resolved_issue_path>
Repository root: <resolved_repo_path>

Your job is read-only verification. Do not modify repository files, stage files, commit, push, publish, or remediate implementation gaps. The main agent owns remediation.

Required workflow:
1. Read the issue doc completely.
2. Extract every row in the `## Acceptance criteria` section in document order. Stop extraction at the next `##` heading. Preserve criterion wording except for stripping markdown bullets/checkbox markers.
3. Count the extracted rows and record the count before queueing. If zero rows are extracted, do not invent criteria; report `blocked` with `total=0`, evidence `Acceptance criteria section missing or empty`, and the exact heading/section evidence you inspected.
4. Assign ids AC-1, AC-2, ... in order. The number of ids and queued objectives must exactly equal the extracted row count; if they differ, stop and fix the extraction/queue list before executing.
5. Enqueue all acceptance items first, before executing any item. For each item, enqueue this orchestration objective exactly:
   create a goal from template `verify-acceptance-item` with args `--issue "<resolved_issue_path>" --item-id "AC-N" -- <criterion text>`
   Do not pass `token_budget`, `time_budget_seconds`, `min_tokens_before_wrap_up`, or `min_time_seconds_before_wrap_up` unless explicit queue metadata or user instructions provide those values. Do not invent budget or floor params.
6. IMPORTANT: NO BATCH CHECKS. After all item goals are queued, execute the queue head-to-tail one item at a time. Processing AC-N..AC-M together for efficiency is a workflow violation, not evidence.
7. Maintain this ledger and update exactly one row after each item:
```toon
acceptance_item_ledger[0]{id,enqueued,template_matched,concrete_goal_created,item_result_captured,concrete_goal_complete,orchestration_dequeued}:
```
8. For every queued orchestration item, use this only valid loop: call `list_goal_templates`, match `verify-acceptance-item`, create exactly one concrete goal with `create_goal_from_template`, review that criterion individually, capture exactly one `acceptance_item_result`, complete that concrete item goal, then dequeue that orchestration item only after the item result is captured. Update the ledger row, then move to the next queue head.
9. If you catch yourself batching AC-N..AC-M, stop immediately, discard that batch shortcut as final evidence, return to the first unprocessed item, and resume one-by-one processing.
10. Treat `verify-acceptance-item` results as evidence, but still compile a final acceptance report yourself. Aggregate all-items inspection may be used only for orientation before per-item execution; it must never be the source of green rows.
11. Reject green-with-real-gap rows before final aggregation. A `green` item or final result row must have `gap` = `none`, and `next_action` = `none` unless the next action is explicitly optional follow-up that is not required for acceptance. If a captured item result says `green` while naming an unresolved material gap, required next action, unruled-out false-green risk, missing stronger proof, or medium/low confidence caused by absent required evidence, treat that item as invalid and rerun/correct it as `red` or `blocked`. Do not aggregate such a row as green.
12. Final report must include a TOON block with `acceptance_summary` and `acceptance_results` rows. Keep every row single-line, quote string cells, and escape embedded double quotes in criterion/evidence/gap text. The `total` field must equal the extracted acceptance-row count and the number of `acceptance_results` rows. The final report is invalid until every extracted criterion has a complete ledger row with all booleans true and every result row is sourced from the matching captured `acceptance_item_result`.

Result statuses:
- green: criterion is independently verified with concrete evidence and has no unresolved material gap or required next action.
- red: criterion is not met, evidence contradicts it, or a plausible false-green risk remains unresolved.
- blocked: verification needs missing authority, environment, unsafe action, or required evidence that cannot currently be obtained safely.

Final report contract:
```toon
toon.version: 1
acceptance_summary{issue,status,total,green,red,blocked,iteration}:
  "<issue>","green|red|blocked",0,0,0,0,1
acceptance_results[0]{id,status,criterion,confidence,evidence,gap,next_action}:
```

If the main agent later sends a correction prompt, re-run only the listed corrected item ids unless the changed files could invalidate previously green rows. Use the same enqueue-all-first then head-to-tail workflow for the rerun.
````

### 2. Spawn and prompt the acceptance agent

Run the rendered `spawn_acceptance_agent` command. Set `ACCEPTANCE_WORKER_ID` from the spawn output.

Run the rendered `verify_worker_status_after_spawn` command before sending the prompt. Confirm the process exists and is a Solo agent process. If status is unavailable, stopped, closed, or clearly not an agent, do not send the prompt; inspect a small output tail or respawn once with a new timestamped name.

Run the rendered `send_model_selection` command to switch the worker to `/model opencode-go/glm-5.1`, then run `verify_worker_status_after_model_selection` and `model_selection_output_check`. Do not send the acceptance prompt until the model-selection command has been sent and the worker is still alive.

Send the prompt with the rendered `send_acceptance_prompt` command. The `--allow-recent-spawn` flag acknowledges startup-readiness risk after the explicit status check; it does not prove receipt. Do not treat the command preview as completion evidence.

### 3. Sparse polling loop

Monitor with sparse polling only:

```bash
sleep 90
solo-mcp --instance <resolved_instance> process status "$ACCEPTANCE_WORKER_ID" --project <resolved_project_id>
```

If the status suggests the worker is still active and healthy, continue the same 90-second cadence. If the status suggests idle/completion/error/blocker, or you need to capture a report, run the rendered `sparse_poll_small_output` command.

Use the rendered `diagnostic_or_final_output` command only when the bounded tail is insufficient for diagnosis or final report capture. When the report is final, prefer the rendered `capture_final_output` command so the report is preserved under the `/tmp` artifact directory.

Do not request recap text from a healthy active worker. Do not perform tight loops. Do not use Solo timer helpers.

### 4. Review acceptance report and remediate

When the acceptance agent returns `acceptance_summary` / `acceptance_results`:

1. Read the report carefully.
2. Check report completeness before remediation: `acceptance_summary.total` must equal the number of `acceptance_results` rows and the issue doc's extracted acceptance-row count. If counts differ, treat the report as incomplete and ask the same acceptance agent to correct the extraction/report before trusting item statuses.
3. Independently inspect the evidence for every `red` or `blocked` row. Worker output is a clue, not proof.
4. For every `red` row, remediate the implementation in the repository.
5. Run targeted validation for each remediation.
6. For every `blocked` row, resolve the environment/authority gap if safe. If it requires user authorization, ask one focused question.

### 5. Send corrected acceptance items and loop

If remediation changed one or more acceptance items, write a rerun prompt to the rendered `acceptance_rerun_prompt_file` and send it with `send_corrected_acceptance_items`.

Use this rerun prompt shape:

```text
Acceptance rerun iteration <N> for <resolved_issue_path>.

The main agent remediated these corrected acceptance items: <AC ids>.
Changed files/evidence:
- <file or command output path>
- <summary>

Re-read the issue doc and relevant changed files. Enqueue the listed corrected acceptance items first using `verify-acceptance-item`, execute the queue head-to-tail with IMPORTANT: NO BATCH CHECKS, maintain the same `acceptance_item_ledger` fields for corrected items, and reject green-with-real-gap rows before final aggregation: `green` requires `gap=none` and `next_action=none` unless the next action is explicitly optional follow-up that is not required for acceptance. If a plausible false-green risk remains unresolved, or if the row names a material gap/required next action/missing stronger proof, report `red` or `blocked`, not `green`. Produce a fresh `acceptance_summary` / `acceptance_results` report for this iteration only after every corrected item ledger row is complete. Do not modify repository files. Do not invent budget or floor params.
```

Repeat sparse polling, report review, remediation, and rerun until the acceptance agent reports all green or a true blocker remains.

### 6. Completion audit

Before marking this pipeline goal complete, report:

- resolved issue path;
- acceptance worker process id/name;
- prompt file path, final output capture path, and any rerun prompt file paths;
- polling checks performed;
- final acceptance summary;
- every red/blocked item found and how it was remediated or why it remains blocked;
- validation commands run by the main agent;
- final worktree state;
- whether all acceptance criteria are green.

## Completion standard

This goal is complete only when the acceptance agent's latest structured report is all green and the main agent has independently reviewed the evidence, or when a real blocker remains that cannot be safely resolved without user input. In the blocker case, do not mark the implementation complete; report the blocker and next focused question.

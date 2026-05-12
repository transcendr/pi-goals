---
description: Verify one issue acceptance criterion against implementation evidence with adversarial false-green checks
aliases: acceptance-item,verify-acceptance-criterion,acceptance-check
usage: /goal verify-acceptance-item --issue .ai/issues/open/ISSUE-040-example.md --item-id AC-1 -- acceptance criterion text
examples: /goal acceptance-item --issue .ai/issues/open/ISSUE-038-bound-goal-template-autocomplete-discovery.md --item-id AC-1 -- /goal autocomplete does not recursively scan arbitrary descendants
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
Verify this single acceptance criterion as an independent acceptance reviewer.

<issue_doc>
{{issue}}
</issue_doc>

<acceptance_item_id>
{{item-id}}
</acceptance_item_id>

<acceptance_criterion>
{{args}}
</acceptance_criterion>

This is a read-only verification goal. Do not modify repository files, stage files, commit, push, publish, or remediate implementation gaps. Your job is to determine whether this one criterion is truly satisfied and to produce a structured result that the acceptance pipeline can aggregate.

## Initial read-only context

Use this embedded context as a starting point, then inspect files directly before deciding. If `item_context_status` is `unresolved`, stop the item with status `blocked` and explain the blocker.

```toon
!`PI_GOAL_ACCEPTANCE_ISSUE=$(cat <<'PI_GOAL_ACCEPTANCE_ISSUE'
{{issue}}
PI_GOAL_ACCEPTANCE_ISSUE
)
PI_GOAL_ACCEPTANCE_ITEM_ID=$(cat <<'PI_GOAL_ACCEPTANCE_ITEM_ID'
{{item-id}}
PI_GOAL_ACCEPTANCE_ITEM_ID
)
PI_GOAL_ACCEPTANCE_CRITERION=$(cat <<'PI_GOAL_ACCEPTANCE_CRITERION'
{{args}}
PI_GOAL_ACCEPTANCE_CRITERION
)
export PI_GOAL_ACCEPTANCE_ISSUE PI_GOAL_ACCEPTANCE_ITEM_ID PI_GOAL_ACCEPTANCE_CRITERION
python3 - <<'PY'
import os
from pathlib import Path

repo = Path.cwd()
issue = Path(os.environ.get("PI_GOAL_ACCEPTANCE_ISSUE", "").strip())
item_id = os.environ.get("PI_GOAL_ACCEPTANCE_ITEM_ID", "").strip()
criterion = os.environ.get("PI_GOAL_ACCEPTANCE_CRITERION", "").strip()

issue_path = issue if issue.is_absolute() else repo / issue
if not item_id or not criterion or not issue_path.exists():
    print("item_context_status: unresolved")
    print(f"repo_path: {repo}")
    print(f"issue_input: {issue}")
    print(f"issue_exists: {issue_path.exists()}")
    print(f"item_id: {item_id or '(missing)'}")
    print(f"criterion_chars: {len(criterion)}")
    print("blocker: --issue, --item-id, and criterion text must resolve before verification")
    raise SystemExit(0)

try:
    rel = issue_path.resolve().relative_to(repo)
except ValueError:
    rel = issue_path.resolve()

print("item_context_status: resolved")
print(f"repo_path: {repo}")
print(f"issue_path: {rel}")
print(f"item_id: {item_id}")
print(f"criterion_chars: {len(criterion)}")
print("ready_to_run_commands:")
print("  git_status: git status --short --untracked-files=all")
print("  issue_headings: rg -n '^## ' " + str(rel))
print("  issue_acceptance_section: rg -n -A 80 '^## Acceptance criteria' " + str(rel))
PY`
```

## Verification workflow

### 1. Read the issue and restate the invariant

Read the issue doc completely enough to understand this criterion in context. At minimum inspect:

- goal/problem/context;
- desired behavior;
- locked design choices;
- implementation checklist or closeout notes;
- proof threat model;
- required proofs;
- acceptance criteria section.

Restate the user-visible invariant implied by this criterion in one concise sentence. Do not treat this restatement as proof.

### 2. Write a proof plan, then map criterion to implementation and proof surfaces

Before checking, write a concise proof plan: name the exact implementation/proof surfaces you expect to inspect, why those surfaces are sufficient if green, and what would likely fail if the criterion were false. Do not treat the proof plan itself as evidence.

Identify what files, docs, probes, commands, or live behavior should demonstrate this criterion. Use targeted inspection rather than broad wandering.

Useful read-only checks include, when relevant:

- `git status --short --untracked-files=all`
- `git diff -- <relevant path>` for uncommitted implementation work;
- `git log --oneline --decorate -- <relevant path>` when the implementation is committed;
- `rg` for feature names, command names, template names, proof ids, or status strings;
- issue-workflow closeout artifacts named by the issue;
- validation logs or probe files named in `required_proofs[]`.

Run targeted deterministic or live checks only when they are non-destructive, proportionate, and relevant to this specific criterion. Do not run broad expensive gates unless this criterion depends on them or the issue proof contract requires them. Small scripts are valid only when they directly test the invariant and your result explains why the script would fail if the criterion were false.

### 3. Attack false-green paths

Before deciding `green`, actively check for false-green risks:

- The criterion is only documented but not implemented.
- The implementation exists but is not discoverable through the intended template/tool path.
- A proof command exists but validates a weaker behavior than the criterion.
- A validation artifact is stale or predates the relevant implementation.
- A live-runtime criterion is backed only by static inspection.
- A queue/template criterion is satisfied for direct goals but not orchestration queue items.
- The issue says fixed/complete but the actual files or command outputs contradict it.
- Your check only proves that strings exist, not that the workflow can be followed.
- A string-presence-only script is being used as green evidence even though stronger implementation, resolver, runtime, or proof evidence is available.

If a false-green risk is plausible and you cannot rule it out with available read-only evidence, return `red` or `blocked`, not `green`. If your only evidence is weak string presence while stronger evidence is available, return `red` or `blocked` and name the stronger evidence needed.

A `green` result must not carry an unresolved material gap or required next action. For `green`, set `gap` to `none`, and set `next_action` to `none` unless the action is explicitly optional follow-up that is not needed to satisfy this criterion. If your honest result would require a material `gap` or required `next_action`, the status is `red` or `blocked`, not `green`.

### 4. Decide status

Use exactly one status:

- `green`: the criterion is independently verified with concrete evidence that would likely fail if the criterion were false. A green result must name at least one direct evidence source, a sufficiency rationale explaining why the evidence would fail if the criterion were false, and at least one false-green risk you ruled out. A green row must not contain an unresolved material gap or required next action.
- `red`: the criterion is not met, is contradicted by evidence, or has only weak/vague evidence when stronger evidence is available.
- `blocked`: verification cannot be completed because required authority, environment, credentials, live service, or safety permission is missing.

Confidence guidance:

- `high`: direct command/probe/live evidence or exact file inspection proves the invariant.
- `medium`: strong static evidence exists, but a live or broader proof would improve confidence.
- `low`: evidence is suggestive only; prefer `red` or `blocked` unless the criterion itself is documentation-only.

### 5. Final item result

Your final response must include this TOON block and no contradictory prose after it. Keep the row single-line, quote string cells, and escape embedded double quotes in criterion/evidence/gap text:

```toon
toon.version: 1
acceptance_item_result{id,status,criterion,confidence,evidence,gap,next_action}:
  "{{item-id}}","green|red|blocked","{{args}}","high|medium|low","<files commands artifacts inspected>","<none or precise gap>","<none or requested main-agent action>"
```

Keep `evidence`, `gap`, and `next_action` concise but specific. Include command names and paths, not vague statements such as `looked good`. For `green`, include the decisive evidence, sufficiency rationale, and the false-green risk ruled out, for example `evidence: resolver smoke test fails without template discovery; sufficient because it exercises the intended resolver path; ruled out docs-only false green`. If the exact criterion text is too long or contains complex punctuation, preserve its meaning while keeping the TOON row valid and single-line.

## Completion standard

This item goal is complete only when the final `acceptance_item_result` row honestly reflects the criterion status after issue-doc reading, targeted evidence inspection, and false-green review. Do not mark the item complete merely because the criterion sounds plausible or because the main implementation agent claimed it was done.

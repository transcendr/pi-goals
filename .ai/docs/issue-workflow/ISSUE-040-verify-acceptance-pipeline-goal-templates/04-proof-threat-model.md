# ISSUE-040 proof threat model — Verify acceptance pipeline goal templates

## Primary invariant

An implemented issue can be independently acceptance-verified criterion-by-criterion by a spawned Solo/Pi acceptance agent, where each criterion is routed through the `verify-acceptance-item` reusable goal template, all item results are reported structurally, and the main agent remediates/rechecks gaps until every acceptance row is green.

## Main false-green risks

1. **Template exists but does not actually orchestrate independent verification.**
   - A shallow template could tell the main agent to review acceptance criteria itself.
   - Required proof must inspect template text for Solo process spawn/direct prompt/sparse monitoring and item-template routing.

2. **Acceptance agent does not enqueue every item first.**
   - It might validate in an ad hoc loop, skip rows, or stop after first failure.
   - Required proof must inspect the acceptance-agent prompt for all-items-first enqueue rules and head-to-tail queue execution.

3. **Queued item goals are direct prose instead of template orchestration.**
   - The queue might start literal objectives and bypass `verify-acceptance-item`.
   - Required proof must verify the objective shape uses `create a goal from template verify-acceptance-item with args ...`.

4. **Deslop-pipeline patterns sneak back in.**
   - `/boomerang` or Solo timer pairs would violate the user's explicit request.
   - Required proof must search for forbidden `/boomerang`, `timer-pair`, and timer-helper commands in `verify-acceptance-pipeline.md`.

5. **Polling is too chatty or too stale.**
   - Tight output polling wastes tokens; no output capture misses completion.
   - Template must prescribe `sleep 90`, status-first checks, small routine output tails, and bounded diagnostic tails only when needed.

6. **Item verification returns vague green.**
   - The inner template could say an item is verified because docs mention it, without checking implementation/proof evidence.
   - Required proof must inspect the item template for issue-doc reading, implementation/proof inspection, targeted checks, false-green risks, and structured `acceptance_item_result` output.

7. **Main agent trusts worker prose without verification/remediation.**
   - The pipeline must require the main agent to inspect red/blocked evidence, fix gaps, run validation, and send corrected items back.

8. **Iteration loses continuity.**
   - A new worker each time or rerun-all-only flow can lose context or waste work.
   - Chosen default is same-worker rerun of corrected items, with fresh-worker recovery only on process corruption/crash.

9. **Issue selector is ambiguous or wrong.**
   - Template must resolve `{{args}}` to a concrete issue path when possible and stop on unresolved/ambiguous selectors rather than guessing.

10. **Live behavior differs from static text.**
    - Reusable goal discovery, queue steering, and process input delivery are runtime behaviors.
    - A bounded live probe should validate at least a synthetic all-green flow or record a visible skip rationale.

## Proof strategy

Use layered proofs:

1. Static/template structure checks prove the files exist, metadata is present, required placeholders are visible, and forbidden patterns are absent.
2. `list_goal_templates` or equivalent live template discovery proves the `pi-goal` extension sees both templates with expected aliases/placeholders.
3. A prompt-contract check proves the acceptance-agent direct prompt includes all-items-first queue creation, template orchestration shape, head-to-tail execution, item result capture, and final report format.
4. A sparse-monitoring check proves the pipeline encodes `sleep 90`, `process status`, and small bounded `process output` reads while avoiding timer pairs.
5. A bounded live probe proves the templates work in a real Pi/Solo session, or a visible closeout explains why deterministic evidence was sufficient and live proof was skipped.

## Required proof rows for implementation

```toon
toon.version: 1
required_proofs[7]{name,source,command,pass_condition,scope,notes}:
  "template_files_exist","issue doc","cd ~/dev/personal/experiments/pi-goals && test -f .ai/.pi-goals/verify-acceptance-pipeline.md && test -f .ai/.pi-goals/verify-acceptance-item.md","exit 0",run,"both reusable goal templates exist under the bounded .ai/.pi-goals root"
  "forbidden_patterns_absent","issue doc","cd ~/dev/personal/experiments/pi-goals && ! rg -n '/boomerang|timer-pair|tlo timer|timer_pair|check-ms|send-seam' .ai/.pi-goals/verify-acceptance-pipeline.md","exit 0 and no forbidden boomerang/timer-assisted patterns are present",run,"the template may say not to use timers in prose only if this grep remains clean for concrete timer commands"
  "pipeline_contract_static","issue doc","cd ~/dev/personal/experiments/pi-goals && rg -n 'verify-acceptance-item|sleep 90|process status|process output|process send|ACCEPTANCE_WORKER_ID|acceptance_summary|corrected acceptance' .ai/.pi-goals/verify-acceptance-pipeline.md","exit 0 with matches for item-template routing sparse polling direct send worker id final report and retry loop",run,"guards the higher-order workflow contract"
  "item_contract_static","issue doc","cd ~/dev/personal/experiments/pi-goals && rg -n 'acceptance_item_result|false-green|green|red|blocked|targeted|proof|implementation' .ai/.pi-goals/verify-acceptance-item.md && rg -nF '{{issue}}' .ai/.pi-goals/verify-acceptance-item.md && rg -nF '{{item-id}}' .ai/.pi-goals/verify-acceptance-item.md && rg -nF '{{args}}' .ai/.pi-goals/verify-acceptance-item.md","exit 0 with matches for placeholders adversarial verification and structured item result",run,"guards inner-loop validation rigor"
  "template_discovery","issue doc","Use the pi-goal list_goal_templates tool from ~/dev/personal/experiments/pi-goals","output lists verify-acceptance-pipeline and verify-acceptance-item with aliases and required placeholders args for pipeline and args issue item-id for item",live,"tool-level proof because template discovery is exposed through the extension rather than a package script"
  "quality_goal_no_extension_regression","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required if implementation unexpectedly touches .pi/extensions/goal; still useful as a final package safety gate"
  "acceptance_pipeline_live_probe","issue doc","Follow .ai/docs/pi-goals-live-probe-testing.md with a disposable synthetic issue doc containing two trivial acceptance criteria, run verify-acceptance-pipeline against it in a real Pi/Solo session, then clean up","transcript shows an acceptance agent is spawned, item goals are queued through verify-acceptance-item, final report is all green, and no disposable goal/queue residue remains; if skipped, closeout records explicit rationale",live,"validates real queue steering and direct process input behavior"
```

## Deterministic vs live adequacy

Static checks are sufficient to catch most authoring regressions, including missing files, wrong placeholders, forbidden `/boomerang`/timer commands, and absent report contracts.

They are not sufficient to prove live queue steering or Solo process input delivery. A bounded live probe is therefore expected after implementation unless the implementer records a concrete skip rationale explaining why live execution would add little value for that pass.

## Completion evidence expected from implementer

Implementation closeout should include:

- files created/changed;
- exact `list_goal_templates` output or equivalent template discovery proof;
- static grep/check command outputs;
- `npm run quality:goal` output or explicit reason it was unnecessary/skipped;
- live probe transcript path or skip rationale;
- final worktree status;
- confirmation that no `.pi/extensions/goal` code was changed unless explicitly justified.

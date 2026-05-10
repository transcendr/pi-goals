# ISSUE-035 implementation closeout

## Summary

Implemented command-side multi-item `/goal queue` block parsing. Clear marker-delimited blocks now enqueue one durable FIFO goal per accepted top-level item while preserving continuation lines and nested/example marker-looking lines that do not belong to the coherent top-level sequence.

## Changed files

- `.pi/extensions/goal/command.ts`
  - routes multi-line queue rest text through bulk parse/resolve/validate/enqueue path;
  - validates every parsed item before persisting any enqueue events;
  - emits compact multi-row success output.
- `.pi/extensions/goal/queue-block-parser.ts`
  - parses ordered markers `[N]`, `N.`, `N)` and bullet markers `-`, `*` at line start;
  - chooses coherent ordered marker sequences and preserves nested/example markers as content;
  - preserves continuation lines until the next accepted top-level marker.
- `.pi/extensions/goal/.sentrux/baseline.json`
  - refreshed by required Sentrux baseline gate.

## Proofs run

```toon
toon.version: 1
proofs[5]{name,command,result,notes}:
  "sentrux_gate","sentrux gate --save .pi/extensions/goal","pass","baseline saved before/around implementation; final quality gate detected no degradation"
  "multi_item_queue_probe","NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-multi-item-probe.cjs","pass","covers request example, continuation lines, nested ordered marker disambiguation, marker variants, atomic invalid behavior, and no/single-arg regressions"
  "queue_regression_probe","NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-direct-enqueue-probe.cjs && NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-order-probe.cjs","pass","existing direct enqueue/template and FIFO replay probes still pass"
  "quality_goal","npm run quality:goal","pass","sentrux gate/check, slop guard, TypeScript, and extension load validation passed"
  "live_probe","pi-goals-live-probe exact ordered-marker/nested-example block","pass","live slash-command path queued exactly three goals; session details show goal 1 preserved embedded [1], [2], and [3] lines; validation artifacts cleaned afterward"
```

## Live probe evidence

- Probe process: `pi-goals-live-probe` in Solo project `2`.
- Exact block sent through `/goal queue` with `submit_followup.sent: true`.
- Pi output showed `Queued goals (3)` after the slash command.
- Session state entry showed the first queued objective exactly as:

```text
this is goal one that coincidently also has the same annotations in it like
[1] example of a multi-queue message
[2] and another part of the example and 
[3] and one more part of the example
```

- Session state entry path observed during validation:
  `/Users/bryan/.pi/agent/sessions/--Users-bryan-dev-personal-experiments-pi-goals--/2026-05-10T01-08-34-288Z_019e0f6d-cb70-70df-9007-3b9d2d7ce013.jsonl`
- Live-probe validation queue items `q-1778419783162-1`, `q-1778419783162-2`, and `q-1778419783162-3` were removed after validation without execution; final probe output confirmed `No queued goals.`

## Solo audit

Solo todo graph created under `issue-stack-ISSUE-035`:

- Epic: 154
- Stack index: 155
- Phases: 156 planning/playbook, 157 implementation, 158 validation/proofs, 159 closeout
- ISSUE-035 parent: 160
- Leaves: 161 implementation, 162 validation/proofs, 163 closeout
- Playbook scratchpad: 7 `issue-stack-ISSUE-035 playbook`

## Result

ISSUE-035 acceptance criteria are satisfied. The issue is ready to move from `open` to `fixed`.

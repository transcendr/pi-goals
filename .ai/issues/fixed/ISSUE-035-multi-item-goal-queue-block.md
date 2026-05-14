# ISSUE-035 — Support multi-item /goal queue block input

Status: fixed
Priority: P1
Owner: pi-goal automation
Created: 2026-05-10
Next best session: focused implementation/validation pass for `/goal queue` block parsing
Next best session rationale: The scope is narrow and grounded in the existing command-side queue implementation; no product fork remains after locking command-side atomic block parsing.
Target bucket: open
Issue kind: feature
Target repo roots: `~/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-027-goal-queue.md`
Depends on: none
Related:
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`
- `.ai/issues/fixed/ISSUE-031-goal-queue-template-autocomplete.md`
- `.ai/docs/pi-goals-live-probe-testing.md`

## Goal

Allow users to paste a numbered/list block into `/goal queue` and enqueue each top-level, order-coherent marker-delimited item as a separate queued goal in FIFO order, including items with continuation lines and embedded example markers that should remain content.

Example desired input:

```text
/goal queue
[1] count to 15
[2] count to 10
[3] count to 5
[4] say "surprise!"
```

Desired result: four queued goals, not one multi-line objective. Each top-level order-coherent marker starts a new queued goal.

## Problem/context

`/goal queue` currently supports two shapes:

- `/goal queue` lists queued goals.
- `/goal queue <objective-or-template>` enqueues exactly one resolved objective.

This is ergonomic for one-off queueing but clumsy when the user has a small ordered backlog. Pasting the example block should be a natural queueing operation, but current code treats all text after `queue` as one objective. The block syntax also needs to support multi-line goal bodies and embedded examples: a marker like `[1]` starts an item, but later marker-looking lines are delimiters only when they make sense as the next top-level marker in the surrounding ordered sequence. Marker-looking lines inside a goal, such as an embedded `[1]`, `[2]`, `[3]` example, must remain content when the coherent top-level sequence resumes later.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-035-multi-item-goal-queue-block/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-035-multi-item-goal-queue-block/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-035-multi-item-goal-queue-block/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-035-multi-item-goal-queue-block/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-035-multi-item-goal-queue-block/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-035-multi-item-goal-queue-block/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-035-multi-item-goal-queue-block/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-035-multi-item-goal-queue-block/raw/commands.log`

## Desired behavior

### Existing behavior preserved

- `/goal queue` with no rest lists the queue or reports `No queued goals.`
- `/goal queue count to 5` enqueues one goal with objective `count to 5`.
- Existing template resolution and objective validation still apply.

### New block behavior

When the rest text after `queue` contains a clearly marked multi-line list, enqueue each top-level marker-delimited item independently:

```text
/goal queue
[1] count to 15
[2] count to 10
[3] count to 5
[4] say "surprise!"
```

Supported first-pass markers:

- `[1] count to 15`
- `1. count to 15`
- `1) count to 15`
- `- count to 15`
- `* count to 15`

Only markers at the start of a line are candidates. A candidate marker starts a new item only when it fits the coherent top-level ordering of the block. Non-delimiter lines, including marker-looking lines that do not fit the chosen top-level sequence, are preserved as part of the current item objective until the next accepted top-level marker. Each item is stripped only of its accepted leading marker, resolved as a template/objective, validated, and enqueued separately in input order.

Clarified required shape:

```text
/goal queue
[1] this is a goal
and it has another N lines
...
...
[2] this is the second goal
```

Desired result: two queued goals; the first objective includes the continuation lines.

Exact ordered-disambiguation example from the user, which is mandatory live-probe input:

```text
/goal queue
[1] this is goal one that coincidently also has the same annotations in it like
[1] example of a multi-queue message
[2] and another part of the example and 
[3] and one more part of the example
[2] this is the real second goal because it's teh last [2] in the message that starts at the beginning of the line. the line above is not recognized as the second goal
[3] this is third goal, same concept as [3] being ignore above because it is found here later.
```

Desired result: three queued goals. Goal one includes the embedded `[1]`, `[2]`, and `[3]` example lines as content. The later `[2]` and `[3]` are the real top-level delimiters because they form the coherent surrounding sequence.

The first queued goal from that exact input must be exactly this content after stripping only the accepted top-level `[1]` marker:

```text
this is goal one that coincidently also has the same annotations in it like
[1] example of a multi-queue message
[2] and another part of the example and 
[3] and one more part of the example
```

The second queued goal must start with the exact user-provided text `this is the real second goal because it's teh last [2]...`; the typo `teh` is intentionally part of the required live-probe fixture.

### Atomic failure behavior

Bulk enqueue is atomic:

- parse all rows;
- resolve and validate all rows;
- if any row is invalid, enqueue nothing and show the first invalid row/error;
- if all rows are valid, enqueue all rows and persist each enqueue event.

## Research findings

Grounded research is recorded in `.ai/docs/issue-workflow/ISSUE-035-multi-item-goal-queue-block/02-grounded-research.md`.

Key facts:

- `.pi/extensions/goal/command.ts` owns `/goal` and routes `queue` to `handleQueueCommand()`.
- `handleQueueCommand()` currently trims all text after `queue` into one `rest` value and either lists queue or enqueues exactly one objective.
- `.pi/extensions/goal/queue-state.ts` already provides durable FIFO enqueue persistence via `enqueueGoal()` and `persistEnqueue()`.
- `.pi/extensions/goal/queue-tools.ts` is one-objective-per-call and need not be expanded for this first pass.
- ISSUE-027 already locked the durable sequential FIFO queue model; this issue only adds a command input shape.

## Locked design choices

- Implement command-side ordered marker-delimited block parsing in or near `.pi/extensions/goal/command.ts`.
- Reuse existing `resolveTemplateOrObjectiveDetails()`, `validateObjective()`, `enqueueGoal()`, and `persistEnqueue()` per item.
- Recognize multi-item mode only for clear marker syntax; candidate markers must be at the start of a line and accepted only when they fit the coherent top-level order.
- Preserve single-line and ambiguous multi-line text as one objective to avoid surprising users who intend one multi-line objective; preserve nested/example marker-looking lines as content when they are not accepted top-level delimiters.
- Make bulk enqueue atomic: no partial queue mutations on invalid input.
- Keep bulk model-facing queue tools deferred.

## Rejected alternatives

- Add `enqueue_goals` model tool now: broader than the requested slash-command ergonomics and unnecessary for first pass.
- Split every non-empty line into a separate goal: too surprising for users who intentionally write multi-line objectives and conflicts with the clarified continuation-line requirement.
- Enqueue valid rows and skip invalid rows: creates hidden partial-success state after paste; atomic behavior is safer.

## Implementation checklist

- [x] Run `sentrux gate --save .pi/extensions/goal` before substantial implementation.
- [x] Add a small parser/helper for ordered marker-delimited queue block detection, marker stripping, continuation-line preservation, and nested/example marker disambiguation.
- [x] Add a bulk path in `handleQueueCommand()` that validates/resolves all rows before enqueueing.
- [x] Persist each accepted row using existing queue persistence in input order.
- [x] Add compact success notification listing all queued rows and ids.
- [x] Add invalid-item notification with marker/index/text and no queue mutation.
- [x] Preserve current no-rest list behavior.
- [x] Preserve current single objective enqueue behavior.
- [x] Add deterministic probe(s) for request example, continuation lines, nested/example marker disambiguation, marker variants, FIFO order, atomic invalid failure, and existing behavior regressions.
- [x] Run `npm run quality:goal`.
- [x] Run live probe against `pi-goals-live-probe` for a realistic multi-line `/goal queue` paste unless skipped with explicit visible rationale.

## Acceptance criteria

- The exact request example enqueues four separate queued goals.
- A marker-delimited example with continuation lines enqueues one goal per accepted top-level marker and preserves continuation text inside the correct objective.
- The exact ordered-marker/nested-example block quoted in this issue passes: embedded marker-looking example lines like `[1]`, `[2]`, `[3]` stay in goal 1, and the coherent later top-level `[2]`/`[3]` delimit goals 2 and 3.
- Queue listing shows four separate rows in the same order: `count to 15`, `count to 10`, `count to 5`, `say "surprise!"`.
- `/goal queue` still lists without enqueueing.
- `/goal queue <single objective>` still enqueues one goal.
- Invalid bulk input enqueues zero rows and reports the problematic row.
- Template resolution and validation are identical to existing single enqueue behavior per item.
- Queue persistence/replay remains FIFO and durable.
- `npm run quality:goal` passes.
- The exact ordered-marker/nested-example test from the user passes in a live `pi-goals-live-probe` agent test; this proof is mandatory and must not be skipped.
- Live probe evidence is recorded at closeout.

## Implementation closeout

Implementation and proof details are recorded in `.ai/docs/issue-workflow/ISSUE-035-multi-item-goal-queue-block/07-implementation-closeout.md`.

## Proof threat model

Primary invariant: a clearly marked multi-line `/goal queue` block enqueues each accepted top-level marker-delimited item as its own durable FIFO queued goal, preserving continuation lines and rejected nested/example marker-looking lines inside that item, without changing existing single-line `/goal queue` behavior or creating partial queue mutations on invalid input.

False-green risks:

- The parser accepts the example but enqueues the whole block as one objective.
- The parser splits on the first marker-looking `[2]` inside goal-one example content instead of the later coherent top-level `[2]`.
- Bulk enqueue loses input order.
- Invalid row handling leaves partial queued goals behind.
- Single-line `/goal queue <objective>` regresses.
- No-arg `/goal queue` list behavior regresses.
- Live Pi slash-command paste behavior differs from deterministic command probes.

## TOON synthesis

```toon
toon.version: 1
issue{id,title,status,goal}:
  "ISSUE-035","Support multi-item /goal queue block input","open — execution-ready","enqueue top-level ordered /goal queue block items as separate FIFO queued goals"
locked_requirements[8]{id,requirement}:
  "lr1","/goal queue with no rest still lists queued goals"
  "lr2","/goal queue with one objective still enqueues one goal"
  "lr3","marked multi-line queue blocks enqueue each marker-delimited item as one queued goal"
  "lr3a","continuation lines after an accepted top-level marker are preserved in that item until the next accepted top-level marker"
  "lr3b","marker-looking lines are content unless they fit the coherent top-level order"
  "lr4","bulk enqueue preserves input order and durable FIFO replay semantics"
  "lr5","bulk enqueue is atomic; invalid rows cause zero queue mutation"
  "lr6","each item uses existing template resolution and objective validation"
implementation_surfaces[4]{surface,path,notes}:
  "command",".pi/extensions/goal/command.ts","ordered marker-delimited queue block parser and bulk enqueue branch"
  "queue_state",".pi/extensions/goal/queue-state.ts","reuse enqueueGoal and persistEnqueue; no model change expected"
  "tests","/tmp or project probes","add deterministic command probes for multi-item behavior"
  "live_probe",".ai/docs/pi-goals-live-probe-testing.md","validate real Pi slash-command paste path unless explicitly skipped"
invariants[6]{id,invariant}:
  "inv1","single active goal invariant remains unchanged"
  "inv2","single-line queue command behavior remains backward compatible"
  "inv3","ambiguous multi-line objective is not split unless marker-delimited as a list block"
  "inv3a","nested/example marker-looking lines do not split the current item when a coherent later delimiter exists"
  "inv4","failed bulk validation writes no enqueue events"
  "inv5","queue ids and ordering remain stable and reviewable"
```

## Required proofs

```toon
toon.version: 1
required_proofs[5]{name,source,command,pass_condition,scope,notes}:
  "sentrux_gate","issue doc","sentrux gate --save .pi/extensions/goal","exit 0",run,"pre-implementation architecture sensor per repo rule"
  "multi_item_queue_probe","issue doc","NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-multi-item-probe.cjs","exit 0",run,"proves example block, continuation-line item preservation, nested marker disambiguation, FIFO order, atomic invalid behavior, and no/single-arg regressions"
  "queue_regression_probe","issue doc","NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-direct-enqueue-probe.cjs && NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-order-probe.cjs","exit 0",run,"reuses existing queue direct enqueue/order regression coverage where available"
  "quality_goal","issue doc","npm run quality:goal","exit 0",run,"required project quality gate"
  "live_probe","issue doc","Follow .ai/docs/pi-goals-live-probe-testing.md: resolve pi-goals-live-probe by current Solo context, send the exact ordered-marker/nested-example block from this issue including original wording/typos, then /goal queue","transcript shows exactly three queued rows; goal 1 preserves the embedded [1]/[2]/[3] example lines as content; later [2] and [3] delimit goals 2 and 3",run,"mandatory live Pi TUI slash-command proof; do not skip"
```

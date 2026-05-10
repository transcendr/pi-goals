# 03 — Design lock

## Design choices considered

### Option A — Command-side block parser, one enqueue per parsed row

Parse `/goal queue` rest text as ordered marker-delimited items. Only marker-looking lines at the start of a line are candidates, and candidates become delimiters only when they fit the coherent top-level ordering of the block. Rejected candidate lines remain content. Strip the accepted marker from each top-level item, preserve continuation and nested/example marker lines in that item objective, then enqueue each item independently through the existing resolution, validation, queue, and persistence path.

Pros:
- Smallest change.
- Reuses existing validation/template/persistence semantics.
- Preserves durable FIFO queue model from ISSUE-027.
- Keeps feature scoped to the user-facing slash command.

Cons:
- Requires careful partial-failure behavior.

### Option B — Add a new bulk queue tool and have slash command call it

Create a model-facing `enqueue_goals` bulk tool and command wrapper.

Rejected for first pass:
- The request is specifically about `/goal queue` paste ergonomics.
- Adding tool semantics broadens explicit-intent policy and proof surface.
- Can be deferred if agents later need bulk enqueue as a tool.

### Option C — Treat all multi-line rest text as separate one-line goals

Split every non-empty line after `/goal queue` into separate objectives, regardless of markers.

Rejected:
- It could surprise users who intend one multi-line objective.
- It fails the clarified requirement that a marker can own multiple following lines until the next accepted top-level marker, and that nested/example marker-looking lines can remain content.
- The example uses explicit `[n]` markers; first-pass behavior should require clear marker syntax for multi-item mode.

## Locked design

Choose Option A.

Implement a command-side helper that recognizes a queue block when the post-`queue` rest contains an order-coherent marker sequence. A marker line starts a new item only if it is selected as part of the top-level sequence; subsequent lines are preserved as continuation text for that item until the next accepted top-level marker. Supported first-pass marker starts:

- `[1] count to 15`
- `1. count to 15`
- `1) count to 15`
- `- count to 15`
- `* count to 15`

Each recognized top-level item becomes one candidate objective after marker stripping, trimming outer whitespace, and preserving internal continuation line breaks, including marker-looking lines that were rejected as nested/example content.

If the rest is a single line without a marker, or if the multi-line text does not satisfy the ordered marker-delimited block recognizer, preserve current behavior and treat it as one objective.

## Partial-failure policy

Bulk enqueue should be atomic for user trust:

- Parse all candidate rows.
- Resolve template/objective and validate every row before mutating the queue.
- If any row is invalid, enqueue nothing and show an error identifying the first invalid row.
- If all rows are valid, enqueue all rows in displayed order and persist each enqueue event.

Atomicity avoids hidden half-enqueued queues that are hard to notice after a paste.

## Output contract

For successful bulk enqueue, notify a compact summary such as:

```text
Queued goals (4):
1. [q-...] count to 15
2. [q-...] count to 10
3. [q-...] count to 5
4. [q-...] say "surprise!"
```

The existing single enqueue output remains unchanged for single objective input.

## Deferred choices

- Bulk model-facing `enqueue_goals` tool is deferred.
- Nested sub-list parsing inside an item is deferred; plain continuation lines are in scope.
- Advanced Markdown task-list syntax (`- [ ]`) is optional and should not block the first pass.

## Ordered marker disambiguation

Candidate markers must be at the start of a line. A parser must not split on the first possible `[2]` if that `[2]` is part of an embedded example inside goal 1 and a later `[2]` forms the coherent top-level sequence. The intended policy is to choose a coherent top-level marker sequence for the whole block, preserving earlier repeated/nested marker-looking lines as content when doing so is necessary to keep the ordered sequence meaningful.

Required example: a block beginning with `[1]`, then containing nested `[1]`, `[2]`, `[3]` example lines, followed by a later real `[2]` and `[3]`, must parse into exactly three goals. Goal 1 includes the nested example lines.

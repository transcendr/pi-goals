# 04 — Proof threat model

## Primary invariant

A clearly marked multi-line `/goal queue` block enqueues each accepted top-level marker-delimited item as its own durable FIFO queued goal, preserving continuation lines and rejected nested/example marker-looking lines inside each item, without changing existing single-line `/goal queue` behavior or creating partial queue mutations on invalid input.

## False-green risks

1. Parser recognizes the example but enqueues the whole block as one objective.
2. Parser splits on nested/example marker-looking lines instead of the coherent later top-level markers.
3. Parser enqueues multiple rows but loses order.
4. Parser mutates the queue before validation and leaves partial rows behind after an invalid row.
5. Single-line `/goal queue <objective>` regresses.
6. `/goal queue` list with no rest regresses.
7. Template resolution differs between single and bulk item paths.
8. Live Pi slash-command paste/submit behavior differs from deterministic command-handler probes.

## Deterministic proof strategy

Add a focused command probe covering:

- exact `[1]` style block from the request;

- clarified marker-delimited continuation case where `[1]` owns multiple following lines until the accepted top-level `[2]`;
- nested/example marker disambiguation where early `[1]`, `[2]`, `[3]` lines remain content and later `[2]`, `[3]` lines delimit the real goals;
- supported marker variants if implemented;
- FIFO order and count;
- atomic invalid-row failure;
- unchanged no-arg list behavior;
- unchanged single objective enqueue behavior;
- template item parity where practical.

## Live proof strategy

Because this feature is slash-command/TUI-facing, run a live probe through `pi-goals-live-probe` unless implementation is demonstrably parser-only and deterministic coverage is exhaustive. The live probe should send a realistic multi-line command, including a continuation-line item and a nested-marker example, and then run `/goal queue` to confirm separate queue rows with continuation text preserved.

Use `.ai/docs/pi-goals-live-probe-testing.md`; resolve the process by name/current Solo context, not hard-coded id.

## Required proof rows

The issue doc should require:

- Sentrux gate before substantial implementation.
- Deterministic multi-item queue command probe.
- Existing relevant queue regression probes or equivalent targeted probes.
- Full `npm run quality:goal`.
- Mandatory live probe for the exact ordered-marker/nested-example block supplied by the user. This proof must not be skipped; it must show exactly three queued goals, with embedded `[1]`/`[2]`/`[3]` example lines preserved inside goal 1.

# 11 — Model output parser reuse note

## Source inspected

- `.pi/extensions/goal/model-output.ts`
- `.ai/issues/fixed/ISSUE-020-goal-churn-monitor.md`

## Finding

The monitor implementation added a tolerant XML payload extraction helper that can extract a root tag from raw XML, surrounding prose, or fenced XML and read repeated tags. ISSUE-020 explicitly anticipated reuse by future features such as `/goal audit`.

## Implementation impact

If audit asks the model for a structured summary, prefer a small XML schema parsed through `model-output.ts` or a compatible helper rather than inventing a second parser. The visible audit response can remain prose/markdown, but persisted bounded metadata should be extracted through a deterministic parser if it depends on model-structured output.

## Proof implication

Prompt/parser probes should check that audit structured metadata is bounded and parseable, and that parser failures do not mark the goal complete or schedule continuation.

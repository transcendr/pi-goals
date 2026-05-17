# 03 Design Lock — ISSUE-046

## Design choice landscape

The request has one real API design fork: whether to make the default `list_goal_queue` output always include full objective text or to preserve compact defaults and add an explicit full/detail mode.

## Chosen design

Keep `list_goal_queue` compact by default, but make truncation explicit and add an agent-facing full/details mode.

Recommended concrete behavior:

1. Extend `list_goal_queue` parameters from empty params to an optional mode or detail flag, such as:
   - `mode?: "summary" | "full"`; or
   - `full?: boolean`.
2. Preserve current no-argument behavior as a compact summary for backward compatibility and token safety.
3. In summary mode:
   - continue truncating long objectives;
   - include enough metadata to know truncation occurred, such as `objective_chars` and `truncated`;
   - include an actionable hint: rerun `list_goal_queue` with full/details mode for complete objective text.
4. In full/details mode:
   - return complete queued objective text for every queued item, or for a specific queue id if the implementation adds an optional `queueId` filter;
   - preserve stable queue ids, order, budgets, template metadata, and post-completion action metadata where useful.
5. Keep slash-command `/goal queue` compact unless a separate human command flag is intentionally added later. This issue is primarily about agent-facing tool access.

## Why this design is locked

- It follows AXI: compact defaults, disclose truncation, provide a full-content escape hatch.
- It preserves existing no-arg tool usage.
- It avoids unbounded default outputs for large queues.
- It lets agents recover the full objective through the intended tool interface instead of persisted session JSONL.
- It avoids changing queue persistence because full objectives are already stored.

## Rejected alternatives

| Alternative | Rejection reason |
|---|---|
| Always print full objectives in default `list_goal_queue` output | Too easy to flood context for large queues or very large goal templates; violates compact default expectations. |
| Leave current truncation and rely on `details.queue` internals | The incident shows agents may only see/trust the tool text and resort to session JSONL spelunking. Hidden details are not a deliberate API. |
| Add a separate `get_queued_goal` tool only | Acceptable as an implementation detail if paired with summary hints, but not sufficient alone unless list output tells agents how to use it. |
| Store abbreviated objectives in queue state | Data model already stores full text; truncating persistence would worsen the problem. |
| Change queue steering only | Queue steering already has a larger preview; the failing surface is `list_goal_queue`. |

## Execution-ready decision

Execution-ready. The scope is localized, the user-visible API behavior is chosen, backward compatibility is clear, and the proof contract can be concrete.

Implementation details left to the implementer:

- exact schema name: `mode`, `full`, or `details`;
- whether full mode supports all items only or all items plus optional `queueId` filter;
- exact text/TOON format of the output, as long as it is structured, compact by default, and exposes complete objective text intentionally.

These are implementation details, not unresolved product/API direction.

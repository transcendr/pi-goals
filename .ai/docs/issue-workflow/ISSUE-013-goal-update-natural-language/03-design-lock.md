# 03 — Design lock

Issue: ISSUE-013 — `/goal update` natural-language goal updates
Date: 2026-05-10

## Locked summary

Implement `/goal update <request>` as a **deterministic known-field update command** that produces a structured proposal, asks for explicit confirmation, then applies the same update semantics as the existing `update_goal` tool.

Do not use model-assisted extraction in the first release.

## Parser decision

Chosen: deterministic parser for a bounded grammar.

Rationale:

- Slash-command mutation must be predictable and debuggable.
- Hidden model extraction would introduce prompt-injection and trust-boundary questions from the current objective and user prose.
- Existing `update_goal` already provides the trusted structured mutation API; `/goal update` should be a human-friendly parser for that API, not a second model planner.

Rejected for first release:

- Hidden extraction prompt.
- Free-form model-assisted objective rewriting.
- Applying best-effort partial parses from ambiguous prose.

## Grammar scope

First pass supports only explicit field updates that can map to one structured mutation object.

Supported families:

- Token budget:
  - `set token budget to <tokens>`
  - `change token budget to <tokens>`
  - `extend token budget to <tokens>`
  - `remove token budget` / `clear token budget`
- Time budget:
  - `set time budget to <duration>`
  - `add time budget of <duration>`
  - `change time budget to <duration>`
  - `remove time budget` / `clear time budget`
- Token wrap-up floor:
  - `set token floor to <tokens>`
  - `set min tokens before wrap-up to <tokens>`
  - `remove token floor` / `clear token floor`
- Time wrap-up floor:
  - `set time floor to <duration>`
  - `set min time before wrap-up to <duration>`
  - `remove time floor` / `clear time floor`
- Objective field edit:
  - `set objective to <text>`
  - `change objective to <text>`
  - `replace objective with <text>`
  - `append to objective: <text>` as an explicit append operation that previews the full resulting objective before confirmation
- Progress estimate after ISSUE-014 exists:
  - `set progress to <0-100>%`
  - `set progress to <0-100>% note <text>`
  - `clear progress`
  - `remove progress`
- Status pause/resume aliases may be supported only as exact command-family matches:
  - `pause goal`
  - `resume goal`

Unsupported/ambiguous examples must not mutate:

- `make this more complete`
- `include docs somehow`
- `use a bigger budget`
- `mark done maybe`
- `finish it`
- any request that mentions multiple fields unless the first implementation intentionally supports and tests that exact combination.

## Literal syntax and validation

Token literals:

- integers: `5000`
- compact suffixes: `5k`, `250K`, `1m`, `5M`
- parsed as base-10 powers (`k = 1_000`, `m = 1_000_000`)
- result must be a positive safe integer for budgets/floors.

Duration literals:

- seconds: `30s`, `30 sec`, `30 seconds`
- minutes: `10m`, `10 min`, `10 minutes`
- hours: `1h`, `1 hour`, `2 hours`
- plain integer without unit is rejected for time to avoid seconds/minutes ambiguity.
- result must be a positive safe integer number of seconds.

Progress literals:

- integer percentage only: `0%` through `100%`.
- `100%` remains advisory and does not imply completion.
- progress note is trimmed and must obey ISSUE-014's max-length validation.

Budget/floor validation must reuse or match `update_goal` validation: positive integers or `null` for clearing, and existing status recompute/budget-limit behavior.

## Trust boundary

- The parser consumes only the `/goal update` request string and current goal state needed for preview (for append/objective display), not a model-generated extraction.
- The current objective is never fed into a model parser, so objective text cannot inject parser instructions.
- The proposed structured mutation is displayed before any persistence.
- Applying a proposal calls the same internal update path as `update_goal` or a shared helper extracted from it; command and tool behavior must not fork.
- Parse errors explain the nearest supported grammar and leave state unchanged.

## Confirmation UX

All successful `/goal update` parses require confirmation in the first release.

Confirmation prompt must include:

- current goal id/status;
- proposed fields and values;
- cleared fields as explicit `null`/`clear` actions;
- objective before/after excerpt for objective edits;
- budget/floor parsed numeric value and human-readable rendering;
- warning if the edit may keep or move the goal into `budgetLimited`.

Choices:

- `Apply update`
- `Cancel`

No default auto-apply path in first release. This is intentionally conservative; later AXI improvements may add `--yes` only after deterministic probes cover it.

## Completion restriction

`/goal update` must **not** support marking complete in the first implementation pass.

If the request is an explicit completion request (`mark complete`, `mark done`, `complete goal`, `goal achieved`), the command must refuse with guidance:

- run/ask for `/goal audit` once ISSUE-024 is implemented, or perform an explicit completion audit;
- then let the agent call `update_goal(status:"complete")` through the structured tool so floors/proofs/telemetry remain authoritative.

Rationale:

- Completion has higher trust requirements than ordinary field edits.
- ISSUE-021 proof gates and ISSUE-036 floors must remain the only completion gate path.
- ISSUE-024 owns user-requested qualitative audit UX.

## Objective edit vs replacement semantics

`/goal update ... objective ...` edits the `objective` field of the existing goal and preserves `goalId`, accounting, budgets, floors, telemetry, and queue position.

It is **not** equivalent to `/goal <new objective>` replacement:

- no new `GoalState` is created;
- no telemetry reset occurs;
- no automatic continuation reason `created` is emitted;
- existing budgets/floors remain unless separately edited;
- the edit is persisted as an update event and visible in replay.

Users who want a new goal must use `/goal <objective>` replacement UX or `clear_goal`/`create_goal`.

## Progress dependency

Because ISSUE-014 is separately promoted, implementation must handle progress conditionally by code state:

- If ISSUE-014 has landed, support the progress grammar by mapping to `progress_percent`/`progress_note` and preserve advisory-only semantics.
- If ISSUE-014 has not landed when ISSUE-013 implementation starts, either implement ISSUE-014 first or leave progress grammar behind a documented unsupported parse error. Do not invent a second progress state.

## Architecture seams

Recommended implementation:

- Add `update` to `GoalSubcommand` and route it before objective creation in `command.ts`.
- Create a small parser/proposal module, e.g. `.pi/extensions/goal/update-command-parser.ts`.
- Extract shared update application from `tools.ts` if needed so command and model tool use the same validation/completion/budget/floor behavior.
- Add proposal formatting helpers in a small module or in `format.ts` only if they stay cohesive.
- Keep `command.ts` as orchestration glue; avoid growing it into a parser god file.

## Execution-ready conclusion

The major forks are closed: deterministic parser, all-proposal confirmation, no slash completion in first pass, objective edits preserve `goalId`, compact literal syntax with explicit units, and progress follows ISSUE-014 only.

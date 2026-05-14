# 05 — Issue writeback

## Canonical issue doc written

Path:

```text
.ai/issues/open/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks.md
```

## Sections written

```toon
toon.version: 1
sections[15]{section,status,notes}:
  "front matter",present,"Status, Priority, Owner, Created, Updated, Next best session, bucket/kind, target repo roots, related links"
  "Goal",present,"rewrite post-completion context management as isolated safe hooks"
  "Transcript artifacts",present,"links to 00-06 artifacts and raw commands log"
  "Problem/context",present,"current ISSUE-043 implementation gaps framed as architecture issue"
  "Why it matters",present,"queue continuation reliability as primary user expectation"
  "Desired behavior",present,"ingress normalization, structured tool API, action model, continuation ticket, safe runner, flag, preserved reset semantics"
  "Grounded research findings",present,"facts linked to source files and research artifact"
  "Locked design choices",present,"architecture patterns mapped to concrete implementation roles"
  "Target architecture",present,"module map and target flow"
  "Execution checklist",present,"execution-level tasks without over-specifying local patch order"
  "Acceptance criteria",present,"behavioral criteria including nonblocking action failure and template raw directive handling"
  "Proof threat model",present,"primary invariant and false-green risks summarized with link to full artifact"
  "Required proofs",present,"importable required_proofs[] TOON block"
  "Live proof",present,"bounded live probe requirement"
  "TOON synthesis",present,"valid TOON issue memory, requirements, invariants, surfaces, verification checks"
```

## Design truth written back

```toon
locked_truth[6]{id,truth}:
  "t1","context reset is optional post-completion action, not a queue continuation gate"
  "t2","GoalIntent anti-corruption layer owns slash/tool/template/queue normalization"
  "t3","template raw directives must be parsed before template expansion"
  "t4","model tools need structured post-completion action params normalized into action specs"
  "t5","ContinuationTicket/outbox-style command captures expected continuation before optional actions"
  "t6","feature flag/strategy boundary selects real vs no-op action runner"
```

## Evidence commands

Recorded in [`raw/commands.log`](raw/commands.log):

- issue file existence check;
- `rg` section presence check.

## Notes

The issue intentionally does not prescribe exact patch order. The queued next step is `implementation-ready-issue`, which should convert this execution-ready issue into a precise implementation-readiness plan with exact patch and proof sequence.

# 22 — Audit record schema sketch

## Purpose

If ISSUE-024 implementation persists audit metadata, keep it bounded and replay-safe.

## Suggested minimal metadata

```toon
toon.version: 1
audit_record_fields[8]{field,type,notes}:
  "version","literal 1","schema version"
  "auditId","string","stable uuid"
  "goalId","string","goal identity stale guard"
  "goalStatusAtAudit","GoalStatus","status when audit requested"
  "requestedAt","number","timestamp"
  "completedAt","number optional","timestamp if structured result captured"
  "summaryStatus","ready|continue|blocked|unknown","compact model-derived recommendation if parsed"
  "counts","object optional","bounded counts for verified/missing/weak/blocked/not_applicable"
```

## Explicitly excluded from metadata

- Full audit prose.
- Full command output excerpts.
- Unbounded requirement lists.
- Arbitrary model JSON.

## Persistence recommendation

Prefer a dedicated custom entry type such as `pi-goal-audit-record` or a bounded goal-adjacent replay stream. Avoid adding unbounded arrays to every `GoalState` snapshot.

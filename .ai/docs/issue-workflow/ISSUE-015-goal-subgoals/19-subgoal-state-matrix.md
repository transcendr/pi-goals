# 19 — Subgoal state matrix

## Purpose

Clarify how first-pass subgoal statuses should affect parent completion.

| Subgoal status | Blocking child effect on parent completion | Required evidence |
| --- | --- | --- |
| `pending` | refuse parent completion | child objective/status summary |
| `active` | refuse parent completion | active child objective and return point |
| `paused` | refuse parent completion | pause reason or next action |
| `failed` | refuse parent completion | failure evidence and remediation/escalation |
| `blocked` | refuse unless explicit escalation evidence exists | blocker reason and parent-level decision |
| `abandoned` | refuse unless explicit escalation evidence exists | abandonment reason and parent-level decision |
| `complete` | allow if all other blockers are resolved | completion evidence/proof reference |

## Implementation impact

The completion gate helper should evaluate the whole bounded subgoal list, not only `activeSubgoalId`, because a failed/pending blocking child can remain unresolved after focus returns to the parent.

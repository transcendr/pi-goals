# 22 — Queue state checkpoint

## Observed queue state

`list_goal_queue` still shows the parent orchestration item followed by the child `create-issue-doc` items originally enqueued for the stack.

## Satisfied child items

The child queue entries for ISSUE-021 and ISSUE-015 are now satisfied by completed concrete goals:

- ISSUE-021 canonical open path: `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- ISSUE-015 canonical open path: `.ai/issues/open/ISSUE-015-goal-subgoals.md`

## Continuation rule

Do not dequeue the parent orchestration item until all refine issues in the stack are open/execution-ready. If the already-satisfied child items later reach the queue head, remove/dequeue them as satisfied duplicates rather than recreating duplicate goals.

## Next concrete issue

- `.ai/issues/refine/ISSUE-016-goal-idle-tolerant-mode.md`

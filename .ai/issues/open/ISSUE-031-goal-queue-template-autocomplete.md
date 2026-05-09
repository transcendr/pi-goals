# ISSUE-031 — Autocomplete templates after goal queue

Status: open — execution-ready
Priority: P2
Owner: unassigned
Created: 2026-05-09
Next best session: focused implementation/validation pass for `/goal queue` autocomplete
Next best session rationale: Research isolates the gap to `goalArgumentCompletions()` whitespace handling in `.pi/extensions/goal/command.ts`; root template autocomplete can be reused.
Target bucket: open
Issue kind: feature
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-027-goal-queue.md`
Related:
- `.ai/issues/open/ISSUE-029-goal-queue-direct-enqueue.md`
- `.ai/issues/fixed/ISSUE-017-reusable-goal-prompt-docs.md`

## Goal

Make `/goal queue <template-prefix>` offer the same fuzzy reusable-template autocomplete as root `/goal <template-prefix>`, while preserving root subcommand/template autocomplete behavior.

## Problem/context

Root goal creation supports fuzzy autocomplete for reusable `.pi-goals` templates and aliases. The queue command should support the same intent:

```text
/goal queue create-issue-doc ...
/goal queue dirty-cleanup ...
```

Today, autocomplete works only at the root `/goal <template>` position. After typing `queue `, the autocomplete function returns `null` because it treats any whitespace in the argument prefix as too complex.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-031-goal-queue-template-autocomplete/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-031-goal-queue-template-autocomplete/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-031-goal-queue-template-autocomplete/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-031-goal-queue-template-autocomplete/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-031-goal-queue-template-autocomplete/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-031-goal-queue-template-autocomplete/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-031-goal-queue-template-autocomplete/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-031-goal-queue-template-autocomplete/raw/commands.log`

## Research findings

- `.pi/extensions/goal/command.ts` exports `goalArgumentCompletions(argumentPrefix)`.
- The function currently does `const query = argumentPrefix.trimStart(); if (/\s/.test(query)) return null;`.
- This makes root template completion work for prefixes such as `cre`, but disables completion after `queue ` because the prefix contains whitespace.
- Template matching already uses `discoverGoalTemplates()` and checks both template names and aliases.
- Queue autocomplete should reuse this template matching behavior instead of adding a divergent list.

## Locked design choices

- Add subcommand-aware autocomplete for the queue subcommand.
- Extract or share template completion logic so root and queue contexts match templates and aliases identically.
- For queue-context completions, return insertable values prefixed with `queue `, e.g. `queue create-issue-doc`.
- Preserve `/goal que` subcommand autocomplete.
- Preserve root `/goal <template-prefix>` behavior.

Rejected alternatives:
- Continue returning `null` after whitespace: fails the requested UX.
- Return bare template names after `queue `: may replace the whole argument instead of preserving the queue subcommand depending on TUI insertion semantics.
- Hardcode known templates: duplicates discovery and misses project-local additions.

## Implementation checklist

- [ ] Refactor template completion creation into a small helper if useful.
- [ ] Detect `queue` as the first token in `goalArgumentCompletions()`.
- [ ] When first token is `queue`, complete the trailing template prefix using the same fuzzy name/alias matching as root.
- [ ] Return queue-prefixed completion values.
- [ ] Add focused probe `/tmp/pi-goal-queue-template-autocomplete-probe.cjs`.
- [ ] Run `npm run quality:goal`.

## Acceptance criteria

- `/goal queue ` offers reusable template completions.
- `/goal queue cre` fuzzy-matches `create-issue-doc`.
- `/goal queue dirty-cleanup` or alias prefixes match template aliases.
- Completion values preserve the `queue ` prefix.
- Root `/goal <template-prefix>` autocomplete still works.
- Root subcommand autocomplete still works.

## Proof threat model

Primary invariant: queue-template autocomplete is functionally equivalent to root template autocomplete, except returned values are prefixed for the queue command.

False greens:
- Root autocomplete still passes but queue autocomplete returns `null`.
- Queue autocomplete suggests only subcommands.
- Queue autocomplete matches names but not aliases.
- Queue autocomplete returns bare template names.
- Fix breaks root autocomplete.

## Required proofs

required_proofs[2]{name,command,condition}:
  queue_template_autocomplete_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-template-autocomplete-probe.cjs","exit 0; queue template autocomplete matches names aliases and returns queue-prefixed values"
  quality_goal,"npm run quality:goal","exit 0; Sentrux slop TypeScript and Pi load gates pass"

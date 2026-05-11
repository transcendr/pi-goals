# ISSUE-038 — Bound goal template autocomplete discovery

Status: fixed — implemented
Priority: P0
Owner: pi-goal automation
Created: 2026-05-11
Next best session: green-loop implementation
Next best session rationale: The bug is isolated to a small TypeScript path, but it affects live slash-command autocomplete and needs adversarial proof against false-green repo-local tests.
Target bucket: open
Issue kind: fix
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: none
Depends on: none
Related:
- `.ai/issues/fixed/ISSUE-017-reusable-goal-prompt-docs.md`
- `.ai/issues/fixed/ISSUE-031-goal-queue-template-autocomplete.md`

## Goal

Make `/goal <string>` and `/goal queue <string>` template autocomplete safe and bounded so starting Pi from a broad directory such as `/Users/bryan` does not synchronously scan the entire home tree, freeze the TUI, spin fans, or trigger macOS folder permission prompts.

## Problem/context

The user reported a severe runtime failure: Pi was started in the home folder, which does not have a root `.pi-goals` directory, and `/goal <string>` autocomplete/search froze. The Mac then requested access to multiple home folders. This strongly suggests autocomplete was walking privacy-protected home-directory trees while looking for reusable goal templates.

The current implementation confirms the likely root cause: autocomplete calls reusable-template discovery synchronously, and discovery recursively searches all descendants of `process.cwd()` for directories named `.pi-goals`.

## Desired behavior

- `/goal` autocomplete stays responsive even when `process.cwd()` is a large directory with no templates.
- Autocomplete/template discovery does not recursively traverse arbitrary home/workspace descendants.
- No macOS privacy-protected folder probing is caused merely by typing `/goal <prefix>`.
- Root `/goal <template-prefix>` completion still works for supported template directories.
- `/goal queue <template-prefix>` completion still works.
- This repo's `.ai/.pi-goals` templates remain discoverable.
- Root `.pi-goals` remains discoverable.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/raw/commands.log`

## Research findings

Grounded research is recorded in `02-grounded-research.md`.

Key facts:

- `.pi/extensions/goal/command.ts` registers `getArgumentCompletions: goalArgumentCompletions` for `/goal`.
- `goalArgumentCompletions()` calls `templateCompletions(query)` for root first-token completions and for `queue ` completions.
- `templateCompletions()` calls `discoverGoalTemplates()` on each completion request.
- `.pi/extensions/goal/templates.ts` implements `discoverGoalTemplates(root = process.cwd())` by calling `findTemplateDirs(root)`.
- `findTemplateDirs()` uses a synchronous recursive `walk()` with `readdirSync()` and `statSync()` across the full current working directory tree, skipping only a small set of directory names.
- This repo stores reusable workflow templates under `.ai/.pi-goals`, so the fix must preserve that bounded location.
- The current code path affects both `/goal <prefix>` and `/goal queue <prefix>` because ISSUE-031 intentionally reused root template completion for queue autocomplete.

## Locked design choices

Chosen design: replace broad recursive template-directory discovery with bounded candidate-directory discovery.

Candidate directories for the first pass:

- `<root>/.pi-goals`
- `<root>/.ai/.pi-goals`

Template collection may continue to recurse inside an actual template directory so nested template names such as `release/checklist` still work. The forbidden behavior is recursively searching arbitrary descendants to find template directories.

Rejected alternatives:

- Keep recursive discovery but expand the skip list. This is brittle and still risks scanning large or privacy-gated folders.
- Add only caching. This hides repeated cost but leaves the first autocomplete dangerous.
- Move discovery async/background only. This may reduce UI blocking but still performs unwanted broad filesystem access.
- Hard-code only `.ai/.pi-goals`. This would break documented root `.pi-goals` usage.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,kind,target_root,next_session}:
  "ISSUE-038","open execution-ready","fix","/Users/bryan/dev/personal/experiments/pi-goals","green-loop implementation"
feature_memory[4]{id,fact}:
  "fm1","goalArgumentCompletions calls templateCompletions during slash-command autocomplete"
  "fm2","templateCompletions calls discoverGoalTemplates for each completion request"
  "fm3","discoverGoalTemplates currently recursively walks process.cwd to find .pi-goals directories"
  "fm4","repo templates live under .ai/.pi-goals and must remain discoverable"
locked_requirements[5]{id,requirement}:
  "lr1","do not recursively search arbitrary cwd descendants for .pi-goals during autocomplete or template listing"
  "lr2","preserve root .pi-goals discovery"
  "lr3","preserve root .ai/.pi-goals discovery"
  "lr4","preserve root and queue template autocomplete behavior"
  "lr5","keep npm run quality:goal green after implementation"
invariants[4]{id,invariant}:
  "inv1","typing /goal prefix from a broad home directory is bounded and responsive"
  "inv2","nested decoy .pi-goals outside explicit candidate dirs are ignored"
  "inv3","template file recursion remains allowed inside explicit template dirs"
  "inv4","errors reading non-template directories are avoided rather than swallowed after probing"
implementation_surfaces[3]{path,expected_change,risk}:
  ".pi/extensions/goal/templates.ts","replace recursive findTemplateDirs walk with explicit candidate-directory discovery","may break nested arbitrary .pi-goals behavior intentionally"
  ".pi/extensions/goal/command.ts","preserve autocomplete call behavior while using safer discovery","root and queue completions must both stay green"
  "README.md","clarify supported template locations if wording remains too broad","docs must match bounded runtime behavior"
verification_checks[4]{id,check,evidence}:
  "v1","temp workspace with nested decoy .pi-goals does not expose decoy template","bounded discovery probe"
  "v2","temp workspace .pi-goals template completes from /goal prefix","bounded discovery probe"
  "v3","temp workspace .ai/.pi-goals template completes from root and queue prefixes","bounded discovery probe"
  "v4","extension quality gates pass","npm run quality:goal"
```

## Implementation checklist

- [x] Replace `findTemplateDirs()` recursive walk in `.pi/extensions/goal/templates.ts` with bounded candidate-directory discovery.
- [x] Include `<root>/.pi-goals` and `<root>/.ai/.pi-goals` as first-pass candidates.
- [x] Keep recursive markdown collection within actual template directories.
- [x] Ensure `listGoalTemplateMetadata()`, `resolveGoalTemplateInvocation()`, `resolveGoalTemplateInvocationArgs()`, and `resolveGoalTemplateByName()` use the same bounded discovery.
- [x] Preserve root `/goal <template-prefix>` and `/goal queue <template-prefix>` completions.
- [x] Add a focused deterministic probe that fails the current recursive implementation by placing a decoy nested `.pi-goals` outside the explicit candidate directories.
- [x] Update README wording if needed so docs do not promise arbitrary descendant `.pi-goals` discovery.
- [x] Run `npm run quality:goal`.
- [x] Usually run a bounded live probe because this touches slash-command autocomplete; if skipped, record a concrete reason.

## Implementation result

Implemented bounded template discovery in `.pi/extensions/goal/templates.ts` by replacing recursive workspace walking with explicit candidate directories: `<root>/.pi-goals` and `<root>/.ai/.pi-goals`. Template file collection still recurses inside those explicit template roots.

Updated `README.md` to document the bounded template roots and why arbitrary recursive search is intentionally avoided.

Added deterministic proof probe `.ai/validation/goal-template-discovery-bounds-probe.cjs` and copied it to `/tmp/pi-goal-template-discovery-bounds-probe.cjs` for the issue-required proof command. The probe creates a temp workspace with root `.pi-goals`, root `.ai/.pi-goals`, and nested decoy `.pi-goals`; it verifies root/queue completions still work and nested decoy templates are ignored.

Live probe was skipped with rationale in `.ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/live-probe-closeout.md` because deterministic coverage directly exercises the autocomplete path without risking a real home-directory scan.

## Acceptance criteria

- Starting Pi in a directory with no `.pi-goals` and many unrelated descendants does not cause template autocomplete to traverse those descendants.
- `/goal x` autocomplete does not discover templates from arbitrary nested `some/subtree/.pi-goals` directories.
- `/goal <prefix>` discovers templates from `<cwd>/.pi-goals`.
- `/goal <prefix>` discovers templates from `<cwd>/.ai/.pi-goals`.
- `/goal queue <prefix>` discovers the same supported templates and returns queue-prefixed completion values.
- `list_goal_templates` and template invocation use the same bounded discovery semantics.
- `npm run quality:goal` passes.

## Proof threat model

Primary invariant: `/goal` autocomplete and template resolution must never recursively traverse arbitrary `process.cwd()` descendants just to discover `.pi-goals` directories.

Likely false greens:

- Tests only run in this repo and never build a nested decoy `.pi-goals`, so recursive behavior survives.
- The implementation fixes autocomplete only, but natural-language tools such as `list_goal_templates` still recurse through home.
- Root autocomplete passes but queue autocomplete regresses.
- `.ai/.pi-goals` support is accidentally removed.
- Elapsed-time-only tests pass on a fast machine while still scanning too much.

Proof strategy:

- Use a deterministic nested-decoy fixture rather than timing alone.
- Test both autocomplete surfaces and template-list/resolution surfaces.
- Use the standard quality gate after implementation.
- Prefer a bounded disposable live probe for the actual Pi autocomplete surface.

## Required proofs

```toon
toon.version: 1
required_proofs[3]{name,source,command,pass_condition,scope,notes}:
  "bounded_template_discovery_probe","issue doc","NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-template-discovery-bounds-probe.cjs","exit 0 and nested decoy templates are ignored while root .pi-goals and .ai/.pi-goals completions work",run,"probe should fail against current recursive discovery"
  "quality_goal","issue doc","npm run quality:goal","exit 0",run,"runs Sentrux slop TypeScript and Pi extension load validation"
  "live_probe_closeout","issue doc","test -f .ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/live-probe-closeout.md && rg -n \"PASS|SKIPPED:\" .ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/live-probe-closeout.md","exit 0 and closeout records bounded live probe pass or explicit skip reason",run,"do not probe by scanning the real home directory"
```

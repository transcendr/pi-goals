---
description: Review README before a release against changes since the last release and propose useful documentation updates
aliases: readme-release-review,release-readme,readme-release
usage: /goal release-readme-review -- v0.1.1..HEAD
examples: /goal readme-release-review -- v0.1.1..HEAD; /goal release-readme -- upcoming npm release
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---

Prepare the project for a release:
1. Move all completed issues the fixed bucket
2. Review the README for an upcoming release and propose useful changes based on what has landed since the last release.
3. Update the CHANGELOG.md based on the product-level changes (anything that directly impacts users) since the last release.

<release_context>
{{args}}
</release_context>

Use this initial snapshot, then inspect targeted details as needed:

<repo_status>
!`git status --short --untracked-files=all`
</repo_status>

<recent_tags>
!`git tag --sort=-creatordate | head -10`
</recent_tags>

<last_release_tag>
!`git describe --tags --abbrev=0 2>/dev/null || true`
</last_release_tag>

<commits_since_last_release>
!`tag=$(git describe --tags --abbrev=0 2>/dev/null || true); if [ -n "$tag" ]; then git log --oneline --decorate "$tag"..HEAD; else git log --oneline --decorate --max-count=40; fi`
</commits_since_last_release>

<changed_public_files_since_last_release>
!`tag=$(git describe --tags --abbrev=0 2>/dev/null || true); if [ -n "$tag" ]; then git diff --name-status "$tag"..HEAD -- README.md package.json .pi/extensions/goal .ai/.pi-goals; else git diff --name-status -- README.md package.json .pi/extensions/goal .ai/.pi-goals; fi`
</changed_public_files_since_last_release>

<readme_headings>
!`rg -n '^#{1,3} ' README.md 2>/dev/null || true`
</readme_headings>

## Issue Movement

- Move every issue closed during the release window into `fixed`, and leave untouched issues in `open`.
- Mentally confirm each moved issue maps to a concrete change since the last tag; 

## README Update

Deliver:
- release-relevant feature and behavior changes since the last release
- README gaps or outdated statements, if any
- concise proposed README additions or edits
- areas intentionally not worth documenting
- optional exact patch suggestions when the changes are straightforward

Keep the review focused on public package behavior and install/use guidance. Do not document project-private workflows unless they are useful examples for package users.

### Changelog Update

- Match existing `CHANGELOG.md` structure with release sections in this order when present: `### Highlights`, `### Added`, `### Changed`, `### Fixed`.
- Add only product-level, user-visible entries (features, behavior, install/use guidance, docs impact); omit private internals and process work that only affects repo hygiene.
- Keep bullets concise and specific to concrete changes, in past tense, and mention commands/functions/modules only when they matter to users.
- Group related behavior changes under one heading; avoid duplicate points across `Highlights`, `Added`, `Changed`, and `Fixed`.
- Omit empty headings; if nothing changed in a category for this release window, leave that heading out of the entry.
- Prefer exact changelog-ready phrasing that mirrors current examples, e.g. ``- `dequeue_goal` now ...`` and short, complete sentences without caveated language.

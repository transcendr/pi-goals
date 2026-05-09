---
description: Review README before a release against changes since the last release and propose useful documentation updates
aliases: readme-release-review,release-readme,readme-release
usage: /goal release-readme-review -- v0.1.1..HEAD
examples: /goal readme-release-review -- v0.1.1..HEAD; /goal release-readme -- upcoming npm release
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
Review the README for an upcoming release and propose useful changes based on what has landed since the last release.

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

Deliver:
- release-relevant feature and behavior changes since the last release
- README gaps or outdated statements, if any
- concise proposed README additions or edits
- areas intentionally not worth documenting
- optional exact patch suggestions when the changes are straightforward

Keep the review focused on public package behavior and install/use guidance. Do not document project-private workflows unless they are useful examples for package users.

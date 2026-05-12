#!/usr/bin/env python3
"""Resolve issue selectors into compact TOON prompt context.

Read-only generic helper for pi-goal templates that take issue docs as their
main trailing argument. It resolves numbers/lists/ranges to concrete
.ai/issues/**/ISSUE-NNN-*.md paths and emits only compact context.
"""

from __future__ import annotations

import glob
import os
import re
from dataclasses import dataclass

DEFAULT_BUCKETS = ["open", "refine", "defer", "review", "fixed", "closed"]


@dataclass(frozen=True)
class IssueDoc:
    num: int
    issue: str
    slug: str
    bucket: str
    path: str
    artifact_dir: str


def env_list(name: str, default: list[str]) -> list[str]:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


def env_int(name: str, default: int) -> int:
    try:
        value = int(os.environ.get(name, ""))
    except ValueError:
        return default
    return value if value > 0 else default


def toon_string(value: object) -> str:
    text = str(value).replace("\\", "\\\\").replace('"', '\\"')
    return f'"{text}"'


def artifact_dir_for(issue: str, slug: str) -> str:
    root = os.environ.get("ISSUE_ARTIFACT_ROOT", ".ai/docs/issue-workflow").strip().rstrip("/")
    subdir = os.environ.get("ISSUE_ARTIFACT_SUBDIR", "").strip().strip("/")
    base = f"{root}/{issue}-{slug}"
    if subdir:
        return f"{base}/{subdir}"
    return base


def discover_issue_docs() -> list[IssueDoc]:
    docs: list[IssueDoc] = []
    for bucket in env_list("ISSUE_BUCKETS", DEFAULT_BUCKETS):
        for path in sorted(glob.glob(f".ai/issues/{bucket}/ISSUE-*.md")):
            match = re.search(r"ISSUE-(\d+)-([^/]+)\.md$", path)
            if not match:
                continue
            num = int(match.group(1))
            issue = f"ISSUE-{num:03d}"
            slug = match.group(2)
            docs.append(IssueDoc(num=num, issue=issue, slug=slug, bucket=bucket, path=path, artifact_dir=artifact_dir_for(issue, slug)))
    return docs


def parse_issue_numbers(selector: str) -> list[int]:
    nums: list[int] = []
    covered_spans: list[tuple[int, int]] = []
    range_re = re.compile(r"(?i)(?:issue[- ]*)?(\d{1,4})\s*(?:-|through|to|\.\.)\s*(?:issue[- ]*)?(\d{1,4})")
    for match in range_re.finditer(selector):
        lo, hi = sorted((int(match.group(1)), int(match.group(2))))
        nums.extend(range(lo, hi + 1))
        covered_spans.append(match.span())

    single_re = re.compile(r"(?i)(?:issue[- ]*)?(\d{1,4})")
    for match in single_re.finditer(selector):
        if any(start <= match.start() and match.end() <= end for start, end in covered_spans):
            continue
        nums.append(int(match.group(1)))

    seen: set[int] = set()
    ordered: list[int] = []
    for num in nums:
        if num not in seen:
            ordered.append(num)
            seen.add(num)
    return ordered


def resolve(selector: str) -> tuple[list[IssueDoc], list[str], str | None]:
    numbers = parse_issue_numbers(selector)
    if not numbers:
        return [], [], "no_issue_numbers_found"
    by_num: dict[int, IssueDoc] = {}
    for doc in discover_issue_docs():
        by_num.setdefault(doc.num, doc)
    missing = [f"ISSUE-{num:03d}" for num in numbers if num not in by_num]
    chosen = [by_num[num] for num in numbers if num in by_num]
    return chosen, missing, None


def stack_id(issues: list[IssueDoc]) -> str:
    prefix = os.environ.get("ISSUE_STACK_PREFIX", "issue-docs").strip() or "issue-docs"
    return prefix + "-" + "-".join(issue.issue for issue in issues)


def artifact_field() -> str:
    raw = os.environ.get("ISSUE_ARTIFACT_FIELD", "artifact_dir").strip() or "artifact_dir"
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", raw)
    return safe or "artifact_dir"


def print_available(limit: int) -> None:
    docs = discover_issue_docs()[:limit]
    if not docs:
        print('available_issues[1]{issue,bucket,path}:')
        print(f"  {toon_string('none')},{toon_string('none')},{toon_string('none')}")
        return
    print(f"available_issues[{len(docs)}]{{issue,bucket,path}}:")
    for doc in docs:
        print(f"  {toon_string(doc.issue)},{toon_string(doc.bucket)},{toon_string(doc.path)}")


def render_resolved(selector: str, issues: list[IssueDoc]) -> None:
    field = artifact_field()
    print("```toon")
    print("toon.version: 1")
    print('resolution[1]{status,selector,stack_id,resolved_count}:')
    print(f"  {toon_string('resolved')},{toon_string(selector)},{toon_string(stack_id(issues))},{len(issues)}")
    print(f"issues[{len(issues)}]{{issue,bucket,path,slug,{field}}}:")
    for issue in issues:
        print(f"  {toon_string(issue.issue)},{toon_string(issue.bucket)},{toon_string(issue.path)},{toon_string(issue.slug)},{toon_string(issue.artifact_dir)}")
    print("```")


def render_unresolved(selector: str, missing: list[str], reason: str | None) -> None:
    detail = ",".join(missing) if missing else (reason or "unknown")
    print("```toon")
    print("toon.version: 1")
    print('resolution[1]{status,selector,blocker,detail}:')
    print(f"  {toon_string('unresolved')},{toon_string(selector)},{toon_string('issue_selector_did_not_resolve')},{toon_string(detail)}")
    print_available(env_int("ISSUE_AVAILABLE_LIMIT", 40))
    print("```")
    print("clarification_required: Ask one focused question naming the missing or ambiguous issue selector before creating artifacts.")


def main() -> None:
    selector = os.environ.get("ISSUE_SELECTOR", "").strip()
    issues, missing, reason = resolve(selector)
    if reason or missing or not issues:
        render_unresolved(selector, missing, reason)
    else:
        render_resolved(selector, issues)


if __name__ == "__main__":
    main()

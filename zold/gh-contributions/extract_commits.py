#!/usr/bin/env python3
"""For every bare clone in /tmp/gh-contribs-repos, extract commits authored by
the user, with per-commit additions/deletions, deduped by commit SHA across repos.

Author identification uses an inclusive regex on the git author field.
"""

import json
import re
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = Path("/tmp/gh-contribs-repos")
OUT = Path("commits.json")
AUDIT = Path("author_audit.json")

# Inclusive author match (matches email OR display name).
# `pondorasti` catches @gmail.com and @users.noreply.github.com forms.
# `alexandru_turcanu` catches the ymail address and the embedded local pattern.
AUTHOR_RE = r"pondorasti|alexandru_turcanu|alexandru@pondorasti\.local"


def list_repos() -> list[Path]:
    return sorted(p for p in ROOT.iterdir() if p.is_dir() and p.name.endswith(".git"))


def parse_log(text: str, repo: str) -> tuple[list[dict], dict[str, int]]:
    """Parse `git log --pretty=tformat:'COMMIT\\t%H\\t%ae\\t%an\\t%aI' --numstat` output.
    Fields are TAB-separated because author names contain spaces."""
    commits = []
    author_counts: dict[str, int] = {}
    cur = None
    for line in text.splitlines():
        if line.startswith("COMMIT\t"):
            if cur is not None:
                commits.append(cur)
            parts = line.split("\t")
            if len(parts) < 5:
                cur = None
                continue
            _, sha, email, name, iso = parts[0], parts[1], parts[2], parts[3], parts[4]
            key = f"{email}|{name}"
            author_counts[key] = author_counts.get(key, 0) + 1
            cur = {
                "sha": sha, "email": email, "name": name,
                "date": iso, "repo": repo,
                "add": 0, "del": 0, "files": 0,
            }
        elif cur is not None and line.strip():
            # numstat line: "<add>\t<del>\t<path>" (- for binary)
            parts = line.split("\t")
            if len(parts) >= 3:
                a, d = parts[0], parts[1]
                if a.isdigit(): cur["add"] += int(a)
                if d.isdigit(): cur["del"] += int(d)
                cur["files"] += 1
    if cur is not None:
        commits.append(cur)
    return commits, author_counts


def extract_one(repo_dir: Path) -> tuple[str, list[dict], dict[str, int]]:
    repo_name = repo_dir.name.removesuffix(".git")
    # Use --regexp-ignore-case + extended-regexp for OR pattern via --perl-regexp
    cmd = [
        "git", "-C", str(repo_dir), "log", "--all",
        "--no-merges",
        "--perl-regexp", "--regexp-ignore-case",
        f"--author={AUTHOR_RE}",
        "--pretty=tformat:COMMIT%x09%H%x09%ae%x09%an%x09%aI",
        "--numstat",
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, check=False, timeout=300)
    except subprocess.TimeoutExpired:
        return repo_name, [], {}
    if r.returncode != 0:
        # Likely empty repo or no commits matching; ignore
        return repo_name, [], {}
    commits, authors = parse_log(r.stdout, repo_name)
    return repo_name, commits, authors


def main():
    repos = list_repos()
    print(f"Extracting commits from {len(repos)} repos…")

    all_commits: list[dict] = []
    all_authors: dict[str, int] = {}
    seen_shas: set[str] = set()
    dup_count = 0

    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(extract_one, r): r for r in repos}
        for i, fut in enumerate(as_completed(futs), start=1):
            repo_name, commits, authors = fut.result()
            for k, v in authors.items():
                all_authors[k] = all_authors.get(k, 0) + v
            new = 0
            for c in commits:
                if c["sha"] in seen_shas:
                    dup_count += 1
                    continue
                seen_shas.add(c["sha"])
                all_commits.append(c)
                new += 1
            if new or commits:
                print(f"  [{i:>3}/{len(repos)}] {repo_name}: {new} new (+{len(commits)-new} dupe across forks)")

    print(f"\nTotal distinct commits: {len(all_commits)}")
    print(f"Cross-repo duplicate commits skipped: {dup_count}")

    # Top authors observed
    top = sorted(all_authors.items(), key=lambda kv: -kv[1])[:15]
    print("\nTop matched authors (sanity check — should all be the user):")
    for k, v in top:
        print(f"  {v:>5}  {k}")

    OUT.write_text(json.dumps(all_commits, indent=2))
    AUDIT.write_text(json.dumps(all_authors, indent=2, sort_keys=True))
    print(f"\nWrote {len(all_commits)} commits to {OUT}")
    print(f"Wrote author audit to {AUDIT}")


if __name__ == "__main__":
    main()

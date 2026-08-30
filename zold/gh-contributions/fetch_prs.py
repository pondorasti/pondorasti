#!/usr/bin/env python3
"""Fetch all merged PRs by a GitHub user, quarter by quarter, with additions/deletions."""

import json
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

USER = "pondorasti"
OUT = Path(__file__).parent / "prs.json"

QUARTERS = []
for year in range(2021, 2027):
    for q, (m_start, m_end) in enumerate([(1, 3), (4, 6), (7, 9), (10, 12)], start=1):
        # Quarter window
        start = date(year, m_start, 1)
        if m_end == 12:
            end = date(year, 12, 31)
        else:
            end = date(year, m_end + 1, 1) - timedelta(days=1)
        QUARTERS.append((f"{year}Q{q}", start.isoformat(), end.isoformat()))


def gh_graphql(query: str) -> dict:
    result = subprocess.run(
        ["gh", "api", "graphql", "-f", f"query={query}"],
        capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout)


def fetch_quarter(label: str, start: str, end: str) -> list[dict]:
    prs = []
    cursor_clause = ""
    while True:
        q = f'''
        query {{
          search(query: "author:{USER} is:pr is:merged merged:{start}..{end}", type: ISSUE, first: 100{cursor_clause}) {{
            issueCount
            pageInfo {{ endCursor hasNextPage }}
            nodes {{
              ... on PullRequest {{
                number
                mergedAt
                additions
                deletions
                changedFiles
                repository {{ nameWithOwner isFork }}
              }}
            }}
          }}
        }}
        '''
        data = gh_graphql(q)
        s = data["data"]["search"]
        for n in s["nodes"]:
            if not n:
                continue
            prs.append({
                "number": n["number"],
                "mergedAt": n["mergedAt"],
                "additions": n["additions"],
                "deletions": n["deletions"],
                "changedFiles": n["changedFiles"],
                "repo": n["repository"]["nameWithOwner"],
                "isFork": n["repository"]["isFork"],
            })
        if not s["pageInfo"]["hasNextPage"]:
            break
        cursor_clause = f', after: "{s["pageInfo"]["endCursor"]}"'
    return prs


def main():
    all_prs = []
    for label, start, end in QUARTERS:
        try:
            prs = fetch_quarter(label, start, end)
        except subprocess.CalledProcessError as e:
            print(f"ERROR {label}: {e.stderr}", file=sys.stderr)
            raise
        print(f"{label}: {len(prs)} PRs", file=sys.stderr)
        all_prs.extend(prs)
    OUT.write_text(json.dumps(all_prs, indent=2))
    print(f"\nWrote {len(all_prs)} PRs to {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()

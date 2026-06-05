#!/usr/bin/env python3
"""Discover every GitHub repo the user has any authored commits in.

Combines three sources:
  1. Repos the user owns (incl. private/archived/forks)
  2. Repos in commitContributionsByRepository across every year since account creation
  3. Repos surfaced by our earlier merged-PR fetch (covers any edge case)
"""

import json
import subprocess
from pathlib import Path

USER = "pondorasti"
ACCOUNT_CREATED_YEAR = 2017
OUT = Path("repos.json")


def gh_graphql(query: str) -> dict:
    r = subprocess.run(["gh", "api", "graphql", "-f", f"query={query}"],
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def fetch_owned_repos() -> list[dict]:
    """All repos owned by the user (paginated)."""
    repos = []
    cursor = ""
    while True:
        after = f', after: "{cursor}"' if cursor else ""
        q = f'''
        query {{
          user(login: "{USER}") {{
            repositories(first: 100, ownerAffiliations: [OWNER], affiliations: [OWNER]
                         , isFork: null{after}) {{
              pageInfo {{ endCursor hasNextPage }}
              nodes {{
                nameWithOwner
                isPrivate
                isFork
                isArchived
                isEmpty
                defaultBranchRef {{ name }}
                sshUrl
                url
              }}
            }}
          }}
        }}
        '''
        d = gh_graphql(q)["data"]["user"]["repositories"]
        for n in d["nodes"]:
            if n and not n["isEmpty"]:
                repos.append(n)
        if not d["pageInfo"]["hasNextPage"]:
            break
        cursor = d["pageInfo"]["endCursor"]
    return repos


def fetch_contributed_repos_year(year: int) -> list[dict]:
    """Repos with commit contributions in a single year window."""
    q = f'''
    query {{
      user(login: "{USER}") {{
        contributionsCollection(from: "{year}-01-01T00:00:00Z", to: "{year}-12-31T23:59:59Z") {{
          commitContributionsByRepository(maxRepositories: 100) {{
            repository {{
              nameWithOwner
              isPrivate
              isFork
              isArchived
              isEmpty
              defaultBranchRef {{ name }}
              sshUrl
              url
            }}
          }}
        }}
      }}
    }}
    '''
    d = gh_graphql(q)
    return [c["repository"] for c in d["data"]["user"]["contributionsCollection"]["commitContributionsByRepository"]
            if c["repository"] and not c["repository"]["isEmpty"]]


def main():
    seen: dict[str, dict] = {}

    print("Owned repos…")
    for r in fetch_owned_repos():
        seen[r["nameWithOwner"]] = r
    print(f"  {len(seen)} so far")

    print("Contributed repos (per year)…")
    for y in range(ACCOUNT_CREATED_YEAR, 2027):
        for r in fetch_contributed_repos_year(y):
            seen[r["nameWithOwner"]] = r
        print(f"  after {y}: {len(seen)}")

    print("Repos from prs.json…")
    if Path("prs.json").exists():
        for p in json.loads(Path("prs.json").read_text()):
            name = p["repo"]
            if name not in seen:
                # Fetch just enough metadata via GraphQL
                owner, repo = name.split("/")
                q = f'''
                query {{ repository(owner: "{owner}", name: "{repo}") {{
                  nameWithOwner isPrivate isFork isArchived isEmpty
                  defaultBranchRef {{ name }} sshUrl url
                }} }}
                '''
                try:
                    d = gh_graphql(q)["data"]["repository"]
                    if d and not d["isEmpty"]:
                        seen[name] = d
                except Exception as e:
                    print(f"  skip {name}: {e}")
        print(f"  after PR repos: {len(seen)}")

    repos = list(seen.values())
    # Drop empty / missing defaultBranchRef
    repos = [r for r in repos if r.get("defaultBranchRef")]
    OUT.write_text(json.dumps(repos, indent=2))
    print(f"\nWrote {len(repos)} repos to {OUT}")
    priv = sum(1 for r in repos if r["isPrivate"])
    forks = sum(1 for r in repos if r["isFork"])
    arch = sum(1 for r in repos if r["isArchived"])
    print(f"  private={priv}  forks={forks}  archived={arch}")


if __name__ == "__main__":
    main()

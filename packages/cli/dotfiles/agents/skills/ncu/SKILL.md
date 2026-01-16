---
name: ncu
description: Update dependencies
metadata:
  author: pondorasti
---

1. Use `bunx npm-check-updates -u` to bump all dependencies to latest (add the `-w` flag if inside a monorepo).
2. Install new dependency versions using the appropriate package manager.
3. Go through the changelog (or migration guide) of each updated dependency, and make code changes as needed.
4. Make sure all checks pass (scripts like lint, format, test, etc)
5. Write a summary for the updated dependencies so I can learn about the changes, new features, and breaking changes.

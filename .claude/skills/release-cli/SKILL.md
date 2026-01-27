---
name: release-cli
description: Release a new version of the pd CLI. Runs tests, bumps version, creates git tag, and pushes to remote. Use when releasing a new CLI version.
---

# CLI Release Process

Follow these steps to release a new version of the `pd` CLI.

## Pre-flight Checks

Before starting:
1. Verify you're on the `main` branch
2. Ensure working tree is clean (no uncommitted changes)
3. Pull latest changes

```bash
git status
git branch --show-current
git pull origin main
```

## Step 1: Run Tests

Ensure all tests pass before releasing:

```bash
bun test
```

Working directory: `packages/cli`

If tests fail, fix them before proceeding.

## Step 2: Bump Version

Bump the patch version in `packages/cli/package.json` (e.g., 0.1.27 → 0.1.28).

## Step 3: Commit Version Bump

```bash
git add packages/cli/package.json
git commit -m "chore: bump cli vX.Y.Z"
```

Replace `X.Y.Z` with the new version.

## Step 4: Create and Push Tag

```bash
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
```

## Step 5: Verify Release

Confirm the tag was pushed:

```bash
git tag --list | tail -5
```

Verify all CI/CD checks pass:

```bash
gh api repos/pondorasti/pondorasti/commits/HEAD/check-runs --jq '.check_runs[] | "\(.name): \(.conclusion)"'
```

## Troubleshooting

### Tests Fail
Fix failing tests before releasing.

### Tag Already Exists
Delete the tag and retry:
```bash
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
```

### Push Rejected
Pull latest and retry:
```bash
git pull --rebase origin main
```

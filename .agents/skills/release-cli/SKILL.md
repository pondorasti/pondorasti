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

## Step 5: Monitor CI

Watch the release workflow and wait for it to finish before continuing:

```bash
gh run list --workflow Release --limit 1
gh run watch
```

If no run shows up yet, wait a moment and retry until it appears:

```bash
sleep 10
gh run list --workflow Release --limit 1
```

If the workflow fails, inspect logs:

```bash
gh run view --log-failed
```

## Step 6: Smoke Test Published Package

Run a quick smoke test from the registry:

```bash
npx pondorasti@X.Y.Z --help
bun pm view pondorasti version
```

Confirm `bun pm view` returns `X.Y.Z`.

Use `npx` for the install smoke test because `bunx` can intermittently fail to resolve freshly published exact versions even when npm metadata is already updated.

Note: the public package name is `pondorasti` (unscoped), not `@pondorasti/cli`.

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

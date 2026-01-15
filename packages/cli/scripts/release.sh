#!/bin/bash
set -e

cd "$(dirname "$0")/.."

# Run tests before releasing
bun test

# Get current version and bump patch
current=$(jq -r .version package.json)
IFS='.' read -r major minor patch <<< "$current"
new_version="$major.$minor.$((patch + 1))"

# Update package.json
jq ".version = \"$new_version\"" package.json > tmp.json && mv tmp.json package.json

# Commit, tag, and push
cd ../..
git add packages/cli/package.json
git commit -m "chore: bump cli v$new_version"
git tag "v$new_version"
git push && git push --tags

echo "Released v$new_version"

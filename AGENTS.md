# AGENTS

## /zold

- this is an archive of old and unused code
- do not edit this directory (i.e. updating deps) unless when explicitly told so

## Dependencies

- pin exact versions (no `^`/`~`) in the root `workspaces.catalog` and reference them with `"catalog:"`
- exception: `packages/cli` is published to npm, and `npm publish` does not resolve `catalog:`, so its dependencies use plain exact versions

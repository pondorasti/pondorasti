# AGENTS

## /zold

- this is an archive of old and unused code
- do not edit this directory (i.e. updating deps) unless when explicitly told so

## Dependencies

- pin exact versions (no `^`/`~`) in the root `workspaces.catalog` and reference them with `"catalog:"`
- exception: `packages/cli` is published to npm, and `npm publish` does not resolve `catalog:`, so its dependencies use plain exact versions

## Development

- Use Bun 1.4.2 (`packageManager` in the root `package.json`). From the repo root, `bun install --frozen-lockfile`.
- Start the app you are working on with `bun run --cwd apps/<name> dev`. Start one `vp dev` server at a time; starting several together can exit with `EADDRINUSE` on the Node inspector port.
- `packages/cli` `bun run build` signs the binary with macOS `codesign`. On Linux, compile with `bun run --cwd packages/cli build:compile` and test with `bun test --cwd packages/cli`. Root `bun run check` runs every workspace `build`, including that signing step.
- `apps/mcp` reads local secrets from `apps/mcp/.dev.vars`. Copy `.dev.vars.example` and fill it in before `bun run dev` in that app.

# datadive-mcp

MCP server (`@datadive-tools/mcp`) that exposes DataDive niches, keywords,
competitors, and Rank Radar data over stdio. Published to npm. Node >= 22,
ESM only. See `README.md` for end-user setup and usage.

## Commands

- `npm run build` — bundle with tsup to `dist/`
- `npm test` — unit tests (vitest)
- `npm run test:smoke` — live-API smoke test; requires `DATADIVE_SMOKE=1` and a real `DATADIVE_API_KEY`
- `npm run lint` / `npm run typecheck`
- `prepublishOnly` gates publish on lint + typecheck + test + build

## Layout

- `src/index.ts` — entry point / bin
- `src/server.ts` — MCP server setup
- `src/tools/` — one file per MCP tool, registered in `src/tools/index.ts`
- `src/http/client.ts`, `src/http/errors.ts` — API client for `api.datadive.tools`
- `src/config.ts` — env/config handling
- `src/types/api.ts` — API response types
- `test/` — mirrors `src/` structure

## Conventions

- Adding a tool: new file in `src/tools/` + register in `src/tools/index.ts` + matching test in `test/tools/`
- Update `CHANGELOG.md` for user-visible changes
- CI: `.github/workflows/ci.yml`; releases: `.github/workflows/release.yml`
- Validate workflow file edits with `actionlint` — yaml-lint misses Actions expression errors (e.g. `secrets` context in step-level `if:`)

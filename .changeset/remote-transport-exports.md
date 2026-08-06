---
"@datadive-tools/mcp": minor
---

Expose an embeddable library entry for the remote MCP resource server (RS-11347):

- New package export (`@datadive-tools/mcp`) with `buildServer`, `allTools`, `requiredScope`, `loadConfig`, `SCOPE_READ`/`SCOPE_WRITE`, `ApiError`, `PKG_VERSION`, and the `Config`/`Credentials`/`ToolDefinition` types. The stdio bin is unchanged.
- Pluggable credentials: `Config.apiKey` is replaced by `Config.credentials` — `{ kind: "api-key", apiKey }` (local stdio path, unchanged behavior) or `{ kind: "bearer", token }`, which sends `Authorization: Bearer` to `/v1` for the OAuth path.
- Optional OAuth scope gating: when `Config.scopes` is set, read tools require `datadive.read` and the token-spending writes require `datadive.write`; unset (stdio) means no gating.
- Every read tool now carries `readOnlyHint: true` (the two writes already carried `readOnlyHint: false` + `destructiveHint: true`), so MCP clients can allow-read / block-write.

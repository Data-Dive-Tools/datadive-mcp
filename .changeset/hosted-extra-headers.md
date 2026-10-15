---
"@datadive-tools/mcp": minor
---

The hosted MCP server can send extra headers on every DataDive API call (`extraHeaders` in the tool config). It uses this to prove to the API that a call really came through it, so the API can trust the end user's IP it forwards. The credential, `accept`, `content-type` and `user-agent` headers cannot be overridden. The local stdio setup is unchanged.

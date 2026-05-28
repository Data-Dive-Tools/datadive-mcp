---
"@datadive-tools/mcp": minor
---

Warn when a newer version is available. The version reported in the User-Agent (and to the MCP client) is now sourced from `package.json` at build time instead of a hardcoded constant, so it can't drift. On each API response the server reads an `x-datadive-mcp-latest` header advertised by the backend and, if it's running an older release, appends a one-time upgrade nudge to a tool result so the assistant can relay it to the user.

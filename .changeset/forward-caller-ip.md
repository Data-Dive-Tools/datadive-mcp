---
"@datadive-tools/mcp": patch
---

The hosted MCP server can now pass the end user's IP address to the DataDive API (`forwardedFor` in the tool config, sent as `x-forwarded-for`), so API logs and rate limits see the person behind a call instead of the MCP server. The local stdio setup is unchanged.

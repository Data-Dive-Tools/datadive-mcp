---
"@datadive-tools/mcp": patch
---

Require complete read/write annotations on every tool, and add `openWorldHint: false` to the three write tools.

`annotations` is now a required field on `ToolDefinition` / `AnyTool`: read tools must declare `readOnlyHint: true`; write tools must declare `readOnlyHint: false` plus `destructiveHint` and `openWorldHint`. The in-product connector directories review these — Claude's Connectors Directory requires `title` + `readOnlyHint`/`destructiveHint`, and OpenAI's plugin review additionally requires `openWorldHint` on write tools and names missing or wrong hint values as a rejection cause. `create_niche_dive`, `create_rank_radar` and `redive_niche` set `openWorldHint: false`: they change only the caller's own DataDive account, never public internet state.

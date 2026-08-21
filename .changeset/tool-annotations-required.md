---
"@datadive-tools/mcp": patch
---

Make `annotations` required on `ToolDefinition` / `AnyTool`, with `readOnlyHint` mandatory.

All 19 tools already declare `title` + `readOnlyHint` (and `destructiveHint` on the three
write tools), but the type left `annotations` optional, so a new tool could ship without
them. The in-product connector directories (Claude's Connectors Directory, ChatGPT's apps
directory) reject a server whose tools do not declare read-vs-write behaviour, so this is
now a compile-time error rather than a review rejection.

---
"@datadive-tools/mcp": patch
---

`get_rank_radar_data`: return every keyword when no page is asked for (RS-11791).

MCP clients keep the tool list they fetched when they connected. ChatGPT, claude.ai and Claude Code were all seen still offering only `rankRadarId`, `startDate` and `endDate` days after 0.14.0 added `currentPage` / `pageSize`, and MCP has no message that makes a stateless server's clients reload it. Those clients could never ask for page 2, so since the API started paging (RS-11683) they silently got only the first 20 keywords — 16 orgs read truncated Rank Radars this way.

- A call without `currentPage` and `pageSize` now reads every page itself (100 keywords per request, in order) and returns all active keywords in one result, with `lastPage: 1` and `hasNext: false`.
- A call with either input returns exactly one page, as before.
- The walk ends at `lastPage` or on an empty page, so it cannot loop.

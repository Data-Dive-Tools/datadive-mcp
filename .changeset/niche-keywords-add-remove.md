---
"@datadive-tools/mcp": minor
---

Add `add_niche_keywords` and `remove_niche_keywords` (RS-11860).

`POST /v1/niches/{nicheId}/keywords` and `…/keywords/remove` (RS-11858) let API users change a niche's Master Keyword List. The MCP had no tool for them, so an assistant could read the MKL but not add the user's own keywords or undo an add.

- `add_niche_keywords` is free on a fresh niche and adds in one call. On a stale niche the add re-dives the niche for one Dive token per competitor, so the first call saves nothing and returns `confirmation_required` with `tokenCost`; the confirmed call passes it back as `maxTokensUsed`, so it can never cost more than the user approved.
- The unconfirmed call is a real call capped at `maxTokensUsed: 0`, not a dry run plus a real call, so a free add uses one of the route's 2 requests per minute instead of both.
- `remove_niche_keywords` is free and ungated, and returns the API's per-origin breakdown as-is.
- Keywords are lower-cased and trimmed the way the API does, so a case-only duplicate is refused before any call.
- `get_niche_keywords` documents the new `origin` field; `get_dive_status` accepts the re-dive id.

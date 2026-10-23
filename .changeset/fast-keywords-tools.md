---
"@datadive-tools/mcp": minor
---

Add Fast Keywords tools (RS-12020).

The public API can run, refresh and read Fast Keywords (RS-12017, RS-12018). The MCP had no tool for any of it, so an assistant could not find a product's keywords from just its ASIN.

- `run_fast_keywords` and `refresh_fast_keywords` spend 1 Dive token. The first call is a dry run that spends nothing and returns `confirmation_required` with the API's `tokenCost` and `hasEnoughTokens`; the confirmed call runs. A refresh refused with a 409 (cooldown, or a run in progress) fails with a message that says when to try again, or to poll, and nothing is charged.
- `get_fast_keywords` is the poll target and returns the roots and top 10 competitors; `get_fast_keywords_keywords` pages through the keywords; `list_fast_keywords` lists the organization's runs.
- `create_niche_dive` takes an optional `fastKeywordsRequestId` (the `requestId` of a run) to link the dive to a Fast Keywords run (RS-12019).

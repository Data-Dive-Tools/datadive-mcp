---
"@datadive-tools/mcp": minor
---

Add write tools for creating niche dives and rank radars — the server's first non-read-only operations.

- `create_niche_dive` — starts niche research from a seed ASIN (`marketplace`, `asin`, `numberOfCompetitors`). Wraps `POST /v1/niches/dives`; runs asynchronously and returns a `diveId` plus an estimated completion time.
- `get_dive_status` — polls a dive by `diveId`, returning `in_progress`, `success` (with the new `nicheId` and token usage), or `error`. Wraps `GET /v1/niches/dives/{diveId}`.
- `create_rank_radar` — starts tracking keyword rankings for an ASIN in a niche (`asin`, `numberOfKeywords`, `nicheId`). Wraps `POST /v1/niches/rank-radars` and returns a `rankRadarId`.

Both creation tools spend billable tokens irreversibly, so they require an explicit `confirm: true` and are marked with MCP destructive annotations. Set the new `DATADIVE_AUTO_CONFIRM_WRITES` env var truthy to skip the confirmation gate. Adds `httpPost` to the API client.

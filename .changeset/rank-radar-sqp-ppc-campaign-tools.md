---
"@datadive-tools/mcp": minor
---

Add `get_rank_radar_sqp_data`, `get_rank_radar_ppc_data` and `list_ppc_campaigns` (RS-11631).

The public API gained three read endpoints (RS-11628, RS-11629) that the MCP could not reach, so an assistant had no way to answer "how is my advertising doing" or "how do shoppers convert on this keyword".

- `get_rank_radar_sqp_data` → `GET /v1/niches/rank-radars/{id}/sqp`: Amazon Search Query Performance per tracked keyword, market total vs this ASIN family.
- `get_rank_radar_ppc_data` → `GET /v1/niches/rank-radars/{id}/ppc`: Sponsored Products metrics per tracked keyword; `includeCampaigns` adds the per-campaign/ad-group breakdown.
- `list_ppc_campaigns` → `GET /v1/seller_profiles/{sellerId}/marketplaces/{marketplace}/ppc/campaigns`: a seller's campaigns with window totals and per-placement metrics, filterable by `asin` / `parentAsin`, `state` and `search`, sortable by any metric.

The two Rank Radar tools share `get_rank_radar_data`'s inputs (date range up to 90 days, keyword paging up to 100 per page), now defined once in `rank-radar-keyword-query.ts`. `get_rank_radar_data`'s description points to the new tools and explains that a rank of 101 means "not in the top 100". All three are read-only; each call counts toward API usage and is rate limited to about 60 requests/minute, which the descriptions say.

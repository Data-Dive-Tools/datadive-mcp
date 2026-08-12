---
"@datadive-tools/mcp": minor
---

Add `redive_niche` — refresh an existing niche with current Amazon data instead of creating a new one (RS-11198).

- Wraps `POST /v1/niches/{nicheId}/redive`. Two modes: `same_competitors` re-dives the niche's current competitor set, and `discover` finds a fresh set of `numberOfCompetitors` ASINs, steerable with `heroAsin`, `lockedAsins` and `excludedAsins`.
- A token-spending write (`datadive.write`, `destructiveHint: true`), so it goes through the same `confirm: true` gate as `create_niche_dive` / `create_rank_radar`.
- Asynchronous like a new dive: returns a `diveId` and `estimatedCompletionDate` to poll with `get_dive_status`. The niche keeps its `nicheId`, so existing rank radars and reports follow the refreshed data — `get_dive_status` now says so, and covers both entry points.

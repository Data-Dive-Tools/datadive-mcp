---
"@datadive-tools/mcp": minor
---

Add nine tools covering the remaining public `/v1` write endpoints: `add_rank_radar_search_terms`, `archive_rank_radar_search_terms`, `resume_rank_radar_search_terms`, `archive_rank_radar`, `resume_rank_radar`, `delete_rank_radar`, `delete_niche`, `generate_listing_copy` and `get_listing_copy_generation_status`.

The `confirm: true` gate is applied only where an action cannot be undone — the two deletes and `generate_listing_copy`, which spends an AI Copywriter prompt. Archive/resume and add-search-terms are not gated: they move Daily Tracked Keywords capacity, which the backend frees again on pause or archive, and each is undone by its counterpart.

Also adds `httpDelete` to the API client.

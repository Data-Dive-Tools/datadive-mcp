---
"@datadive-tools/mcp": minor
---

Add nine tools covering the remaining public `/v1` write endpoints: `add_rank_radar_search_terms`, `pause_rank_radar_search_terms`, `resume_rank_radar_search_terms`, `pause_rank_radar`, `resume_rank_radar`, `delete_rank_radar`, `delete_niche`, `generate_listing_copy` and `get_listing_copy_generation_status`. The pause tools sit on the API's "archive" endpoints, renamed because archiving there pauses — `status: ARCHIVED` in `list_rank_radars` means deleted.

The `confirm: true` gate is applied only where an action cannot be undone — the two deletes and `generate_listing_copy`, which spends an AI Copywriter prompt. Pause/resume and add-search-terms are not gated: they move Daily Tracked Keywords capacity, which the backend frees again on pause, and each is undone by its counterpart.

Also adds `httpDelete` to the API client.

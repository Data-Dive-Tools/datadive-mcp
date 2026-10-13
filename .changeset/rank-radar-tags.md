---
"@datadive-tools/mcp": minor
---

Add Rank Radar tag management (RS-11822).

Six new tools cover the full tag lifecycle on a Rank Radar:

- `list_rank_radar_tags` — enumerate tags on a Rank Radar.
- `create_rank_radar_tag` — create a tag, optionally attaching up to 1000 keywords in the same call.
- `update_rank_radar_tag` — partial update of title, colour, description, or `startAt`/`endAt` window.
- `delete_rank_radar_tag` — remove a tag (confirm-gated, since deletion is irreversible).
- `add_rank_radar_tag_search_terms` / `remove_rank_radar_tag_search_terms` — attach or detach up to 1000 keyword ids per call, idempotent.

The `highlights` field on each keyword in `get_rank_radar_data` is now typed as `KrtHighlight` — the same shape `list_rank_radar_tags` returns — so a caller can jump from a ranking view to editing its tags without a round trip. Title clashes answer 409 `{ error: 'TAG_TITLE_EXISTS', existingTagId }` so callers can reuse the existing tag instead of retrying. The reserved colour `#EB5757` (the system "paused" tag) is rejected with 400 on create and update.

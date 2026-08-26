---
"@datadive-tools/mcp": patch
---

State retry-unsafety in the three write tools' descriptions (RS-11519): `create_niche_dive`, `redive_niche` and `create_rank_radar` now say each call spends tokens again and creates a separate dive / re-dive / Rank Radar, and point at `get_dive_status` / `list_niches` / `list_rank_radars` to check what already exists instead of re-calling. Documentation only — the `confirm: true` gate and all behavior are unchanged.

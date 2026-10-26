---
"@datadive-tools/mcp": minor
---

Add Space and label tools, and filters by them (RS-12030).

The public API can now read Spaces and labels, put a niche in them and filter by them (RS-12028, RS-12029). The MCP had no tool for any of it, so an assistant could not keep one end user's niches apart from another's.

- `list_spaces` and `list_labels` return the trees. A connected member sees only the Spaces they have rights on.
- `add_niche_spaces`, `remove_niche_spaces`, `add_niche_labels` and `remove_niche_labels` take 1–100 ids per call. They are free and have no confirm gate. They are for the organization owner or a team admin; anyone else is refused with the API's `INSUFFICIENT_ROLE` message. One unknown id, or a Space the member only has view rights on, fails the whole call and nothing changes.
- `list_niches` and `list_rank_radars` accept `spaces` and `labels` (OR inside one list, AND between them and with the other filters); Rank Radars match through their niche. Each niche in `list_niches` now carries the ids of its `spaces` and `labels`.

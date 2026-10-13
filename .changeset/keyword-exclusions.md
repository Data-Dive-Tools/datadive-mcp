---
"@datadive-tools/mcp": minor
---

Add `list_keyword_exclusions`, `add_keyword_exclusions` and `remove_keyword_exclusions` (RS-11864).

`/v1/niches/{nicheId}/keyword-exclusions` (RS-11863) lets API users read and change the keywords a niche hides from its Master Keyword List. The MCP had no tool for it, so an assistant could not explain a missing keyword or hide irrelevant ones.

- Exact and phrase entries, 1–100 in total per call. The total spans both optional lists, so it is checked before the request; per-entry rules (lower-cased, trimmed, ≤255 characters, unique) are in the schema.
- No confirm gate: exclusions spend nothing, and each tool is undone by the other. Responses are passed through, with `unchanged` making repeats safe.
- `add_niche_keywords`, `remove_niche_keywords` and `get_niche_keywords` now point at the exclusion tools where a keyword is hidden rather than missing.

---
"@datadive-tools/mcp": minor
---

Catch up with public API changes the MCP did not describe yet.

- Add `get_niche_outlier_keywords` and `get_niche_residue_keywords`, which page through a niche's Outliers and Residue lists (RS-11150). Other tools already pointed users at those lists, but nothing could read them.
- `get_niche_keywords` returns each keyword's exact-match `suggestedBid`, which the API has sent since RS-11150; the description and types now include it.
- `get_seller_catalog`: `status: "all"` never includes deleted listings, and only listings Amazon reported in the last 30 days are returned (RS-11796).
- `redive_niche`: `excludedAsins` are saved on the niche and apply to every later dive, and ASINs already excluded on the niche are always skipped unless locked (RS-11872).
- A 429 now tells the assistant to wait up to a minute and not to loop over one niche: keyword, competitor and ranking juice reads allow 60 calls a minute per niche (RS-12035).
- `KrtKeyword` no longer declares `adData` / `sqpData`; the API stopped sending them on the keyword rankings endpoint.

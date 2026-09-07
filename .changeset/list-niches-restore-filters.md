---
"@datadive-tools/mcp": minor
---

`list_niches`: restore the search and ordering inputs, drop the paging warning (RS-11517).

`GET /v1/niches` now reads the filters and applies paging, so the inputs withdrawn on 2026-08-28 are back and the temporary limitation notice is gone.

- `searchText` (niche label / hero keyword), `searchAsin` (niches whose competitor set contains the ASIN), `orderBy` (`lastDived` | `name`) and `sortOrder` (`ASC` | `DESC`) are forwarded again. Prefer them over paging through the whole account.
- `currentPage` / `pageSize` now return real pages: walk `currentPage` while `hasNext` is true.

Additive for callers — the tool name and the response shape never changed.

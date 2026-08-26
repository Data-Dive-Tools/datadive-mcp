---
"@datadive-tools/mcp": minor
---

`list_niches`: truthful pagination and new filters (RS-11517).

- `pageSize` is now capped at 50, the API's real maximum. The schema used to advertise 100, which the API silently clamped; combined with a server bug that ignored paging altogether, the tool looked like it returned everything. It never did by contract — walk `currentPage` while `hasNext` is true.
- New `searchText` (label / hero keyword), `searchAsin` (niches whose competitor set contains the ASIN), `orderBy` (`lastDived` | `name`) and `sortOrder` (`ASC` | `DESC`) inputs, forwarded to `GET /v1/niches`. Prefer them over paging through the whole account.

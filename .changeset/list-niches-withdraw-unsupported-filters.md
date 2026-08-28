---
"@datadive-tools/mcp": minor
---

`list_niches`: withdraw the search and ordering inputs, state the paging limitation (RS-11517).

- Removed `searchText`, `searchAsin`, `orderBy` and `sortOrder`. `GET /v1/niches` binds only `currentPage` and `pageSize` and drops unknown query params silently, so these four filtered nothing while the tool told the model they did.
- The description now says that the API does not apply paging yet: one call returns every niche of the account whatever `currentPage`/`pageSize` say, the pagination metadata describes a page that was not applied, and walking pages only repeats the same rows. Read `data` once and filter locally.
- Verified against prod on 2026-08-28 on an org with 907 niches: `pageSize: 2` returned all 907 rows; page 2 was byte-identical to page 1; `searchText: "dog hat"` was byte-identical again, though only 80 rows contain that text.

Both the filters and normal paging come back once the API fix ships (planned 2026-09-07). No change to the tool name or the response shape.

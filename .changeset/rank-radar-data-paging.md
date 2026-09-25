---
"@datadive-tools/mcp": minor
---

`get_rank_radar_data`: page through a Rank Radar's keywords (RS-11631).

Since RS-11683 the API returns `GET /v1/niches/rank-radars/{id}` one page of keywords at a time (20 by default, 100 at most) inside the standard paging envelope. The tool had no way to ask for a page, so an assistant only ever saw the first 20 keywords of a Rank Radar and could not reach the rest.

- New `currentPage` and `pageSize` inputs. `pageSize` is capped at 100 in the schema: the API does not reject a larger value, it silently falls back to 20.
- The description now tells the model the result is paged, to walk `currentPage` while `hasNext` is true, and that the date range is at most 90 days.
- `RankRadarKeywordList` is now `PaginationResponse<KrtKeyword>`; `KrtKeyword` gains `relevancy` and the still-sent `adData` / `sqpData` (due for removal in RS-11744), and ranks gain `sponsoredRank`.

The response shape itself changed on the API side, not here: this release only lets callers ask for the other pages.

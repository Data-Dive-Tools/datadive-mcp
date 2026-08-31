---
"@datadive-tools/mcp": minor
---

`list_rank_radars`: correct the status enum, cap `pageSize`, and stop leaking `krt_asin` internals (RS-11518).

- `status` now offers the values the API actually honors: `ACTIVE`, `PAUSED`, `ARCHIVED` and `ALL`. The three advertised before were partly fiction — the API accepted only `ALL`/`PAUSED` and answered anything else with the active set and no error, so `status: "ARCHIVED"` returned every active Rank Radar. The paired API fix (RS-11518) makes each value select what it names and rejects an unknown one with 400.
- `pageSize` is capped at 50, the API's real maximum. The schema claimed 100, which the API silently replaced with the default 20.
- Each item's `asin` is now the ASIN string instead of a `krt_asin` row. The row carried `id`, `krtId` (a copy of the item's own `id`), `parent_asin`, `image_url`, `variation_attributes`, `created_at`, `updated_at` and `deleted_at` — internal identifiers and logging timestamps that no tool accepts as input.
- Each item now carries `status` in the same vocabulary the filter accepts. It used to be the internal `"normal"`, which matched no input value.
- The description no longer names fields that are not returned.

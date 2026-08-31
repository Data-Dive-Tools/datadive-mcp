# @datadive-tools/mcp

## 0.11.0

### Minor Changes

- ff085cb: Document the fields `get_niche_competitors` now returns. The `/v1/niches/{nicheId}/competitors` endpoint gained `title` and `bsr` (previously stripped from the response, so unavailable through any v1 endpoint), and its `category`, `categoryTree` and `advertisedKwsEvaluation` fields are now part of the published contract instead of undeclared extras.
  - The tool description names product title, BSR, category and category tree, so the model knows they are available. BSR supports ranking Competitors by sales position within mentioned category.
  - `Competitor` is now a real type in `src/types/api.ts` rather than an opaque `Record<string, unknown>`. It keeps an index signature, so the remaining keyword and ads diagnostics stay visible to the model.
  - `listingRankingJuice` on a Competitor keeps its `{ value }` object but no longer carries the `contribution` breakdown, so existing `listingRankingJuice.value` reads keep working. `get_ranking_juice` remains the tool for the per-property breakdown.

  No tool inputs changed and no tool was added or removed.

- f7280cd: `list_niches`: withdraw the search and ordering inputs, state the paging limitation (RS-11517).
  - Removed `searchText`, `searchAsin`, `orderBy` and `sortOrder`. `GET /v1/niches` binds only `currentPage` and `pageSize` and drops unknown query params silently, so these four filtered nothing while the tool told the model they did.
  - The description now says that the API does not apply paging yet: one call returns every niche of the account whatever `currentPage`/`pageSize` say, the pagination metadata describes a page that was not applied, and walking pages only repeats the same rows. Read `data` once and filter locally.
  - Verified against prod on 2026-08-28 on an org with 907 niches: `pageSize: 2` returned all 907 rows; page 2 was byte-identical to page 1; `searchText: "dog hat"` was byte-identical again, though only 80 rows contain that text.

  Both the filters and normal paging come back once the API fix ships (planned 2026-09-07). No change to the tool name or the response shape.

- db1f633: Add nine tools covering the remaining public `/v1` write endpoints: `add_rank_radar_search_terms`, `pause_rank_radar_search_terms`, `resume_rank_radar_search_terms`, `pause_rank_radar`, `resume_rank_radar`, `delete_rank_radar`, `delete_niche`, `generate_listing_copy` and `get_listing_copy_generation_status`. The pause tools sit on the API's "archive" endpoints, renamed because archiving there pauses — `status: ARCHIVED` in `list_rank_radars` means deleted.

  The `confirm: true` gate is applied only where an action cannot be undone — the two deletes and `generate_listing_copy`, which spends an AI Copywriter prompt. Pause/resume and add-search-terms are not gated: they move Daily Tracked Keywords capacity, which the backend frees again on pause, and each is undone by its counterpart.

  Also adds `httpDelete` to the API client.

- 69561d2: `list_rank_radars`: correct the status enum, cap `pageSize`, and stop leaking `krt_asin` internals (RS-11518).
  - `status` now offers the values the API actually honors: `ACTIVE`, `PAUSED`, `ARCHIVED` and `ALL`. The three advertised before were partly fiction — the API accepted only `ALL`/`PAUSED` and answered anything else with the active set and no error, so `status: "ARCHIVED"` returned every active Rank Radar. The paired API fix (RS-11518) makes each value select what it names and rejects an unknown one with 400.
  - `pageSize` is capped at 50, the API's real maximum. The schema claimed 100, which the API silently replaced with the default 20.
  - Each item's `asin` is now the ASIN string instead of a `krt_asin` row. The row carried `id`, `krtId` (a copy of the item's own `id`), `parent_asin`, `image_url`, `variation_attributes`, `created_at`, `updated_at` and `deleted_at` — internal identifiers and logging timestamps that no tool accepts as input.
  - Each item now carries `status` in the same vocabulary the filter accepts. It used to be the internal `"normal"`, which matched no input value.
  - The description no longer names fields that are not returned.

### Patch Changes

- f2176ce: Require complete read/write annotations on every tool, and add `openWorldHint: false` to the three write tools.

  `annotations` is now a required field on `ToolDefinition` / `AnyTool`: read tools must declare `readOnlyHint: true`; write tools must declare `readOnlyHint: false` plus `destructiveHint` and `openWorldHint`. The in-product connector directories review these — Claude's Connectors Directory requires `title` + `readOnlyHint`/`destructiveHint`, and OpenAI's plugin review additionally requires `openWorldHint` on write tools and names missing or wrong hint values as a rejection cause. `create_niche_dive`, `create_rank_radar` and `redive_niche` set `openWorldHint: false`: they change only the caller's own DataDive account, never public internet state.

## 0.10.0

### Minor Changes

- dc32086: `list_niches`: truthful pagination and new filters (RS-11517).
  - `pageSize` is now capped at 50, the API's real maximum. The schema used to advertise 100, which the API silently clamped; combined with a server bug that ignored paging altogether, the tool looked like it returned everything. It never did by contract — walk `currentPage` while `hasNext` is true.
  - New `searchText` (label / hero keyword), `searchAsin` (niches whose competitor set contains the ASIN), `orderBy` (`lastDived` | `name`) and `sortOrder` (`ASC` | `DESC`) inputs, forwarded to `GET /v1/niches`. Prefer them over paging through the whole account.

### Patch Changes

- b0e66e2: State retry-unsafety in the three write tools' descriptions (RS-11519): `create_niche_dive`, `redive_niche` and `create_rank_radar` now say each call spends tokens again and creates a separate dive / re-dive / Rank Radar, and point at `get_dive_status` / `list_niches` / `list_rank_radars` to check what already exists instead of re-calling. Documentation only — the `confirm: true` gate and all behavior are unchanged.

## 0.9.0

### Minor Changes

- b51ffe2: Add `redive_niche` — refresh an existing niche with current Amazon data instead of creating a new one (RS-11198).
  - Wraps `POST /v1/niches/{nicheId}/redive`. Two modes: `same_competitors` re-dives the niche's current competitor set, and `discover` finds a fresh set of `numberOfCompetitors` ASINs, steerable with `heroAsin`, `lockedAsins` and `excludedAsins`.
  - A token-spending write (`datadive.write`, `destructiveHint: true`), so it goes through the same `confirm: true` gate as `create_niche_dive` / `create_rank_radar`.
  - Asynchronous like a new dive: returns a `diveId` and `estimatedCompletionDate` to poll with `get_dive_status`. The niche keeps its `nicheId`, so existing rank radars and reports follow the refreshed data — `get_dive_status` now says so, and covers both entry points.

## 0.8.0

### Minor Changes

- 5101b1c: Expose an embeddable library entry for the remote MCP resource server (RS-11347):
  - New package export (`@datadive-tools/mcp`) with `buildServer`, `allTools`, `requiredScope`, `loadConfig`, `SCOPE_READ`/`SCOPE_WRITE`, `ApiError`, `PKG_VERSION`, and the `Config`/`Credentials`/`ToolDefinition` types. The stdio bin is unchanged.
  - Pluggable credentials: `Config.apiKey` is replaced by `Config.credentials` — `{ kind: "api-key", apiKey }` (local stdio path, unchanged behavior) or `{ kind: "bearer", token }`, which sends `Authorization: Bearer` to `/v1` for the OAuth path.
  - Optional OAuth scope gating: when `Config.scopes` is set, read tools require `datadive.read` and the token-spending writes require `datadive.write`; unset (stdio) means no gating.
  - Every read tool now carries `readOnlyHint: true` (the two writes already carried `readOnlyHint: false` + `destructiveHint: true`), so MCP clients can allow-read / block-write.

## 0.7.0

### Minor Changes

- af066ab: Add three read-only seller-profile tools:
  - `list_seller_profiles` — paginated list of connected Amazon seller accounts (`sellerId`, `sellerName`, `marketplace`, `hasAdApi`, `createdAt`). This is the discovery step that yields the `sellerId` + `marketplace` the seller-scoped tools (and the alert tools) require. Wraps `GET /v1/seller_profiles`.
  - `get_seller_catalog` — paginated catalog of a seller's own ASINs, filterable by `search`, `brand`, and `status` (Active by default). Wraps `GET /v1/seller_profiles/{sellerId}/marketplaces/{marketplace}/catalog`.
  - `get_seller_listing_changes` — paginated price/content/image changes on a seller's listings, filterable by `types`, `asin`, `brand`, `search`, and a `startDate`/`endDate` range with `sortBy`/`sortOrder`; pass `includeCorrelations: true` to attach per-change ranking/conversion impact. Wraps `GET /v1/seller_profiles/{sellerId}/marketplaces/{marketplace}/listing-changes`.

  Also updates `get_asin_inventory_distribution` to point users at `list_seller_profiles` for discovering their `sellerId` (previously it noted no such tool existed).

## 0.6.0

### Minor Changes

- 7f887f9: Add write tools for creating niche dives and rank radars — the server's first non-read-only operations.
  - `create_niche_dive` — starts niche research from a seed ASIN (`marketplace`, `asin`, `numberOfCompetitors`). Wraps `POST /v1/niches/dives`; runs asynchronously and returns a `diveId` plus an estimated completion time.
  - `get_dive_status` — polls a dive by `diveId`, returning `in_progress`, `success` (with the new `nicheId` and token usage), or `error`. Wraps `GET /v1/niches/dives/{diveId}`.
  - `create_rank_radar` — starts tracking keyword rankings for an ASIN in a niche (`asin`, `numberOfKeywords`, `nicheId`). Wraps `POST /v1/niches/rank-radars` and returns a `rankRadarId`.

  Both creation tools spend billable tokens irreversibly, so they require an explicit `confirm: true` and are marked with MCP destructive annotations. Set the new `DATADIVE_AUTO_CONFIRM_WRITES` env var truthy to skip the confirmation gate. Adds `httpPost` to the API client.

## 0.5.0

### Minor Changes

- d8caf5f: Add three read-only tools: `get_niche_roots` (keyword lexical roots for a niche — high-impact words with frequency and broad search volume), `get_quota` (current usage/capacity per billable feature plus next refresh date), and `list_usage` (paginated billable usage logs, filterable by `type`, `search`, and `startDate`/`endDate`). Wraps `GET /v1/niches/{nicheId}/roots`, `GET /v1/quota`, and `GET /v1/usage`.

## 0.4.0

### Minor Changes

- 3c3d43f: Add `list_indexing_issue_alerts` and `list_blind_spend_alerts` tools — paginated, read-only access to the new `/v1/alerts/indexing-issues` and `/v1/alerts/blind-spend` endpoints, with `sellerId`/`marketplace`/`status`/`updatedSince` filters.

## 0.3.0

### Minor Changes

- 11762fd: Warn when a newer version is available. The version reported in the User-Agent (and to the MCP client) is now sourced from `package.json` at build time instead of a hardcoded constant, so it can't drift. On each API response the server reads an `x-datadive-mcp-latest` header advertised by the backend and, if it's running an older release, appends a one-time upgrade nudge to a tool result so the assistant can relay it to the user.

## 0.2.0

### Minor Changes

- baf0cc9: Add `get_asin_inventory_distribution` tool — returns per-fulfillment-center sellable inventory for a given ASIN. Wraps `GET /v1/sellers/{sellerId}/marketplaces/{marketplace}/asins/{asin}/inventory` and returns `totalSellableUnits` plus a per-FC `distribution` array.
- baf0cc9: Drop support for Node.js <22. `engines.node` is now `>=22`, aligning with the actively supported LTS line. CI also bumped to Node 24.

### Patch Changes

- ff86f98: Fix incorrect API key portal URL in error messages and config docs (was `app.datadive.tools`, should be `2.datadive.tools`).

## 0.1.0

Initial release. MVP MCP server that wraps the existing DataDive `/v1/*` external
API as 6 read-only tools usable from Claude Desktop, Claude Code, and Cursor.

### Tools

- `list_niches` — list user's niches (paginated)
- `get_niche_keywords` — master keyword list for a niche
- `get_niche_competitors` — competitor ASINs and niche statistics
- `get_ranking_juice` — DataDive proprietary ranking-juice metric per competitor
- `list_rank_radars` — list of keyword rank trackers (paginated, filterable)
- `get_rank_radar_data` — historical keyword rankings for a rank radar (date-range)

### Auth

Requires a DataDive API key. Generate one at https://2.datadive.tools/api-key
(billing-manager role required, Standard plan or higher).

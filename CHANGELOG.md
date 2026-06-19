# @datadive-tools/mcp

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

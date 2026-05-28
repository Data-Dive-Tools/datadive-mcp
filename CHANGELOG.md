# @datadive-tools/mcp

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

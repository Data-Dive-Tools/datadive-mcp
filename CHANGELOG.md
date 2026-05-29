# @datadive-tools/mcp

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

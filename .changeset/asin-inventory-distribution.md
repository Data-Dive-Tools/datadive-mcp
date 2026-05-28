---
"@datadive-tools/mcp": minor
---

Add `get_asin_inventory_distribution` tool — returns per-fulfillment-center sellable inventory for a given ASIN. Wraps `GET /v1/sellers/{sellerId}/marketplaces/{marketplace}/asins/{asin}/inventory` and returns `totalSellableUnits` plus a per-FC `distribution` array.

---
"@datadive-tools/mcp": minor
---

Add three read-only seller-profile tools:

- `list_seller_profiles` — paginated list of connected Amazon seller accounts (`sellerId`, `sellerName`, `marketplace`, `hasAdApi`, `createdAt`). This is the discovery step that yields the `sellerId` + `marketplace` the seller-scoped tools (and the alert tools) require. Wraps `GET /v1/seller_profiles`.
- `get_seller_catalog` — paginated catalog of a seller's own ASINs, filterable by `search`, `brand`, and `status` (Active by default). Wraps `GET /v1/seller_profiles/{sellerId}/marketplaces/{marketplace}/catalog`.
- `get_seller_listing_changes` — paginated price/content/image changes on a seller's listings, filterable by `types`, `asin`, `brand`, `search`, and a `startDate`/`endDate` range with `sortBy`/`sortOrder`; pass `includeCorrelations: true` to attach per-change ranking/conversion impact. Wraps `GET /v1/seller_profiles/{sellerId}/marketplaces/{marketplace}/listing-changes`.

Also updates `get_asin_inventory_distribution` to point users at `list_seller_profiles` for discovering their `sellerId` (previously it noted no such tool existed).

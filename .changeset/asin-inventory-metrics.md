---
"@datadive-tools/mcp": minor
---

`get_asin_inventory_distribution` returns the ASIN's inventory metrics (RS-11919).

`GET /v1/sellers/{sellerId}/marketplaces/{marketplace}/asins/{asin}/inventory` (RS-11919) now returns the per-ASIN metrics the DataDive Inventory page shows, next to the per-fulfillment-center distribution. The tool passes them through; its title and description now say so, so an assistant reaches for it on stock, days-of-stock, LILF, LTSF and aged-inventory questions.

- New fields: `fulfillableStock`, `totalStock`, `reservedStock`, `inboundStock`, `researchingStock`, `unfulfillableStock`, `daysOfStock` + `daysOfStockSource`, `daysOfStock30`, `daysOfStock90`, `inLowInventoryState`, `estWeeklyLilf`, `estLtsfNextAssessment`, `ltsfLastMonthActual`, `agedUnits`, `oldestUnitAgeDays`, and `currency` for the fees.
- A metric is `null`, never `0`, when Amazon has no data. Metrics the plan does not include are `null` and listed in `lockedFields`, with `lockedReason`.
- **Changed meaning:** `lastUpdatedAt` now dates the live stock the metrics come from. The distribution date it used to carry is the new `distributionLastUpdatedAt`, usually up to 2 days behind.
- The tool keeps its name so existing agents and saved prompts keep working.

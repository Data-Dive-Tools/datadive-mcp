---
"@datadive-tools/mcp": minor
---

Add `create_niche_dive_from_competitors` (RS-11631).

`POST /v1/niches/dive_with_competitors` (RS-11148) builds a niche from an explicit list of 2–200 competitor ASINs, with no automatic competitor discovery — the API side of the extension's "ASIN tray → Create Niche" flow. The MCP had no tool for it, so an assistant could only research a niche by discovering competitors around one seed ASIN.

- Confirm-gated like `create_niche_dive`: spends dive tokens per ASIN, and the confirmation note states how many ASINs are being paid for.
- ASINs are trimmed and upper-cased as the API does, and a list with the same ASIN twice is refused before any call.
- The description says which failures cost nothing (plan ASIN limit, niche limit, no product data for enough ASINs) and that the returned `diveId` is polled with `get_dive_status`, whose description now names the new tool.
- New "what's new" entry for 0.16.0.

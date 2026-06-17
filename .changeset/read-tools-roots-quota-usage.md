---
"@datadive-tools/mcp": minor
---

Add three read-only tools: `get_niche_roots` (keyword lexical roots for a niche — high-impact words with frequency and broad search volume), `get_quota` (current usage/capacity per billable feature plus next refresh date), and `list_usage` (paginated billable usage logs, filterable by `type`, `search`, and `startDate`/`endDate`). Wraps `GET /v1/niches/{nicheId}/roots`, `GET /v1/quota`, and `GET /v1/usage`.

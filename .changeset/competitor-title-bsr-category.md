---
"@datadive-tools/mcp": minor
---

Document the fields `get_niche_competitors` now returns. The `/v1/niches/{nicheId}/competitors` endpoint gained `title` and `bsr` (previously stripped from the response, so unavailable through any v1 endpoint), and its `category`, `categoryTree` and `advertisedKwsEvaluation` fields are now part of the published contract instead of undeclared extras.

- The tool description names product title, BSR, category and category tree, so the model knows they are available. BSR supports ranking Competitors by sales position within mentioned category.
- `Competitor` is now a real type in `src/types/api.ts` rather than an opaque `Record<string, unknown>`. It keeps an index signature, so the remaining keyword and ads diagnostics stay visible to the model.
- `listingRankingJuice` on a Competitor is now the total score as a plain number. It previously carried the whole internal breakdown object. `get_ranking_juice` remains the tool for the per-property breakdown.

No tool inputs changed and no tool was added or removed.

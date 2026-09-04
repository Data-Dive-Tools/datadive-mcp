---
"@datadive-tools/mcp": patch
---

Turn the backend's structured `QUOTA_EXCEEDED` responses into an actionable tool error (RS-11430).

When a token-spending call is blocked by quota, `api.datadive.tools` now answers with `error: "QUOTA_EXCEEDED"` plus the exhausted feature, usage, next refresh date and a `subscriptionUrl`. `ApiError.fromHttp` recognises that body ahead of the generic 400/403 mappings and produces a deterministic message that names the feature (e.g. "Rank Radar tracked keywords (5000 of 5000 used)"), points at the subscription overview page, and tells the model not to retry — instead of the previous `Bad request: Quota exceeded`, which left the model guessing what ran out and where to send the user.

New `ApiErrorKind` value `"quota"`; `isQuotaExceededBody` and `quotaExceededMessage` are exported for hosts that render their own errors. Legacy flat `{ message: "Quota exceeded" }` bodies from older backends still map to `bad_request` unchanged.

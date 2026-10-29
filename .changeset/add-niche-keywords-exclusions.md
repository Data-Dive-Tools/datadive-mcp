---
"@datadive-tools/mcp": patch
---

`add_niche_keywords` describes how keyword exclusions are now handled (RS-12026).

The API has changed how an add treats excluded keywords (backend v9.506.0). A keyword that matches an exact exclusion is now added and the exclusion is removed, where before it was reported as added but stayed hidden. A keyword that matches a phrase exclusion is no longer saved or charged. `originBreakdown` has two new fields that report these cases: `takenFromExcluded`, whose keywords also appear in the group they landed in, and `blockedByPhraseExclusion`, which gives each `keyword` with its `matchedPhrase`. The tool description no longer says that excluded keywords stay hidden. It now explains both fields, and tells the assistant to ask the user before removing a phrase exclusion so a blocked keyword can be added.

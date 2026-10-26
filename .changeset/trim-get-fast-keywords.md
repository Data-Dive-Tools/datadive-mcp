---
"@datadive-tools/mcp": patch
---

`get_fast_keywords` no longer returns every keyword of every root (RS-12020).

For a busy product the API lists hundreds of roots and thousands of keywords, about 240 KB, which is more than an assistant can read and tripped client output limits on the tool that is polled. It now returns the top 25 roots by search volume with up to 10 keywords each, plus `totalRoots` and a per-root `keywordCount`, and a `note` pointing at `get_fast_keywords_keywords` when anything was cut. The API is unchanged.

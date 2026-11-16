---
"@datadive-tools/mcp": minor
---

`get_seller_listing_changes` returns Item Highlights changes (RS-12306).

The public API now records and returns changes to a listing's Item Highlights (RS-12280), the line Amazon shows under the 75-character title. They come back as Content changes with `contentType: "Highlights"`, with the old and new text in `previousValue` and `newValue`. History starts when RS-12280 ships; earlier edits cannot be recovered. The tool description, README and `whats_new` say so, so an assistant knows a shorter title can mean words moved into the highlights.

---
"@datadive-tools/mcp": patch
---

The niche Space and label write tools now describe the same rights as the web app (RS-12151).

The API no longer limits `add_niche_spaces`, `remove_niche_spaces`, `add_niche_labels` and `remove_niche_labels` to the organization owner or a team admin: a member with Manage access to the niche can change its labels, and its Spaces where they can manage the Space. The tool descriptions, README and what's new now say so, and no longer mention `INSUFFICIENT_ROLE`.

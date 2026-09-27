---
"@datadive-tools/mcp": minor
---

Tell assistants and users what is new (RS-11631).

MCP has no "new version is out" message, and `tools/list_changed` never reaches users of the stateless hosted server, so new tools went unnoticed. Two protocol features now carry the news, both built from one hand-kept list in `src/whats-new.ts`:

- **Server instructions** (`initialize` result): a short overview of the tool set plus the last two releases' additions, so the assistant can mention a new tool once when it fits.
- **`whats_new` prompt**: the full recent list, picked by the user (e.g. `/mcp__datadive__whats_new` in Claude Code), asking the assistant for a short summary with an example question per addition.

`buildServer` registers both. `SERVER_INSTRUCTIONS`, `WHATS_NEW`, `WHATS_NEW_PROMPT` and `whatsNewPromptText` are exported so the hosted server registers the same text.

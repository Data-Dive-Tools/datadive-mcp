# @datadive-tools/mcp

An [MCP](https://modelcontextprotocol.io) server that lets Claude (or any
MCP-compatible client) query your DataDive niches, keywords, competitors, and
Rank Radar data using your existing API key.

Runs locally on your machine over stdio. Your API key never leaves your machine
except as the `x-api-key` header on requests to `api.datadive.tools`.

## What you can ask

- "List my DataDive niches in marketplace `com`."
- "What's the master keyword list for niche `z515cGOFg3`?"
- "Who are the top competitors in niche X and what are their sales?"
- "What's my ranking juice for niche X — where can I improve?"
- "Show me my rank radars."
- "Plot the organic ranking trend for rank radar Y from 2024-03-01 to 2024-04-01."

## 1. Get a DataDive API key

1. Sign in at [https://2.datadive.tools](https://2.datadive.tools/sign-in).
2. Go to **Settings → API Key** (`/api-key`).
3. Click **Generate API Key**. Copy the value — you'll paste it into your MCP
   client config below.

> Requires the **Billing Manager** or **Owner** role and the **Standard plan
> or higher**. Contact your org admin if you can't see the page.

## 2. Add it to your MCP client

### Claude Desktop

Edit your config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add the `datadive` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "datadive": {
      "command": "npx",
      "args": ["-y", "@datadive-tools/mcp"],
      "env": {
        "DATADIVE_API_KEY": "ddk_live_..."
      }
    }
  }
}
```

Restart Claude Desktop. You should see `datadive` in the tools menu.

### Claude Code

```sh
claude mcp add datadive -- npx -y @datadive-tools/mcp
# Then add the env var via:
#   claude mcp add datadive --env DATADIVE_API_KEY=ddk_live_... -- npx -y @datadive-tools/mcp
```

Or edit `.mcp.json` in your project / `~/.claude/mcp.json` globally with the
same JSON shape as above.

### Cursor

**Settings → MCP → Add new MCP server** and paste the same JSON shape:

```json
{
  "datadive": {
    "command": "npx",
    "args": ["-y", "@datadive-tools/mcp"],
    "env": { "DATADIVE_API_KEY": "ddk_live_..." }
  }
}
```

## 3. Verify

Ask Claude: **"List my DataDive niches."**

You should see a tool call to `list_niches` and a JSON response with your
niches, plus pagination metadata. If you don't, see Troubleshooting below.

## Available tools

| Tool | Description |
|---|---|
| `list_niches` | Paginated list of your niches. Discovery step — returns `nicheId`s for the next four tools. |
| `get_niche_keywords` | Master keyword list for a niche: search volume, relevancy, competitor ASIN ranks. |
| `get_niche_competitors` | Competitor ASINs and niche statistics (sales, revenue, ratings, opportunity score). |
| `get_ranking_juice` | DataDive proprietary ranking-juice metric per competitor (current vs optimized listing). |
| `list_rank_radars` | Paginated list of rank radars. Filter by `nicheId` or `status`. |
| `get_rank_radar_data` | Historical keyword rankings for a rank radar within a `startDate`/`endDate` range. |
| `get_asin_inventory_distribution` | Per-fulfillment-center sellable inventory for an ASIN. Requires `sellerId` from your Connections page. |
| `list_indexing_issue_alerts` | Paginated list of indexing-issue alerts — ASINs no longer indexed for their tracked keywords. Filter by `sellerId`, `marketplace`, `status`, or `updatedSince`. |
| `list_blind_spend_alerts` | Paginated list of blind-spend alerts — ad spend on search terms with little or no sales, with per-term spend/clicks/CVR. Same filters as above. |

Read-only. All data is scoped to the organization that owns the API key.

> **Coming in v1.1:** keyword roots, async niche dives with polling, rank-radar
> creation, AI copywriter. We'll prioritize based on usage signal — if you
> have a request, open an issue.

## Configuration

| Env var | Required | Default | Notes |
|---|---|---|---|
| `DATADIVE_API_KEY` | yes | — | Generate at https://2.datadive.tools/api-key |
| `DATADIVE_API_BASE_URL` | no | `https://api.datadive.tools` | Override for staging |

## Troubleshooting

If a tool call returns an error message, it'll be one of these — each maps to a
specific HTTP status from the DataDive API.

| Message starts with… | What to do |
|---|---|
| **Authentication failed: your DATADIVE_API_KEY is invalid or expired** | The key is wrong, deleted, or expired. Generate a new one at https://2.datadive.tools/api-key. |
| **Subscription is inactive or paused** | Resume billing at https://2.datadive.tools — the API key is valid but the subscription isn't active. |
| **Forbidden** | The key is valid but doesn't have access to that resource. Usually a niche/rank-radar that belongs to a different org. |
| **Rate limit exceeded** | Wait a few seconds and retry. |
| **Bad request** | Check the parameters — the message echoes the server's validation error (e.g., `pageSize must not exceed 100`). |
| **DataDive API error (5xx)** | Transient backend issue. Try again; if it persists, contact support. |
| **Network error reaching …** | Your machine can't reach `api.datadive.tools` — check VPN / firewall / DNS. |

If the server itself fails to start, look in your MCP client's log output:

- **`DATADIVE_API_KEY environment variable is required`** — the env var isn't
  being passed through to the binary. Confirm your client config has it under
  `env` (not `args`), and that you've restarted the client after editing.

## Privacy

- The MCP server runs locally on your machine. It is a thin shim — every tool
  call becomes a single HTTPS request from your machine to
  `api.datadive.tools` with your API key as the `x-api-key` header.
- Your API key is stored only in your MCP client's config file (which you
  control). It is never sent anywhere else.
- The server logs nothing on its own. Standard backend access logs at DataDive
  record per-request metadata (organization, route, status, latency) the same
  way any direct API call would.

## Development

```sh
npm install
npm run build       # tsup -> dist/index.js (with shebang)
npm test            # vitest run
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

Smoke test against staging:

```sh
DATADIVE_SMOKE_API_KEY=ddk_test_... DATADIVE_API_BASE_URL=https://api-staging.datadive.tools npm run test:smoke
```

Test the binary end-to-end with the MCP Inspector:

```sh
DATADIVE_API_KEY=ddk_live_... npx @modelcontextprotocol/inspector dist/index.js
```

## Releasing

The repo uses [Changesets](https://github.com/changesets/changesets):

```sh
npx changeset             # add a changeset describing the change (patch/minor/major)
git commit -am "fix: ..."
git push
```

A "Version Packages" PR opens automatically. Merging it bumps the version,
updates CHANGELOG.md, and publishes to npm with provenance.

## Support

- **Issues:** https://github.com/Data-Dive-Tools/datadive-mcp/issues
- **API docs:** https://developer.datadive.tools/docs#/v1
- **DataDive support:** support@datadive.tools

## License

MIT — see [LICENSE](./LICENSE).

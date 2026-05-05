/**
 * Entry point for the datadive-mcp stdio binary.
 *
 * Wired via package.json#bin -> dist/index.js so `npx -y @datadive/mcp` runs it.
 * The shebang is added at build time by tsup.config.ts (banner.js).
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { buildServer } from "./server.js";

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    // Config errors (e.g. missing API key) are user-facing; print to stderr and exit
    // non-zero so the MCP client surfaces a real error rather than silently disconnecting.
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[datadive-mcp] ${msg}\n`);
    process.exit(1);
  }

  const server = buildServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
  process.stderr.write(`[datadive-mcp] fatal: ${msg}\n`);
  process.exit(1);
});

/**
 * Builds the MCP server: registers each tool from the registry with the SDK.
 *
 * Error handling: if a tool handler throws (most commonly an ApiError from the
 * HTTP client), we surface the message back through MCP as a tool-level error
 * (`isError: true`). The LLM sees the message and can react — e.g. tell the
 * user to regenerate their API key on a 401.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "./config.js";
import { allTools } from "./tools/index.js";
import { ApiError } from "./http/errors.js";
import { PKG_VERSION } from "./http/client.js";

export function buildServer(config: Config): McpServer {
  const server = new McpServer({
    name: "datadive",
    version: PKG_VERSION,
  });

  for (const tool of allTools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args: Record<string, unknown>) => {
        try {
          const data = await tool.handler(args, { config });
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        } catch (err) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err),
              },
            ],
          };
        }
      },
    );
  }

  return server;
}

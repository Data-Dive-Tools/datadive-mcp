/**
 * Library entry point (package.json#exports ".") — the embeddable surface for
 * hosts that run these tools over a transport other than stdio (e.g. the remote
 * Streamable HTTP resource server in datadive-backend/serverless/mcp-server).
 *
 * Unlike index.ts (the stdio bin), importing this module has no side effects.
 */

export { buildServer, requiredScope } from "./server.js";
export { allTools } from "./tools/index.js";
export type { ToolDefinition, AnyTool } from "./tools/index.js";
export { loadConfig, SCOPE_READ, SCOPE_WRITE } from "./config.js";
export type { Config, Credentials } from "./config.js";
export { ApiError } from "./http/errors.js";
export { PKG_VERSION } from "./http/client.js";

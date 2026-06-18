/**
 * Shared tool-definition shape consumed by the registry in src/server.ts.
 *
 * Each tool file exports a single `ToolDefinition` so adding tool #N+1 in v1.1
 * is a one-file change (plus appending to `allTools` in tools/index.ts).
 */

import type { z } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { Config } from "../config.js";

export interface HandlerContext {
  config: Config;
}

export interface ToolDefinition<S extends z.ZodRawShape = z.ZodRawShape> {
  /** Snake_case tool name shown to the LLM (e.g. "list_niches"). */
  name: string;
  /** Human-readable title (shown in some MCP UIs). */
  title: string;
  /**
   * Tool description — the primary signal for LLM tool selection.
   * Convention: lead with "Use this when..." then describe inputs and what's returned.
   */
  description: string;
  /** Zod raw shape (object of Zod field schemas) — passed through to MCP SDK. */
  inputSchema: S;
  /**
   * Optional MCP behavior hints (readOnlyHint, destructiveHint, etc.) so clients can
   * flag token-spending write tools in their approval UI. Read tools may omit this.
   */
  annotations?: ToolAnnotations;
  /** Returns the data payload to be JSON-stringified in the tool response. */
  handler: (args: z.infer<z.ZodObject<S>>, ctx: HandlerContext) => Promise<unknown>;
}

/**
 * Type-erased tool used by the registry. The MCP SDK validates `args` against
 * `inputSchema` before calling `handler`, so `Record<string, unknown>` is sound
 * at the call site even though each tool's handler internally expects a tighter
 * inferred shape.
 */
export interface AnyTool {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  annotations?: ToolAnnotations;
  handler: (args: Record<string, unknown>, ctx: HandlerContext) => Promise<unknown>;
}

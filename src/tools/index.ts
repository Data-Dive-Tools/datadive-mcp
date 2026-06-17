/**
 * Tool registry. The order here is the order tools appear in `tools/list`
 * over the MCP transport, which biases LLM discovery — keep "discovery" tools
 * (the ones that return IDs needed by other tools) at the top.
 */

import { listNichesTool } from "./list-niches.js";
import { getNicheKeywordsTool } from "./get-niche-keywords.js";
import { getNicheRootsTool } from "./get-niche-roots.js";
import { getNicheCompetitorsTool } from "./get-niche-competitors.js";
import { getRankingJuiceTool } from "./get-ranking-juice.js";
import { listRankRadarsTool } from "./list-rank-radars.js";
import { getRankRadarDataTool } from "./get-rank-radar-data.js";
import { getAsinInventoryDistributionTool } from "./get-asin-inventory-distribution.js";
import { listIndexingIssueAlertsTool } from "./list-indexing-issue-alerts.js";
import { listBlindSpendAlertsTool } from "./list-blind-spend-alerts.js";
import { getQuotaTool } from "./get-quota.js";
import { listUsageTool } from "./list-usage.js";
import type { AnyTool } from "./types.js";

// Note on the cast: each ToolDefinition<S> has a handler typed to its specific
// schema; the registry needs a uniform shape. The MCP SDK validates incoming
// args against `inputSchema` before calling the handler, so the cast is safe.
export const allTools: ReadonlyArray<AnyTool> = [
  listNichesTool,
  getNicheKeywordsTool,
  getNicheRootsTool,
  getNicheCompetitorsTool,
  getRankingJuiceTool,
  listRankRadarsTool,
  getRankRadarDataTool,
  getAsinInventoryDistributionTool,
  listIndexingIssueAlertsTool,
  listBlindSpendAlertsTool,
  getQuotaTool,
  listUsageTool,
] as unknown as ReadonlyArray<AnyTool>;

export type { ToolDefinition, AnyTool } from "./types.js";

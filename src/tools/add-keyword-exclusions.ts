import { httpPost } from "../http/client.js";
import {
  KEYWORD_EXCLUSIONS_MAX_PER_CALL,
  KEYWORD_EXCLUSIONS_MAX_PER_NICHE,
  type AddKeywordExclusionsResult,
} from "../types/api.js";
import { assertExclusionCount, keywordExclusionsInputSchema } from "./keyword-exclusions-input.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = keywordExclusionsInputSchema("exclude");

export const addKeywordExclusionsTool: ToolDefinition<typeof inputSchema> = {
  name: "add_keyword_exclusions",
  title: "Exclude Keywords from a Niche",
  description:
    "Use this to hide irrelevant keywords from a niche's Master Keyword List — e.g. other brands, wrong " +
    "product types. `exact` entries hide the one keyword that matches exactly; `phrase` entries hide every " +
    "keyword containing the phrase, so prefer `exact` unless the user wants a whole family of keywords gone. " +
    "The excluded keywords drop out of `get_niche_keywords` at once, wherever they come from: the dive, " +
    "Outliers, Residue, or ones added with `add_niche_keywords`. Nothing is deleted: " +
    "`remove_keyword_exclusions` brings them back. Only the exclusions change — every other niche setting is " +
    `kept. Send 1–${KEYWORD_EXCLUSIONS_MAX_PER_CALL} entries in total across \`exact\` and \`phrase\`; a niche ` +
    `can hold at most ${KEYWORD_EXCLUSIONS_MAX_PER_NICHE} exclusions. Free, no tokens, and safe to repeat: ` +
    "entries already excluded come back under `unchanged`. Returns `added`, `unchanged` and the full `exact` / " +
    "`phrase` lists after the change. Limited to 30 calls per minute per niche, so batch entries into one call.",
  inputSchema,
  // Hides data from every MKL-based view until undone; reversible, but clients should prompt on it.
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    assertExclusionCount(args.exact, args.phrase);
    return await httpPost<AddKeywordExclusionsResult>(
      { config: ctx.config, toolName: "add_keyword_exclusions" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/keyword-exclusions`,
      { exact: args.exact, phrase: args.phrase },
    );
  },
};

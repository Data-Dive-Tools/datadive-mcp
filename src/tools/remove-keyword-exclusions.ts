import { httpPost } from "../http/client.js";
import { KEYWORD_EXCLUSIONS_MAX_PER_CALL, type RemoveKeywordExclusionsResult } from "../types/api.js";
import { assertExclusionCount, keywordExclusionsInputSchema } from "./keyword-exclusions-input.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = keywordExclusionsInputSchema("stop excluding");

export const removeKeywordExclusionsTool: ToolDefinition<typeof inputSchema> = {
  name: "remove_keyword_exclusions",
  title: "Remove Keyword Exclusions from a Niche",
  description:
    "Use this to undo `add_keyword_exclusions`, so the keywords an exclusion hid show in the niche's Master " +
    "Keyword List (`get_niche_keywords`) again. Pass the entries exactly as `list_keyword_exclusions` shows " +
    "them, `exact` and `phrase` separately: removing a phrase does not touch an exact entry for the same text, " +
    "and a keyword also hidden by another remaining exclusion stays hidden. Only the exclusions change — every " +
    `other niche setting is kept. Send 1–${KEYWORD_EXCLUSIONS_MAX_PER_CALL} entries in total across \`exact\` ` +
    "and `phrase`. Free, and safe to repeat: entries that are not excluded come back under `unchanged`. " +
    "Returns `removed`, `unchanged` and the full `exact` / `phrase` lists after the change. Limited to 30 " +
    "calls per minute per niche.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    assertExclusionCount(args.exact, args.phrase);
    return await httpPost<RemoveKeywordExclusionsResult>(
      { config: ctx.config, toolName: "remove_keyword_exclusions" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/keyword-exclusions/remove`,
      { exact: args.exact, phrase: args.phrase },
    );
  },
};

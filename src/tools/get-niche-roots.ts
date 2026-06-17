import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { NicheRoots } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The unique identifier of the Niche (from `list_niches`)."),
};

export const getNicheRootsTool: ToolDefinition<typeof inputSchema> = {
  name: "get_niche_roots",
  title: "Get Keyword Roots for a Niche",
  description:
    "Use this when the user wants to find the highest-impact words across a niche's keywords, asks about " +
    "'keyword roots', or wants to prioritize terms for a listing. " +
    "Retrieves the keyword lexical roots for the Niche — individual words or word-combinations extracted " +
    "from the Master Keyword List (e.g. 'bluetooth headphones' yields roots 'bluetooth', 'headphones', " +
    "'bluetooth headphones'). Returns `roots` and `normalizedRoots` tables, each item with root, frequency " +
    "(how many keywords contain it), broadSearchVolume (summed search volume of those keywords), and " +
    "broadSearchVolumeRatio (0-1, relative to the top root), plus the per-keyword breakdowns and " +
    "latestResearchDate.",
  inputSchema,
  handler: async (args, ctx) => {
    return await httpGet<NicheRoots>(
      { config: ctx.config, toolName: "get_niche_roots" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/roots`,
    );
  },
};

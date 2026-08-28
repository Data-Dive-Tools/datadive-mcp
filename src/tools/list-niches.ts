import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { NicheList } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

/** Mirrors the API's `PaginationParams.MAX_PAGE_SIZE`; larger values are rejected there with 400. */
export const LIST_NICHES_MAX_PAGE_SIZE = 50;

/**
 * `searchText`, `searchAsin`, `orderBy` and `sortOrder` were added in 0.10.0 (RS-11517) on the
 * assumption that `GET /v1/niches` accepted them. It does not: the route binds only `currentPage`
 * and `pageSize` (datadive-backend `external-api-v1.controller.ts`), and Nest drops unknown query
 * params silently, so the tool advertised filters that never filtered anything.
 *
 * The same endpoint also ignores paging: `listNichesForExternalApi` combines `skip`/`take` with
 * `getRawMany()` over a joined builder, which makes TypeORM discard LIMIT/OFFSET (RS-11494). Every
 * call returns the whole account while the response metadata describes a page.
 *
 * Verified against prod on 2026-08-28 with an org of 907 niches: `pageSize: 2` returned all 907
 * rows, page 2 was byte-identical to page 1, and `searchText: "dog hat"` was byte-identical again
 * (only 80 of the 907 rows even contain that text).
 *
 * So the inputs are withdrawn and the description states the paging limitation, rather than letting
 * an assistant trust filters that do nothing. Both are restored once the API fix ships (planned
 * 2026-09-07) — see the follow-up branch `RS-11517-restore-niche-filters-sep-07`.
 */
const inputSchema = {
  currentPage: z.number().int().min(1).optional().describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(LIST_NICHES_MAX_PAGE_SIZE)
    .optional()
    .describe(`Items per page (max ${LIST_NICHES_MAX_PAGE_SIZE}). Defaults to 20.`),
};

export const listNichesTool: ToolDefinition<typeof inputSchema> = {
  name: "list_niches",
  title: "List DataDive Niches",
  description:
    "Use this first when the user asks about their niches, or to find a `nicheId` for use with " +
    "`get_niche_keywords`, `get_niche_competitors`, or `get_ranking_juice`. " +
    "Retrieves the Niches of the account. Each Niche represents a market segment or product " +
    "category being tracked. Returns nicheId, heroKeyword, nicheLabel, marketplace (com/uk/de/...), " +
    "and latestResearchDate per niche, plus pagination metadata (currentPage, pageSize, total, " +
    "lastPage, hasNext, hasPrev). " +
    "TEMPORARY LIMITATION: the API does not apply paging yet, so a single call returns every niche " +
    "of the account whatever `currentPage` and `pageSize` say, and the pagination metadata describes " +
    "a page that was not applied. Read the whole `data` array and filter it yourself; do not walk " +
    "`currentPage` while `hasNext` is true, because every page repeats the same rows. Accounts with " +
    "many niches therefore return a large response. There is no server-side search or sorting.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<NicheList>({ config: ctx.config, toolName: "list_niches" }, "/v1/niches", {
      currentPage: args.currentPage,
      pageSize: args.pageSize,
    });
  },
};

/**
 * Input shared by add_keyword_exclusions and remove_keyword_exclusions.
 *
 * The API normalises entries like MKL keywords (lower-cased, trimmed, unique per list), so the
 * per-entry rules come from niche-keyword-list.ts. The 1–100 total spans both optional lists, which
 * a raw input shape cannot express, so `assertExclusionCount` checks it in the handler — before the
 * call, so a request the API would refuse never reaches it.
 */

import { z } from "zod";
import { ApiError } from "../http/errors.js";
import { KEYWORD_EXCLUSIONS_MAX_PER_CALL } from "../types/api.js";
import { nicheKeyword, uniqueKeywords } from "./niche-keyword-list.js";

const entries = (field: string) =>
  uniqueKeywords(z.array(nicheKeyword()).max(KEYWORD_EXCLUSIONS_MAX_PER_CALL), field).optional();

export const keywordExclusionsInputSchema = (verb: "exclude" | "stop excluding") => ({
  nicheId: z.string().min(1).describe("The niche whose keyword exclusions to change. Get one from `list_niches`."),
  exact: entries("exact").describe(
    `Exact-match entries to ${verb}: each one hides the single keyword that matches it exactly. At most 255 ` +
      "characters each; lower-cased and trimmed, and must be unique after that.",
  ),
  phrase: entries("phrase").describe(
    `Phrase-match entries to ${verb}: each one hides every keyword that contains the phrase (e.g. "puppy" ` +
      'hides "puppy hat" and "hat for puppy"). At most 255 characters each; lower-cased and trimmed, and ' +
      "must be unique after that.",
  ),
});

export function assertExclusionCount(exact: string[] | undefined, phrase: string[] | undefined): void {
  const total = (exact?.length ?? 0) + (phrase?.length ?? 0);
  if (total === 0 || total > KEYWORD_EXCLUSIONS_MAX_PER_CALL) {
    throw new ApiError(
      "bad_request",
      400,
      `Send 1 to ${KEYWORD_EXCLUSIONS_MAX_PER_CALL} entries in total across \`exact\` and \`phrase\` ` +
        `(got ${total}). Split a longer list over several calls.`,
    );
  }
}

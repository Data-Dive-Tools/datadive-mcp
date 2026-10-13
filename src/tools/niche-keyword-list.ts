/**
 * Keyword-list input shared by the niche keyword write tools (add/remove MKL keywords).
 *
 * The API lower-cases and trims every keyword before its own uniqueness check, so "Dog Hat" and
 * "dog hat " are the same keyword there and sending both is a 400. Normalising here makes the
 * duplicate check agree with the API and turns that mistake into a schema error the model sees
 * before any call, which matters because these routes allow only 2 writes per minute per niche.
 */

import { z } from "zod";
import { NICHE_KEYWORD_MAX_LENGTH, NICHE_KEYWORDS_MAX_PER_CALL } from "../types/api.js";

export const nicheKeyword = z.string().trim().toLowerCase().min(1).max(NICHE_KEYWORD_MAX_LENGTH);

/** Rejects a list holding the same keyword twice, compared after normalisation. */
export function uniqueKeywords<T extends z.ZodType<string[]>>(schema: T, field: string) {
  return schema.refine((keywords) => new Set(keywords).size === keywords.length, {
    message: `${field} must not contain the same keyword twice (compared lower-cased and trimmed)`,
  });
}

export const nicheKeywordList = uniqueKeywords(
  z.array(nicheKeyword).min(1).max(NICHE_KEYWORDS_MAX_PER_CALL),
  "keywords",
);

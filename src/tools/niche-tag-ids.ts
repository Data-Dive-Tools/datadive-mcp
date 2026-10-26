/**
 * Id-list input shared by the niche Space and label write tools, and by the `spaces` / `labels`
 * filters of the list tools. The API takes 1-100 unique positive integers; checking that here turns
 * a mistake into a schema error before a call, and these routes allow only 2 writes per minute per niche.
 */

import { z } from "zod";
import { NICHE_TAG_IDS_MAX_PER_CALL } from "../types/api.js";

/** A fresh schema per use: one instance shared by two fields is emitted as a `$ref`, which some MCP clients do not resolve. */
const tagId = () => z.number().int().min(1);

/** Rejects a list holding the same id twice. */
function unique<T extends z.ZodType<number[]>>(schema: T, field: string) {
  return schema.refine((ids) => new Set(ids).size === ids.length, {
    message: `${field} must not contain the same id twice`,
  });
}

/** 1-100 unique ids, for the write tools. */
export const nicheTagIdList = (field: string) =>
  unique(z.array(tagId()).min(1).max(NICHE_TAG_IDS_MAX_PER_CALL), field);

/** Up to 100 unique ids, for the list filters. */
export const tagFilterIdList = (field: string) =>
  unique(z.array(tagId()).max(NICHE_TAG_IDS_MAX_PER_CALL), field);

/** The rules every write tool shares, appended to each description. */
export const NICHE_TAG_WRITE_RULES =
  "Only the organization owner or a team admin can change a niche's Spaces and labels; anyone else is " +
  "refused with a 403 (INSUFFICIENT_ROLE), so tell the user instead of retrying. A change is all or nothing: " +
  "if any id is unknown, or a Space is one the user has only view rights on, the whole call fails and " +
  "nothing changes (the error lists the offending ids). Ids already in the wanted state are counted, " +
  "never errors, so a repeat is safe. Costs nothing. Limited to 2 calls per minute per niche, so put " +
  "every id in one call.";

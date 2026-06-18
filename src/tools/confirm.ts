/**
 * Shared confirm gate for token-spending write tools (create_niche_dive,
 * create_rank_radar).
 *
 * Creating a Dive or Rank Radar consumes billable tokens irreversibly, so these
 * tools require an explicit `confirm: true` before they hit the API. When the flag
 * is missing, requireConfirmation returns a structured (non-error) payload telling
 * the model to confirm the token spend with the user and re-call with `confirm: true`;
 * the handler returns that payload early WITHOUT calling the API.
 *
 * The user can opt out of the gate entirely by setting DATADIVE_AUTO_CONFIRM_WRITES
 * (see config.ts) — a persistent "don't ask me again".
 */

import type { HandlerContext } from "./types.js";

export interface ConfirmationRequired {
  status: "confirmation_required";
  message: string;
  /** Human-readable note on what this action will cost in tokens. */
  costNote: string;
}

/**
 * Returns a ConfirmationRequired payload if the action is not yet confirmed, or null
 * if the handler should proceed (confirm:true was passed, or the opt-out is set).
 */
export function requireConfirmation(
  confirm: boolean | undefined,
  ctx: HandlerContext,
  costNote: string,
): ConfirmationRequired | null {
  if (confirm === true || ctx.config.autoConfirmWrites) return null;
  return {
    status: "confirmation_required",
    message:
      "This action spends billable tokens and cannot be undone. Confirm the cost with " +
      "the user, then call again with `confirm: true` to proceed.",
    costNote,
  };
}

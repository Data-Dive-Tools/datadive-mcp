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

import type { ApiWarning } from "../types/api.js";
import type { HandlerContext } from "./types.js";

export interface ConfirmationRequired {
  status: "confirmation_required";
  message: string;
  /** Human-readable note on what this action will cost in tokens. */
  costNote: string;
  /**
   * Non-blocking notices the API reported for this exact request, obtained from a
   * dry run (RS-11615). Absent when the tool has no dry-run preview or the API
   * flagged nothing. Each `message` is customer-facing text to be shown verbatim.
   */
  warnings?: ApiWarning[];
}

/**
 * Whether the gate applies — whether the tool must stop and ask before spending
 * anything. Split out from requireConfirmation so a tool can run a read-only preview
 * first and fold its result into the payload; see create_rank_radar's dry run.
 */
export function needsConfirmation(confirm: boolean | undefined, ctx: HandlerContext): boolean {
  return !(confirm === true || ctx.config.autoConfirmWrites);
}

/** The gate payload. `warnings` is omitted entirely when there are none, to keep the JSON quiet. */
export function confirmationRequired(costNote: string, warnings?: ApiWarning[]): ConfirmationRequired {
  return {
    status: "confirmation_required",
    message:
      "This action spends billable tokens and cannot be undone. Confirm the cost with " +
      "the user, then call again with `confirm: true` to proceed.",
    costNote,
    ...(warnings && warnings.length > 0 ? { warnings } : {}),
  };
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
  if (!needsConfirmation(confirm, ctx)) return null;
  return confirmationRequired(costNote);
}

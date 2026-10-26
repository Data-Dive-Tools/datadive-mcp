/**
 * The confirm gate shared by `run_fast_keywords` and `refresh_fast_keywords`: both spend 1 Dive token
 * and answer to the same two request bodies (a real run, or `dryRun: true`).
 *
 * Built like `create_rank_radar`. The first call is a dry run, which does the API's own eligibility and
 * Dive token check and spends nothing, so the confirmation carries the API's figures instead of a static
 * note. `dryRun` is set only here, never taken from the model: a model that could set it could dry-run,
 * read a success-shaped answer and tell the user a run started when none did.
 */

import { httpPost, type RequestContext } from "../http/client.js";
import { ApiError } from "../http/errors.js";
import type {
  FastKeywordsRefreshConflictBody,
  FastKeywordsRunPreview,
  FastKeywordsRunResult,
} from "../types/api.js";
import { confirmationRequired, needsConfirmation, type ConfirmationRequired } from "./confirm.js";
import type { HandlerContext } from "./types.js";

export interface FastKeywordsConfirmation extends ConfirmationRequired {
  /** Dive tokens the run would consume, as the API reports it. */
  tokenCost: number;
  /** Whether the organization has enough Dive tokens left. When `false`, a confirmed call is refused. */
  hasEnoughTokens: boolean;
}

function isRefreshConflict(body: unknown): body is FastKeywordsRefreshConflictBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return b.error === "IN_PROGRESS" || b.error === "COOLDOWN";
}

/** The 409 of a refresh as a plain message the model can relay; nothing was spent. */
function toConflictError(err: ApiError): ApiError {
  const body = err.body;
  if (!isRefreshConflict(body)) return err;

  const message =
    body.error === "COOLDOWN" && body.nextEligibleAt
      ? `This Fast Keywords result was refreshed recently. It can be refreshed again from ${body.nextEligibleAt}. ` +
        "Nothing was run or charged; read the current result with `get_fast_keywords`."
      : body.error === "IN_PROGRESS"
        ? "A run for this Fast Keywords result is already in progress. Nothing was charged: poll " +
          "`get_fast_keywords` until it finishes instead of calling again."
        : `${body.message} Nothing was run or charged.`;
  return new ApiError("http", 409, message, body);
}

export async function runFastKeywords(
  ctx: HandlerContext,
  request: RequestContext,
  path: string,
  body: Record<string, unknown>,
  confirm: boolean | undefined,
  what: string,
): Promise<FastKeywordsRunResult | FastKeywordsConfirmation> {
  const post = async <T>(payload: Record<string, unknown>): Promise<T> => {
    try {
      return await httpPost<T>(request, path, payload);
    } catch (err) {
      throw err instanceof ApiError && err.status === 409 ? toConflictError(err) : err;
    }
  };

  if (needsConfirmation(confirm, ctx)) {
    const preview = await post<FastKeywordsRunPreview | FastKeywordsRunResult>({ ...body, dryRun: true });

    // A backend that ignores `dryRun` runs for real. It gives itself away by returning a result id where a
    // preview returns none. Report what happened rather than ask to confirm what is already paid for.
    if ("fastKeywordsId" in preview) return preview;

    const { tokenCost, hasEnoughTokens } = preview;
    return {
      ...confirmationRequired(
        `${what} consumes ${tokenCost} Dive token${tokenCost === 1 ? "" : "s"}.` +
          (hasEnoughTokens ? "" : " The organization does not have enough Dive tokens left, so a confirmed call would be refused."),
      ),
      tokenCost,
      hasEnoughTokens,
    };
  }

  // Confirmed, or the gate is opted out via DATADIVE_AUTO_CONFIRM_WRITES.
  return await post<FastKeywordsRunResult>(body);
}

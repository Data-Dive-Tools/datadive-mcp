/**
 * Error mapping for the DataDive /v1 API.
 *
 * The MCP server is a thin HTTP shim — when api.datadive.tools returns an error,
 * we want the LLM (and ultimately the user) to see a useful, actionable message
 * rather than "Request failed". `ApiError.fromHttp` turns an HTTP status + body
 * into one of those messages.
 *
 * Source of truth for status semantics:
 *   datadive-backend/src/external-api/auth/api-key.guard.ts (401/402 logic)
 *   datadive-backend/src/external-api/external-api-v1.controller.ts (per-route docs)
 *   datadive-backend/src/microservices/token/quota-exceeded.error.ts (QUOTA_EXCEEDED body)
 */

const KEY_HELP_URL = "https://2.datadive.tools/api-key";

export type ApiErrorKind =
  | "auth"
  | "payment"
  | "quota"
  | "forbidden"
  | "not_found"
  | "bad_request"
  | "rate_limit"
  | "server"
  | "network"
  | "http";

/**
 * Body the backend returns whenever a billable action would exceed the subscription's quota,
 * regardless of the HTTP status (400 for most features, 403 for the AI Copywriter). `error` is the
 * stable discriminant; the usage fields are present only when the throw site knows them.
 */
export interface QuotaExceededBody {
  error: "QUOTA_EXCEEDED";
  message: string;
  subscriptionUrl: string;
  feature?: string;
  used?: number | null;
  capacity?: number | null;
  nextRefreshDate?: string | null;
}

/** Display names for the backend's `BillableFeature` values; unknown values fall through verbatim. */
const FEATURE_LABELS: Record<string, string> = {
  DIVED_ASINS: "Dive tokens",
  RANK_RADAR_KEYWORDS: "Rank Radar tracked keywords",
  PRODUCT_BRIEF_ASINS: "Product Brief ASINs",
  AI_COPYWRITER_PROMPTS: "AI Copywriter prompts",
  INDEXING_DIAGNOSIS: "Indexing Diagnosis checks",
};

export class ApiError extends Error {
  public readonly kind: ApiErrorKind;
  public readonly status: number;
  public readonly body: unknown;

  constructor(kind: ApiErrorKind, status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.body = body;
  }

  static fromHttp(status: number, body: unknown): ApiError {
    // Checked before the status branches: the backend uses 400 or 403 depending on the
    // feature, and neither generic mapping would tell the model what ran out or where to go.
    if (isQuotaExceededBody(body)) {
      return new ApiError("quota", status, quotaExceededMessage(body), body);
    }

    const serverMsg = extractMessage(body);

    if (status === 400) {
      return new ApiError(
        "bad_request",
        400,
        serverMsg ? `Bad request: ${serverMsg}` : "Bad request: invalid parameters.",
        body,
      );
    }
    if (status === 401) {
      return new ApiError(
        "auth",
        401,
        `Authentication failed: your DATADIVE_API_KEY is invalid or expired. Generate a new key at ${KEY_HELP_URL}.`,
        body,
      );
    }
    if (status === 402) {
      return new ApiError(
        "payment",
        402,
        "Subscription is inactive or paused. Resume billing at https://2.datadive.tools to use the API.",
        body,
      );
    }
    if (status === 403) {
      return new ApiError(
        "forbidden",
        403,
        serverMsg
          ? `Forbidden: ${serverMsg}`
          : "Forbidden: this API key cannot access the requested resource.",
        body,
      );
    }
    if (status === 404) {
      return new ApiError("not_found", 404, serverMsg ? `Not found: ${serverMsg}` : "Resource not found.", body);
    }
    if (status === 429) {
      return new ApiError("rate_limit", 429, "Rate limit exceeded. Wait a few seconds and retry.", body);
    }
    if (status >= 500) {
      return new ApiError(
        "server",
        status,
        `DataDive API error (${status}). ${serverMsg ?? "Please try again."}`.trim(),
        body,
      );
    }
    return new ApiError("http", status, serverMsg ?? `HTTP ${status}`, body);
  }
}

export function isQuotaExceededBody(body: unknown): body is QuotaExceededBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return b.error === "QUOTA_EXCEEDED" && typeof b.subscriptionUrl === "string";
}

/**
 * Deterministic, server-data-only wording for a quota error. The model relays this instead of
 * improvising: it names the exhausted feature, states usage when known, points at the
 * informational subscription page, and tells the model not to retry. It deliberately does not
 * quote prices or push a specific upgrade — the connector directories only allow explaining that
 * a feature needs a different plan and linking to a plan page.
 */
export function quotaExceededMessage(body: QuotaExceededBody): string {
  const lead = typeof body.message === "string" && body.message.length > 0 ? body.message : "Quota exceeded";
  const feature = body.feature ? (FEATURE_LABELS[body.feature] ?? body.feature) : null;

  const parts: string[] = [];
  if (feature) {
    parts.push(`This subscription has used up its ${feature} quota${usageSuffix(body)}.`);
  } else {
    parts.push(`This subscription has used up its quota for this action${usageSuffix(body)}.`);
  }
  if (body.nextRefreshDate) {
    parts.push(`It refreshes on ${body.nextRefreshDate.slice(0, 10)}.`);
  }
  parts.push(
    `Tell the user which quota ran out and that they can review or raise it on their subscription page: ${body.subscriptionUrl}`,
  );
  parts.push("Do not retry this call until the quota has been raised.");

  return `${lead}. ${parts.join(" ")}`;
}

function usageSuffix(body: QuotaExceededBody): string {
  if (typeof body.used === "number" && typeof body.capacity === "number") {
    return ` (${body.used} of ${body.capacity} used)`;
  }
  return "";
}

function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  // NestJS conventional error shapes: { message: string | string[] } or { error, message }.
  if (typeof b.message === "string") return b.message;
  if (Array.isArray(b.message) && b.message.every((m) => typeof m === "string")) {
    return (b.message as string[]).join("; ");
  }
  if (typeof b.error === "string") return b.error;
  return null;
}

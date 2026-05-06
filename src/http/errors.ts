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
 */

const KEY_HELP_URL = "https://2.datadive.tools/api-key";

export type ApiErrorKind =
  | "auth"
  | "payment"
  | "forbidden"
  | "not_found"
  | "bad_request"
  | "rate_limit"
  | "server"
  | "network"
  | "http";

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

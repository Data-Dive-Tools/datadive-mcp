/**
 * HTTP client for the DataDive /v1 API.
 *
 * Responsibilities:
 *   1. Attach `x-api-key` from config to every request.
 *   2. Tag the User-Agent with the package version + tool name so backend access
 *      logs can attribute usage per tool (no separate telemetry endpoint needed).
 *   3. Map HTTP errors via `ApiError.fromHttp`.
 *   4. Unwrap the `ResponseDto<T>` envelope (`{ message?, success?, data }`)
 *      while preserving bare `PaginationResponse<T>` bodies (which need their
 *      pagination metadata to reach the LLM).
 *
 * Envelope detection (verified against datadive-backend):
 *   - GET /v1/niches            -> NicheList extends PaginationResponse<NicheItem>  (BARE)
 *   - GET /v1/niches/rank-radars -> ResponseDto<ExternalRankRadarListResponseDto>
 *                                   where the inner DTO IS itself paginated.
 *   - All other read endpoints  -> ResponseDto<T>                                  (UNWRAP)
 *
 * Heuristic: if the body has `data` AND any pagination key (currentPage, lastPage,
 * hasNext, hasPrev, pageSize, total), it's a PaginationResponse — return as-is.
 * Otherwise if the body has `data`, it's a ResponseDto envelope — return body.data.
 *
 * Cite: datadive-backend/src/common/pagination/pagination.dto.ts (pagination keys)
 *       datadive-backend/src/common/dto/response.dto.ts          (envelope shape)
 */

import type { Config } from "../config.js";
import { ApiError } from "./errors.js";

/** Bumped at release time; written into the User-Agent header. */
export const PKG_VERSION = "0.1.0";

const PAGINATION_KEYS = ["currentPage", "lastPage", "hasNext", "hasPrev", "pageSize", "total"] as const;

export interface RequestContext {
  config: Config;
  /** Tool name used to tag the User-Agent header for per-tool log attribution. */
  toolName: string;
}

export async function httpGet<T>(ctx: RequestContext, path: string, query?: Record<string, unknown>): Promise<T> {
  const url = buildUrl(ctx.config.baseUrl, path, query);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": ctx.config.apiKey,
        accept: "application/json",
        "user-agent": userAgent(ctx.toolName),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ApiError("network", 0, `Network error reaching ${url}: ${msg}`);
  }

  const text = await res.text();
  let body: unknown;
  try {
    body = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    throw ApiError.fromHttp(res.status, body);
  }

  return unwrap<T>(body);
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, unknown>): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const u = new URL(`${baseUrl}${normalizedPath}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
}

function userAgent(toolName: string): string {
  return `datadive-mcp/${PKG_VERSION} tool/${toolName}`;
}

/**
 * Unwraps a ResponseDto<T> envelope while preserving bare PaginationResponse bodies.
 * Exported for unit testing.
 */
export function unwrap<T>(body: unknown): T {
  if (!isObject(body)) return body as T;
  if (!("data" in body)) return body as T;
  // If pagination metadata is present at the top level, return as-is.
  for (const key of PAGINATION_KEYS) {
    if (key in body) return body as T;
  }
  // Plain ResponseDto envelope -> unwrap.
  return (body as { data: T }).data;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

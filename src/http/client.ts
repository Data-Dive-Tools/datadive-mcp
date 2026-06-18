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
import { version } from "../../package.json";

/**
 * The running package version, inlined from package.json at build time by
 * tsup/esbuild (and by vite under vitest). Single source of truth — no manual
 * bump here, so it can never drift from what's published to npm.
 *
 * Written into the User-Agent header, and compared against the backend's
 * advertised latest version (see noteLatestVersion) to nudge stale installs.
 */
export const PKG_VERSION: string = version;

/** Response header the DataDive backend uses to advertise the latest published MCP version. */
const LATEST_VERSION_HEADER = "x-datadive-mcp-latest";

/**
 * One-time upgrade notice. Armed when the backend advertises a version newer than
 * the one we're running; consumed (and then suppressed for the rest of the session)
 * by takeUpgradeNotice(). We surface it once per process so we don't nag on every call.
 */
let pendingUpgradeNotice: string | null = null;
let hasWarned = false;

/**
 * Compares dotted version strings (major.minor.patch). Pre-release / build suffixes
 * are stripped — a stable release is the signal we act on. Returns true iff `latest`
 * is strictly newer than `current`. Exported for unit testing.
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.split(/[-+]/)[0]!.split(".").map((n) => parseInt(n, 10) || 0);
  const a = parse(latest);
  const b = parse(current);
  for (let i = 0; i < 3; i++) {
    const da = a[i] ?? 0;
    const db = b[i] ?? 0;
    if (da !== db) return da > db;
  }
  return false;
}

/** Records the advertised latest version; arms a one-time notice if we're behind. Never throws. */
function noteLatestVersion(latest: string | null): void {
  if (!latest || hasWarned) return;
  if (isNewerVersion(latest, PKG_VERSION)) {
    pendingUpgradeNotice =
      `A newer version of datadive-mcp is available (${latest}; you are running ${PKG_VERSION}). ` +
      `Update by reinstalling the latest from npm — e.g. \`npm install -g @datadive-tools/mcp@latest\` — ` +
      `or bump the @datadive-tools/mcp version in your MCP client config, then restart the client.`;
  }
}

/**
 * Returns a pending upgrade notice once, then suppresses further notices for the rest
 * of the session. Called when assembling a tool result so the LLM can relay it to the
 * user. Returns null when there's nothing to surface.
 */
export function takeUpgradeNotice(): string | null {
  if (!pendingUpgradeNotice) return null;
  const notice = pendingUpgradeNotice;
  pendingUpgradeNotice = null;
  hasWarned = true;
  return notice;
}

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
    throw networkError(url, e);
  }

  return handleResponse<T>(res);
}

/**
 * POST a JSON body to a /v1 write endpoint. Mirrors httpGet (same auth/UA headers,
 * version notice, error mapping, and envelope unwrapping) but adds a JSON request
 * body. The create endpoints return bare objects (no ResponseDto envelope), which
 * unwrap() passes through untouched.
 */
export async function httpPost<T>(ctx: RequestContext, path: string, body: unknown): Promise<T> {
  const url = buildUrl(ctx.config.baseUrl, path);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": ctx.config.apiKey,
        accept: "application/json",
        "content-type": "application/json",
        "user-agent": userAgent(ctx.toolName),
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw networkError(url, e);
  }

  return handleResponse<T>(res);
}

function networkError(url: string, e: unknown): ApiError {
  const msg = e instanceof Error ? e.message : String(e);
  return new ApiError("network", 0, `Network error reaching ${url}: ${msg}`);
}

/**
 * Shared response handling for httpGet/httpPost: arm the one-time upgrade notice,
 * parse the body, map HTTP errors via ApiError, and unwrap the ResponseDto envelope.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  // The backend advertises the latest published MCP version on every response
  // (including errors); arm a one-time upgrade notice if we're behind.
  noteLatestVersion(res.headers.get(LATEST_VERSION_HEADER));

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

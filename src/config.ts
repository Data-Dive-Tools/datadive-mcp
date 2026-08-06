/**
 * Loads and validates the server's runtime configuration from environment.
 *
 * Required:
 *   DATADIVE_API_KEY        - your DataDive API key (generate at 2.datadive.tools/api-key)
 *
 * Optional:
 *   DATADIVE_API_BASE_URL        - override the API base URL (defaults to https://api.datadive.tools)
 *   DATADIVE_AUTO_CONFIRM_WRITES - skip the confirm gate on token-spending write tools
 *                                  (create_niche_dive, create_rank_radar). Truthy =
 *                                  "1"/"true"/"yes" (case-insensitive). Defaults to false.
 *
 * The env-based loader always produces api-key credentials (the local stdio path).
 * A remote host embedding this package builds a Config directly with bearer
 * credentials (the OAuth path) — see Credentials.
 */

/** OAuth scope covering the read tools. */
export const SCOPE_READ = "datadive.read";
/** OAuth scope covering the token-spending write tools. */
export const SCOPE_WRITE = "datadive.write";

/**
 * How the HTTP client authenticates against the DataDive /v1 API.
 *  - "api-key": the local stdio path — sends `x-api-key` (DATADIVE_API_KEY).
 *  - "bearer":  the remote/OAuth path — sends `Authorization: Bearer <token>`.
 *               The token is read at request time, so a host may mutate the
 *               credentials object to rotate a refreshed access token in place.
 */
export type Credentials = { kind: "api-key"; apiKey: string } | { kind: "bearer"; token: string };

export interface Config {
  credentials: Credentials;
  baseUrl: string;
  /**
   * When true, the token-spending write tools proceed without requiring `confirm: true`.
   * A user-controlled "don't ask me again" opt-out, set via DATADIVE_AUTO_CONFIRM_WRITES.
   */
  autoConfirmWrites: boolean;
  /**
   * OAuth scopes granted to this session. When set, tool calls are gated:
   * read tools require SCOPE_READ and write tools SCOPE_WRITE (see server.ts).
   * Undefined (the stdio/api-key path) means no scope gating.
   */
  scopes?: readonly string[];
}

const DEFAULT_BASE_URL = "https://api.datadive.tools";
const KEY_HELP_URL = "https://2.datadive.tools/api-key";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = (env.DATADIVE_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error(
      `DATADIVE_API_KEY environment variable is required. Generate one at ${KEY_HELP_URL} ` +
        `and add it to your MCP client config under env.DATADIVE_API_KEY.`,
    );
  }

  const rawBase = (env.DATADIVE_API_BASE_URL ?? DEFAULT_BASE_URL).trim();
  // Normalize: strip trailing slashes so we can append "/v1/..." paths cleanly.
  const baseUrl = rawBase.replace(/\/+$/, "");

  const autoConfirmWrites = ["1", "true", "yes"].includes(
    (env.DATADIVE_AUTO_CONFIRM_WRITES ?? "").trim().toLowerCase(),
  );

  return { credentials: { kind: "api-key", apiKey }, baseUrl, autoConfirmWrites };
}

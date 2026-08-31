import { vi } from "vitest";
import type { Config } from "../../src/config.js";

export const TEST_CONFIG: Config = {
  credentials: { kind: "api-key", apiKey: "ddk_test" },
  baseUrl: "https://api.datadive.tools",
  autoConfirmWrites: false,
};
export const CTX = { config: TEST_CONFIG };

/** Context with the write-confirm gate opted out, for testing the bypass path. */
export const CTX_AUTO_CONFIRM = {
  config: { ...TEST_CONFIG, autoConfirmWrites: true },
};

export function mockFetch(body: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

/**
 * Fetch mock for the 204 No Content endpoints (deletes, archive/resume). The
 * Response constructor rejects a body on 204, so this passes `null` explicitly
 * rather than the empty string mockFetch would send.
 */
export function mockNoContentFetch() {
  return vi.fn(async () => new Response(null, { status: 204 }));
}

export function getCallUrl(fetchMock: ReturnType<typeof vi.fn>): string {
  const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return call[0];
}

/** The RequestInit (method, headers, body) of the first fetch call — for POST tools. */
export function getCallInit(fetchMock: ReturnType<typeof vi.fn>): RequestInit {
  const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return call[1];
}

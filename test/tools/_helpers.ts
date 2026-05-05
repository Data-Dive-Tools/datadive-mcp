import { vi } from "vitest";
import type { Config } from "../../src/config.js";

export const TEST_CONFIG: Config = { apiKey: "ddk_test", baseUrl: "https://api.datadive.tools" };
export const CTX = { config: TEST_CONFIG };

export function mockFetch(body: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

export function getCallUrl(fetchMock: ReturnType<typeof vi.fn>): string {
  const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return call[0];
}

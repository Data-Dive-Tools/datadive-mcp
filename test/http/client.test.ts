import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { httpGet, unwrap, PKG_VERSION, isNewerVersion, takeUpgradeNotice } from "../../src/http/client.js";
import { ApiError } from "../../src/http/errors.js";

const ctx = {
  config: { apiKey: "ddk_test", baseUrl: "https://api.datadive.tools", autoConfirmWrites: false },
  toolName: "list_niches",
};

function mockFetch(response: { status?: number; body?: unknown; bodyText?: string; headers?: Record<string, string> }) {
  const status = response.status ?? 200;
  const text = response.bodyText ?? (response.body !== undefined ? JSON.stringify(response.body) : "");
  return vi.fn(async () =>
    new Response(text, {
      status,
      headers: { "content-type": "application/json", ...response.headers },
    }),
  );
}

describe("unwrap", () => {
  it("returns bare PaginationResponse as-is (data + pagination keys at top level)", () => {
    const body = { data: [{ nicheId: "abc" }], currentPage: 1, pageSize: 20, total: 1, lastPage: 1, hasNext: false, hasPrev: false };
    const result = unwrap<typeof body>(body);
    expect(result).toBe(body); // identical reference, no unwrap
    expect(result.currentPage).toBe(1);
  });

  it("unwraps a plain ResponseDto<T> envelope", () => {
    const inner = { keywords: [{ keyword: "dog hat" }], latestResearchDate: "2024-01-01" };
    const body = { data: inner };
    const result = unwrap<typeof inner>(body);
    expect(result).toBe(inner);
  });

  it("unwraps a ResponseDto with success flag", () => {
    const inner = [{ id: "k1", keyword: "abc", searchVolume: 10, ranks: [], highlights: [] }];
    const body = { success: true, data: inner };
    expect(unwrap(body)).toBe(inner);
  });

  it("returns ResponseDto wrapping a paginated inner intact (don't double-unwrap)", () => {
    // /v1/niches/rank-radars returns { data: { data: [...], currentPage, ... } }
    // First-level unwrap should peel the outer; the inner pagination is preserved.
    const innerPaginated = { data: [{ id: "rr1" }], currentPage: 1, total: 1, pageSize: 20, lastPage: 1, hasNext: false, hasPrev: false };
    const outer = { data: innerPaginated };
    const result = unwrap<typeof innerPaginated>(outer);
    expect(result).toBe(innerPaginated);
    expect(result.currentPage).toBe(1);
  });

  it("passes through arrays, primitives, null", () => {
    expect(unwrap(null)).toBeNull();
    expect(unwrap("hi" as unknown)).toBe("hi");
    expect(unwrap([1, 2, 3] as unknown)).toEqual([1, 2, 3]);
  });
});

describe("httpGet", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sets x-api-key, accept, and user-agent headers", async () => {
    const fetchMock = mockFetch({ body: { data: { ok: true } } });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await httpGet(ctx, "/v1/niches/abc/keywords");

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = call[1].headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("ddk_test");
    expect(headers["accept"]).toBe("application/json");
    expect(headers["user-agent"]).toBe(`datadive-mcp/${PKG_VERSION} tool/list_niches`);
  });

  it("appends query parameters, skipping undefined and null", async () => {
    const fetchMock = mockFetch({ body: { data: [] } });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await httpGet(ctx, "/v1/niches", { currentPage: 2, pageSize: 50, marketplace: undefined, status: null });

    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe("https://api.datadive.tools/v1/niches?currentPage=2&pageSize=50");
  });

  it("throws an ApiError on 401", async () => {
    globalThis.fetch = mockFetch({ status: 401, body: { message: "Api key is invalid" } }) as unknown as typeof fetch;
    await expect(httpGet(ctx, "/v1/niches")).rejects.toBeInstanceOf(ApiError);
    await expect(httpGet(ctx, "/v1/niches")).rejects.toMatchObject({ kind: "auth", status: 401 });
  });

  it("throws a network ApiError when fetch itself rejects", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;

    await expect(httpGet(ctx, "/v1/niches")).rejects.toMatchObject({ kind: "network" });
  });

  it("returns the bare paginated body for /v1/niches", async () => {
    const body = {
      data: [{ nicheId: "z1", heroKeyword: "k", nicheLabel: "L", marketplace: "com", latestResearchDate: null }],
      currentPage: 1,
      pageSize: 20,
      total: 1,
      lastPage: 1,
      hasNext: false,
      hasPrev: false,
    };
    globalThis.fetch = mockFetch({ body }) as unknown as typeof fetch;

    const result = await httpGet<typeof body>(ctx, "/v1/niches");
    expect(result).toEqual(body);
  });
});

describe("isNewerVersion", () => {
  it("detects newer major/minor/patch", () => {
    expect(isNewerVersion("1.0.0", "0.9.9")).toBe(true);
    expect(isNewerVersion("0.2.0", "0.1.9")).toBe(true);
    expect(isNewerVersion("0.1.1", "0.1.0")).toBe(true);
  });

  it("returns false for equal or older versions", () => {
    expect(isNewerVersion("0.1.0", "0.1.0")).toBe(false);
    expect(isNewerVersion("0.1.0", "0.2.0")).toBe(false);
    expect(isNewerVersion("1.0.0", "1.0.1")).toBe(false);
  });

  it("ignores pre-release and build suffixes", () => {
    expect(isNewerVersion("0.2.0-beta.1", "0.1.0")).toBe(true);
    expect(isNewerVersion("0.1.0-rc.1", "0.1.0")).toBe(false); // same release line
    expect(isNewerVersion("0.1.0+build.5", "0.1.0")).toBe(false);
  });
});

describe("upgrade notice", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("arms a one-time notice when the backend advertises a newer version, then suppresses it", async () => {
    expect(takeUpgradeNotice()).toBeNull(); // nothing armed yet

    globalThis.fetch = mockFetch({
      body: { data: { ok: true } },
      headers: { "x-datadive-mcp-latest": "999.0.0" },
    }) as unknown as typeof fetch;
    await httpGet(ctx, "/v1/niches");

    const notice = takeUpgradeNotice();
    expect(notice).toContain("999.0.0");
    expect(notice).toContain(PKG_VERSION);

    // Consumed once; a second request must not re-arm it this session.
    await httpGet(ctx, "/v1/niches");
    expect(takeUpgradeNotice()).toBeNull();
  });
});

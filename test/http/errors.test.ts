import { describe, it, expect } from "vitest";
import { ApiError, isQuotaExceededBody, quotaExceededMessage } from "../../src/http/errors.js";

describe("ApiError.fromHttp", () => {
  it("400 -> bad_request with server message", () => {
    const e = ApiError.fromHttp(400, { message: "Invalid pagination parameters" });
    expect(e.kind).toBe("bad_request");
    expect(e.message).toContain("Invalid pagination parameters");
  });

  it("401 -> auth + key-help URL", () => {
    const e = ApiError.fromHttp(401, { message: "Api key is invalid" });
    expect(e.kind).toBe("auth");
    expect(e.message).toContain("DATADIVE_API_KEY");
    expect(e.message).toContain("2.datadive.tools/api-key");
  });

  it("402 -> payment", () => {
    const e = ApiError.fromHttp(402, null);
    expect(e.kind).toBe("payment");
    expect(e.message).toMatch(/inactive|paused/i);
  });

  it("403 -> forbidden, echoes server msg", () => {
    const e = ApiError.fromHttp(403, { message: "Niche belongs to a different organization" });
    expect(e.kind).toBe("forbidden");
    expect(e.message).toContain("different organization");
  });

  it("404 -> not_found", () => {
    const e = ApiError.fromHttp(404, { message: "Niche not found" });
    expect(e.kind).toBe("not_found");
    expect(e.message).toContain("Niche not found");
  });

  it("429 -> rate_limit with retry hint", () => {
    const e = ApiError.fromHttp(429, null);
    expect(e.kind).toBe("rate_limit");
    expect(e.message).toMatch(/wait|retry/i);
  });

  it("500 -> server", () => {
    const e = ApiError.fromHttp(500, { message: "Internal error" });
    expect(e.kind).toBe("server");
    expect(e.message).toContain("500");
  });

  it("503 -> server (any 5xx)", () => {
    const e = ApiError.fromHttp(503, null);
    expect(e.kind).toBe("server");
    expect(e.status).toBe(503);
  });

  it("418 -> generic http fallback", () => {
    const e = ApiError.fromHttp(418, { message: "I'm a teapot" });
    expect(e.kind).toBe("http");
    expect(e.message).toBe("I'm a teapot");
  });

  it("handles array NestJS validation messages", () => {
    const e = ApiError.fromHttp(400, { message: ["nicheId must be a string", "pageSize must not exceed 100"] });
    expect(e.message).toContain("nicheId must be a string");
    expect(e.message).toContain("pageSize must not exceed 100");
  });

  describe("QUOTA_EXCEEDED bodies", () => {
    const SUBSCRIPTION_URL = "https://2.datadive.tools/subscription/overview";

    it("400 with the full body -> quota, naming the feature, usage, refresh date and subscription page", () => {
      const body = {
        statusCode: 400,
        error: "QUOTA_EXCEEDED",
        message: "Quota exceeded",
        success: false,
        subscriptionUrl: SUBSCRIPTION_URL,
        feature: "RANK_RADAR_KEYWORDS",
        used: 5000,
        capacity: 5000,
        nextRefreshDate: "2026-10-01T00:00:00.000Z",
      };
      const e = ApiError.fromHttp(400, body);

      expect(e.kind).toBe("quota");
      expect(e.status).toBe(400);
      expect(e.body).toBe(body);
      expect(e.message).toBe(
        "Quota exceeded. This subscription has used up its Rank Radar tracked keywords quota (5000 of 5000 used). " +
          "It refreshes on 2026-10-01. Tell the user which quota ran out and that they can review or raise it on " +
          `their subscription page: ${SUBSCRIPTION_URL} Do not retry this call until the quota has been raised.`,
      );
      // The generic 400 prefix must not leak in.
      expect(e.message).not.toContain("Bad request");
    });

    it("403 (AI Copywriter) -> quota, keeping the server's feature-specific lead message", () => {
      const e = ApiError.fromHttp(403, {
        statusCode: 403,
        error: "QUOTA_EXCEEDED",
        message: "AI Copywriter prompt quota exceeded",
        success: false,
        subscriptionUrl: SUBSCRIPTION_URL,
        feature: "AI_COPYWRITER_PROMPTS",
        used: 12,
        capacity: 12,
        nextRefreshDate: null,
      });

      expect(e.kind).toBe("quota");
      expect(e.status).toBe(403);
      expect(e.message).toMatch(/^AI Copywriter prompt quota exceeded\. /);
      expect(e.message).toContain("AI Copywriter prompts quota (12 of 12 used)");
      expect(e.message).not.toContain("refreshes");
      expect(e.message).not.toContain("Forbidden");
    });

    it("omits usage and the refresh sentence when the backend does not know them", () => {
      const e = ApiError.fromHttp(400, {
        error: "QUOTA_EXCEEDED",
        message: "Quota exceeded",
        success: false,
        subscriptionUrl: SUBSCRIPTION_URL,
        feature: "DIVED_ASINS",
      });

      expect(e.message).toContain("used up its Dive tokens quota.");
      expect(e.message).not.toContain(" of ");
      expect(e.message).not.toContain("refreshes");
      expect(e.message).toContain(SUBSCRIPTION_URL);
    });

    it("still points at the subscription page when no feature is given, and passes unknown features through", () => {
      const noFeature = ApiError.fromHttp(400, {
        error: "QUOTA_EXCEEDED",
        message: "Quota exceeded",
        subscriptionUrl: SUBSCRIPTION_URL,
      });
      expect(noFeature.message).toContain("used up its quota for this action.");
      expect(noFeature.message).toContain(SUBSCRIPTION_URL);

      const unknown = ApiError.fromHttp(400, {
        error: "QUOTA_EXCEEDED",
        message: "Quota exceeded",
        subscriptionUrl: SUBSCRIPTION_URL,
        feature: "SOME_NEW_FEATURE",
      });
      expect(unknown.message).toContain("SOME_NEW_FEATURE quota");
    });

    it("does not treat a legacy flat 'Quota exceeded' body as structured", () => {
      const e = ApiError.fromHttp(400, { message: "Quota exceeded", success: false });
      expect(e.kind).toBe("bad_request");
      expect(e.message).toBe("Bad request: Quota exceeded");
    });

    it("isQuotaExceededBody requires both the discriminant and a subscription URL", () => {
      expect(isQuotaExceededBody({ error: "QUOTA_EXCEEDED", subscriptionUrl: "https://x" })).toBe(true);
      expect(isQuotaExceededBody({ error: "QUOTA_EXCEEDED" })).toBe(false);
      expect(isQuotaExceededBody({ error: "STALE_VALUE", subscriptionUrl: "https://x" })).toBe(false);
      expect(isQuotaExceededBody("QUOTA_EXCEEDED")).toBe(false);
      expect(isQuotaExceededBody(null)).toBe(false);
    });

    it("quotaExceededMessage never quotes a price or a specific plan", () => {
      const msg = quotaExceededMessage({
        error: "QUOTA_EXCEEDED",
        message: "Quota exceeded",
        subscriptionUrl: SUBSCRIPTION_URL,
        feature: "RANK_RADAR_KEYWORDS",
        used: 1,
        capacity: 1,
      });
      expect(msg).not.toMatch(/\$|price|upgrade to|buy/i);
    });
  });
});

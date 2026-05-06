import { describe, it, expect } from "vitest";
import { ApiError } from "../../src/http/errors.js";

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
});

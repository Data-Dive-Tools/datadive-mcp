import { describe, it, expect } from "vitest";
import { alertsQueryInputSchema } from "../../src/tools/alert-query.js";

/**
 * Validation rules for the shared /v1/alerts/* query schema. Per-tool tests
 * assert identity with this schema, so the rules are covered once here.
 */
describe("alerts query schema", () => {
  it("rejects an invalid status enum value", () => {
    expect(() => alertsQueryInputSchema.status.parse("dismissed")).toThrow();
    expect(alertsQueryInputSchema.status.parse("active")).toBe("active");
    expect(alertsQueryInputSchema.status.parse("all")).toBe("all");
  });

  it("rejects an empty or unsupported marketplace", () => {
    expect(() => alertsQueryInputSchema.marketplace.parse("")).toThrow();
    expect(() => alertsQueryInputSchema.marketplace.parse("xyz")).toThrow();
    expect(alertsQueryInputSchema.marketplace.parse("com")).toBe("com");
    expect(alertsQueryInputSchema.marketplace.parse("co.uk")).toBe("co.uk");
  });

  it("rejects a non-ISO-8601 updatedSince", () => {
    expect(() => alertsQueryInputSchema.updatedSince.parse("")).toThrow();
    expect(() => alertsQueryInputSchema.updatedSince.parse("last week")).toThrow();
    expect(alertsQueryInputSchema.updatedSince.parse("2026-05-01")).toBe("2026-05-01");
    expect(alertsQueryInputSchema.updatedSince.parse("2026-05-01T00:00:00Z")).toBe("2026-05-01T00:00:00Z");
  });

  it("rejects pageSize above the API cap of 50", () => {
    expect(() => alertsQueryInputSchema.pageSize.parse(51)).toThrow();
    expect(alertsQueryInputSchema.pageSize.parse(50)).toBe(50);
  });
});

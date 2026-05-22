import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAsinInventoryDistributionTool } from "../../src/tools/get-asin-inventory-distribution.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("get_asin_inventory_distribution tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("URL-encodes all three path params", async () => {
    const fetchMock = mockFetch({
      data: {
        asin: "B08XYZ1234",
        sellerId: "A1 / B2",
        marketplace: "com",
        lastUpdatedAt: null,
        totalSellableUnits: 0,
        distribution: [],
      },
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getAsinInventoryDistributionTool.handler(
      { sellerId: "A1 / B2", marketplace: "com", asin: "B08XYZ1234" },
      CTX,
    );
    expect(getCallUrl(fetchMock)).toBe(
      "https://api.datadive.tools/v1/sellers/A1%20%2F%20B2/marketplaces/com/asins/B08XYZ1234/inventory",
    );
  });

  it("unwraps ResponseDto envelope", async () => {
    const inner = {
      asin: "B08XYZ1234",
      sellerId: "A1B2C3",
      marketplace: "com",
      lastUpdatedAt: "2026-05-20T12:34:56.000Z",
      totalSellableUnits: 120,
      distribution: [
        { fc: "ONT8", state: "CA", availableStock: 90, availableStockPercentage: 0.75 },
        { fc: "BFI4", state: "WA", availableStock: 30, availableStockPercentage: 0.25 },
      ],
    };
    globalThis.fetch = mockFetch({ data: inner }) as unknown as typeof fetch;

    const result = await getAsinInventoryDistributionTool.handler(
      { sellerId: "A1B2C3", marketplace: "com", asin: "B08XYZ1234" },
      CTX,
    );
    expect(result).toEqual(inner);
  });

  it("passes lastUpdatedAt: null through unchanged", async () => {
    const inner = {
      asin: "B08XYZ1234",
      sellerId: "A1B2C3",
      marketplace: "com",
      lastUpdatedAt: null,
      totalSellableUnits: 0,
      distribution: [],
    };
    globalThis.fetch = mockFetch({ data: inner }) as unknown as typeof fetch;

    const result = await getAsinInventoryDistributionTool.handler(
      { sellerId: "A1B2C3", marketplace: "com", asin: "B08XYZ1234" },
      CTX,
    );
    expect(result).toEqual(inner);
    expect((result as { lastUpdatedAt: unknown }).lastUpdatedAt).toBeNull();
  });
});

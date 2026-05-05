import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("loads a valid key with the default base URL", () => {
    const cfg = loadConfig({ DATADIVE_API_KEY: "ddk_live_abc" });
    expect(cfg.apiKey).toBe("ddk_live_abc");
    expect(cfg.baseUrl).toBe("https://api.datadive.tools");
  });

  it("trims whitespace on the api key", () => {
    const cfg = loadConfig({ DATADIVE_API_KEY: "  ddk_live_abc\n" });
    expect(cfg.apiKey).toBe("ddk_live_abc");
  });

  it("strips trailing slashes from the base URL", () => {
    const cfg = loadConfig({
      DATADIVE_API_KEY: "ddk_live_abc",
      DATADIVE_API_BASE_URL: "https://api-staging.datadive.tools///",
    });
    expect(cfg.baseUrl).toBe("https://api-staging.datadive.tools");
  });

  it("throws a helpful error when the api key is missing", () => {
    expect(() => loadConfig({})).toThrow(/DATADIVE_API_KEY environment variable is required/);
    expect(() => loadConfig({})).toThrow(/app\.datadive\.tools\/api-key/);
  });

  it("throws when the api key is empty/whitespace", () => {
    expect(() => loadConfig({ DATADIVE_API_KEY: "   " })).toThrow(/DATADIVE_API_KEY/);
  });
});

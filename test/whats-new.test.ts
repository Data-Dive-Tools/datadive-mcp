import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer } from "../src/server.js";
import { SERVER_INSTRUCTIONS, WHATS_NEW, WHATS_NEW_PROMPT, whatsNewPromptText } from "../src/whats-new.js";
import { allTools } from "../src/tools/index.js";
import { isNewerVersion } from "../src/http/client.js";
import type { Config } from "../src/config.js";

const CONFIG: Config = {
  credentials: { kind: "api-key", apiKey: "ddk_test" },
  baseUrl: "https://api.datadive.tools",
  autoConfirmWrites: false,
};

async function connect() {
  const server = buildServer(CONFIG);
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("what's new", () => {
  it("is sent to the client as server instructions on connect", async () => {
    const client = await connect();
    expect(client.getInstructions()).toBe(SERVER_INSTRUCTIONS);
  });

  it("is offered as the whats_new prompt, listing every entry", async () => {
    const client = await connect();
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toEqual([WHATS_NEW_PROMPT.name]);

    const prompt = await client.getPrompt({ name: WHATS_NEW_PROMPT.name });
    expect(prompt.messages).toEqual([
      { role: "user", content: { type: "text", text: whatsNewPromptText() } },
    ]);
    for (const entry of WHATS_NEW) {
      for (const item of entry.items) expect(whatsNewPromptText()).toContain(item);
    }
  });

  it("mentions only the latest releases in the instructions", () => {
    expect(SERVER_INSTRUCTIONS).toContain(`v${WHATS_NEW[0]!.version}`);
    expect(SERVER_INSTRUCTIONS).not.toContain(`v${WHATS_NEW[WHATS_NEW.length - 1]!.version}`);
  });

  it("names only tools that exist", () => {
    const names = new Set(allTools.map((t) => t.name));
    const mentioned = [SERVER_INSTRUCTIONS, whatsNewPromptText()].flatMap((t) =>
      [...t.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]!),
    );
    for (const name of mentioned.filter((n) => n !== WHATS_NEW_PROMPT.name)) expect(names).toContain(name);
  });

  it("is listed newest first", () => {
    for (let i = 1; i < WHATS_NEW.length; i++) {
      expect(isNewerVersion(WHATS_NEW[i - 1]!.version, WHATS_NEW[i]!.version)).toBe(true);
      expect(WHATS_NEW[i - 1]!.released >= WHATS_NEW[i]!.released).toBe(true);
    }
  });
});

import { z } from "zod";
import { httpDelete } from "../http/client.js";
import { requireConfirmation } from "./confirm.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The niche to delete. Get one from `list_niches`."),
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Must be true to proceed — deleting a niche destroys its keywords, competitors and dive history " +
        "permanently. Confirm with the user first.",
    ),
};

export const deleteNicheTool: ToolDefinition<typeof inputSchema> = {
  name: "delete_niche",
  title: "Delete a Niche",
  description:
    "Use this to permanently remove a niche the user no longer needs. ⚠️ Deletes the niche and everything " +
    "attached to it — keywords, competitors, all dives and diveboxes — and cannot be undone; the dive tokens " +
    "already spent on it are NOT refunded. Set `confirm: true` only after the user approves. A niche used by " +
    "any Rank Radar cannot be deleted: the call fails with a conflict, so delete or archive those rank radars " +
    "first (`list_rank_radars` with the `nicheId` filter shows them).",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    const pending = requireConfirmation(
      args.confirm,
      ctx,
      "Deleting this niche removes its keywords, competitors and all dive history permanently. " +
        "The dive tokens already spent on it are not refunded.",
    );
    if (pending) return pending;

    // The endpoint answers 204 No Content, so there is no payload to return. Hand the
    // model an explicit result instead of `null`, which reads as a failed call.
    await httpDelete<null>(
      { config: ctx.config, toolName: "delete_niche" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}`,
    );
    return { status: "deleted", nicheId: args.nicheId };
  },
};

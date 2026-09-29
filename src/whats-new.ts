/**
 * "What's new" for connected assistants and users (RS-11631).
 *
 * MCP has no message for "a new version with new features is out": `tools/list_changed` only
 * reaches a live session, and the hosted server is stateless, so no session survives a deploy.
 * Two protocol features carry the news instead, both built from the list below:
 *
 *   - `SERVER_INSTRUCTIONS`, sent to the client in the `initialize` result on every connection,
 *     so the assistant knows the latest additions without the user asking.
 *   - The `whats_new` prompt, which the user picks by hand (e.g. `/mcp__datadive__whats_new` in
 *     Claude Code), for the full recent list.
 *
 * Both the stdio server (`buildServer`) and the hosted server register them from these exports,
 * so there is one copy. Add an entry here with every release that changes what a user can do;
 * keep the wording for users, not developers. Newest first.
 */

export interface WhatsNewEntry {
  /** Package version that shipped the change. */
  version: string;
  /** yyyy-mm-dd the change reached the hosted server. */
  released: string;
  items: string[];
}

export const WHATS_NEW: ReadonlyArray<WhatsNewEntry> = [
  {
    version: "0.16.1",
    released: "2026-09-29",
    items: [
      "`get_rank_radar_data` returns every tracked keyword of a Rank Radar in one answer again, also in AI " +
        "apps that still show its older inputs. Pass `currentPage` / `pageSize` to read one page at a time.",
    ],
  },
  {
    version: "0.16.0",
    released: "2026-09-28",
    items: [
      "Niche research from your own competitor list (`create_niche_dive_from_competitors_list`): give 2 to 200 " +
        "ASINs and the niche is built from exactly those products, with no automatic competitor search.",
    ],
  },
  {
    version: "0.15.0",
    released: "2026-09-28",
    items: [
      "Search Query Performance for Rank Radar keywords (`get_rank_radar_sqp_data`): how shoppers search, " +
        "click, add to cart and buy, for the whole market and for your product.",
      "PPC data for Rank Radar keywords (`get_rank_radar_ppc_data`): sponsored rank, spend, sales, ACOS and " +
        "CPC per keyword, optionally broken down by campaign.",
      "Your Sponsored Products campaigns (`list_ppc_campaigns`): totals and placement performance per " +
        "campaign, sortable by any metric, e.g. the top spenders first.",
    ],
  },
  {
    version: "0.14.0",
    released: "2026-09-25",
    items: [
      "Rank Radar keywords are now read page by page (`get_rank_radar_data`, up to 100 keywords per page), " +
        "so large Rank Radars load reliably.",
    ],
  },
  {
    version: "0.13.0",
    released: "2026-09-09",
    items: [
      "Before creating a Rank Radar, you are warned when the same product family is already tracked by " +
        "another of your Rank Radars.",
    ],
  },
  {
    version: "0.12.0",
    released: "2026-09-07",
    items: ["Search and sort your niches by name, hero keyword or ASIN (`list_niches`)."],
  },
];

/** How many releases the connection-time instructions mention; the prompt lists them all. */
const INSTRUCTIONS_RELEASES = 2;

function formatEntries(entries: ReadonlyArray<WhatsNewEntry>): string {
  return entries
    .map((e) => `${e.released} (v${e.version}):\n${e.items.map((i) => `- ${i}`).join("\n")}`)
    .join("\n\n");
}

export const SERVER_INSTRUCTIONS =
  "DataDive tools for Amazon sellers: niche research (niches, keywords, roots, competitors, Ranking Juice), " +
  "Rank Radar keyword rank tracking with SQP and PPC data, the seller's catalog, listing changes, inventory, " +
  "PPC campaigns and alerts. Start with a discovery tool: `list_niches`, `list_rank_radars` or " +
  "`list_seller_profiles`. Tools that spend tokens ask for confirmation first.\n\n" +
  `Recently added:\n${formatEntries(WHATS_NEW.slice(0, INSTRUCTIONS_RELEASES))}\n\n` +
  "When one of these additions fits what the user is doing, mention it once. The user can see the full " +
  "list with the `whats_new` prompt.";

export const WHATS_NEW_PROMPT = {
  name: "whats_new",
  title: "What's new in DataDive",
  description: "Recent additions to the DataDive tools, newest first.",
};

/** The prompt's single user message: the list plus a request to explain it briefly. */
export function whatsNewPromptText(): string {
  return (
    "Here is what is new in the DataDive tools, newest first:\n\n" +
    `${formatEntries(WHATS_NEW)}\n\n` +
    "Summarize this for me in a few short lines, and for each addition give one example question I could ask you."
  );
}

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
    version: "0.20.1",
    released: "2026-10-23",
    items: [
       "Run Fast Keywords from just an ASIN and read the result (`run_fast_keywords`, `get_fast_keywords`, " +
        "`get_fast_keywords_keywords`, `list_fast_keywords`, `refresh_fast_keywords`). A run costs 1 Dive token " +
        "and asks you to confirm first. A finished run can be refreshed once every 24 hours, and " +
        "`create_niche_dive` can now link a full niche dive to the Fast Keywords run it follows.",
    ]
  },
  {
    version: "0.20.0",
    released: "2026-10-23",
    items: [
      "See your Spaces and labels (`list_spaces`, `list_labels`), put a niche into them or take it out " +
        "(`add_niche_spaces`, `remove_niche_spaces`, `add_niche_labels`, `remove_niche_labels`), and filter " +
        "`list_niches` and `list_rank_radars` by Space and label. Free. You can change a niche's Spaces and " +
        "labels when you can manage it, as in the web app; a Space you only have view rights on is refused.",
    ],
  },
  {
    version: "0.17.1",
    released: "2026-10-13",
    items: [
      "Rank Radar tags end-to-end: list, create, update, delete tags, and attach or detach up to 1000 " +
        "keywords per call (`list_rank_radar_tags`, `create_rank_radar_tag`, `update_rank_radar_tag`, " +
        "`delete_rank_radar_tag`, `add_rank_radar_tag_search_terms`, `remove_rank_radar_tag_search_terms`). " +
        "The highlights on each keyword in `get_rank_radar_data` are the same objects, so you can go " +
        "from a ranking view to editing its tags without a round trip.",
    ]},
    {
      version: "0.17.0",
      released: "2026-10-12",
      items: [
      "Add your own keywords to a niche's Master Keyword List, or take them back out (`add_niche_keywords`, " +
        "`remove_niche_keywords`). Free while the niche is fresh; on an older niche you are asked to confirm " +
        "the Dive tokens first. `get_niche_keywords` now shows where each keyword came from.",
      "See and change which keywords a niche hides (`list_keyword_exclusions`, `add_keyword_exclusions`, " +
        "`remove_keyword_exclusions`): exclude one exact keyword, or every keyword containing a phrase. Free.",
    ],
  },
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

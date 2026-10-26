/**
 * Hand-mirrored DTOs from the DataDive backend (v1 external API).
 *
 * Source of truth (in this priority order):
 *   1. Live Swagger:    https://developer.datadive.tools/docs#/v1
 *                       (machine-readable: https://developer.datadive.tools/docs-json)
 *   2. Backend DTOs:    datadive-backend/src/external-api/dto/*.ts
 *                       datadive-backend/src/niche-research/dto/rank-radar.response.dto.ts
 *                       datadive-backend/src/common/dto/response.dto.ts
 *                       datadive-backend/src/common/pagination/pagination.dto.ts
 *   3. Controller:      datadive-backend/src/external-api/external-api-v1.controller.ts
 *
 * Last synced: 2026-06-19.
 *
 * The MCP server forwards JSON straight to the LLM, so deeply-nested DTOs are
 * intentionally typed loosely (with `unknown` or pass-through Records) where
 * the TS surface doesn't add safety. Pin tighter as use cases require.
 */

// ─── Envelope + pagination ───────────────────────────────────────────────────

/** Generic NestJS response envelope: { message?, success?, data? }. */
export interface ResponseEnvelope<T> {
  message?: string;
  /** @deprecated — use HTTP status as the success indicator. */
  success?: boolean;
  data?: T | null;
}

/** Standard pagination envelope returned by list endpoints. */
export interface PaginationResponse<T> {
  data: T[];
  currentPage: number;
  pageSize: number;
  total: number;
  lastPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * ISO-8601 date or timestamp, mirroring the backend's `@IsISO8601()` (date-only
 * allowed). Shared by the date/timestamp query params across /v1 tools
 * (alerts `updatedSince`, usage `startDate`/`endDate`).
 */
export const ISO_8601 = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Marketplace codes accepted by `marketplace` params across /v1 endpoints
 * (alerts, inventory). Mirrors the backend's `SupportedMarketplaceEnum`.
 */
export const SUPPORTED_MARKETPLACES = [
  "com",
  "ca",
  "co.uk",
  "com.mx",
  "in",
  "fr",
  "de",
  "es",
  "it",
  "co.jp",
] as const;

// ─── /v1/niches  (NicheList = PaginationResponse<NicheItem>) ─────────────────

export interface NicheItem {
  nicheId: string;
  heroKeyword: string;
  nicheLabel: string;
  /** Amazon marketplace TLD: "com", "uk", "de", etc. */
  marketplace: string;
  /** ISO date string when the Niche was last researched. Nullable. */
  latestResearchDate: string | null;
  /** Ids of the Spaces the niche is in (see `list_spaces`). */
  spaces: number[];
  /** Ids of the labels on the niche (see `list_labels`). */
  labels: number[];
}

export type NicheList = PaginationResponse<NicheItem>;

// ─── Spaces and labels  (GET /v1/spaces, GET /v1/labels, ExternalTagNodeDto, wrapped) ─

/** Mirrors the API's cap on ids per request and per list filter. */
export const NICHE_TAG_IDS_MAX_PER_CALL = 100;

export interface TagNode {
  id: number;
  name: string;
  /** The names from the root down to this node, joined with `/`. */
  path: string;
  parentId: number | null;
  children: TagNode[];
}

// ─── POST /v1/niches/:nicheId/(spaces|labels)[/remove]  (wrapped) ─────────────

export interface AddNicheTagsResult {
  added: number;
  /** Already attached; left untouched. */
  alreadyPresent: number;
}

export interface RemoveNicheTagsResult {
  removed: number;
  /** Not attached; left untouched. */
  notPresent: number;
}

// ─── /v1/niches/:nicheId/keywords  (GetMasterKeywordListResult, wrapped) ─────

/** Map of competitor ASIN -> rank (or null when unranked). */
export type AsinRanks = Record<string, number | null>;

/**
 * How a keyword got into the Master Keyword List: `mkl` found by the dive, `manual` added by hand,
 * `outlier` / `residue` moved in from those lists. The last three are what `remove_niche_keywords`
 * can take back out.
 */
export type MklKeywordOrigin = "mkl" | "manual" | "outlier" | "residue";

export interface MasterKeyword {
  keyword: string;
  searchVolume: number;
  /** "Outlier" or a numeric relevancy score. */
  relevancy: string | number;
  asinRanks: AsinRanks;
  origin: MklKeywordOrigin;
}

export interface GetMasterKeywordListResult {
  keywords: MasterKeyword[];
  /** ISO date string. */
  latestResearchDate: string;
}

// ─── POST /v1/niches/:nicheId/keywords  (AddNicheKeywordsResponseDto, wrapped) ─

/** Mirrors the API's `ADD_MANUAL_KEYWORDS_MAX_LIMIT` and `MANUAL_KEYWORD_MAX_LENGTH`. */
export const NICHE_KEYWORDS_MAX_PER_CALL = 100;
export const NICHE_KEYWORD_MAX_LENGTH = 255;

export interface AddNicheKeywordsResult {
  /** Every submitted keyword, in exactly one group. */
  originBreakdown: {
    alreadyInMkl: string[];
    takenFromOutliers: string[];
    takenFromResidue: string[];
    addedManually: string[];
  };
  /** Dive tokens spent (or, on a dry run, the most the re-dive can cost). 0 for a fresh niche. */
  tokensUsed: number;
  /** Present only when the add re-dived a stale niche; poll `get_dive_status` with `diveId`. */
  refresh?: { diveId: string; estimatedCompletionDate: string };
}

/** 400 body when a stale-niche add would cost more than `maxTokensUsed`. Nothing is saved or charged. */
export interface MaxTokensExceededBody {
  error: "MAX_TOKENS_EXCEEDED";
  message: string;
  maxTokensUsed: number;
  tokensUsed: number;
}

// ─── POST /v1/niches/:nicheId/keywords/remove  (RemoveNicheKeywordsResponseDto, wrapped) ─

export interface RemoveNicheKeywordsResult {
  removedManual: string[];
  sentBackToOutliers: string[];
  sentBackToResidue: string[];
  /** Found by the dive itself, or not in the niche at all. Left unchanged. */
  notRemovable: string[];
}

// ─── /v1/niches/:nicheId/keyword-exclusions  (KeywordExclusionsDto, wrapped) ──

/** Mirrors the API's `KEYWORD_EXCLUSIONS_MAX_PER_REQUEST` and `KEYWORD_EXCLUSIONS_MAX_PER_NICHE`. */
export const KEYWORD_EXCLUSIONS_MAX_PER_CALL = 100;
export const KEYWORD_EXCLUSIONS_MAX_PER_NICHE = 1000;

export interface KeywordExclusions {
  /** Oldest first. `searchVolume` is 0 when the niche has no such keyword. */
  exact: Array<{ keyword: string; searchVolume: number }>;
  /** Oldest first. Volume and count of the keywords the phrase hides, besides exact-excluded ones. */
  phrase: Array<{ phrase: string; searchVolume: number; excludedKeywordsCount: number }>;
}

export interface KeywordExclusionEntries {
  exact: string[];
  phrase: string[];
}

/** POST /v1/niches/:nicheId/keyword-exclusions: the lists after the add, plus what changed. */
export interface AddKeywordExclusionsResult extends KeywordExclusions {
  added: KeywordExclusionEntries;
  /** Already excluded; left as is. */
  unchanged: KeywordExclusionEntries;
}

/** POST /v1/niches/:nicheId/keyword-exclusions/remove: the lists after the remove, plus what changed. */
export interface RemoveKeywordExclusionsResult extends KeywordExclusions {
  removed: KeywordExclusionEntries;
  /** Were not excluded; left as is. */
  unchanged: KeywordExclusionEntries;
}

// ─── /v1/niches/:nicheId/competitors  (GetCompetitorListResult, wrapped) ─────

/**
 * A single Competitor row. The fields documented here are the ones worth naming for
 * a consumer; the index signature keeps the rest of the payload (keyword and ads
 * diagnostics, evaluation labels) available to the LLM without enumerating it.
 */
export interface Competitor {
  asin: string;
  /** Product title. */
  title: string;
  /** Best Sellers Rank. Null when Amazon publishes none for the product. */
  bsr: number | null;
  /** Amazon category name. Null when unknown. */
  category: string | null;
  /** Full category path, e.g. "Pet Supplies > Dogs > Apparel & Accessories". Null when unknown. */
  categoryTree: string | null;
  brand: string | null;
  price: number | null;
  rating: number | null;
  reviewCount: number | null;
  sales: number | null;
  revenue: number | null;
  numberOfVariations: number;
  /**
   * Total Ranking Juice for this listing. Use `get_ranking_juice` for the breakdown
   * by title, bullets and description.
   */
  listingRankingJuice: { value: number };
  [key: string]: unknown;
}

/**
 * Niche competitors response — several nested DTOs from the backend (MklStatisticsData,
 * OpportunityEvaluation, MklBenchmark, CompetitorsStrength). We type the outer shape and
 * the competitor rows, and leave the niche-level aggregates as opaque records; the LLM
 * sees the full JSON and can reason about it. Tighten if a specific consumer needs it.
 */
export interface GetCompetitorListResult {
  /** Marketplace enum (AmazonStore in backend). */
  marketplace: string;
  statistics: Record<string, unknown>;
  opportunityEvaluation: Record<string, unknown>;
  benchmark: Record<string, unknown>;
  competitorsStrength: Record<string, unknown>;
  competitors: Competitor[];
  latestResearchDate: string;
}

// ─── /v1/niches/:nicheId/ranking-juices  (NicheRankingJuices, wrapped) ───────

export interface RankingJuiceProperty {
  rankingJuice: number;
}

export interface ListingRankingJuice {
  rankingJuice: number;
  title: RankingJuiceProperty;
  bullets: RankingJuiceProperty;
  description: RankingJuiceProperty;
}

export interface CompetitorRankingJuice {
  asin: string;
  listing: ListingRankingJuice;
}

export interface NicheRankingJuices {
  currentListing: ListingRankingJuice;
  optimizedListing: ListingRankingJuice;
  competitors: CompetitorRankingJuice[];
  latestResearchDate: string;
}

// ─── /v1/niches/rank-radars  (ExternalRankRadarListResponseDto, wrapped) ─────

/**
 * States a Rank Radar can be reported in. Matches the backend's `ExternalRankRadarStatus`, so a
 * value read out of a response can be fed straight back into the `status` filter.
 *
 * `PAUSED` is what the API's own archive endpoint produces (tracking stopped, data kept);
 * `ARCHIVED` is a Rank Radar that was deleted.
 */
export const RANK_RADAR_STATES = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;
export type RankRadarState = (typeof RANK_RADAR_STATES)[number];

/**
 * Accepted values of the `status` query param on /v1/niches/rank-radars. `ALL` is filter-only —
 * it selects active and paused together and never appears as an item's own status.
 *
 * The API rejects anything else with 400 (datadive-backend `ExternalKeywordRankTrackerStatus`).
 * Before RS-11518 it accepted only `ALL`/`PAUSED` and silently answered anything else with the
 * active set, so this list must not be widened ahead of the API.
 */
export const RANK_RADAR_STATUSES = [...RANK_RADAR_STATES, "ALL"] as const;
export type RankRadarStatus = (typeof RANK_RADAR_STATUSES)[number];

/** A row exactly as `/v1/niches/rank-radars` sends it, before the tool minimizes it. */
export interface ApiRankRadarItem {
  id: string;
  status: RankRadarState;
  /** Only `asin` carries information; `id`/`krtId` are internal row identifiers. */
  asin: { id: string; krtId: string; asin: string };
  marketplace: string;
  keywordCount: number;
  title: string;
  imageUrl: string;
  top10KW: number | null;
  top10SV: number | null;
  top50KW: number | null;
  top50SV: number | null;
}

/** A row as `list_rank_radars` returns it: `asin` flattened to the ASIN, no internal identifiers. */
export interface RankRadarItem extends Omit<ApiRankRadarItem, "asin"> {
  asin: string;
}

export type ApiRankRadarList = PaginationResponse<ApiRankRadarItem>;
export type RankRadarList = PaginationResponse<RankRadarItem>;

// ─── POST /v1/niches/rank-radars  (CreateRankRadarSuccessResponseDto, bare) ──

/**
 * A non-blocking notice the API attaches to an otherwise successful write (RS-11615).
 * `message` is customer-facing prose composed by the backend so every surface — the
 * DataDive UI, the public API and this server — words it identically; show it verbatim
 * rather than paraphrasing it. Treat an unrecognised `code` as informational.
 */
export interface ApiWarning {
  /** Machine-readable code, e.g. `FAMILY_ALREADY_TRACKED`. */
  code: string;
  message: string;
  /** Ids of the existing resources the warning refers to, when it names any. */
  existingRankRadarIds?: string[];
}

/** Result of creating a Rank Radar. */
export interface CreateRankRadarResult {
  /** `null` when the request was a dry run, because nothing was created. */
  rankRadarId: string | null;
  /** Non-blocking notices about this creation. Empty or absent when there is nothing to flag. */
  warnings?: ApiWarning[];
}

// ─── POST /v1/niches/dives  (CreateNicheDiveSuccessResponseDto, bare) ────────

/** Result of kicking off a Niche Dive. Poll get_dive_status with `diveId`. */
export interface CreateNicheDiveResult {
  diveId: string;
  /** ISO-8601 estimated completion timestamp. */
  estimatedCompletionDate: string;
}

// ─── POST /v1/niches/:nicheId/redive  (RediveNicheResponseDto, wrapped) ──────

/**
 * Result of re-diving an existing niche. Same shape as CreateNicheDiveResult and
 * polled the same way, but the niche keeps its existing `nicheId` — so unlike a new
 * dive, `get_dive_status` success carries no id the caller did not already have.
 */
export interface RediveNicheResult {
  diveId: string;
  /** ISO-8601 estimated completion timestamp. */
  estimatedCompletionDate: string;
}

// ─── GET /v1/niches/dives/:diveId  (NicheDiveStatus*ResponseDto, bare oneOf) ──

/**
 * Niche Dive status, discriminated on `status`:
 *   - "in_progress" → estimatedCompletionDate
 *   - "success"     → nicheId + token usage (feed nicheId to list_niches / get_niche_*)
 *   - "error"       → error message
 */
export type DiveStatus =
  | { diveId: string; status: "in_progress"; estimatedCompletionDate: string }
  | { diveId: string; status: "success"; nicheId: string; tokensUsed: number; tokensLeft: number }
  | { diveId: string; status: "error"; error: string };

// ─── /v1/niches/rank-radars/:rankRadarId  (KrtKeywordListResponseDto, wrapped) ─

export interface KrtAsinRank {
  /** yyyy-mm-dd. */
  date: string;
  organicRank?: number | null;
  sponsoredRank?: number | null;
  impressionRank?: number | null;
}

/**
 * A tag ("highlight") attached to a Rank Radar keyword in its ranking timeline. Same object as a
 * row in `list_rank_radar_tags` — the `id` field is the one the tag-management tools (update,
 * delete, add/remove search terms) take as `tagId`. The v1 response field names are frozen, so
 * this type does not rename them: `krtId` is the Rank Radar id, `krtKeywordId` the keyword id.
 * `type` is the backend `KRTHighlightType` enum; the system "paused" tag uses the reserved colour
 * `TAG_RESERVED_COLOR` and is also surfaced here.
 */
export interface KrtHighlight {
  id: string;
  krtId: string;
  krtKeywordId: string;
  title: string;
  description: string | null;
  color: string | null;
  type: string;
  /** ISO-8601 timestamp or date; null when the tag has no window. */
  startAt: string | null;
  /** ISO-8601 timestamp or date; null when the tag has no window. */
  endAt: string | null;
}

export interface KrtKeyword {
  id: string;
  keyword: string;
  searchVolume: number | null;
  /** Phrase relevancy score for this keyword within its Niche. */
  relevancy?: number | null;
  ranks: KrtAsinRank[];
  /** User tags on this keyword — the same objects `list_rank_radar_tags` returns (RS-11822). */
  highlights: KrtHighlight[];
  /** PPC data. Still sent by the API but due for removal (RS-11744); kept opaque. */
  adData?: Record<string, unknown> | null;
  /** SQP data. Still sent by the API but due for removal (RS-11744); kept opaque. */
  sqpData?: Record<string, unknown> | null;
}

/** One page of a Rank Radar's active keywords (paged since RS-11683); paused keywords are not included. */
export type RankRadarKeywordList = PaginationResponse<KrtKeyword>;

// ─── /v1/niches/rank-radars/:rankRadarId/tags  (RS-11822) ────────────────────────────────────

/** Mirrors backend `TAG_TITLE_MAX_LENGTH`. */
export const TAG_TITLE_MAX_LENGTH = 100;

/** Mirrors backend `TAG_KEYWORD_IDS_MAX` — attach/detach cap and initial-assignment cap on create. */
export const TAG_KEYWORD_IDS_MAX = 1000;

/**
 * Reserved for the system "paused" tag the quota pauser writes. Rejected with 400 on tag
 * create and update; the system tag that uses it is excluded from `list_rank_radar_tags` and
 * returns 404 on update / delete / search-term attach / search-term remove.
 */
export const TAG_RESERVED_COLOR = "#EB5757";

/** `#RRGGBB` only, matching the UI colour picker's output. Not `#C9D` short form, not `rgba(...)`. */
export const TAG_HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** A single tag row — `list` returns these, `create` and `update` return one of them. */
export interface RankRadarTag {
  id: string;
  title: string;
  color: string | null;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  keywordCount: number;
  createdAt: string | null;
}

/** `GET /v1/niches/rank-radars/:rankRadarId/tags` — bare paginated body (follows the backend list pattern). */
export type RankRadarTagList = PaginationResponse<RankRadarTag>;

/**
 * `POST .../tags/:tagId/search-terms` (attach) and `.../search-terms/remove` (detach). Kept
 * opaque for now — the backend side ships in RS-11821 and its response shape is not yet frozen.
 * When RS-11821 lands, tighten this to the real DTO.
 */
export type TagSearchTermsResult = Record<string, unknown>;

// ─── /v1/niches/rank-radars/:rankRadarId/sqp  (RankRadarSqpKeywordListResponseDto, bare) ─

/** SQP metrics of one keyword, aggregated over the requested range. Null when Amazon has no SQP data for it. */
export interface RankRadarSqpKeyword {
  id: string;
  keyword: string;
  numberOfDaysWithData: number | null;
  searchQueryVolume: number | null;
  searchQueryScore: number | null;
  impressionsTotalCount: number | null;
  impressionsAsinCount: number | null;
  impressionsAsinShare: number | null;
  clicksTotalCount: number | null;
  clicksAsinCount: number | null;
  clicksAsinShare: number | null;
  clicksClickRate: number | null;
  cartAddsTotalCount: number | null;
  cartAddsAsinCount: number | null;
  cartAddsAsinShare: number | null;
  cartAddsCartAddRate: number | null;
  purchasesTotalCount: number | null;
  purchasesAsinCount: number | null;
  purchasesAsinShare: number | null;
  purchasesPurchaseRate: number | null;
  ctrTotal: number | null;
  ctrAsin: number | null;
  cvrTotal: number | null;
  cvrAsin: number | null;
}

export type RankRadarSqpKeywordList = PaginationResponse<RankRadarSqpKeyword>;

// ─── /v1/niches/rank-radars/:rankRadarId/ppc  (RankRadarPpcKeywordListResponseDto, bare) ─

/** One campaign/ad group targeting the keyword; present only with `includeCampaigns=true`. */
export interface RankRadarPpcCampaign {
  campaignId: number;
  campaignName: string;
  adGroupName: string;
  matchType: string | null;
  targeting: string | null;
  costPerClicks: number | null;
  totalImpressions: number | null;
  totalOrders: number | null;
  totalClicks: number | null;
  ppcSpend: number | null;
  ppcSales: number | null;
  clickThroughRate: number | null;
  conversionRate: number | null;
  acos: number | null;
}

/** PPC metrics of one keyword, aggregated over the requested range. */
export interface RankRadarPpcKeyword {
  id: string;
  keyword: string;
  /** Median sponsored rank over the range. */
  sponsoredRank: number | null;
  impressionRank: number | null;
  impressionRankShare: number | null;
  exactMatches: number | null;
  phraseMatches: number | null;
  broadMatches: number | null;
  autoMatches: number | null;
  organicSales: number | null;
  ppcSales: number | null;
  ppcSpend: number | null;
  costPerClicks: number | null;
  clickThroughRate: number | null;
  conversionRate: number | null;
  totalClicks: number;
  totalImpressions: number;
  totalOrders: number;
  acos: number;
  campaigns?: RankRadarPpcCampaign[];
}

export type RankRadarPpcKeywordList = PaginationResponse<RankRadarPpcKeyword>;

// ─── /v1/seller_profiles/:sellerId/marketplaces/:marketplace/ppc/campaigns ───
//      (PpcCampaignsExternalListDto, bare PaginationResponse)

/** Mirrors the backend's `PpcCampaignsBaseSortBy`. */
export const PPC_CAMPAIGN_BASE_SORT_BY = [
  "name",
  "state",
  "bidStrategy",
  "budget",
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "spend",
  "unitsSold",
  "sales",
  "acos",
  "cvr",
  "tosImpressionShare",
] as const;

/** Mirrors the backend's `PpcCampaignsPlacementSortBy`; accepted only with placements included. */
export const PPC_CAMPAIGN_PLACEMENT_SORT_BY = [
  ...(["tos", "ros", "pp", "off"] as const).flatMap((p) =>
    (["Impressions", "Clicks", "Spend", "Sales", "UnitsSold", "Ctr", "Cpc", "Acos"] as const).map(
      (m) => `${p}${m}` as const,
    ),
  ),
  "tosBidAdjustment",
  "rosBidAdjustment",
  "ppBidAdjustment",
] as const;

/** Mirrors the backend's `CampaignStateFilter`. */
export const PPC_CAMPAIGN_STATES = ["ENABLED", "PAUSED"] as const;

export interface PpcPlacementMetrics {
  /** Placement bid adjustment, percent. Null for off-Amazon, which has none. */
  bidAdjustment: number | null;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  spend: number;
  unitsSold: number;
  sales: number;
  acos: number | null;
}

export interface PpcCampaign {
  campaignId: number;
  name: string;
  type: string | null;
  state: string;
  targetingType: string | null;
  bidStrategy: string | null;
  budget: { type: string | null; amount: number | null; currencyCode: string | null };
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  cvr: number | null;
  spend: number;
  unitsSold: number;
  orders: number;
  sales: number;
  tosImpressionShare: number | null;
  acos: number | null;
  roas: number | null;
  tacos: number | null;
  asinCount: number;
  placements?: {
    topOfSearch: PpcPlacementMetrics;
    restOfSearch: PpcPlacementMetrics;
    productPage: PpcPlacementMetrics;
    offAmazon: PpcPlacementMetrics;
    homePageBidAdjustment: number | null;
  };
}

export type PpcCampaignList = PaginationResponse<PpcCampaign>;

// ─── /v1/sellers/:sellerId/marketplaces/:marketplace/asins/:asin/inventory ────
//      (InventoryByFcResponseDto, wrapped)

export interface InventoryByFcItem {
  /** Fulfillment center code. */
  fc: string;
  /** State or region code where the FC is located, when known. */
  state: string;
  /** Units of sellable inventory currently at this FC. May be 0 when stock is out. */
  availableStock: number;
  /** Share of the ASIN's total sellable inventory at this FC, as a 0..1 fraction. */
  availableStockPercentage: number;
}

export interface InventoryByFcResponse {
  asin: string;
  sellerId: string;
  /** Marketplace enum: "com", "ca", "co.uk", "com.mx", "in", "fr", "de", "es", "it", "co.jp". */
  marketplace: string;
  /** ISO timestamp of the last live-stock refresh, which the metrics come from. Null if none in the last 30 days. */
  lastUpdatedAt: string | null;
  /** ISO timestamp of the last `distribution` refresh, usually up to 2 days behind. Null if none in the last 30 days. */
  distributionLastUpdatedAt: string | null;
  // Metrics: null when Amazon has no data, or when listed in `lockedFields`.
  fulfillableStock: number | null;
  totalStock: number | null;
  reservedStock: number | null;
  inboundStock: number | null;
  researchingStock: number | null;
  unfulfillableStock: number | null;
  daysOfStock: number | null;
  daysOfStockSource: "AMAZON" | "ESTIMATE" | null;
  daysOfStock30: number | null;
  daysOfStock90: number | null;
  inLowInventoryState: boolean | null;
  /** Fees are in `currency`. */
  estWeeklyLilf: number | null;
  estLtsfNextAssessment: number | null;
  ltsfLastMonthActual: number | null;
  agedUnits: number | null;
  oldestUnitAgeDays: number | null;
  /** ISO 4217 marketplace currency, e.g. "USD". */
  currency: string;
  /** Metrics the user's plan does not include; returned as null. */
  lockedFields: string[];
  lockedReason: "PLAN_UPGRADE_REQUIRED" | null;
  totalSellableUnits: number;
  distribution: InventoryByFcItem[];
}

// ─── /v1/alerts/indexing-issues  (IndexingIssueAlertListDto, bare) ───────────

/**
 * Allowed values for the `status` query param on the /v1/alerts/* endpoints.
 * `active` is the server-side default; dismissed alerts are never returned.
 */
export const ALERT_STATUSES = ["active", "resolved", "all"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export interface IndexingIssueAlertItem {
  id: number;
  /** The ASIN that is no longer indexed for its tracked keywords. */
  asin: string;
  title: string | null;
  imageUrl: string | null;
  /** True when the ASIN is a parent of a variation family. */
  isParent: boolean;
  sellerId: string;
  marketplace: string;
  /** ISO timestamp of when the alert was most recently surfaced. Updates each time it re-fires. */
  lastAlertedAt: string;
  /** ISO timestamp of when the alert was resolved, or null if still active. */
  resolvedAt: string | null;
}

export type IndexingIssueAlertList = PaginationResponse<IndexingIssueAlertItem>;

// ─── /v1/alerts/blind-spend  (BlindSpendAlertListDto, bare) ──────────────────

export interface BlindSpendSearchTerm {
  /** The customer search term that wasted spend. */
  term: string;
  spend: number | null;
  sales: number | null;
  clicks: number | null;
  /** Conversion rate as a 0..1 fraction. */
  cvr: number | null;
  impressions: number | null;
}

export interface BlindSpendAlertItem {
  id: number;
  asin: string | null;
  title: string | null;
  imageUrl: string | null;
  sellerId: string;
  marketplace: string;
  /** ISO timestamp of when the alert was most recently surfaced. Updates each time it re-fires. */
  lastAlertedAt: string;
  /** ISO timestamp of when the alert was resolved, or null if still active. */
  resolvedAt: string | null;
  /** Total ad spend across the unresolved wasted-spend search terms. */
  wastedSpend: number;
  totalKeywordCount: number;
  unresolvedKeywordCount: number;
  /** The unresolved wasted-spend search terms. */
  searchTerms: BlindSpendSearchTerm[];
}

export type BlindSpendAlertList = PaginationResponse<BlindSpendAlertItem>;

// ─── Billable features (shared by /v1/quota and /v1/usage) ───────────────────

/**
 * Billable feature types. These are both the keys of the `quota.features` object
 * and the allowed values of the `type` filter on /v1/usage. Mirrors the backend's
 * billable-feature enum.
 */
export const BILLABLE_FEATURE_TYPES = [
  "DIVED_ASINS",
  "PRODUCT_BRIEF_ASINS",
  "AI_COPYWRITER_PROMPTS",
  "RANK_RADAR_KEYWORDS",
] as const;
export type BillableFeatureType = (typeof BILLABLE_FEATURE_TYPES)[number];

// ─── /v1/niches/:nicheId/roots  (ExternalRootResponseDto[], wrapped) ─────────

export interface RootsTableItem {
  /** A word or word-combination extracted from the master keyword list. */
  root: string;
  /** Count of keywords in the master list that contain this root. */
  frequency: number;
  /** Sum of search volume across all original keywords containing this root. */
  broadSearchVolume: number;
  /** broadSearchVolume / maxBroadSearchVolume, as a 0..1 fraction. */
  broadSearchVolumeRatio: number;
}

/**
 * Keyword-roots analysis for a Niche. `keywords` and `consolidatedKeywords` are
 * the per-keyword breakdowns (kept opaque — the LLM sees the full JSON); `roots`
 * and `normalizedRoots` are the ranked root tables.
 *
 * Note: the OpenAPI spec types the endpoint's `data` as an array, but the live
 * API returns a single object (verified against api-qa, 2026-06-17). The client's
 * unwrap() strips the `{ data }` envelope, so the tool returns this object directly.
 */
export interface NicheRoots {
  keywords: Array<Record<string, unknown>>;
  consolidatedKeywords: Array<Record<string, unknown>>;
  roots: RootsTableItem[];
  normalizedRoots: RootsTableItem[];
  /** ISO date string of the last successful research for the niche. */
  latestResearchDate: string;
}

// ─── /v1/quota  (ExternalQuotaResponseDto) ───────────────────────────────────

export interface QuotaFeature {
  /** Current usage count. Null when not applicable to the plan. */
  used: number | null;
  /** Quota capacity. Null when unlimited / not applicable. */
  capacity: number | null;
}

export interface Quota {
  /** ISO-8601 timestamp of the next quota reset. Null when no reset is scheduled. */
  nextRefreshDate: string | null;
  /** Per-billable-feature usage and capacity. */
  features: Record<BillableFeatureType, QuotaFeature>;
}

// ─── /v1/usage  (ExternalUsageLogListDto, bare PaginationResponse) ───────────

export interface UsageLogItem {
  /** Name of the user who performed the action. Null when unknown. */
  name: string | null;
  email: string;
  /** Number of tokens consumed. */
  qty: number;
  type: BillableFeatureType;
  /** Specific action performed (e.g. "RANK_RADAR_CREATE"). Null when not set. */
  action: string | null;
  nicheId: string | null;
  nicheName: string | null;
  rankRadarId: string | null;
  /** ISO timestamp of when the usage was recorded. */
  date: string;
}

export type UsageLogList = PaginationResponse<UsageLogItem>;

// ─── /v1/seller_profiles  (SellerProfileListDto, bare PaginationResponse) ─────

export interface SellerProfileItem {
  /** Amazon seller account ID — the value other seller-scoped tools require. */
  sellerId: string;
  /** Display name of the connected seller account. */
  sellerName: string;
  /** Marketplace code, e.g. "com", "co.uk" (see SUPPORTED_MARKETPLACES). */
  marketplace: string;
  /** True when Amazon Advertising API credentials are connected for this account. */
  hasAdApi: boolean;
  /** ISO timestamp of when the account was connected to DataDive. */
  createdAt: string;
}

export type SellerProfileList = PaginationResponse<SellerProfileItem>;

// ─── /v1/seller_profiles/:sellerId/marketplaces/:marketplace/catalog ──────────
//      (CatalogAsinListDto, bare PaginationResponse)

/** Allowed values for the `status` query param on the seller catalog endpoint. */
export const CATALOG_STATUSES = ["Active", "all"] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export interface CatalogAsinItem {
  asin: string;
  title: string;
  /** Parent ASIN for a variation child, or null for standalone/parent ASINs. */
  parentAsin: string | null;
  brand: string | null;
  /** Listing status, e.g. "Active". */
  status: string;
  imageUrl: string | null;
  /** True when the ASIN has variation children. Null when unknown. */
  hasVariations: boolean | null;
}

export type SellerCatalogList = PaginationResponse<CatalogAsinItem>;

// ─── /v1/seller_profiles/:sellerId/marketplaces/:marketplace/listing-changes ──
//      (ListingChangeExternalListDto, bare PaginationResponse)

/** Allowed values for the `types` query param on the listing-changes endpoint. */
export const LISTING_CHANGE_TYPES = ["Price", "Content", "Image"] as const;
export type ListingChangeType = (typeof LISTING_CHANGE_TYPES)[number];

/** Allowed values for the `sortBy` query param on the listing-changes endpoint. */
export const LISTING_CHANGE_SORT_BY = ["date", "type"] as const;
export type ListingChangeSortBy = (typeof LISTING_CHANGE_SORT_BY)[number];

/** Generic sort direction, shared where a `sortOrder` query param is accepted. */
export const SORT_ORDER = ["ASC", "DESC"] as const;
export type SortOrder = (typeof SORT_ORDER)[number];

/**
 * Optional ranking/conversion correlation for a listing change, present only when
 * `includeCorrelations=true`. Sub-objects (salesCvr, top10/top50SearchTerms) carry
 * before/after figures and are kept loosely typed per this file's convention.
 */
export interface ListingChangeCorrelation {
  /** "PENDING" | "AVAILABLE" | "UNAVAILABLE_NO_ACTIVE_RANK_RADAR" | "UNAVAILABLE". */
  status: string;
  message: string | null;
  salesCvr: Record<string, unknown> | null;
  top10SearchTerms: Record<string, unknown> | null;
  top50SearchTerms: Record<string, unknown> | null;
}

export interface ListingChangeItem {
  asin: string;
  title: string | null;
  imageUrl: string | null;
  /** ISO timestamp of when the change was detected. */
  date: string;
  /** "Price" | "Content" | "Image". */
  type: string;
  /** Sub-type for content changes (e.g. title/bullets/description); null otherwise. */
  contentType: string | null;
  description: string;
  /** Prior value of the changed field. Shape varies by change type; kept opaque. */
  previousValue: Record<string, unknown> | null;
  /** New value of the changed field. Shape varies by change type; kept opaque. */
  newValue: Record<string, unknown> | null;
  /** Present only when `includeCorrelations=true`; null otherwise. */
  correlation: ListingChangeCorrelation | null;
}

export type ListingChangeList = PaginationResponse<ListingChangeItem>;

// ─── /v1/niches/rank-radars/:rankRadarId/search-terms  (ExternalAddSearchTermsResponseDto, wrapped) ──

/**
 * Where each submitted search term ended up. `manual` and `suggestions` are terms the
 * niche had never seen; the rest were already known to the niche in that role.
 * Mirrors the backend's SearchTermOriginBreakdown.
 */
export interface SearchTermOriginBreakdown {
  tracked: string[];
  paused: string[];
  outliers: string[];
  residues: string[];
  ppc: string[];
  /** Terms the niche has never seen, typed in by the user. */
  manual: string[];
  /** Terms the niche has never seen, accepted from the Rank Radar keyword suggestions. */
  suggestions: string[];
}

export interface AddSearchTermsResult {
  originBreakdown: SearchTermOriginBreakdown;
  /** search term -> rankRadarKeywordId, the id the archive/resume search-term tools take. */
  keywordToRankRadarKeywordIdMap: Record<string, string>;
}

/** Backend cap on how many search terms one add call accepts (ADD_SEARCH_TERM_MAX_LIMIT). */
export const ADD_SEARCH_TERMS_MAX = 1000;

// ─── /v1/niches/:nicheId/ai-copywriter  (AI Copywriter, wrapped) ─────────────

/**
 * Generation strategies the AI Copywriter accepts. Mirrors the backend's
 * GenerateAiCopywriterPromptOption enum.
 */
export const LISTING_COPY_STRATEGIES = ["cosmo", "ranking-juice", "nlp", "cosmo-rufus"] as const;
export type ListingCopyStrategy = (typeof LISTING_COPY_STRATEGIES)[number];

/** Returned immediately when a generation is enqueued. */
export interface CreateListingCopyResult {
  generationId: string;
  status: "generating";
}

export interface ListingCopyResult {
  title: string;
  bullets: string[];
  description: string;
  itemHighlights: string;
  /** Ranking Juice metrics for the generated copy (value + per-field contribution). */
  rankingJuice: Record<string, unknown>;
  methodology_breakdown?: unknown;
}

/** Polled status of a generation. Discriminated on `status`, like DiveStatus. */
export type ListingCopyGenerationStatus =
  | { generationId: string; status: "generating" }
  | { generationId: string; status: "complete"; result: ListingCopyResult }
  | { generationId: string; status: "failed"; error: string };

// ─── Fast Keywords  (/v1/fast-keywords, RS-12017 / RS-12018) ─────────────────

/** Mirrors the API's page-size cap on the Fast Keywords lists. */
export const FAST_KEYWORDS_MAX_PAGE_SIZE = 100;

export type FastKeywordsStatus = "in-progress" | "failed" | "success";

export interface FastKeywordsRoot {
  root: string;
  aggregateSearchVolume: number;
  medianOrganicRank: number | null;
  keywords: string[];
}

/** GET /v1/fast-keywords/:fastKeywordsId (wrapped). The keyword rows are a separate route. */
export interface FastKeywordsResult {
  fastKeywordsId: number;
  status: FastKeywordsStatus;
  asin: string;
  parentAsin: string | null;
  marketplace: string;
  product: { title: string | null; imageUrl: string | null; brand: string | null; price: number | null };
  variations: Array<{ asin: string; title: string | null; imageUrl: string | null }>;
  roots: FastKeywordsRoot[];
  /** The top 10 competitors. */
  competitors: Array<{ asin: string; title: string | null; imageUrl: string | null; variationCount: number }>;
  keywordCount: number;
  lastRefreshedAt: string | null;
  /** Set when `status` is `failed`. */
  failureReason?: string;
  /** Why the run failed, or why a successful run has little to show. Safe to show to a user. */
  failureMessage?: string;
  /** `true` when a successful run found too few keywords to be useful. */
  insufficientKeywordData?: boolean;
}

export interface FastKeywordsKeyword {
  keyword: string;
  searchVolume: number | null;
  organicRank: number | null;
  sponsoredRank: number | null;
}

export type FastKeywordsKeywordList = PaginationResponse<FastKeywordsKeyword>;

export interface FastKeywordsListItem {
  fastKeywordsId: number;
  asin: string;
  parentAsin: string | null;
  marketplace: string;
  status: FastKeywordsStatus;
  title: string | null;
  brand: string | null;
  price: number | null;
  keywordCount: number;
  totalSearchVolume: number | null;
  top10OrganicRankCount: number | null;
  rootCount: number | null;
  lastRefreshedAt: string | null;
  /** Latest request by anyone in the organization. */
  requestedAt: string;
}

export type FastKeywordsList = PaginationResponse<FastKeywordsListItem>;

/** POST /v1/fast-keywords and /:fastKeywordsId/refresh (wrapped): a real run. */
export interface FastKeywordsRunResult {
  /** Poll `get_fast_keywords` with it. */
  fastKeywordsId: number;
  /** Id of this request; what `create_niche_dive` takes as `fastKeywordsRequestId`. */
  requestId: number;
  /** `success` right away when a fresh result for the same product already exists. */
  status: FastKeywordsStatus;
  tokenCost: number;
  estimatedCompletionDate: string;
}

/** The same routes with `dryRun: true`: nothing runs and nothing is spent. */
export interface FastKeywordsRunPreview {
  tokenCost: number;
  hasEnoughTokens: boolean;
}

/** Body of the 409 a refresh answers while a run is going or the cooldown has not passed. */
export interface FastKeywordsRefreshConflictBody {
  error: "IN_PROGRESS" | "COOLDOWN";
  message: string;
  /** `null` while a run is in progress. */
  nextEligibleAt: string | null;
}

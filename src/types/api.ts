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
}

export type NicheList = PaginationResponse<NicheItem>;

// ─── /v1/niches/:nicheId/keywords  (GetMasterKeywordListResult, wrapped) ─────

/** Map of competitor ASIN -> rank (or null when unranked). */
export type AsinRanks = Record<string, number | null>;

export interface MasterKeyword {
  keyword: string;
  searchVolume: number;
  /** "Outlier" or a numeric relevancy score. */
  relevancy: string | number;
  asinRanks: AsinRanks;
}

export interface GetMasterKeywordListResult {
  keywords: MasterKeyword[];
  /** ISO date string. */
  latestResearchDate: string;
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

/** Result of creating a Rank Radar. */
export interface CreateRankRadarResult {
  rankRadarId: string;
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

// ─── /v1/niches/rank-radars/:rankRadarId  (KrtKeywordResponseDto[], wrapped) ─

export interface KrtAsinRank {
  /** ISO date string. */
  date: string;
  organicRank?: number | null;
  impressionRank?: number | null;
}

export interface KrtKeyword {
  id: string;
  keyword: string;
  searchVolume: number | null;
  ranks: KrtAsinRank[];
  /** Highlight annotations (KrtHighlightDto in backend); kept opaque for MVP. */
  highlights: Array<Record<string, unknown>>;
}

export type RankRadarKeywordList = KrtKeyword[];

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
  /** ISO timestamp of last successful ingestion. Null if none in the last 30 days. */
  lastUpdatedAt: string | null;
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

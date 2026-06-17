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
 * Last synced: 2026-06-17.
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
 * Niche competitors response — many nested DTOs from the backend (MklStatisticsData,
 * OpportunityEvaluation, MklBenchmark, CompetitorsStrength, AsinListItem). We type
 * the outer shape and leave the inner objects as opaque records; the LLM sees the
 * full JSON and can reason about it. Tighten if a specific consumer needs it.
 */
export interface GetCompetitorListResult {
  /** Marketplace enum (AmazonStore in backend). */
  marketplace: string;
  statistics: Record<string, unknown>;
  opportunityEvaluation: Record<string, unknown>;
  benchmark: Record<string, unknown>;
  competitorsStrength: Record<string, unknown>;
  competitors: Array<Record<string, unknown>>;
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

export interface RankRadarAsin {
  id: string;
  krtId: string;
  asin: string;
}

export interface RankRadarItem {
  id: string;
  asin: RankRadarAsin;
  marketplace: string;
  keywordCount: number;
  title: string;
  imageUrl: string;
  top10KW: number | null;
  top10SV: number | null;
  top50KW: number | null;
  top50SV: number | null;
}

export type RankRadarList = PaginationResponse<RankRadarItem>;

/** Allowed values for the `status` query param on /v1/niches/rank-radars. */
export const RANK_RADAR_STATUSES = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;
export type RankRadarStatus = (typeof RANK_RADAR_STATUSES)[number];

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

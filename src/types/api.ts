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
 * Last synced: 2026-06-05.
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

/**
 * Marketplace codes accepted by the `marketplace` query param.
 * Mirrors the backend's `SupportedMarketplaceEnum`.
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

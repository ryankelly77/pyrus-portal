/**
 * Report Section Types and Data Shapes for Campaign/Harvest Reports
 *
 * Used across admin forms, API routes, and client views.
 */

// ============ Section Types ============

export const SECTION_TYPES = [
  'search_visibility',
  'organic_traffic',
  'keyword_rankings',
  'keyword_growth',
  'link_building',
  'local_seo',
  'technical_audit',
  'work_completed',
  'coming_next',
] as const

export type SectionType = typeof SECTION_TYPES[number]

// ============ Section Labels ============

export const SECTION_LABELS: Record<SectionType, string> = {
  search_visibility: 'Search Visibility',
  organic_traffic: 'Organic Traffic',
  keyword_rankings: 'Keyword Rankings',
  keyword_growth: 'Keyword Growth',
  link_building: 'Link Building',
  local_seo: 'Local SEO',
  technical_audit: 'Technical Audit',
  work_completed: 'Work Completed',
  coming_next: 'Coming Next',
}

// ============ Section Data Interfaces ============

export interface SearchVisibilityData {
  currentImpressions: number
  previousImpressions: number
  currentClicks: number
  previousClicks: number
  currentCTR: number
  previousCTR: number
  currentAvgPosition: number
  previousAvgPosition: number
}

export interface OrganicTrafficData {
  currentUsers: number
  previousUsers: number
  currentSessions?: number
  previousSessions?: number
}

export interface KeywordRankingsData {
  totalTracked: number
  top3: number
  top10: number
  top20: number
  top30: number
  top100: number
  // delta from campaign start for each tier
  top3Delta: number
  top10Delta: number
  top20Delta: number
  top30Delta: number
  top100Delta: number
  totalImproved: number
}

export interface KeywordGrowthData {
  // array of monthly snapshots in chronological order
  months: Array<{
    label: string           // e.g. "Jun 25"
    isCampaignStart: boolean
    top3: number
    pos4to20: number
    pos21to50: number
    pos51to100: number
    serpFeatures: number
  }>
}

export interface LinkBuildingData {
  campaignTotal: number
  monthlyBreakdown: Array<{
    month: string           // e.g. "November 2025"
    total: number
    guestPosts: number
    linkTypes: string[]     // e.g. ["Contextual", "Web 2.0"]
  }>
}

export interface LocalSeoData {
  monthlyPosts: Array<{
    month: string           // e.g. "Nov"
    count: number
  }>
  notes?: string
}

export interface TechnicalAuditData {
  issues: Array<{
    title: string
    description: string
    status: 'resolved' | 'submitted' | 'in_progress' | 'monitoring'
  }>
}

export interface WorkCompletedData {
  items: Array<{
    category: string
    description: string
  }>
}

export interface ComingNextData {
  items: Array<{
    title: string
    description: string
    iconColor: 'blue' | 'teal' | 'green' | 'orange' | 'purple' | 'amber'
  }>
}

// ============ Union & Mapped Types ============

export type ReportSectionData =
  | SearchVisibilityData
  | OrganicTrafficData
  | KeywordRankingsData
  | KeywordGrowthData
  | LinkBuildingData
  | LocalSeoData
  | TechnicalAuditData
  | WorkCompletedData
  | ComingNextData

export type SectionDataMap = {
  search_visibility: SearchVisibilityData
  organic_traffic: OrganicTrafficData
  keyword_rankings: KeywordRankingsData
  keyword_growth: KeywordGrowthData
  link_building: LinkBuildingData
  local_seo: LocalSeoData
  technical_audit: TechnicalAuditData
  work_completed: WorkCompletedData
  coming_next: ComingNextData
}

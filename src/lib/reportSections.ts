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
  'paid_search',
  'paid_social',
  'local_service_ads',
  'organic_social',
  'lead_tracking',
  'review_management',
  'content_writing',
  'ai_visibility',
  'email_sms',
  'local_seo',
  'technical_audit',
  'work_completed',
  'coming_next',
] as const

export type SectionType = (typeof SECTION_TYPES)[number]

// ============ Section Labels ============

export const SECTION_LABELS: Record<SectionType, string> = {
  search_visibility: 'Search Visibility',
  organic_traffic: 'Organic Traffic',
  keyword_rankings: 'Keyword Rankings',
  keyword_growth: 'Keyword Growth',
  link_building: 'Link Building',
  paid_search: 'Google Search Ads',
  paid_social: 'Paid Social Media',
  local_service_ads: 'Local Service Ads',
  organic_social: 'Organic Social Media',
  lead_tracking: 'CRM & Lead Tracking',
  review_management: 'Review Management',
  content_writing: 'Content Writing',
  ai_visibility: 'AI Visibility',
  email_sms: 'Email & SMS',
  local_seo: 'Local SEO & GBP',
  technical_audit: 'Technical Health',
  work_completed: 'Work Completed',
  coming_next: 'Coming Next',
}

// ============ Section Nav Groups (for admin editor sidebar) ============

export const SECTION_NAV_GROUPS = [
  {
    label: 'Visibility & Traffic',
    sections: ['search_visibility', 'organic_traffic'] as SectionType[],
  },
  {
    label: 'SEO',
    sections: ['keyword_rankings', 'keyword_growth', 'link_building'] as SectionType[],
  },
  {
    label: 'Paid Advertising',
    sections: ['paid_search', 'paid_social', 'local_service_ads'] as SectionType[],
  },
  {
    label: 'Social Media',
    sections: ['organic_social'] as SectionType[],
  },
  {
    label: 'Lead Generation',
    sections: ['lead_tracking'] as SectionType[],
  },
  {
    label: 'Reputation',
    sections: ['review_management'] as SectionType[],
  },
  {
    label: 'Content',
    sections: ['content_writing'] as SectionType[],
  },
  {
    label: 'AI & Automation',
    sections: ['ai_visibility', 'email_sms'] as SectionType[],
  },
  {
    label: 'Local & Technical',
    sections: ['local_seo', 'technical_audit'] as SectionType[],
  },
  {
    label: 'Summary',
    sections: ['work_completed', 'coming_next'] as SectionType[],
  },
]

// ============ Section Data Interfaces ============

export interface SearchVisibilityData {
  currentImpressions: number
  previousImpressions: number
  currentClicks: number
  previousClicks: number
  currentCTR: number // percent, e.g. 1.03
  previousCTR: number
  currentAvgPosition: number
  previousAvgPosition: number
  // Monthly history for line chart
  monthlyHistory?: Array<{
    month: string
    impressions: number
    clicks: number
    isCampaignStart?: boolean
    isPreCampaign?: boolean
  }>
}

export interface OrganicTrafficData {
  currentUsers: number
  previousUsers: number
  currentSessions?: number
  previousSessions?: number
  monthlyHistory?: Array<{
    month: string
    users: number
    isCampaignStart?: boolean
    isPreCampaign?: boolean
  }>
}

export interface KeywordRankingsData {
  totalTracked: number
  top3: number
  top3Delta: number // change since campaign start
  top10: number
  top10Delta: number
  top20: number
  top20Delta: number
  top30: number
  top30Delta: number
  top100: number
  top100Delta: number
  totalImproved: number
  notRanking?: number
}

export interface KeywordGrowthData {
  months: Array<{
    label: string
    isCampaignStart?: boolean
    isPreCampaign?: boolean
    top3: number
    pos4to20: number
    pos21to50: number
    pos51to100: number
    serpFeatures: number
  }>
}

export interface LinkBuildingData {
  campaignTotal: number
  // Legacy format (used by existing editor/view)
  monthlyBreakdown: Array<{
    month: string // e.g. "November 2025"
    total: number
    guestPosts: number
    linkTypes: string[] // e.g. ["Contextual", "Web 2.0"]
  }>
  // New format for v4 (optional, for future migration)
  months?: Array<{
    month: string // e.g. "Nov 2025"
    contextual: number
    guestPosts: number
    web2: number
    other?: number
  }>
  // Campaign totals by type (auto-calculated from months or entered manually)
  totalContextual?: number
  totalGuestPosts?: number
  totalWeb2?: number
  totalOther?: number
}

export interface PaidSearchData {
  currentSpend: number
  previousSpend: number
  currentConversions: number
  previousConversions: number
  currentCPL: number
  previousCPL: number
  currentCTR: number
  previousCTR: number
  currentImpressions?: number
  previousImpressions?: number
  currentClicks?: number
  previousClicks?: number
  currentROAS?: number
  previousROAS?: number
  months: Array<{
    month: string
    spend: number
    conversions: number
  }>
}

export interface PaidSocialData {
  currentSpend: number
  previousSpend: number
  currentConversions: number
  previousConversions: number
  currentCPL: number
  previousCPL: number
  currentImpressions: number
  previousImpressions: number
  platforms: Array<{
    platform: 'Facebook' | 'Instagram' | 'TikTok' | 'LinkedIn' | 'Pinterest' | 'Other'
    currentSpend: number
    previousSpend: number
    currentConversions: number
    previousConversions: number
    currentCPL: number
    previousCPL: number
  }>
  months: Array<{
    month: string
    facebook?: number
    instagram?: number
    tiktok?: number
    linkedin?: number
    other?: number
  }>
}

export interface LocalServiceAdsData {
  currentLeads: number
  previousLeads: number
  currentSpend: number
  previousSpend: number
  currentCPL: number
  previousCPL: number
  currentRating?: number
  totalReviews?: number
  notes?: string
}

export interface OrganicSocialData {
  platforms: Array<{
    platform: 'Facebook' | 'Instagram' | 'TikTok' | 'LinkedIn' | 'Pinterest' | 'Other'
    currentFollowers: number
    previousFollowers: number
    followersAtStart: number
    currentPeriodPosts: number
    currentReach?: number
    previousReach?: number
    currentEngagements?: number
    previousEngagements?: number
  }>
  // Monthly post counts for grouped bar chart
  monthlyPosts?: Array<{
    month: string
    facebook?: number
    instagram?: number
    tiktok?: number
    linkedin?: number
    other?: number
  }>
  // Monthly follower totals for line chart
  followerHistory?: Array<{
    month: string
    facebook?: number
    instagram?: number
    tiktok?: number
    linkedin?: number
  }>
}

export interface LeadTrackingData {
  currentLeads: number
  previousLeads: number
  currentFormSubmissions?: number
  previousFormSubmissions?: number
  currentPhoneCalls?: number
  previousPhoneCalls?: number
  currentWebChat?: number
  previousWebChat?: number
  currentAppointments?: number
  previousAppointments?: number
  currentConversions?: number
  previousConversions?: number
  leadSources?: Array<{ source: string; count: number }>
  monthlyLeads?: Array<{ month: string; leads: number }>
}

export interface ReviewManagementData {
  platforms: Array<{
    platform: 'Google' | 'Facebook' | 'Yelp' | 'Other'
    currentRating: number
    previousRating: number
    currentTotal: number
    previousTotal: number
    newThisPeriod: number
    responsesThisPeriod?: number
  }>
  // Monthly new review counts for grouped bar chart
  monthlyReviews?: Array<{
    month: string
    google?: number
    facebook?: number
    yelp?: number
    isCampaignStart?: boolean
    isPreCampaign?: boolean
  }>
}

export interface ContentWritingData {
  articles: Array<{
    title: string
    url?: string
    wordCount: number
    publishedDate: string // e.g. "November 2025"
    targetKeyword?: string
  }>
}

export interface AiVisibilityData {
  platforms: Array<{
    platform: 'ChatGPT' | 'Google Gemini' | 'Perplexity' | 'Claude' | 'Bing Copilot' | 'Other'
    mentioned: boolean
    sentiment?: 'positive' | 'neutral' | 'negative'
    visibilityScore?: number // 0–100
    rankPosition?: string // e.g. "#2 of 5"
    notes?: string
  }>
  queriesTracked?: number
  queriesMentioned?: number
  notes?: string
}

export interface EmailSmsData {
  channels: Array<{
    channel: 'Email' | 'SMS'
    campaignsSent: number
    delivered: number
    openRate?: number // percent
    clickRate?: number // percent
    optOuts?: number
    leadsGenerated?: number
    automationsActive?: number
  }>
  // Monthly send counts for grouped bar chart
  monthlySends?: Array<{
    month: string
    email?: number
    sms?: number
  }>
}

export interface LocalSeoData {
  monthlyPosts: Array<{ month: string; count: number }>
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
  | PaidSearchData
  | PaidSocialData
  | LocalServiceAdsData
  | OrganicSocialData
  | LeadTrackingData
  | ReviewManagementData
  | ContentWritingData
  | AiVisibilityData
  | EmailSmsData
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
  paid_search: PaidSearchData
  paid_social: PaidSocialData
  local_service_ads: LocalServiceAdsData
  organic_social: OrganicSocialData
  lead_tracking: LeadTrackingData
  review_management: ReviewManagementData
  content_writing: ContentWritingData
  ai_visibility: AiVisibilityData
  email_sms: EmailSmsData
  local_seo: LocalSeoData
  technical_audit: TechnicalAuditData
  work_completed: WorkCompletedData
  coming_next: ComingNextData
}

// ============ Helper Functions ============

/**
 * Get the section label for display
 */
export function getSectionLabel(sectionType: SectionType): string {
  return SECTION_LABELS[sectionType]
}

/**
 * Get the nav group for a section
 */
export function getSectionNavGroup(sectionType: SectionType): string | null {
  for (const group of SECTION_NAV_GROUPS) {
    if (group.sections.includes(sectionType)) {
      return group.label
    }
  }
  return null
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Format a number with appropriate suffix (K, M, B)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B'
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return num.toLocaleString()
}

/**
 * Format currency value
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format percentage value
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

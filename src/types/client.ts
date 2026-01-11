/**
 * Canonical client types
 * All client-related interfaces should be imported from here
 */

// Growth stages in order of progression
export type GrowthStage = 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting'

// Client status values
export type ClientStatus = 'active' | 'paused' | 'churned' | 'prospect'

// Growth stage display labels
export const growthStageLabels: Record<GrowthStage, string> = {
  prospect: 'Prospect',
  seedling: 'Seedling',
  sprouting: 'Sprouting',
  blooming: 'Blooming',
  harvesting: 'Harvesting',
}

// Growth stage colors for UI
export const growthStageColors: Record<GrowthStage, string> = {
  prospect: '#94a3b8',    // gray
  seedling: '#22c55e',    // green
  sprouting: '#3b82f6',   // blue
  blooming: '#8b5cf6',    // purple
  harvesting: '#f59e0b',  // amber
}

// Client status display labels
export const clientStatusLabels: Record<ClientStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  churned: 'Churned',
  prospect: 'Prospect',
}

/**
 * Database client record (snake_case, matches Prisma/DB)
 * Use this type for raw database records
 */
export interface DBClient {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  avatar_url: string | null
  avatar_color: string | null
  growth_stage: GrowthStage | null
  status: ClientStatus
  monthly_spend: number
  start_date: string | null
  highlevel_id: string | null
  basecamp_id: string | null
  basecamp_project_id: string | null
  stripe_customer_id: string | null
  notes: string | null
  referred_by: string | null
  referral_source: string | null
  // Integration fields
  agency_dashboard_share_key: string | null
  landingsite_preview_url: string | null
  created_at: string
  updated_at: string
}

/**
 * Frontend client data (camelCase, for React components)
 * Transform from DBClient at API boundary
 */
export interface Client {
  id: string
  name: string
  contactName: string | null
  contactEmail: string | null
  avatarUrl: string | null
  avatarColor: string | null
  growthStage: GrowthStage
  status: ClientStatus
  monthlySpend: number
  startDate: string | null
  notes: string | null
  // Computed fields
  initials: string
  isActive: boolean
}

/**
 * Client card display data (used in lists)
 */
export interface ClientCardData {
  id: string
  name: string
  initials: string
  avatarColor: string
  growthStage: GrowthStage
  status: ClientStatus
  monthlySpend: number
  contactEmail: string | null
}

/**
 * Client with subscription info
 */
export interface ClientWithSubscription extends Client {
  hasActiveSubscription: boolean
  subscriptionId: string | null
  currentPlan: string | null
}

/**
 * Transform database client to frontend format
 */
export function transformDBClient(db: DBClient): Client {
  const nameParts = db.name.split(' ')
  const initials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : db.name.substring(0, 2).toUpperCase()

  return {
    id: db.id,
    name: db.name,
    contactName: db.contact_name,
    contactEmail: db.contact_email,
    avatarUrl: db.avatar_url,
    avatarColor: db.avatar_color || '#3b82f6',
    growthStage: db.growth_stage || 'prospect',
    status: db.status || 'prospect',
    monthlySpend: Number(db.monthly_spend) || 0,
    startDate: db.start_date,
    notes: db.notes,
    initials,
    isActive: db.growth_stage !== null && db.growth_stage !== 'prospect',
  }
}

/**
 * Check if client has an active subscription
 */
export function isActiveClient(client: { growth_stage?: GrowthStage | null } | null): boolean {
  return client?.growth_stage !== null && client?.growth_stage !== 'prospect'
}

/**
 * Get display color for growth stage
 */
export function getGrowthStageColor(stage: GrowthStage | null): string {
  return stage ? growthStageColors[stage] : growthStageColors.prospect
}

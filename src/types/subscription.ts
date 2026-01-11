/**
 * Canonical subscription types
 * All subscription-related interfaces should be imported from here
 */

// Subscription status values
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'paused' | 'incomplete'

// Subscription status display labels
export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  active: 'Active',
  past_due: 'Past Due',
  canceled: 'Canceled',
  paused: 'Paused',
  incomplete: 'Incomplete',
}

// Subscription status colors for UI
export const subscriptionStatusColors: Record<SubscriptionStatus, string> = {
  active: '#22c55e',      // green
  past_due: '#f59e0b',    // amber
  canceled: '#ef4444',    // red
  paused: '#94a3b8',      // gray
  incomplete: '#f59e0b',  // amber
}

/**
 * Database subscription record (snake_case, matches Prisma/DB)
 */
export interface DBSubscription {
  id: string
  client_id: string
  recommendation_id: string | null
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  status: SubscriptionStatus | null
  current_period_start: string | null
  current_period_end: string | null
  monthly_amount: number | null
  canceled_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Database subscription item record
 */
export interface DBSubscriptionItem {
  id: string
  subscription_id: string
  product_id: string | null
  bundle_id: string | null
  quantity: number
  unit_amount: number
  created_at: string
}

/**
 * Frontend subscription data (camelCase)
 */
export interface Subscription {
  id: string
  clientId: string
  status: SubscriptionStatus
  monthlyAmount: number
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
  items: SubscriptionItem[]
}

/**
 * Frontend subscription item
 */
export interface SubscriptionItem {
  id: string
  productId: string | null
  bundleId: string | null
  productName: string
  quantity: number
  unitAmount: number
}

/**
 * Subscription with product details
 */
export interface SubscriptionWithProducts extends DBSubscription {
  subscription_items: Array<DBSubscriptionItem & {
    product?: {
      id: string
      name: string
      category: string
    } | null
    bundle?: {
      id: string
      name: string
    } | null
  }>
}

/**
 * Transform database subscription to frontend format
 */
export function transformDBSubscription(
  db: SubscriptionWithProducts
): Subscription {
  return {
    id: db.id,
    clientId: db.client_id,
    status: db.status || 'incomplete',
    monthlyAmount: Number(db.monthly_amount) || 0,
    currentPeriodStart: db.current_period_start,
    currentPeriodEnd: db.current_period_end,
    canceledAt: db.canceled_at,
    items: db.subscription_items.map(item => ({
      id: item.id,
      productId: item.product_id,
      bundleId: item.bundle_id,
      productName: item.product?.name || item.bundle?.name || 'Unknown',
      quantity: item.quantity,
      unitAmount: Number(item.unit_amount) || 0,
    })),
  }
}

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(status: SubscriptionStatus | null): boolean {
  return status === 'active'
}

/**
 * Get display color for subscription status
 */
export function getSubscriptionStatusColor(status: SubscriptionStatus | null): string {
  return status ? subscriptionStatusColors[status] : subscriptionStatusColors.incomplete
}

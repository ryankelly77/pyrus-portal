/**
 * Centralized type exports
 * Import types from '@/types' instead of individual files
 */

// Client types
export {
  type GrowthStage,
  type ClientStatus,
  type DBClient,
  type Client,
  type ClientCardData,
  type ClientWithSubscription,
  growthStageLabels,
  growthStageColors,
  clientStatusLabels,
  transformDBClient,
  isActiveClient,
  getGrowthStageColor,
} from './client'

// Subscription types
export {
  type SubscriptionStatus,
  type DBSubscription,
  type DBSubscriptionItem,
  type Subscription,
  type SubscriptionItem,
  type SubscriptionWithProducts,
  subscriptionStatusLabels,
  subscriptionStatusColors,
  transformDBSubscription,
  isSubscriptionActive,
  getSubscriptionStatusColor,
} from './subscription'

// Recommendation types
export {
  type ServiceCategory,
  type PricingType,
  type TierName,
  type BundleProduct,
  type Product,
  type RecommendationItem,
  type RewardTier,
  type PricingResult,
  type GrowthRewardsDisplay,
  type ClaimHints,
  type TierState,
  type ServiceDetailContent,
} from './recommendation'

// Email types
export {
  type EmailRecipientType,
  type EmailLogStatus,
  type TemplateVariable,
  type EmailTemplate,
  type RenderResult,
  type SendTemplatedEmailOptions,
  type SendTemplatedEmailResult,
  type CreateEmailLogData,
  type CachedTemplate,
} from './email'

// Database types (legacy, use specific types above when possible)
export type { Database, Tables, InsertTables, UpdateTables } from './database'

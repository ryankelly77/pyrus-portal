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

// Client detail page types
export {
  // Tab & navigation types
  type MainTab,
  type GettingStartedSubtab,
  type ResultsSubtab,
  type RecommendationsSubtab,
  type ActivityFilter,
  // Client & database types
  type ClientPageDBClient,
  type RequestStatus,
  type EditRequest,
  type ClientData,
  // Checklist & onboarding types
  type ChecklistItem,
  type OnboardingResponse,
  type OnboardingSummary,
  type OnboardingQuestion,
  type OnboardingFormData,
  type VideoChapter,
  // Recommendation types (page-specific)
  type RecommendationItem as PageRecommendationItem,
  type RecommendationHistory,
  type Recommendation as PageRecommendation,
  // Subscription types (page-specific)
  type SubscriptionItem as PageSubscriptionItem,
  type SubscriptionHistory,
  type Subscription as PageSubscription,
  type StripeSubscriptionItem,
  type StripeSubscription,
  type StripeHistoryEvent,
  // Product types
  type ManualProduct,
  type TestProduct,
  type ContentProduct,
  type AvailableProduct,
  type Service,
  // Activity types
  type BasecampActivity,
  type Activity,
  // Communication types
  type Communication,
  type CommForExport,
  // Billing types
  type PaymentMethod,
  type InvoiceLine,
  type Invoice,
  type StripeCustomer,
  // Result alert types
  type KeywordRow,
  type ResultAlertType,
  type AlertTypeConfig,
  // Edit form types
  type EditFormData,
  // Constants
  AVATAR_COLORS,
  type AvatarColor,
} from './client-page'

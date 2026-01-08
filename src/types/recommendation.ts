// Service categories
export type ServiceCategory = 'root' | 'growth' | 'cultivation' | 'bundle' | 'fertilizer'

// Pricing type selection
export type PricingType = 'monthly' | 'onetime'

// Tier names for Good/Better/Best columns
export type TierName = 'good' | 'better' | 'best'

// Bundle product info
export interface BundleProduct {
  id: string
  name: string
  monthlyPrice: number
  onetimePrice: number
}

// Base product interface
export interface Product {
  id: string
  name: string
  description: string
  category: ServiceCategory
  monthlyPrice: number
  onetimePrice: number
  hasQuantity?: boolean
  requires?: string // Name of product this depends on
  detailContent?: string // Key for detailed modal content
  bundleProducts?: BundleProduct[] // Products included in this bundle (for bundle category)
  fullPrice?: number // Sum of individual product prices (for bundles)
}

// Item added to a recommendation tier
export interface RecommendationItem {
  id: string // Unique instance ID
  product: Product
  quantity: number
  pricingType: PricingType
  isFree?: boolean // Whether this item is free due to rewards
  freeUnits?: number // How many units are free (for quantity items)
}

// Reward tier configuration
export interface RewardTier {
  threshold: number
  freeProducts: string[]
  discount: number
  coupon: string | null
}

// Pricing calculation result
export interface PricingResult {
  fullPriceMonthly: number
  fullPriceOnetime: number
  afterFreeMonthly: number
  afterFreeOnetime: number
  yourPriceMonthly: number
  yourPriceOnetime: number
  discountPercent: number
  discountAmount: number
  freeItemsValue: number
  totalSavings: number
  savingsDetails: string[]
  couponCode: string | null
  rewardTierIndex: number
  hasAnalyticsInCart: boolean
  free99SlotUsed: boolean
  hasFree99Reward: boolean
}

// Growth rewards display data
export interface GrowthRewardsDisplay {
  unlockedRewards: Array<{
    text: string
    pending?: boolean
  }>
  couponCode: string | null
  lockedRewards: Array<{
    amountNeeded: number
    reward: string
  }>
  maxRewardsReached: boolean
}

// Claim hints for unclaimed rewards
export interface ClaimHints {
  addAnalytics: boolean
  add99Product: boolean
}

// Client data
export interface Client {
  id: string
  name: string
  email: string
  initials: string
  avatarColor: string
}

// Complete recommendation state for a tier
export interface TierState {
  items: RecommendationItem[]
  pricing: PricingResult
  rewards: GrowthRewardsDisplay
  claimHints: ClaimHints
}

// Service detail content for modals
export interface ServiceDetailContent {
  title: string
  tagline: string
  intro: string
  callout?: {
    label: string
    text: string
  }
  simpleTerm?: string
  summary?: string
  deliverables: Array<{
    number: string
    title: string
    description: string
    isBonus?: boolean
    features: Array<{
      title: string
      description: string
    }>
  }>
  cta?: {
    title: string
    text: string
  }
  upsell?: {
    title: string
    text: string
  }
  imageUrl?: string
}

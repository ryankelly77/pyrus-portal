import type {
  RecommendationItem,
  RewardTier,
  PricingResult,
  GrowthRewardsDisplay,
  ClaimHints,
  PricingType,
} from '@/types/recommendation'

// Reward tier configuration
export const REWARD_TIERS: RewardTier[] = [
  { threshold: 0, freeProducts: ['Free Analytics Tracking ($99 Value)'], discount: 0, coupon: null },
  { threshold: 1000, freeProducts: ['Free Analytics Tracking ($99 Value)'], discount: 5, coupon: 'HARVEST5X' },
  { threshold: 1500, freeProducts: ['Free Analytics Tracking ($99 Value)', 'Another Free $99 Product'], discount: 5, coupon: 'HARVEST5X' },
  { threshold: 2000, freeProducts: ['Free Analytics Tracking ($99 Value)', 'Another Free $99 Product'], discount: 10, coupon: 'CULTIVATE10' },
]

/**
 * Get reward tier index based on monthly total
 */
export function getRewardTierIndex(monthlyTotal: number): number {
  let currentTier = 0
  for (let i = REWARD_TIERS.length - 1; i >= 0; i--) {
    if (monthlyTotal >= REWARD_TIERS[i].threshold) {
      currentTier = i
      break
    }
  }
  return currentTier
}

/**
 * Calculate item price based on quantity and pricing type
 */
export function calculateItemPrice(
  item: RecommendationItem,
  paidUnits: number = item.quantity
): { monthly: number; onetime: number } {
  if (item.pricingType === 'onetime') {
    return {
      monthly: 0,
      onetime: item.product.onetimePrice * paidUnits,
    }
  }
  return {
    monthly: item.product.monthlyPrice * paidUnits,
    onetime: 0,
  }
}

/**
 * Calculate base total (excluding always-free items) for tier determination
 */
export function calculateBaseTotal(items: RecommendationItem[]): number {
  let total = 0
  for (const item of items) {
    // Skip Analytics Tracking - it's always free
    if (item.product.name.includes('Analytics Tracking')) continue

    if (item.pricingType === 'monthly') {
      total += item.product.monthlyPrice * item.quantity
    }
  }
  return total
}

/**
 * Calculate complete pricing for a tier
 */
export function calculateTierPricing(items: RecommendationItem[]): PricingResult {
  // First pass: calculate base total (excluding analytics) to determine reward tier
  const baseTotalMonthly = calculateBaseTotal(items)

  // Determine reward tier
  const rewardTierIndex = getRewardTierIndex(baseTotalMonthly)
  const currentTier = REWARD_TIERS[rewardTierIndex]
  const hasFree99Reward = rewardTierIndex >= 2
  const free99Count = hasFree99Reward ? 1 : 0

  // Track free $99 slots used
  let free99Used = 0

  // Track totals
  let totalMonthly = 0
  let totalOnetime = 0
  let freeItemsValue = 0
  const savingsDetails: string[] = []

  // Check what's in cart
  const hasAnalyticsInCart = items.some(item =>
    item.product.name.includes('Analytics Tracking')
  )

  // Process each item
  for (const item of items) {
    const isAnalyticsTracking = item.product.name.includes('Analytics Tracking')

    // Analytics Tracking is always free
    if (isAnalyticsTracking) {
      if (hasAnalyticsInCart) {
        freeItemsValue += 99
      }
      continue // Don't add to total
    }

    // Check if this $99 product can use free slots
    let freeUnits = 0
    let paidUnits = item.quantity

    if (item.product.monthlyPrice === 99 && free99Used < free99Count && item.pricingType === 'monthly') {
      const availableFreeSlots = free99Count - free99Used
      freeUnits = Math.min(item.quantity, availableFreeSlots)
      paidUnits = item.quantity - freeUnits
      free99Used += freeUnits
    }

    // Calculate totals based on paid units only
    if (item.pricingType === 'onetime') {
      totalOnetime += item.product.onetimePrice * paidUnits
    } else {
      totalMonthly += item.product.monthlyPrice * paidUnits
    }
  }

  // Build savings details
  if (hasAnalyticsInCart) {
    savingsDetails.push('Free Analytics Tracking ($99)')
  }

  const free99SlotUsed = free99Used > 0
  if (hasFree99Reward && free99SlotUsed) {
    freeItemsValue += 99
    savingsDetails.push('Free $99 Product')
  }

  // Calculate discount
  let discountAmount = 0
  if (currentTier.discount > 0 && totalMonthly > 0) {
    discountAmount = Math.round(totalMonthly * (currentTier.discount / 100) * 100) / 100
    savingsDetails.push(`${currentTier.discount}% off (-$${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`)
  }

  const totalSavings = freeItemsValue + discountAmount
  const fullPriceMonthly = totalMonthly + freeItemsValue
  const yourPriceMonthly = totalMonthly - discountAmount

  return {
    fullPriceMonthly,
    fullPriceOnetime: totalOnetime,
    afterFreeMonthly: totalMonthly,
    afterFreeOnetime: totalOnetime,
    yourPriceMonthly,
    yourPriceOnetime: totalOnetime,
    discountPercent: currentTier.discount,
    discountAmount,
    freeItemsValue,
    totalSavings,
    savingsDetails,
    couponCode: currentTier.coupon,
    rewardTierIndex,
    hasAnalyticsInCart,
    free99SlotUsed,
    hasFree99Reward,
  }
}

/**
 * Calculate growth rewards display data
 */
export function calculateGrowthRewards(
  monthlyTotal: number,
  has99ProductInCart: boolean
): GrowthRewardsDisplay {
  const currentTierIndex = getRewardTierIndex(monthlyTotal)
  const currentTier = REWARD_TIERS[currentTierIndex]
  const hasFree99Reward = currentTierIndex >= 2

  // Build unlocked rewards
  const unlockedRewards: GrowthRewardsDisplay['unlockedRewards'] = []

  // Always show Analytics Tracking first
  unlockedRewards.push({ text: 'Free Analytics Tracking ($99 Value)' })

  // Show discount second (if any)
  if (currentTier.discount > 0) {
    unlockedRewards.push({ text: `${currentTier.discount}% off your plan` })
  }

  // Show another free $99 product third (if unlocked at tier 2+)
  if (hasFree99Reward) {
    if (has99ProductInCart) {
      unlockedRewards.push({ text: 'Another Free $99 Product' })
    } else {
      unlockedRewards.push({ text: 'Another Free $99 Product', pending: true })
    }
  }

  // Build locked rewards
  const lockedRewards: GrowthRewardsDisplay['lockedRewards'] = []

  if (currentTierIndex < REWARD_TIERS.length - 1) {
    if (currentTierIndex < 1) {
      lockedRewards.push({
        amountNeeded: 1000 - monthlyTotal,
        reward: '5% off your total cart',
      })
    }
    if (currentTierIndex < 2) {
      lockedRewards.push({
        amountNeeded: 1500 - monthlyTotal,
        reward: 'another Free $99 Product',
      })
    }
    if (currentTierIndex < 3) {
      lockedRewards.push({
        amountNeeded: 2000 - monthlyTotal,
        reward: '10% off your total cart',
      })
    }
  }

  return {
    unlockedRewards,
    couponCode: currentTier.coupon,
    lockedRewards,
    maxRewardsReached: currentTierIndex >= REWARD_TIERS.length - 1,
  }
}

/**
 * Calculate claim hints for a tier
 */
export function calculateClaimHints(pricing: PricingResult): ClaimHints {
  return {
    addAnalytics: !pricing.hasAnalyticsInCart,
    add99Product: pricing.hasFree99Reward && !pricing.free99SlotUsed,
  }
}

/**
 * Check if an item's requirements are met
 */
export function checkRequirementMet(
  item: RecommendationItem,
  allItems: RecommendationItem[]
): boolean {
  if (!item.product.requires) return true
  return allItems.some(i => i.product.name === item.product.requires)
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, decimals: boolean = false): string {
  if (decimals) {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return amount.toLocaleString()
}

/**
 * Get price display text for an item
 */
export function getItemPriceDisplay(
  item: RecommendationItem,
  pricing: PricingResult,
  free99Used: number
): { text: string; isFree: boolean; originalPrice?: string } {
  const isAnalytics = item.product.name.includes('Analytics Tracking')
  const monthly = item.product.monthlyPrice
  const originalPrice = `($${monthly}/mo)`

  // Analytics is always free
  if (isAnalytics) {
    return { text: 'Free', isFree: true, originalPrice }
  }

  // Check if this $99 product can be free
  if (monthly === 99 && pricing.hasFree99Reward && item.pricingType === 'monthly') {
    const quantity = item.quantity
    const freeUnits = Math.min(quantity, 1) // Max 1 free
    const paidUnits = quantity - freeUnits

    if (freeUnits > 0 && paidUnits === 0) {
      return { text: 'Free', isFree: true, originalPrice }
    } else if (freeUnits > 0 && paidUnits > 0) {
      return {
        text: `${freeUnits} Free, ${paidUnits} × $${monthly}/mo`,
        isFree: true
      }
    }
  }

  // Regular pricing
  if (item.pricingType === 'onetime' && item.product.onetimePrice > 0) {
    return { text: `$${formatPrice(item.product.onetimePrice)} one-time`, isFree: false }
  }

  if (item.quantity > 1) {
    return { text: `${item.quantity} × $${monthly}/mo`, isFree: false }
  }

  return { text: `$${monthly}/mo`, isFree: false }
}

import { create } from 'zustand'
import type {
  Product,
  RecommendationItem,
  TierName,
  PricingType,
  Client,
} from '@/types/recommendation'
import {
  calculateTierPricing,
  calculateGrowthRewards,
  calculateClaimHints,
  calculateBaseTotal,
} from '@/lib/utils/pricing'

interface RecommendationState {
  // Selected client
  selectedClient: Client | null

  // Items in each tier
  tiers: Record<TierName, RecommendationItem[]>

  // Modal state
  infoModalOpen: boolean
  infoModalProduct: Product | null

  // Actions
  setSelectedClient: (client: Client | null) => void
  addItem: (tier: TierName, product: Product) => void
  removeItem: (tier: TierName, itemId: string) => void
  updateItemQuantity: (tier: TierName, itemId: string, quantity: number) => void
  updateItemPricingType: (tier: TierName, itemId: string, pricingType: PricingType) => void
  clearTier: (tier: TierName) => void
  clearAllTiers: () => void
  setTierItems: (tier: TierName, items: RecommendationItem[]) => void
  openInfoModal: (product: Product) => void
  closeInfoModal: () => void

  // Computed values
  getTierPricing: (tier: TierName) => ReturnType<typeof calculateTierPricing>
  getTierRewards: (tier: TierName) => ReturnType<typeof calculateGrowthRewards>
  getTierClaimHints: (tier: TierName) => ReturnType<typeof calculateClaimHints>
  getUnmetRequirements: (tier: TierName) => Map<string, string>
}

export const useRecommendationStore = create<RecommendationState>((set, get) => ({
  selectedClient: null,

  tiers: {
    good: [],
    better: [],
    best: [],
  },

  infoModalOpen: false,
  infoModalProduct: null,

  setSelectedClient: (client) => set({ selectedClient: client }),

  addItem: (tier, product) => {
    const id = `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newItem: RecommendationItem = {
      id,
      product,
      quantity: 1,
      pricingType: 'monthly',
    }

    set((state) => ({
      tiers: {
        ...state.tiers,
        [tier]: [...state.tiers[tier], newItem],
      },
    }))
  },

  removeItem: (tier, itemId) => {
    set((state) => ({
      tiers: {
        ...state.tiers,
        [tier]: state.tiers[tier].filter((item) => item.id !== itemId),
      },
    }))
  },

  updateItemQuantity: (tier, itemId, quantity) => {
    if (quantity < 1) return

    set((state) => ({
      tiers: {
        ...state.tiers,
        [tier]: state.tiers[tier].map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        ),
      },
    }))
  },

  updateItemPricingType: (tier, itemId, pricingType) => {
    set((state) => ({
      tiers: {
        ...state.tiers,
        [tier]: state.tiers[tier].map((item) =>
          item.id === itemId ? { ...item, pricingType } : item
        ),
      },
    }))
  },

  clearTier: (tier) => {
    set((state) => ({
      tiers: {
        ...state.tiers,
        [tier]: [],
      },
    }))
  },

  clearAllTiers: () => {
    set({
      tiers: {
        good: [],
        better: [],
        best: [],
      },
    })
  },

  setTierItems: (tier, items) => {
    set((state) => ({
      tiers: {
        ...state.tiers,
        [tier]: items,
      },
    }))
  },

  openInfoModal: (product) => set({ infoModalOpen: true, infoModalProduct: product }),

  closeInfoModal: () => set({ infoModalOpen: false, infoModalProduct: null }),

  getTierPricing: (tier) => {
    const items = get().tiers[tier]
    return calculateTierPricing(items)
  },

  getTierRewards: (tier) => {
    const items = get().tiers[tier]
    const baseTotal = calculateBaseTotal(items)
    const pricing = calculateTierPricing(items)
    return calculateGrowthRewards(baseTotal, pricing.free99SlotUsed)
  },

  getTierClaimHints: (tier) => {
    const pricing = get().getTierPricing(tier)
    return calculateClaimHints(pricing)
  },

  getUnmetRequirements: (tier) => {
    const items = get().tiers[tier]
    const productNames = new Set(items.map((item) => item.product.name))
    const unmet = new Map<string, string>()

    for (const item of items) {
      if (item.product.requires && !productNames.has(item.product.requires)) {
        unmet.set(item.id, item.product.requires)
      }
    }

    return unmet
  },
}))

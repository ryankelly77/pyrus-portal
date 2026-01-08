'use client'

import type { RecommendationItem, TierName, PricingType, Product } from '@/types/recommendation'

interface SelectedItemsListProps {
  items: RecommendationItem[]
  tier: TierName
  unmetRequirements: Map<string, string>
  onRemove: (itemId: string) => void
  onQuantityChange: (itemId: string, quantity: number) => void
  onPricingTypeChange: (itemId: string, pricingType: PricingType) => void
  onInfoClick: (product: Product) => void
  free99SlotUsed: boolean
  hasFree99Reward: boolean
}

export function SelectedItemsList({
  items,
  tier,
  unmetRequirements,
  onRemove,
  onQuantityChange,
  onPricingTypeChange,
  onInfoClick,
  free99SlotUsed,
  hasFree99Reward,
}: SelectedItemsListProps) {
  // Track how many free $99 slots have been used as we render
  let currentFree99Used = 0

  const getItemPriceDisplay = (item: RecommendationItem) => {
    const isAnalytics = item.product.name.includes('Analytics Tracking')
    const monthly = item.product.monthlyPrice
    const originalPrice = `($${monthly}/mo)`

    // Analytics is always free
    if (isAnalytics) {
      return { text: 'Free', isFree: true, originalPrice }
    }

    // Check if this $99 product can be free
    if (monthly === 99 && hasFree99Reward && item.pricingType === 'monthly' && currentFree99Used === 0) {
      const quantity = item.quantity
      const freeUnits = Math.min(quantity, 1)
      const paidUnits = quantity - freeUnits
      currentFree99Used += freeUnits

      if (freeUnits > 0 && paidUnits === 0) {
        return { text: 'Free', isFree: true, originalPrice }
      } else if (freeUnits > 0 && paidUnits > 0) {
        return {
          text: `${freeUnits} Free, ${paidUnits} × $${monthly}/mo`,
          isFree: true,
          originalPrice: undefined,
        }
      }
    }

    // Regular pricing
    if (item.pricingType === 'onetime' && item.product.onetimePrice > 0) {
      return { text: `$${item.product.onetimePrice.toLocaleString()} one-time`, isFree: false }
    }

    if (item.quantity > 1) {
      return { text: `${item.quantity} × $${monthly}/mo`, isFree: false }
    }

    return { text: `$${monthly}/mo`, isFree: false }
  }

  if (items.length === 0) {
    return (
      <div className="dropzone-placeholder">
        <span>Drag drop service here</span>
      </div>
    )
  }

  // Reset counter for display calculation
  currentFree99Used = 0

  return (
    <>
      {items.map((item) => {
        const priceDisplay = getItemPriceDisplay(item)
        const unmetRequirement = unmetRequirements.get(item.id)
        const hasBothPricing = item.product.monthlyPrice > 0 && item.product.onetimePrice > 0
        const uniqueId = `pricing-${tier}-${item.id}`
        const isBundle = item.product.category === 'bundle' && item.product.bundleProducts && item.product.bundleProducts.length > 0
        const bundleProducts = item.product.bundleProducts || []

        return (
          <div
            key={item.id}
            className={`service-item dropped${item.product.requires ? ' has-requirement' : ''}${isBundle ? ' is-bundle' : ''}`}
            data-category={item.product.category}
          >
            <div className="service-item-header">
              <span className="service-item-title">{item.product.name}</span>
              <button
                className="info-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onInfoClick(item.product)
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </button>
            </div>

            {/* Regular price display for non-bundles */}
            {!isBundle && (
              <div className={`service-item-price${priceDisplay.isFree ? ' free-item' : ''}`}>
                {priceDisplay.originalPrice && (
                  <span className="original-price">{priceDisplay.originalPrice}</span>
                )}
                {priceDisplay.text}
              </div>
            )}

            {/* Bundle price display */}
            {isBundle && (
              <div className="service-item-price">
                ${item.product.monthlyPrice}/mo
              </div>
            )}

            {/* Bundle includes list */}
            {isBundle && bundleProducts.length > 0 && (
              <div className="bundle-includes">
                <div className="bundle-includes-header">
                  <span className="bundle-header-includes">Includes</span>
                  <span className="bundle-header-price">Reg. Price</span>
                </div>
                <ul className="bundle-products-list">
                  {bundleProducts.map((bp) => (
                    <li key={bp.id} className="bundle-product-item">
                      <span className="product-name">{bp.name}</span>
                      <span className="product-price">${bp.monthlyPrice}/mo</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description for non-bundles */}
            {!isBundle && <p className="service-item-desc">{item.product.description}</p>}

            {/* Pricing selector for items with both options */}
            {hasBothPricing && (
              <div className="pricing-selector">
                <label className="pricing-option">
                  <input
                    type="radio"
                    name={uniqueId}
                    value="monthly"
                    checked={item.pricingType === 'monthly'}
                    onChange={() => onPricingTypeChange(item.id, 'monthly')}
                  />
                  <span>${item.product.monthlyPrice}/mo for 12 months</span>
                </label>
                <label className="pricing-option">
                  <input
                    type="radio"
                    name={uniqueId}
                    value="onetime"
                    checked={item.pricingType === 'onetime'}
                    onChange={() => onPricingTypeChange(item.id, 'onetime')}
                  />
                  <span>${item.product.onetimePrice.toLocaleString()} one-time</span>
                </label>
              </div>
            )}

            {/* Quantity selector */}
            {item.product.hasQuantity && (
              <div className="quantity-selector">
                <button
                  type="button"
                  className="qty-btn qty-minus"
                  onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  −
                </button>
                <span className="qty-value">{item.quantity}</span>
                <button
                  type="button"
                  className="qty-btn qty-plus"
                  onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                >
                  +
                </button>
              </div>
            )}

            {/* Requirement overlay */}
            {unmetRequirement && (
              <div className="requirement-overlay">
                <svg
                  className="requirement-overlay-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span className="requirement-overlay-text">
                  Requires <strong>{unmetRequirement}</strong>
                </span>
              </div>
            )}

            {/* Remove button */}
            <button
              className="remove-service-btn"
              onClick={() => onRemove(item.id)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )
      })}
    </>
  )
}

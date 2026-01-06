'use client'

import type { PricingResult, GrowthRewardsDisplay, ClaimHints } from '@/types/recommendation'
import { formatPrice } from '@/lib/utils/pricing'

interface PricingSummaryProps {
  pricing: PricingResult
  rewards: GrowthRewardsDisplay
  claimHints: ClaimHints
}

export function PricingSummary({ pricing, rewards, claimHints }: PricingSummaryProps) {
  const {
    fullPriceMonthly,
    fullPriceOnetime,
    afterFreeMonthly,
    afterFreeOnetime,
    yourPriceMonthly,
    yourPriceOnetime,
    discountAmount,
    totalSavings,
    savingsDetails,
    couponCode,
  } = pricing

  const hasItems = fullPriceMonthly > 0 || fullPriceOnetime > 0

  // Format price lines
  const formatPriceLine = (onetime: number, monthly: number, decimals: boolean = false) => {
    if (onetime > 0) {
      return `$${formatPrice(onetime)} today, then $${formatPrice(monthly, decimals)}/month`
    }
    return `$${formatPrice(monthly, decimals)}/month`
  }

  return (
    <div className="tier-pricing">
      {/* 3-line pricing display */}
      <div className="price-line price-full-line" style={{ display: hasItems ? '' : 'none' }}>
        <span className="price-line-label">Full Price</span>
        <span className={`price-line-value${totalSavings > 0 ? ' strikethrough' : ''}`}>
          {formatPriceLine(fullPriceOnetime, fullPriceMonthly)}
        </span>
      </div>

      <div className="price-line price-after-free" style={{ display: hasItems ? '' : 'none' }}>
        <span className="price-line-label">After Free Items</span>
        <span className="price-line-value">
          {formatPriceLine(afterFreeOnetime, afterFreeMonthly)}
        </span>
      </div>

      <div className="price-line price-your-price" style={{ display: hasItems ? '' : 'none' }}>
        <span className="price-line-label">Your Price</span>
        <span className="price-line-value highlight">
          {formatPriceLine(yourPriceOnetime, yourPriceMonthly, discountAmount > 0)}
        </span>
      </div>

      {/* Legacy display for empty state */}
      {!hasItems && (
        <>
          <div className="price-row monthly-row">
            <span className="price-amount">$0</span>
            <span className="price-label">/month</span>
          </div>
          <div className="price-row onetime-row" style={{ display: 'none' }}>
            <span className="price-amount">$0</span>
            <span className="price-label">one-time</span>
          </div>
          <div className="price-total">
            <span className="total-text">$0/mo Total</span>
          </div>
        </>
      )}

      {/* Savings breakdown */}
      {totalSavings > 0 && (
        <div className="price-savings">
          <div className="savings-total">
            You save <strong>${formatPrice(totalSavings, true)}</strong>
          </div>
          <div className="savings-details">
            {savingsDetails.map((detail, index) => (
              <div key={index} className="savings-detail-item">{detail}</div>
            ))}
          </div>
        </div>
      )}

      {/* Claim hints */}
      <div className="claim-hints">
        {claimHints.addAnalytics && (
          <div className="claim-hint-item">Add Analytics Tracking for Free!</div>
        )}
        {claimHints.add99Product && (
          <div className="claim-hint-item">Add a $99 product to claim your free reward!</div>
        )}
      </div>
    </div>
  )
}

interface GrowthRewardsSectionProps {
  rewards: GrowthRewardsDisplay
}

export function GrowthRewardsSection({ rewards }: GrowthRewardsSectionProps) {
  const { unlockedRewards, couponCode, lockedRewards, maxRewardsReached } = rewards

  return (
    <div className="growth-rewards">
      <div className="rewards-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 12 20 22 4 22 4 12"></polyline>
          <rect x="2" y="7" width="20" height="5"></rect>
          <line x1="12" y1="22" x2="12" y2="7"></line>
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
        </svg>
        Your Growth Rewards
      </div>

      {/* Unlocked rewards */}
      <div className="rewards-unlocked">
        {unlockedRewards.map((reward, index) => (
          <div
            key={index}
            className={`reward-item unlocked${reward.pending ? ' pending' : ''}`}
          >
            {reward.text}
            {reward.pending && <span className="claim-hint">(not claimed)</span>}
          </div>
        ))}
      </div>

      {/* Coupon code */}
      {couponCode && (
        <div className="rewards-coupon">
          <div className="coupon-box">
            <span className="coupon-label">Use Code at Checkout</span>
            <span className="coupon-code">{couponCode}</span>
          </div>
        </div>
      )}

      {/* Locked rewards */}
      <div className="rewards-locked">
        {maxRewardsReached ? (
          <div className="max-rewards">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Maximum Rewards Unlocked!
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
        ) : (
          lockedRewards.map((locked, index) => (
            <div key={index} className="reward-item locked">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Add <strong>${formatPrice(locked.amountNeeded)}</strong> to unlock {locked.reward}!
            </div>
          ))
        )}
      </div>

      <div className="rewards-savings"></div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'

type TierName = 'good' | 'better' | 'best'

interface TierPricing {
  monthly: number
  onetime: number
}

interface PredictedTierSelectorProps {
  recommendationId: string
  onSaved?: () => void
}

const TIER_CONFIG: Record<TierName, { label: string; color: string; bgColor: string }> = {
  good: { label: 'Good', color: '#2563EB', bgColor: '#EFF6FF' },
  better: { label: 'Better', color: '#7C3AED', bgColor: '#F5F3FF' },
  best: { label: 'Best', color: '#D97706', bgColor: '#FFFBEB' },
}

export function PredictedTierSelector({
  recommendationId,
  onSaved,
}: PredictedTierSelectorProps) {
  const [selectedTier, setSelectedTier] = useState<TierName | null>(null)
  const [tierPricing, setTierPricing] = useState<Record<TierName, TierPricing>>({
    good: { monthly: 0, onetime: 0 },
    better: { monthly: 0, onetime: 0 },
    best: { monthly: 0, onetime: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTierData() {
      try {
        const res = await fetch(
          `/api/admin/recommendations/${recommendationId}/predicted-tier`
        )
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setSelectedTier(data.predictedTier || null)
        setTierPricing(data.tierPricing || {
          good: { monthly: 0, onetime: 0 },
          better: { monthly: 0, onetime: 0 },
          best: { monthly: 0, onetime: 0 },
        })
      } catch (err) {
        console.error(err)
        setError('Failed to load tier data')
      } finally {
        setLoading(false)
      }
    }

    fetchTierData()
  }, [recommendationId])

  const handleSelectTier = async (tier: TierName) => {
    if (tier === selectedTier) return

    setSelectedTier(tier)
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch(
        `/api/admin/recommendations/${recommendationId}/predicted-tier`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier }),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      // Revert selection on error
      setSelectedTier(selectedTier)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="tier-selector-loading">
        Loading tier options...
        <style jsx>{`
          .tier-selector-loading {
            padding: 20px;
            text-align: center;
            color: #6B7280;
            font-size: 13px;
          }
        `}</style>
      </div>
    )
  }

  const hasAnyPricing = Object.values(tierPricing).some(
    (p) => p.monthly > 0 || p.onetime > 0
  )

  if (!hasAnyPricing) {
    return (
      <div className="tier-selector-empty">
        <span>No items added to recommendation yet</span>
        <style jsx>{`
          .tier-selector-empty {
            padding: 20px;
            text-align: center;
            color: #9CA3AF;
            font-size: 13px;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="tier-selector">
      <div className="selector-header">
        <h4>Expected Closing Tier</h4>
        {saving && <span className="saving-indicator">Saving...</span>}
        {saved && <span className="saved-indicator">Saved!</span>}
      </div>

      <p className="selector-hint">
        Select the tier you expect this prospect to choose
      </p>

      <div className="tier-options">
        {(['good', 'better', 'best'] as TierName[]).map((tier) => {
          const config = TIER_CONFIG[tier]
          const pricing = tierPricing[tier]
          const isSelected = selectedTier === tier
          const isEmpty = pricing.monthly === 0 && pricing.onetime === 0

          return (
            <button
              key={tier}
              type="button"
              className={`tier-option ${isSelected ? 'selected' : ''} ${isEmpty ? 'empty' : ''}`}
              style={{
                '--tier-color': config.color,
                '--tier-bg': config.bgColor,
              } as React.CSSProperties}
              onClick={() => !isEmpty && handleSelectTier(tier)}
              disabled={isEmpty || saving}
            >
              <div className="tier-header">
                <span className="tier-label">{config.label}</span>
                {isSelected && (
                  <span className="tier-check">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                )}
              </div>

              {isEmpty ? (
                <span className="tier-empty">No items</span>
              ) : (
                <div className="tier-pricing">
                  {pricing.monthly > 0 && (
                    <div className="price-row">
                      <span className="price-amount">${pricing.monthly.toLocaleString()}</span>
                      <span className="price-period">/mo</span>
                    </div>
                  )}
                  {pricing.onetime > 0 && (
                    <div className="price-row onetime">
                      <span className="price-amount">${pricing.onetime.toLocaleString()}</span>
                      <span className="price-period">one-time</span>
                    </div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {error && <div className="selector-error">{error}</div>}

      <style jsx>{`
        .tier-selector {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
        }

        .selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .selector-header h4 {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .saving-indicator {
          font-size: 12px;
          color: #6B7280;
        }

        .saved-indicator {
          font-size: 12px;
          color: #059669;
          font-weight: 500;
        }

        .selector-hint {
          font-size: 12px;
          color: #6B7280;
          margin: 0 0 12px 0;
        }

        .tier-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        @media (max-width: 500px) {
          .tier-options {
            grid-template-columns: 1fr;
          }
        }

        .tier-option {
          display: flex;
          flex-direction: column;
          padding: 12px;
          background: #F9FAFB;
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .tier-option:hover:not(:disabled) {
          background: var(--tier-bg);
          border-color: var(--tier-color);
        }

        .tier-option.selected {
          background: var(--tier-bg);
          border-color: var(--tier-color);
        }

        .tier-option.empty {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tier-option:disabled {
          cursor: not-allowed;
        }

        .tier-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .tier-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--tier-color);
        }

        .tier-check {
          color: var(--tier-color);
        }

        .tier-empty {
          font-size: 12px;
          color: #9CA3AF;
        }

        .tier-pricing {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .price-row {
          display: flex;
          align-items: baseline;
          gap: 2px;
        }

        .price-amount {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
        }

        .price-period {
          font-size: 11px;
          color: #6B7280;
        }

        .price-row.onetime .price-amount {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .selector-error {
          margin-top: 12px;
          padding: 8px 10px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 6px;
          color: #DC2626;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}

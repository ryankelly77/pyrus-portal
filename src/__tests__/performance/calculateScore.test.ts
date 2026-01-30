/**
 * Performance Scoring System Tests
 */

import { describe, it, expect } from 'vitest'
import {
  deltaToPoints,
  calculateDelta,
  calculateAlertsScore,
  calculateBaseScore,
  calculateFinalScore,
  type AlertData,
  type MetricScores,
} from '@/lib/performance/calculateScore'
import {
  redistributeWeights,
  getWeightsForPlan,
  PLAN_WEIGHTS,
  type MetricWeights,
  type MetricType,
} from '@/lib/performance/weights'
import {
  getVelocityModifier,
  calculateVelocity,
  isInRampPeriod,
  calculateVelocityResult,
} from '@/lib/performance/velocity'
import {
  getGrowthStage,
  getEvaluationLabel,
  getScoreStatus,
  getStageFlags,
  getDaysSince,
  getMonthsActive,
} from '@/lib/performance/stages'

describe('deltaToPoints', () => {
  it('returns 50 for zero delta (no change)', () => {
    expect(deltaToPoints(0)).toBe(50)
  })

  it('returns higher score for positive delta', () => {
    expect(deltaToPoints(10)).toBe(60)
    expect(deltaToPoints(25)).toBe(75)
    expect(deltaToPoints(50)).toBe(100) // Clamped at 100
  })

  it('returns lower score for negative delta', () => {
    expect(deltaToPoints(-10)).toBe(40)
    expect(deltaToPoints(-25)).toBe(25)
    expect(deltaToPoints(-50)).toBe(0) // Clamped at 0
  })

  it('clamps to 0-100 range', () => {
    expect(deltaToPoints(100)).toBe(100)
    expect(deltaToPoints(200)).toBe(100)
    expect(deltaToPoints(-100)).toBe(0)
    expect(deltaToPoints(-200)).toBe(0)
  })

  it('rounds to nearest integer', () => {
    expect(deltaToPoints(5.7)).toBe(56)
    expect(deltaToPoints(-3.2)).toBe(47)
  })

  it('handles NaN and Infinity', () => {
    expect(deltaToPoints(NaN)).toBe(50) // Neutral
    expect(deltaToPoints(Infinity)).toBe(50) // Neutral
    expect(deltaToPoints(-Infinity)).toBe(50) // Neutral
  })
})

describe('calculateDelta', () => {
  it('calculates positive percent change', () => {
    expect(calculateDelta(120, 100)).toBe(20) // 20% increase
  })

  it('calculates negative percent change', () => {
    expect(calculateDelta(80, 100)).toBe(-20) // 20% decrease
  })

  it('returns 0 for no change', () => {
    expect(calculateDelta(100, 100)).toBe(0)
  })

  it('handles zero previous value', () => {
    expect(calculateDelta(50, 0)).toBe(25) // Positive improvement
    expect(calculateDelta(0, 0)).toBe(0) // No change
  })

  it('inverts for lower-is-better metrics', () => {
    // Keyword position: 5 (current) vs 10 (previous) = improvement
    expect(calculateDelta(5, 10, true)).toBe(50) // 50% improvement (inverted)
    // Keyword position: 15 (current) vs 10 (previous) = decline
    expect(calculateDelta(15, 10, true)).toBe(-50) // 50% decline (inverted)
  })
})

describe('calculateAlertsScore', () => {
  it('returns 0 for no alerts', () => {
    expect(calculateAlertsScore([])).toBe(0)
    expect(calculateAlertsScore(null as any)).toBe(0)
  })

  it('scores based on alert type weights', () => {
    // lead_increase = 15 points, * 2 = 30 score
    const alerts: AlertData[] = [{ type: 'lead_increase', count: 1 }]
    expect(calculateAlertsScore(alerts)).toBe(30)
  })

  it('sums multiple alerts', () => {
    const alerts: AlertData[] = [
      { type: 'lead_increase', count: 1 }, // 15
      { type: 'keyword_ranking', count: 2 }, // 10 * 2 = 20
    ]
    // Total: 35 points * 2 = 70
    expect(calculateAlertsScore(alerts)).toBe(70)
  })

  it('caps at 100', () => {
    const alerts: AlertData[] = [
      { type: 'lead_increase', count: 5 }, // 15 * 5 = 75
    ]
    // Total: 75 * 2 = 150 -> capped at 100
    expect(calculateAlertsScore(alerts)).toBe(100)
  })

  it('uses default weight for unknown types', () => {
    const alerts: AlertData[] = [{ type: 'unknown_type', count: 1 }]
    // other_update = 5 points * 2 = 10
    expect(calculateAlertsScore(alerts)).toBe(10)
  })
})

describe('calculateBaseScore', () => {
  it('calculates weighted average', () => {
    const metrics: MetricScores = {
      keywords: { current: 0, previous: 0, delta: 0, score: 80, weight: 30, contribution: 24 },
      visitors: { current: 0, previous: 0, delta: 0, score: 60, weight: 20, contribution: 12 },
      leads: { current: 0, previous: 0, delta: 0, score: 50, weight: 50, contribution: 25 },
    }
    const weights = { keywords: 30, visitors: 20, leads: 50 }

    // (80 * 0.30) + (60 * 0.20) + (50 * 0.50) = 24 + 12 + 25 = 61
    expect(calculateBaseScore(metrics, weights)).toBeCloseTo(61, 0)
  })

  it('handles missing metrics', () => {
    const metrics: MetricScores = {
      keywords: { current: 0, previous: 0, delta: 0, score: 80, weight: 50, contribution: 40 },
    }
    const weights = { keywords: 50, visitors: 50 }

    // Only keywords present, normalize to 100%
    // 80 * 0.50 = 40, normalized: 40 / 50 * 100 = 80
    expect(calculateBaseScore(metrics, weights)).toBeCloseTo(80, 0)
  })
})

describe('calculateFinalScore', () => {
  it('applies velocity modifier', () => {
    expect(calculateFinalScore(80, 1.0)).toBe(80) // No change
    expect(calculateFinalScore(80, 1.15)).toBe(92) // 15% bonus
    expect(calculateFinalScore(80, 0.85)).toBe(68) // 15% penalty
    expect(calculateFinalScore(80, 0.70)).toBe(56) // 30% penalty
  })

  it('clamps result to 0-100', () => {
    expect(calculateFinalScore(90, 1.15)).toBe(100) // 103.5 clamped
    expect(calculateFinalScore(10, 0.70)).toBe(7)
  })

  it('rounds to integer', () => {
    expect(calculateFinalScore(75, 1.15)).toBe(86) // 86.25 rounded
  })
})

describe('redistributeWeights', () => {
  it('redistributes weight proportionally', () => {
    const weights: MetricWeights = {
      keywords: 30,
      visitors: 20,
      leads: 15,
      ai_visibility: 5,
      conversions: 10,
      alerts: 20,
    }

    // Exclude ai_visibility (5%) - redistribute among remaining
    const result = redistributeWeights(weights, ['ai_visibility'])

    // Remaining active weight = 95, scale factor = 100/95
    expect(result.keywords).toBeCloseTo(31.58, 1)
    expect(result.visitors).toBeCloseTo(21.05, 1)
    expect(result.ai_visibility).toBeUndefined()

    // Sum should be 100
    const sum = Object.values(result).reduce((a, b) => a + (b || 0), 0)
    expect(sum).toBeCloseTo(100, 0)
  })

  it('handles multiple excluded metrics', () => {
    const weights: MetricWeights = {
      keywords: 30,
      visitors: 20,
      leads: 15,
      ai_visibility: 5,
      conversions: 10,
      alerts: 20,
    }

    const result = redistributeWeights(weights, ['ai_visibility', 'conversions'])

    expect(result.ai_visibility).toBeUndefined()
    expect(result.conversions).toBeUndefined()

    const sum = Object.values(result).reduce((a, b) => a + (b || 0), 0)
    expect(sum).toBeCloseTo(100, 0)
  })

  it('returns empty object if all excluded', () => {
    const weights: MetricWeights = {
      keywords: 30,
      visitors: 20,
      leads: 15,
      ai_visibility: 5,
      conversions: 10,
      alerts: 20,
    }

    const allMetrics: MetricType[] = ['keywords', 'visitors', 'leads', 'ai_visibility', 'conversions', 'alerts']
    const result = redistributeWeights(weights, allMetrics)

    expect(Object.keys(result)).toHaveLength(0)
  })
})

describe('getWeightsForPlan', () => {
  it('returns correct weights for SEO plan', () => {
    const weights = getWeightsForPlan('seo')
    expect(weights.keywords).toBe(30) // SEO emphasizes keywords
    expect(weights.leads).toBe(15)
  })

  it('returns correct weights for paid media plan', () => {
    const weights = getWeightsForPlan('paid_media')
    expect(weights.leads).toBe(40) // Paid emphasizes leads
    expect(weights.keywords).toBe(10)
  })

  it('returns correct weights for AI optimization plan', () => {
    const weights = getWeightsForPlan('ai_optimization')
    expect(weights.ai_visibility).toBe(35) // AI emphasizes visibility
  })

  it('defaults to full_service for unknown plan', () => {
    const weights = getWeightsForPlan('unknown')
    expect(weights).toEqual(PLAN_WEIGHTS.full_service)
  })

  it('normalizes plan type with spaces/dashes', () => {
    expect(getWeightsForPlan('paid-media')).toEqual(PLAN_WEIGHTS.paid_media)
    expect(getWeightsForPlan('AI Optimization')).toEqual(PLAN_WEIGHTS.ai_optimization)
  })
})

describe('getVelocityModifier', () => {
  it('returns 1.0 during ramp period', () => {
    expect(getVelocityModifier(0, 3, true)).toBe(1.0)
    expect(getVelocityModifier(0.1, 3, true)).toBe(1.0)
  })

  it('returns 1.15 for exceeding expectations (150%+)', () => {
    expect(getVelocityModifier(4.5, 3, false)).toBe(1.15) // 150%
    expect(getVelocityModifier(6, 3, false)).toBe(1.15) // 200%
  })

  it('returns 1.0 for on track (100%+)', () => {
    expect(getVelocityModifier(3, 3, false)).toBe(1.0) // 100%
    expect(getVelocityModifier(4, 3, false)).toBe(1.0) // 133%
  })

  it('returns 0.85 for below expectations (50%+)', () => {
    expect(getVelocityModifier(1.5, 3, false)).toBe(0.85) // 50%
    expect(getVelocityModifier(2, 3, false)).toBe(0.85) // 67%
  })

  it('returns 0.70 for stagnant (<50%)', () => {
    expect(getVelocityModifier(1, 3, false)).toBe(0.7) // 33%
    expect(getVelocityModifier(0, 3, false)).toBe(0.7) // 0%
  })

  it('handles zero expected velocity', () => {
    expect(getVelocityModifier(5, 0, false)).toBe(1.0)
  })
})

describe('calculateVelocity', () => {
  it('calculates improvements per month', () => {
    expect(calculateVelocity(12, 4)).toBe(3) // 12 improvements over 4 months
    expect(calculateVelocity(6, 2)).toBe(3)
  })

  it('handles zero months', () => {
    expect(calculateVelocity(10, 0)).toBe(0)
  })
})

describe('isInRampPeriod', () => {
  it('returns true for new accounts within ramp period', () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    expect(isInRampPeriod(thirtyDaysAgo, 'seo')).toBe(true) // SEO has 90 day ramp
    expect(isInRampPeriod(thirtyDaysAgo, 'paid_media')).toBe(false) // Paid has 30 day ramp
  })

  it('returns false after ramp period', () => {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    expect(isInRampPeriod(oneYearAgo, 'seo')).toBe(false)
    expect(isInRampPeriod(oneYearAgo, 'paid_media')).toBe(false)
  })
})

describe('getGrowthStage', () => {
  it('returns seedling for 0-90 days', () => {
    const now = new Date()
    expect(getGrowthStage(now)).toBe('seedling')

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    expect(getGrowthStage(sixtyDaysAgo)).toBe('seedling')
  })

  it('returns sprouting for 90-180 days', () => {
    const fourMonthsAgo = new Date()
    fourMonthsAgo.setDate(fourMonthsAgo.getDate() - 120)
    expect(getGrowthStage(fourMonthsAgo)).toBe('sprouting')
  })

  it('returns blooming for 180-365 days', () => {
    const eightMonthsAgo = new Date()
    eightMonthsAgo.setDate(eightMonthsAgo.getDate() - 240)
    expect(getGrowthStage(eightMonthsAgo)).toBe('blooming')
  })

  it('returns harvesting for 365+ days', () => {
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    expect(getGrowthStage(twoYearsAgo)).toBe('harvesting')
  })
})

describe('getEvaluationLabel', () => {
  it('returns correct labels for seedling stage', () => {
    expect(getEvaluationLabel(85, 'seedling')).toBe('Exceptional Start')
    expect(getEvaluationLabel(65, 'seedling')).toBe('Strong Start')
    expect(getEvaluationLabel(45, 'seedling')).toBe('Normal Ramp')
    expect(getEvaluationLabel(25, 'seedling')).toBe('Slow Start')
    expect(getEvaluationLabel(10, 'seedling')).toBe('Stalled Launch')
  })

  it('returns correct labels for harvesting stage', () => {
    expect(getEvaluationLabel(85, 'harvesting')).toBe('Ideal / Premium Candidate')
    expect(getEvaluationLabel(65, 'harvesting')).toBe('Stable')
    expect(getEvaluationLabel(45, 'harvesting')).toBe('Declining')
    expect(getEvaluationLabel(25, 'harvesting')).toBe('Churn Risk')
    expect(getEvaluationLabel(10, 'harvesting')).toBe('Likely Lost')
  })
})

describe('getScoreStatus', () => {
  it('returns Thriving for 80-100', () => {
    expect(getScoreStatus(85).status).toBe('Thriving')
    expect(getScoreStatus(100).status).toBe('Thriving')
  })

  it('returns Healthy for 60-79', () => {
    expect(getScoreStatus(70).status).toBe('Healthy')
  })

  it('returns Needs Attention for 40-59', () => {
    expect(getScoreStatus(50).status).toBe('Needs Attention')
  })

  it('returns At Risk for 20-39', () => {
    expect(getScoreStatus(30).status).toBe('At Risk')
  })

  it('returns Critical for 0-19', () => {
    expect(getScoreStatus(10).status).toBe('Critical')
    expect(getScoreStatus(0).status).toBe('Critical')
  })

  it('returns correct colors', () => {
    expect(getScoreStatus(85).hex).toBe('#16a34a') // Dark green
    expect(getScoreStatus(10).hex).toBe('#dc2626') // Red
  })
})

describe('getStageFlags', () => {
  it('returns Critical flag for very low scores', () => {
    const flags = getStageFlags(15, 'blooming')
    expect(flags.some(f => f.flag === 'Critical')).toBe(true)
  })

  it('returns Churn Risk for low harvesting scores', () => {
    const flags = getStageFlags(30, 'harvesting')
    expect(flags.some(f => f.flag === 'Churn Risk')).toBe(true)
  })

  it('returns Premium Candidate for high harvesting scores', () => {
    const flags = getStageFlags(85, 'harvesting')
    expect(flags.some(f => f.flag === 'Premium Candidate')).toBe(true)
  })

  it('returns Fast Tracker for high sprouting scores', () => {
    const flags = getStageFlags(85, 'sprouting')
    expect(flags.some(f => f.flag === 'Fast Tracker')).toBe(true)
  })

  it('returns Problem Account for low blooming scores', () => {
    const flags = getStageFlags(35, 'blooming')
    expect(flags.some(f => f.flag === 'Problem Account')).toBe(true)
  })

  it('returns empty array for normal scores', () => {
    const flags = getStageFlags(65, 'blooming')
    expect(flags).toHaveLength(0)
  })
})

describe('getDaysSince', () => {
  it('calculates days from date', () => {
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
    expect(getDaysSince(tenDaysAgo)).toBe(10)
  })

  it('accepts string dates', () => {
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
    expect(getDaysSince(tenDaysAgo.toISOString())).toBe(10)
  })
})

describe('getMonthsActive', () => {
  it('returns minimum of 1 month', () => {
    expect(getMonthsActive(new Date())).toBe(1)
  })

  it('calculates months from date', () => {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180)
    expect(getMonthsActive(sixMonthsAgo)).toBe(6)
  })
})

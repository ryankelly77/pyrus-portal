/**
 * Plan-based metric weights for performance scoring
 *
 * Different service plans prioritize different metrics.
 * Weights are percentages that must sum to 100.
 */

export type MetricType =
  | 'keywords'
  | 'visitors'
  | 'leads'
  | 'ai_visibility'
  | 'conversions'
  | 'alerts'

export type PlanType =
  | 'seo'
  | 'paid_media'
  | 'ai_optimization'
  | 'full_service'

export type MetricWeights = Record<MetricType, number>

/**
 * Default weights by plan type
 * All weights sum to 100
 */
export const PLAN_WEIGHTS: Record<PlanType, MetricWeights> = {
  seo: {
    keywords: 30,
    visitors: 20,
    leads: 15,
    ai_visibility: 5,
    conversions: 10,
    alerts: 20,
  },
  paid_media: {
    keywords: 10,
    visitors: 15,
    leads: 40,
    ai_visibility: 5,
    conversions: 15,
    alerts: 15,
  },
  ai_optimization: {
    keywords: 10,
    visitors: 15,
    leads: 15,
    ai_visibility: 35,
    conversions: 10,
    alerts: 15,
  },
  full_service: {
    keywords: 20,
    visitors: 15,
    leads: 20,
    ai_visibility: 15,
    conversions: 15,
    alerts: 15,
  },
}

/**
 * Alert type weights for calculating alerts score
 * Higher weight = more impactful alert type
 */
export const ALERT_TYPE_WEIGHTS: Record<string, number> = {
  lead_increase: 15,
  ai_alert: 12.5,
  keyword_ranking: 10,
  traffic_milestone: 10,
  campaign_milestone: 7.5,
  other_update: 5,
}

/**
 * Redistributes weights when certain metrics are not tracked for a client.
 * The excluded metric's weight is proportionally distributed among remaining metrics.
 *
 * @param weights - Original weights object
 * @param excludedMetrics - Array of metric keys to exclude
 * @returns New weights object with redistributed values
 */
export function redistributeWeights(
  weights: MetricWeights,
  excludedMetrics: MetricType[]
): Partial<MetricWeights> {
  const activeMetrics = (Object.keys(weights) as MetricType[])
    .filter(m => !excludedMetrics.includes(m))

  if (activeMetrics.length === 0) {
    return {}
  }

  const excludedWeight = excludedMetrics.reduce((sum, m) => sum + (weights[m] || 0), 0)
  const activeWeight = 100 - excludedWeight

  if (activeWeight <= 0) {
    // If all weight is excluded, distribute equally among active metrics
    const equalWeight = 100 / activeMetrics.length
    return activeMetrics.reduce((newWeights, metric) => {
      newWeights[metric] = equalWeight
      return newWeights
    }, {} as Partial<MetricWeights>)
  }

  // Scale up remaining weights proportionally to sum to 100
  const scaleFactor = 100 / activeWeight

  return activeMetrics.reduce((newWeights, metric) => {
    newWeights[metric] = weights[metric] * scaleFactor
    return newWeights
  }, {} as Partial<MetricWeights>)
}

/**
 * Get weights for a specific plan type
 * Defaults to full_service if plan type is not recognized
 */
export function getWeightsForPlan(planType: string): MetricWeights {
  const normalizedPlan = planType.toLowerCase().replace(/[\s-]/g, '_') as PlanType
  return PLAN_WEIGHTS[normalizedPlan] || PLAN_WEIGHTS.full_service
}

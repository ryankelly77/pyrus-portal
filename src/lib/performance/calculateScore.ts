/**
 * Performance Score Calculation
 *
 * Main scoring functions that combine metrics, alerts, and velocity
 * into a final performance score (0-100).
 */

import { prisma } from '@/lib/prisma'
import {
  MetricType,
  MetricWeights,
  PlanType,
  ALERT_TYPE_WEIGHTS,
  getWeightsForPlan,
  redistributeWeights,
} from './weights'
import {
  GrowthStage,
  getGrowthStage,
  getStageConfig,
  getEvaluationLabel,
  getScoreStatus,
  getStageFlags,
  StageFlag,
} from './stages'
import {
  calculateVelocityResult,
  VelocityResult,
  getExpectedVelocity,
} from './velocity'

/**
 * Convert a percentage delta to a 0-100 point score
 *
 * Base formula: 50 = no change, +1% = +1 point
 * For inverted metrics (like keyword position where lower is better),
 * pass the inverted delta.
 *
 * @param delta - Percentage change (-100 to +100+)
 * @returns Score between 0 and 100
 */
export function deltaToPoints(delta: number): number {
  // Handle NaN or undefined
  if (!Number.isFinite(delta)) {
    return 50 // Neutral score for invalid input
  }

  // Base formula: 50 + delta
  const points = 50 + delta

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(points)))
}

/**
 * Calculate percentage change between two values
 *
 * @param current - Current period value
 * @param previous - Previous period value
 * @param invert - If true, invert the calculation (for "lower is better" metrics)
 * @returns Percentage change
 */
export function calculateDelta(
  current: number,
  previous: number,
  invert: boolean = false
): number {
  // Special case: no previous data
  if (previous === 0) {
    if (current === 0) return 0 // No change
    // Use absolute threshold - treat any positive value as improvement
    return current > 0 ? 25 : -25
  }

  let delta = ((current - previous) / previous) * 100

  // Invert for metrics where lower is better (e.g., keyword position)
  if (invert) {
    delta = -delta
  }

  return delta
}

export interface AlertData {
  type: string
  count?: number
}

/**
 * Calculate alerts score based on result alerts sent
 *
 * More meaningful alerts = higher score
 * 50 points of weighted alerts = score of 100
 *
 * @param alerts - Array of alerts with types
 * @returns Score between 0 and 100
 */
export function calculateAlertsScore(alerts: AlertData[]): number {
  if (!alerts || alerts.length === 0) {
    return 0
  }

  const totalPoints = alerts.reduce((sum, alert) => {
    const weight = ALERT_TYPE_WEIGHTS[alert.type] || ALERT_TYPE_WEIGHTS.other_update
    const count = alert.count || 1
    return sum + (weight * count)
  }, 0)

  // 50 points = 100 score, scale linearly
  return Math.min(100, Math.round(totalPoints * 2))
}

export interface MetricScore {
  current: number
  previous: number
  delta: number
  score: number
  weight: number
  contribution: number
}

export type MetricScores = Partial<Record<MetricType, MetricScore>>

/**
 * Calculate base score from weighted metric scores
 *
 * @param metricScores - Individual metric scores
 * @param weights - Metric weights (should sum to 100)
 * @returns Weighted average score
 */
export function calculateBaseScore(
  metricScores: MetricScores,
  weights: Partial<MetricWeights>
): number {
  let totalScore = 0
  let totalWeight = 0

  for (const [metric, weight] of Object.entries(weights)) {
    const metricScore = metricScores[metric as MetricType]
    if (metricScore && weight) {
      totalScore += metricScore.score * (weight / 100)
      totalWeight += weight
    }
  }

  // If weights don't sum to 100, normalize
  if (totalWeight > 0 && totalWeight !== 100) {
    totalScore = (totalScore / totalWeight) * 100
  }

  return totalScore
}

/**
 * Apply velocity modifier to get final score
 *
 * @param baseScore - Pre-velocity score
 * @param velocityModifier - Modifier from velocity calculation (0.7 to 1.15)
 * @returns Final score, clamped to 0-100
 */
export function calculateFinalScore(baseScore: number, velocityModifier: number): number {
  const finalScore = baseScore * velocityModifier
  return Math.max(0, Math.min(100, Math.round(finalScore)))
}

export interface PerformanceResult {
  clientId: string
  clientName: string
  score: number
  growthStage: GrowthStage
  stageLabel: string
  stageIcon: string
  status: string
  statusColor: string
  evaluationLabel: string
  planType: PlanType
  tenureMonths: number
  mrr: number
  metrics: MetricScores
  velocity: VelocityResult
  calculation: {
    baseScore: number
    velocityModifier: number
    finalScore: number
  }
  flags: StageFlag[]
  lastAlertAt: Date | null
  lastAlertType: string | null
  redFlags: string[]
  recommendations: string[]
}

/**
 * Count improvements from activity log and communications
 */
async function countImprovements(clientId: string, monthsBack: number = 12): Promise<number> {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - monthsBack)

  // Count positive result alerts
  const alertCount = await prisma.client_communications.count({
    where: {
      client_id: clientId,
      comm_type: 'result_alert',
      highlight_type: 'success',
      created_at: { gte: startDate },
    },
  })

  // Count positive activity log entries
  const activityCount = await prisma.activity_log.count({
    where: {
      client_id: clientId,
      activity_type: {
        in: ['seo_ranking', 'traffic_milestone', 'lead_generated', 'social_engagement'],
      },
      created_at: { gte: startDate },
    },
  })

  return alertCount + activityCount
}

/**
 * Get recent alerts for a client
 */
async function getRecentAlerts(clientId: string, days: number = 30): Promise<AlertData[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const alerts = await prisma.client_communications.findMany({
    where: {
      client_id: clientId,
      comm_type: 'result_alert',
      created_at: { gte: startDate },
    },
    select: {
      metadata: true,
    },
  })

  // Group by alert type from metadata
  const alertTypes: Record<string, number> = {}
  for (const alert of alerts) {
    const metadata = alert.metadata as Record<string, unknown> | null
    const type = (metadata?.type as string) || 'other_update'
    alertTypes[type] = (alertTypes[type] || 0) + 1
  }

  return Object.entries(alertTypes).map(([type, count]) => ({ type, count }))
}

/**
 * Get metric snapshots for a period
 *
 * Finds a snapshot whose start date falls within a reasonable range of the query period.
 * This ensures we get the correct snapshot for current vs previous periods.
 */
async function getMetricValue(
  clientId: string,
  metricType: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number | null> {
  // Find snapshot where period_start is within a few days of our query start
  // This prevents finding the wrong snapshot when periods are close together
  const rangeStart = new Date(periodStart)
  rangeStart.setDate(rangeStart.getDate() - 5) // Allow 5 days before
  const rangeEnd = new Date(periodStart)
  rangeEnd.setDate(rangeEnd.getDate() + 10) // Allow 10 days after

  const snapshot = await prisma.metric_snapshots.findFirst({
    where: {
      client_id: clientId,
      metric_type: metricType,
      period_start: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    orderBy: { period_start: 'desc' },
  })

  return snapshot ? parseFloat(snapshot.value.toString()) : null
}

interface LastAlertInfo {
  date: Date | null
  type: string | null
}

/**
 * Get last alert date and type for a client
 */
async function getLastAlertInfo(clientId: string): Promise<LastAlertInfo> {
  // First check client_alerts table (newer system)
  const clientAlert = await prisma.client_alerts.findFirst({
    where: {
      client_id: clientId,
      status: 'published',
    },
    orderBy: { published_at: 'desc' },
    select: { published_at: true, alert_type: true },
  })

  if (clientAlert?.published_at) {
    return {
      date: clientAlert.published_at,
      type: clientAlert.alert_type,
    }
  }

  // Fall back to client_communications table (legacy)
  const lastComm = await prisma.client_communications.findFirst({
    where: {
      client_id: clientId,
      comm_type: 'result_alert',
    },
    orderBy: { created_at: 'desc' },
    select: { created_at: true, metadata: true },
  })

  if (lastComm) {
    const metadata = lastComm.metadata as Record<string, unknown> | null
    return {
      date: lastComm.created_at,
      type: (metadata?.type as string) || null,
    }
  }

  return { date: null, type: null }
}

/**
 * Generate red flags based on metrics and history
 */
function generateRedFlags(
  metrics: MetricScores,
  lastAlertAt: Date | null,
  velocity: VelocityResult
): string[] {
  const flags: string[] = []

  // No recent alerts
  if (lastAlertAt) {
    const daysSinceAlert = Math.floor(
      (new Date().getTime() - lastAlertAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceAlert > 30) {
      flags.push(`No result alerts sent in ${daysSinceAlert} days`)
    }
  } else {
    flags.push('No result alerts ever sent')
  }

  // Check for declining metrics
  for (const [metric, data] of Object.entries(metrics)) {
    if (data && data.delta < -20) {
      const metricLabel = metric.replace(/_/g, ' ')
      flags.push(`${metricLabel} down ${Math.abs(Math.round(data.delta))}% this period`)
    }
  }

  // Low velocity
  if (!velocity.isInRampPeriod && velocity.ratio < 0.5) {
    flags.push('Account velocity significantly below expectations')
  }

  return flags
}

/**
 * Generate recommendations based on performance data
 */
function generateRecommendations(
  score: number,
  stage: GrowthStage,
  metrics: MetricScores,
  lastAlertAt: Date | null
): string[] {
  const recommendations: string[] = []

  // Low score recommendations
  if (score < 40) {
    recommendations.push('Schedule strategy review meeting')
    recommendations.push('Consider publishing intervention alert')
  }

  // No recent alerts
  const daysSinceAlert = lastAlertAt
    ? Math.floor((new Date().getTime() - lastAlertAt.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity

  if (daysSinceAlert > 14) {
    recommendations.push('Send a result alert to re-engage')
  }

  // Metric-specific recommendations
  if (metrics.keywords && metrics.keywords.delta < -10) {
    recommendations.push('Review keyword strategy')
  }

  if (metrics.visitors && metrics.visitors.delta < -15) {
    recommendations.push('Investigate traffic decline')
  }

  // High performer recommendations
  if (score >= 80 && stage === 'harvesting') {
    recommendations.push('Consider for case study')
    recommendations.push('Explore upsell opportunities')
  }

  return recommendations
}

/**
 * Main function to calculate performance score for a client
 *
 * Pulls all relevant data and computes the full performance analysis.
 */
export async function calculateClientPerformance(
  clientId: string
): Promise<PerformanceResult | null> {
  // Fetch client data
  const client = await prisma.clients.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      growth_stage: true,
      created_at: true,
      start_date: true,
      monthly_spend: true,
      subscriptions: {
        where: { status: 'active' },
        include: { subscription_items: { include: { product: true } } },
      },
      client_products: {
        include: { product: true },
      },
    },
  })

  if (!client) {
    return null
  }

  // Determine plan type from subscriptions/products
  // Default to full_service if unclear
  let planType: PlanType = 'full_service'
  const hasAI = client.subscriptions.some(s =>
    s.subscription_items.some(i =>
      i.product?.category?.toLowerCase().includes('ai')
    )
  ) || client.client_products.some(cp =>
    cp.product?.category?.toLowerCase().includes('ai')
  )
  const hasSEO = client.subscriptions.some(s =>
    s.subscription_items.some(i =>
      ['root', 'growth'].includes(i.product?.category?.toLowerCase() || '')
    )
  ) || client.client_products.some(cp =>
    ['root', 'growth'].includes(cp.product?.category?.toLowerCase() || '')
  )

  if (hasAI && hasSEO) {
    planType = 'full_service'
  } else if (hasAI) {
    planType = 'ai_optimization'
  } else if (hasSEO) {
    planType = 'seo'
  }

  // Calculate periods
  const now = new Date()
  const currentPeriodEnd = now
  const currentPeriodStart = new Date(now)
  currentPeriodStart.setDate(currentPeriodStart.getDate() - 30)
  const previousPeriodEnd = new Date(currentPeriodStart)
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1)
  const previousPeriodStart = new Date(previousPeriodEnd)
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 30)

  // Get metric values
  const metricTypes: Array<{ key: MetricType; dbKey: string; invert: boolean }> = [
    { key: 'keywords', dbKey: 'keyword_avg_position', invert: true },
    { key: 'visitors', dbKey: 'visitors', invert: false },
    { key: 'leads', dbKey: 'leads', invert: false },
    { key: 'ai_visibility', dbKey: 'ai_visibility', invert: false },
    { key: 'conversions', dbKey: 'conversions', invert: false },
  ]

  const metrics: MetricScores = {}
  const excludedMetrics: MetricType[] = []
  const weights = getWeightsForPlan(planType)

  for (const { key, dbKey, invert } of metricTypes) {
    const current = await getMetricValue(clientId, dbKey, currentPeriodStart, currentPeriodEnd)
    const previous = await getMetricValue(clientId, dbKey, previousPeriodStart, previousPeriodEnd)

    if (current === null && previous === null) {
      excludedMetrics.push(key)
      continue
    }

    const currentVal = current ?? 0
    const previousVal = previous ?? 0
    const delta = calculateDelta(currentVal, previousVal, invert)
    const score = deltaToPoints(delta)

    metrics[key] = {
      current: currentVal,
      previous: previousVal,
      delta,
      score,
      weight: weights[key],
      contribution: score * (weights[key] / 100),
    }
  }

  // Get alerts score
  const recentAlerts = await getRecentAlerts(clientId, 30)
  const alertsScore = calculateAlertsScore(recentAlerts)
  metrics.alerts = {
    current: recentAlerts.reduce((sum, a) => sum + (a.count || 1), 0),
    previous: 0,
    delta: 0,
    score: alertsScore,
    weight: weights.alerts,
    contribution: alertsScore * (weights.alerts / 100),
  }

  // Redistribute weights if some metrics are missing
  const adjustedWeights = excludedMetrics.length > 0
    ? redistributeWeights(weights, excludedMetrics)
    : weights

  // Update metric contributions with adjusted weights
  for (const [key, data] of Object.entries(metrics)) {
    const adjustedWeight = adjustedWeights[key as MetricType]
    if (data && adjustedWeight) {
      data.weight = adjustedWeight
      data.contribution = data.score * (adjustedWeight / 100)
    }
  }

  // Calculate base score
  const baseScore = calculateBaseScore(metrics, adjustedWeights)

  // Calculate velocity - use start_date for tenure (when they became a client)
  const improvements = await countImprovements(clientId)
  const clientStartDate = client.start_date || client.created_at || new Date()
  const velocity = calculateVelocityResult(
    improvements,
    clientStartDate,
    planType
  )

  // Calculate final score
  const finalScore = calculateFinalScore(baseScore, velocity.modifier)

  // Get growth stage (only valid performance stages, fallback to calculated)
  const validStages: GrowthStage[] = ['seedling', 'sprouting', 'blooming', 'harvesting']
  const growthStage = (validStages.includes(client.growth_stage as GrowthStage)
    ? client.growth_stage as GrowthStage
    : getGrowthStage(client.created_at || new Date()))
  const stageConfig = getStageConfig(growthStage)

  // Get status
  const status = getScoreStatus(finalScore)
  const evaluationLabel = getEvaluationLabel(finalScore, growthStage)
  const flags = getStageFlags(finalScore, growthStage)

  // Get last alert info
  const lastAlertInfo = await getLastAlertInfo(clientId)
  const lastAlertAt = lastAlertInfo.date

  // Generate red flags and recommendations
  const redFlags = generateRedFlags(metrics, lastAlertAt, velocity)
  const recommendations = generateRecommendations(finalScore, growthStage, metrics, lastAlertAt)

  // Calculate MRR - prefer monthly_spend from client record, fall back to subscription items
  let mrr = 0
  if (client.monthly_spend && parseFloat(client.monthly_spend.toString()) > 0) {
    mrr = parseFloat(client.monthly_spend.toString())
  } else {
    // Sum up all subscription items (unit_amount * quantity, or product price if no unit_amount)
    for (const sub of client.subscriptions) {
      for (const item of sub.subscription_items) {
        const quantity = item.quantity || 1
        // Try unit_amount first (stored in cents from Stripe), then fall back to product's monthly_price (in dollars)
        let unitAmount = 0
        if (item.unit_amount) {
          // Stripe stores amounts in cents, convert to dollars
          unitAmount = parseFloat(item.unit_amount.toString()) / 100
        } else if (item.product?.monthly_price) {
          // Product prices are stored in dollars
          unitAmount = parseFloat(item.product.monthly_price.toString())
        }
        mrr += unitAmount * quantity
      }
    }
  }

  return {
    clientId: client.id,
    clientName: client.name,
    score: finalScore,
    growthStage,
    stageLabel: stageConfig.label,
    stageIcon: stageConfig.icon,
    status: status.status,
    statusColor: status.hex,
    evaluationLabel,
    planType,
    tenureMonths: velocity.monthsActive,
    mrr,
    metrics,
    velocity,
    calculation: {
      baseScore,
      velocityModifier: velocity.modifier,
      finalScore,
    },
    flags,
    lastAlertAt,
    lastAlertType: lastAlertInfo.type,
    redFlags,
    recommendations,
  }
}

/**
 * Update the cached performance score on a client record
 * Also records score history for sparkline charts
 */
export async function updateClientPerformanceScore(clientId: string): Promise<number | null> {
  const result = await calculateClientPerformance(clientId)

  if (!result) {
    return null
  }

  // Update cached score
  await prisma.clients.update({
    where: { id: clientId },
    data: {
      performance_score: result.score,
      score_updated_at: new Date(),
      growth_stage: result.growthStage,
      stage_updated_at: new Date(),
    },
  })

  // Record score history (only if score changed or last record is older than 24 hours)
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)

  const lastHistory = await prisma.score_history.findFirst({
    where: { client_id: clientId },
    orderBy: { recorded_at: 'desc' },
  })

  const shouldRecord = !lastHistory ||
    lastHistory.score !== result.score ||
    lastHistory.recorded_at < oneDayAgo

  if (shouldRecord) {
    await prisma.score_history.create({
      data: {
        client_id: clientId,
        score: result.score,
        growth_stage: result.growthStage,
      },
    })
  }

  return result.score
}

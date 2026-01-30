/**
 * Velocity Modifier calculation
 *
 * Velocity measures improvements relative to account tenure.
 * It rewards fast-improving accounts and penalizes stagnant ones.
 */

import { PlanType } from './weights'
import { getMonthsActive, GrowthStage, getGrowthStage } from './stages'

/**
 * Expected monthly improvements by plan type
 * These represent the baseline for "on track" performance
 */
export const EXPECTED_VELOCITY: Record<PlanType, number> = {
  seo: 3, // 3 keyword improvements per month
  paid_media: 2, // 2 lead increases per month
  ai_optimization: 1, // 1 visibility improvement per month
  full_service: 4, // 4 combined improvements per month
}

/**
 * Ramp periods by plan type (in days)
 * During ramp period, velocity penalties are not applied
 */
export const RAMP_PERIODS: Record<PlanType, number> = {
  seo: 90,
  paid_media: 30,
  ai_optimization: 60,
  full_service: 90,
}

/**
 * Velocity modifier thresholds
 */
export const VELOCITY_MODIFIERS = {
  exceeding: { ratio: 1.5, modifier: 1.15 }, // 15% bonus
  on_track: { ratio: 1.0, modifier: 1.0 }, // No change
  below: { ratio: 0.5, modifier: 0.85 }, // 15% penalty
  stagnant: { ratio: 0, modifier: 0.7 }, // 30% penalty
}

export interface VelocityResult {
  improvementsTotal: number
  monthsActive: number
  velocity: number
  expected: number
  ratio: number
  modifier: number
  isInRampPeriod: boolean
  planType: PlanType
}

/**
 * Check if client is still in the ramp-up period
 */
export function isInRampPeriod(createdAt: Date | string, planType: PlanType): boolean {
  const startDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const now = new Date()
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const rampDays = RAMP_PERIODS[planType] || RAMP_PERIODS.full_service
  return daysSinceStart < rampDays
}

/**
 * Calculate the velocity (improvements per month)
 */
export function calculateVelocity(improvementsTotal: number, monthsActive: number): number {
  if (monthsActive <= 0) return 0
  return improvementsTotal / monthsActive
}

/**
 * Get the velocity modifier based on actual vs expected velocity
 *
 * @param velocity - Actual velocity (improvements per month)
 * @param expected - Expected velocity for the plan type
 * @param inRampPeriod - Whether client is still in ramp period
 * @returns Modifier value (0.7 to 1.15)
 */
export function getVelocityModifier(
  velocity: number,
  expected: number,
  inRampPeriod: boolean
): number {
  // During ramp period, no penalty applied
  if (inRampPeriod) {
    return 1.0
  }

  // Handle edge case of zero expected velocity
  if (expected <= 0) {
    return 1.0
  }

  const ratio = velocity / expected

  if (ratio >= VELOCITY_MODIFIERS.exceeding.ratio) {
    return VELOCITY_MODIFIERS.exceeding.modifier
  }
  if (ratio >= VELOCITY_MODIFIERS.on_track.ratio) {
    return VELOCITY_MODIFIERS.on_track.modifier
  }
  if (ratio >= VELOCITY_MODIFIERS.below.ratio) {
    return VELOCITY_MODIFIERS.below.modifier
  }
  return VELOCITY_MODIFIERS.stagnant.modifier
}

/**
 * Calculate complete velocity analysis for a client
 */
export function calculateVelocityResult(
  improvementsTotal: number,
  createdAt: Date | string,
  planType: PlanType
): VelocityResult {
  const monthsActive = getMonthsActive(createdAt)
  const velocity = calculateVelocity(improvementsTotal, monthsActive)
  const expected = EXPECTED_VELOCITY[planType] || EXPECTED_VELOCITY.full_service
  const inRampPeriod = isInRampPeriod(createdAt, planType)
  const ratio = expected > 0 ? velocity / expected : 0
  const modifier = getVelocityModifier(velocity, expected, inRampPeriod)

  return {
    improvementsTotal,
    monthsActive,
    velocity,
    expected,
    ratio,
    modifier,
    isInRampPeriod: inRampPeriod,
    planType,
  }
}

/**
 * Get expected velocity for a plan type
 */
export function getExpectedVelocity(planType: string): number {
  const normalizedPlan = planType.toLowerCase().replace(/[\s-]/g, '_') as PlanType
  return EXPECTED_VELOCITY[normalizedPlan] || EXPECTED_VELOCITY.full_service
}

/**
 * Get ramp period days for a plan type
 */
export function getRampPeriodDays(planType: string): number {
  const normalizedPlan = planType.toLowerCase().replace(/[\s-]/g, '_') as PlanType
  return RAMP_PERIODS[normalizedPlan] || RAMP_PERIODS.full_service
}

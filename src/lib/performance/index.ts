/**
 * Performance Scoring System
 *
 * Exports all performance-related functions and types
 */

// Weights
export {
  type MetricType,
  type PlanType,
  type MetricWeights,
  PLAN_WEIGHTS,
  ALERT_TYPE_WEIGHTS,
  redistributeWeights,
  getWeightsForPlan,
} from './weights'

// Stages
export {
  type GrowthStage,
  type StageConfig,
  type StatusConfig,
  type StageFlag,
  STAGE_CONFIGS,
  STAGE_EVALUATION_LABELS,
  SCORE_STATUSES,
  getDaysSince,
  getMonthsActive,
  getGrowthStage,
  getStageConfig,
  getEvaluationLabel,
  getScoreStatus,
  isBelowExpectation,
  isAboveExpectation,
  getStageFlags,
} from './stages'

// Velocity
export {
  type VelocityResult,
  EXPECTED_VELOCITY,
  RAMP_PERIODS,
  VELOCITY_MODIFIERS,
  isInRampPeriod,
  calculateVelocity,
  getVelocityModifier,
  calculateVelocityResult,
  getExpectedVelocity,
  getRampPeriodDays,
} from './velocity'

// Score Calculation
export {
  type AlertData,
  type MetricScore,
  type MetricScores,
  type PerformanceResult,
  deltaToPoints,
  calculateDelta,
  calculateAlertsScore,
  calculateBaseScore,
  calculateFinalScore,
  calculateClientPerformance,
  updateClientPerformanceScore,
} from './calculateScore'

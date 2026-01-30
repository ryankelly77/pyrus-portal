/**
 * Growth Stage definitions and logic
 *
 * Growth stages are lifecycle classifications based on account tenure.
 * Each stage has different expectations and scoring adjustments.
 */

export type GrowthStage = 'seedling' | 'sprouting' | 'blooming' | 'harvesting'

export interface StageConfig {
  name: GrowthStage
  label: string
  icon: string
  minDays: number
  maxDays: number
  expectedScoreRange: [number, number]
  description: string
}

/**
 * Stage configurations with tenure ranges and expected scores
 */
export const STAGE_CONFIGS: Record<GrowthStage, StageConfig> = {
  seedling: {
    name: 'seedling',
    label: 'Seedling',
    icon: '🌱',
    minDays: 0,
    maxDays: 90,
    expectedScoreRange: [40, 60],
    description: 'Ramp-up period, foundation building',
  },
  sprouting: {
    name: 'sprouting',
    label: 'Sprouting',
    icon: '🌿',
    minDays: 90,
    maxDays: 180,
    expectedScoreRange: [50, 70],
    description: 'Early results appearing',
  },
  blooming: {
    name: 'blooming',
    label: 'Blooming',
    icon: '🌸',
    minDays: 180,
    maxDays: 365,
    expectedScoreRange: [60, 80],
    description: 'Multi-metric growth expected',
  },
  harvesting: {
    name: 'harvesting',
    label: 'Harvesting',
    icon: '🌾',
    minDays: 365,
    maxDays: Infinity,
    expectedScoreRange: [70, 90],
    description: 'Mature, stable, expansion-ready',
  },
}

/**
 * Evaluation labels based on score and stage
 */
export const STAGE_EVALUATION_LABELS: Record<GrowthStage, Record<string, string>> = {
  seedling: {
    '80-100': 'Exceptional Start',
    '60-79': 'Strong Start',
    '40-59': 'Normal Ramp',
    '20-39': 'Slow Start',
    '0-19': 'Stalled Launch',
  },
  sprouting: {
    '80-100': 'Fast Tracker',
    '60-79': 'Ahead of Schedule',
    '40-59': 'Normal Growth',
    '20-39': 'Behind Schedule',
    '0-19': 'Failing',
  },
  blooming: {
    '80-100': 'Star Client',
    '60-79': 'On Track',
    '40-59': 'Needs Attention',
    '20-39': 'At Risk',
    '0-19': 'Critical',
  },
  harvesting: {
    '80-100': 'Ideal / Premium Candidate',
    '60-79': 'Stable',
    '40-59': 'Declining',
    '20-39': 'Churn Risk',
    '0-19': 'Likely Lost',
  },
}

/**
 * Status definitions with colors
 */
export interface StatusConfig {
  status: string
  color: string
  hex: string
  minScore: number
  maxScore: number
}

export const SCORE_STATUSES: StatusConfig[] = [
  { status: 'Thriving', color: 'dark-green', hex: '#16a34a', minScore: 80, maxScore: 100 },
  { status: 'Healthy', color: 'light-green', hex: '#22c55e', minScore: 60, maxScore: 79 },
  { status: 'Needs Attention', color: 'yellow', hex: '#eab308', minScore: 40, maxScore: 59 },
  { status: 'At Risk', color: 'orange', hex: '#f97316', minScore: 20, maxScore: 39 },
  { status: 'Critical', color: 'red', hex: '#dc2626', minScore: 0, maxScore: 19 },
]

/**
 * Calculate the number of days since a given date
 */
export function getDaysSince(date: Date | string): number {
  const startDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffTime = now.getTime() - startDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculate months active from creation date
 */
export function getMonthsActive(createdAt: Date | string): number {
  const days = getDaysSince(createdAt)
  return Math.max(1, Math.floor(days / 30)) // Minimum 1 month
}

/**
 * Determine growth stage based on account tenure
 */
export function getGrowthStage(createdAt: Date | string): GrowthStage {
  const days = getDaysSince(createdAt)

  if (days < 90) return 'seedling'
  if (days < 180) return 'sprouting'
  if (days < 365) return 'blooming'
  return 'harvesting'
}

/**
 * Get stage configuration for a given stage
 */
export function getStageConfig(stage: GrowthStage): StageConfig {
  return STAGE_CONFIGS[stage]
}

/**
 * Get evaluation label based on score and stage
 */
export function getEvaluationLabel(score: number, stage: GrowthStage): string {
  const labels = STAGE_EVALUATION_LABELS[stage]

  if (score >= 80) return labels['80-100']
  if (score >= 60) return labels['60-79']
  if (score >= 40) return labels['40-59']
  if (score >= 20) return labels['20-39']
  return labels['0-19']
}

/**
 * Get status based on score
 */
export function getScoreStatus(score: number): StatusConfig {
  const status = SCORE_STATUSES.find(s => score >= s.minScore && score <= s.maxScore)
  return status || SCORE_STATUSES[SCORE_STATUSES.length - 1]
}

/**
 * Determine if the score is below expectation for the stage
 */
export function isBelowExpectation(score: number, stage: GrowthStage): boolean {
  const config = STAGE_CONFIGS[stage]
  return score < config.expectedScoreRange[0]
}

/**
 * Determine if the score is above expectation for the stage
 */
export function isAboveExpectation(score: number, stage: GrowthStage): boolean {
  const config = STAGE_CONFIGS[stage]
  return score > config.expectedScoreRange[1]
}

/**
 * Get special flags based on stage and score combination
 */
export interface StageFlag {
  flag: string
  icon: string
  action: string
  priority: 'critical' | 'high' | 'medium' | 'low'
}

export function getStageFlags(score: number, stage: GrowthStage): StageFlag[] {
  const flags: StageFlag[] = []

  // Critical - any stage with very low score
  if (score < 20) {
    flags.push({
      flag: 'Critical',
      icon: '🔴',
      action: 'All hands on deck',
      priority: 'critical',
    })
  }

  // Stage-specific flags
  if (stage === 'harvesting') {
    if (score < 40) {
      flags.push({
        flag: 'Churn Risk',
        icon: '🚨',
        action: 'Immediate intervention',
        priority: 'critical',
      })
    } else if (score >= 80) {
      flags.push({
        flag: 'Premium Candidate',
        icon: '⭐',
        action: 'Offer premium services',
        priority: 'low',
      })
    }
  }

  if (stage === 'blooming' && score < 40) {
    flags.push({
      flag: 'Problem Account',
      icon: '⚠️',
      action: 'Strategy review',
      priority: 'high',
    })
  }

  if (stage === 'sprouting' && score >= 80) {
    flags.push({
      flag: 'Fast Tracker',
      icon: '🚀',
      action: 'Upsell candidate',
      priority: 'low',
    })
  }

  return flags
}

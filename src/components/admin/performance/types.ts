// Shared types for performance components

export interface MetricData {
  score: number
  delta: number
}

export interface ClientMetrics {
  keywords?: MetricData
  visitors?: MetricData
  leads?: MetricData
  ai_visibility?: MetricData
  conversions?: MetricData
  alerts?: { score: number; count: number }
}

export interface ClientData {
  id: string
  name: string
  score: number
  growth_stage: 'seedling' | 'sprouting' | 'blooming' | 'harvesting'
  status: string
  plan_type: string
  mrr: number
  tenure_months: number
  metrics: ClientMetrics
  velocity_modifier: number
  last_alert_at: string | null
  flags: string[]
}

export interface StageSummary {
  count: number
  avg_score: number
  issues_count?: number
}

export interface Summary {
  total_clients: number
  average_score: number
  by_status: {
    critical: number
    at_risk: number
    needs_attention: number
    healthy: number
    thriving: number
  }
  by_stage: {
    seedling: StageSummary
    sprouting: StageSummary
    blooming: StageSummary
    harvesting: StageSummary
  }
}

export interface PerformanceData {
  summary: Summary
  clients: ClientData[]
}

export interface ClientDetailData {
  client: {
    id: string
    name: string
    score: number
    growth_stage: string
    status: string
    plan_type: string
    mrr: number
    tenure_months: number
    created_at: string
  }
  metrics: Record<string, {
    current: number
    previous: number
    delta: number
    score: number
    weight: number
    contribution: number
  }>
  velocity: {
    improvements_total: number
    months_active: number
    velocity: number
    expected: number
    ratio: number
    modifier: number
  }
  calculation: {
    base_score: number
    velocity_modifier: number
    final_score: number
  }
  red_flags: string[]
  recommendations: string[]
  alerts_history: Array<{
    id: string
    type: string
    message: string
    sent_at: string
  }>
}

export type GrowthStage = 'seedling' | 'sprouting' | 'blooming' | 'harvesting'

/**
 * Zod validation schemas for Performance Scoring System
 */

import { z } from 'zod'

/**
 * Metric types enum
 */
export const MetricTypeSchema = z.enum([
  'keywords',
  'visitors',
  'leads',
  'ai_visibility',
  'conversions',
  'alerts',
])

/**
 * Plan types enum
 */
export const PlanTypeSchema = z.enum([
  'seo',
  'paid_media',
  'ai_optimization',
  'full_service',
])

/**
 * Growth stage enum
 */
export const GrowthStageSchema = z.enum([
  'seedling',
  'sprouting',
  'blooming',
  'harvesting',
])

/**
 * Alert type enum (for result alerts)
 */
export const AlertTypeSchema = z.enum([
  'lead_increase',
  'ai_alert',
  'keyword_ranking',
  'traffic_milestone',
  'campaign_milestone',
  'other_update',
])

/**
 * Client alert type enum
 */
export const ClientAlertTypeSchema = z.enum([
  'performance_focus',
  'general_update',
  'milestone',
  'intervention',
])

/**
 * Client alert status enum
 */
export const ClientAlertStatusSchema = z.enum([
  'draft',
  'published',
  'dismissed',
])

/**
 * Metric score schema
 */
export const MetricScoreSchema = z.object({
  current: z.number(),
  previous: z.number(),
  delta: z.number(),
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(100),
  contribution: z.number(),
})

/**
 * Velocity result schema
 */
export const VelocityResultSchema = z.object({
  improvementsTotal: z.number().int().min(0),
  monthsActive: z.number().int().min(1),
  velocity: z.number().min(0),
  expected: z.number().min(0),
  ratio: z.number().min(0),
  modifier: z.number().min(0.7).max(1.15),
  isInRampPeriod: z.boolean(),
  planType: PlanTypeSchema,
})

/**
 * Stage flag schema
 */
export const StageFlagSchema = z.object({
  flag: z.string(),
  icon: z.string(),
  action: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
})

/**
 * Performance result schema
 */
export const PerformanceResultSchema = z.object({
  clientId: z.string().uuid(),
  clientName: z.string(),
  score: z.number().int().min(0).max(100),
  growthStage: GrowthStageSchema,
  stageLabel: z.string(),
  stageIcon: z.string(),
  status: z.string(),
  statusColor: z.string(),
  evaluationLabel: z.string(),
  planType: PlanTypeSchema,
  tenureMonths: z.number().int().min(1),
  mrr: z.number().min(0),
  metrics: z.record(z.string(), MetricScoreSchema.optional()),
  velocity: VelocityResultSchema,
  calculation: z.object({
    baseScore: z.number(),
    velocityModifier: z.number(),
    finalScore: z.number().int().min(0).max(100),
  }),
  flags: z.array(StageFlagSchema),
  lastAlertAt: z.date().nullable(),
  redFlags: z.array(z.string()),
  recommendations: z.array(z.string()),
})

/**
 * Create client alert request schema
 */
export const CreateClientAlertSchema = z.object({
  client_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
  alert_type: ClientAlertTypeSchema,
  publish: z.boolean().optional().default(false),
})

/**
 * Metric snapshot input schema
 */
export const MetricSnapshotInputSchema = z.object({
  client_id: z.string().uuid(),
  metric_type: z.string(),
  value: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
})

/**
 * Keyword ranking input schema
 */
export const KeywordRankingInputSchema = z.object({
  client_id: z.string().uuid(),
  keyword: z.string().min(1),
  position: z.number().int().min(1),
  search_engine: z.enum(['google', 'bing', 'chatgpt', 'perplexity', 'gemini', 'copilot']),
  recorded_at: z.coerce.date(),
})

/**
 * Lead input schema
 */
export const LeadInputSchema = z.object({
  client_id: z.string().uuid(),
  source: z.enum(['organic', 'paid', 'referral', 'direct', 'social']),
  lead_score: z.number().int().min(1).max(100).optional(),
  converted: z.boolean().optional().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/**
 * AI visibility score input schema
 */
export const AIVisibilityScoreInputSchema = z.object({
  client_id: z.string().uuid(),
  platform: z.enum(['chatgpt', 'perplexity', 'gemini', 'copilot', 'claude']),
  query: z.string().min(1),
  visibility_score: z.number().int().min(0).max(100),
  mentioned: z.boolean().optional().default(false),
  position: z.number().int().min(1).optional(),
  recorded_at: z.coerce.date(),
})

/**
 * Performance dashboard query params schema
 */
export const PerformanceDashboardQuerySchema = z.object({
  stage: GrowthStageSchema.optional(),
  status: z.enum(['critical', 'at_risk', 'needs_attention', 'healthy', 'thriving']).optional(),
  plan: PlanTypeSchema.optional(),
  sort: z.enum(['score_asc', 'score_desc', 'name', 'stage', 'mrr_desc']).optional().default('score_desc'),
  critical_only: z.coerce.boolean().optional().default(false),
})

/**
 * Dashboard client metric schema (simplified for list view)
 */
export const DashboardClientMetricSchema = z.object({
  score: z.number(),
  delta: z.number(),
})

/**
 * Dashboard client schema (for client list)
 */
export const DashboardClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  score: z.number().min(0).max(100),
  growth_stage: GrowthStageSchema,
  status: z.string(),
  plan_type: z.string(),
  mrr: z.number().min(0),
  tenure_months: z.number().min(0),
  metrics: z.object({
    keywords: DashboardClientMetricSchema.optional(),
    visitors: DashboardClientMetricSchema.optional(),
    leads: DashboardClientMetricSchema.optional(),
    ai_visibility: DashboardClientMetricSchema.optional(),
    alerts: z.object({
      score: z.number(),
      count: z.number(),
    }).optional(),
  }),
  velocity_modifier: z.number(),
  last_alert_at: z.string().nullable(),
  flags: z.array(z.string()),
})

/**
 * Stage summary schema
 */
export const StageSummarySchema = z.object({
  count: z.number().min(0),
  avg_score: z.number().min(0).max(100),
})

/**
 * Dashboard summary schema
 */
export const DashboardSummarySchema = z.object({
  total_clients: z.number().min(0),
  average_score: z.number().min(0).max(100),
  by_status: z.object({
    critical: z.number().min(0),
    at_risk: z.number().min(0),
    needs_attention: z.number().min(0),
    healthy: z.number().min(0),
    thriving: z.number().min(0),
  }),
  by_stage: z.object({
    seedling: StageSummarySchema,
    sprouting: StageSummarySchema,
    blooming: StageSummarySchema,
    harvesting: StageSummarySchema,
  }),
})

/**
 * Performance dashboard response schema
 * Use this to validate API responses match expected shape
 */
export const PerformanceDashboardResponseSchema = z.object({
  summary: DashboardSummarySchema,
  clients: z.array(DashboardClientSchema),
})

// Type exports
export type MetricType = z.infer<typeof MetricTypeSchema>
export type PlanType = z.infer<typeof PlanTypeSchema>
export type GrowthStage = z.infer<typeof GrowthStageSchema>
export type AlertType = z.infer<typeof AlertTypeSchema>
export type ClientAlertType = z.infer<typeof ClientAlertTypeSchema>
export type ClientAlertStatus = z.infer<typeof ClientAlertStatusSchema>
export type MetricScore = z.infer<typeof MetricScoreSchema>
export type VelocityResult = z.infer<typeof VelocityResultSchema>
export type StageFlag = z.infer<typeof StageFlagSchema>
export type PerformanceResult = z.infer<typeof PerformanceResultSchema>
export type CreateClientAlert = z.infer<typeof CreateClientAlertSchema>
export type MetricSnapshotInput = z.infer<typeof MetricSnapshotInputSchema>
export type KeywordRankingInput = z.infer<typeof KeywordRankingInputSchema>
export type LeadInput = z.infer<typeof LeadInputSchema>
export type AIVisibilityScoreInput = z.infer<typeof AIVisibilityScoreInputSchema>
export type PerformanceDashboardQuery = z.infer<typeof PerformanceDashboardQuerySchema>
export type DashboardClientMetric = z.infer<typeof DashboardClientMetricSchema>
export type DashboardClient = z.infer<typeof DashboardClientSchema>
export type StageSummary = z.infer<typeof StageSummarySchema>
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>
export type PerformanceDashboardResponse = z.infer<typeof PerformanceDashboardResponseSchema>

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import {
  calculateClientPerformance,
  type PerformanceResult,
  type GrowthStage,
  STAGE_CONFIGS,
} from '@/lib/performance'
import { PerformanceDashboardQuerySchema } from '@/lib/validation/performanceSchemas'

interface DashboardSummary {
  total_clients: number
  average_score: number
  by_stage: Record<GrowthStage, { count: number; avg_score: number }>
  needs_attention: number
  upsell_ready: number
}

interface DashboardClient {
  id: string
  name: string
  score: number
  growth_stage: GrowthStage
  status: string
  plan_type: string
  mrr: number
  tenure_months: number
  metrics: {
    keywords?: { score: number; delta: number }
    visitors?: { score: number; delta: number }
    leads?: { score: number; delta: number }
    ai_visibility?: { score: number; delta: number }
    alerts?: { score: number; count: number }
  }
  velocity_modifier: number
  last_alert_at: string | null
  flags: string[]
}

interface DashboardResponse {
  summary: DashboardSummary
  clients: DashboardClient[]
}

// GET /api/admin/performance - Dashboard data
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Parse query params
    const { searchParams } = new URL(request.url)
    const queryResult = PerformanceDashboardQuerySchema.safeParse({
      stage: searchParams.get('stage') || undefined,
      status: searchParams.get('status') || undefined,
      plan: searchParams.get('plan') || undefined,
      sort: searchParams.get('sort') || 'score_desc',
      critical_only: searchParams.get('critical_only') || false,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.issues },
        { status: 400 }
      )
    }

    const query = queryResult.data

    // Fetch all active clients
    const clients = await prisma.clients.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        growth_stage: true,
        performance_score: true,
        score_updated_at: true,
        created_at: true,
      },
    })

    // Calculate performance for each client (or use cached if recent)
    const performanceResults: PerformanceResult[] = []
    const ONE_HOUR = 60 * 60 * 1000

    for (const client of clients) {
      // Use cached score if updated within the last hour
      const cacheValid = client.score_updated_at &&
        (new Date().getTime() - new Date(client.score_updated_at).getTime()) < ONE_HOUR

      if (cacheValid && client.performance_score !== null) {
        // For cached clients, we still need full data for dashboard
        const result = await calculateClientPerformance(client.id)
        if (result) {
          performanceResults.push(result)
        }
      } else {
        // Calculate fresh score
        const result = await calculateClientPerformance(client.id)
        if (result) {
          performanceResults.push(result)
          // Update cache
          await prisma.clients.update({
            where: { id: client.id },
            data: {
              performance_score: result.score,
              score_updated_at: new Date(),
              growth_stage: result.growthStage,
            },
          })
        }
      }
    }

    // Apply filters
    let filteredResults = performanceResults

    if (query.stage) {
      filteredResults = filteredResults.filter(r => r.growthStage === query.stage)
    }

    if (query.status) {
      const statusMap: Record<string, [number, number]> = {
        critical: [0, 19],
        at_risk: [20, 39],
        needs_attention: [40, 59],
        healthy: [60, 79],
        thriving: [80, 100],
      }
      const [min, max] = statusMap[query.status] || [0, 100]
      filteredResults = filteredResults.filter(r => r.score >= min && r.score <= max)
    }

    if (query.critical_only) {
      filteredResults = filteredResults.filter(r => r.score < 40)
    }

    // Sort
    switch (query.sort) {
      case 'score_asc':
        filteredResults.sort((a, b) => a.score - b.score)
        break
      case 'score_desc':
        filteredResults.sort((a, b) => b.score - a.score)
        break
      case 'name':
        filteredResults.sort((a, b) => a.clientName.localeCompare(b.clientName))
        break
      case 'stage':
        const stageOrder: GrowthStage[] = ['seedling', 'sprouting', 'blooming', 'harvesting']
        filteredResults.sort((a, b) =>
          stageOrder.indexOf(a.growthStage) - stageOrder.indexOf(b.growthStage)
        )
        break
      case 'mrr_desc':
        filteredResults.sort((a, b) => b.mrr - a.mrr)
        break
    }

    // Build summary
    const summary: DashboardSummary = {
      total_clients: performanceResults.length,
      average_score: performanceResults.length > 0
        ? Math.round(performanceResults.reduce((sum, r) => sum + r.score, 0) / performanceResults.length)
        : 0,
      by_stage: {
        seedling: { count: 0, avg_score: 0 },
        sprouting: { count: 0, avg_score: 0 },
        blooming: { count: 0, avg_score: 0 },
        harvesting: { count: 0, avg_score: 0 },
      },
      needs_attention: performanceResults.filter(r => r.score >= 40 && r.score < 60).length,
      upsell_ready: performanceResults.filter(r =>
        r.score >= 80 && (r.growthStage === 'harvesting' || r.growthStage === 'sprouting')
      ).length,
    }

    // Calculate stage stats
    for (const stage of Object.keys(summary.by_stage) as GrowthStage[]) {
      const stageClients = performanceResults.filter(r => r.growthStage === stage)
      summary.by_stage[stage] = {
        count: stageClients.length,
        avg_score: stageClients.length > 0
          ? Math.round(stageClients.reduce((sum, r) => sum + r.score, 0) / stageClients.length)
          : 0,
      }
    }

    // Transform to response format
    const dashboardClients: DashboardClient[] = filteredResults.map(r => ({
      id: r.clientId,
      name: r.clientName,
      score: r.score,
      growth_stage: r.growthStage,
      status: r.status,
      plan_type: r.planType,
      mrr: r.mrr,
      tenure_months: r.tenureMonths,
      metrics: {
        keywords: r.metrics.keywords
          ? { score: r.metrics.keywords.score, delta: r.metrics.keywords.delta }
          : undefined,
        visitors: r.metrics.visitors
          ? { score: r.metrics.visitors.score, delta: r.metrics.visitors.delta }
          : undefined,
        leads: r.metrics.leads
          ? { score: r.metrics.leads.score, delta: r.metrics.leads.delta }
          : undefined,
        ai_visibility: r.metrics.ai_visibility
          ? { score: r.metrics.ai_visibility.score, delta: r.metrics.ai_visibility.delta }
          : undefined,
        alerts: r.metrics.alerts
          ? { score: r.metrics.alerts.score, count: r.metrics.alerts.current }
          : undefined,
      },
      velocity_modifier: r.velocity.modifier,
      last_alert_at: r.lastAlertAt?.toISOString() || null,
      flags: r.flags.map(f => f.flag),
    }))

    const response: DashboardResponse = {
      summary,
      clients: dashboardClients,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to fetch performance dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance dashboard' },
      { status: 500 }
    )
  }
}

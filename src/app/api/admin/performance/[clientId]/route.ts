import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import {
  calculateClientPerformance,
  getStageConfig,
  type PerformanceResult,
} from '@/lib/performance'

export const dynamic = 'force-dynamic';

// GET /api/admin/performance/[clientId] - Single client performance detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { clientId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      return NextResponse.json(
        { error: 'Invalid client ID format' },
        { status: 400 }
      )
    }

    // Calculate fresh performance data
    const result = await calculateClientPerformance(clientId)

    if (!result) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get alert history from client_alerts table
    const alertsHistory = await prisma.client_alerts.findMany({
      where: {
        client_id: clientId,
        status: 'published',
      },
      select: {
        id: true,
        message: true,
        alert_type: true,
        published_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    })

    // Get period information
    const now = new Date()
    const currentPeriodEnd = now
    const currentPeriodStart = new Date(now)
    currentPeriodStart.setDate(currentPeriodStart.getDate() - 30)

    // Get stage config for expectation comparison
    const stageConfig = getStageConfig(result.growthStage)
    const expectedMidpoint = (stageConfig.expectedScoreRange[0] + stageConfig.expectedScoreRange[1]) / 2
    const scoreGap = result.score - expectedMidpoint

    // Get current client status to check if prospect
    const currentClient = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { status: true, growth_stage: true },
    })

    // Update cached score - but don't overwrite 'prospect' growth_stage
    // Prospects should stay as prospects until they purchase
    const shouldUpdateGrowthStage = currentClient?.growth_stage !== 'prospect' && currentClient?.status !== 'prospect'
    await prisma.clients.update({
      where: { id: clientId },
      data: {
        performance_score: result.score,
        score_updated_at: new Date(),
        ...(shouldUpdateGrowthStage && {
          growth_stage: result.growthStage,
          stage_updated_at: new Date(),
        }),
      },
    })

    // Build detailed response
    const response = {
      client: {
        id: result.clientId,
        name: result.clientName,
        score: result.score,
        growth_stage: result.growthStage,
        stage_label: result.stageLabel,
        stage_icon: result.stageIcon,
        status: result.status,
        status_color: result.statusColor,
        evaluation_label: result.evaluationLabel,
        plan_type: result.planType,
        mrr: result.mrr,
        tenure_months: result.tenureMonths,
        expected_score_range: stageConfig.expectedScoreRange,
        score_gap: scoreGap,
      },
      current_period: {
        start: currentPeriodStart.toISOString().split('T')[0],
        end: currentPeriodEnd.toISOString().split('T')[0],
      },
      metrics: Object.fromEntries(
        Object.entries(result.metrics).map(([key, data]) => [
          key,
          data ? {
            current: data.current,
            previous: data.previous,
            delta: Math.round(data.delta * 10) / 10,
            score: data.score,
            weight: Math.round(data.weight * 10) / 10,
            contribution: Math.round(data.contribution * 10) / 10,
          } : null,
        ])
      ),
      velocity: {
        improvements_total: result.velocity.improvementsTotal,
        months_active: result.velocity.monthsActive,
        velocity: Math.round(result.velocity.velocity * 100) / 100,
        expected: result.velocity.expected,
        ratio: Math.round(result.velocity.ratio * 100) / 100,
        modifier: result.velocity.modifier,
        is_in_ramp_period: result.velocity.isInRampPeriod,
      },
      calculation: {
        base_score: Math.round(result.calculation.baseScore * 10) / 10,
        velocity_modifier: result.calculation.velocityModifier,
        final_score: result.calculation.finalScore,
      },
      flags: result.flags,
      alerts_history: alertsHistory.map(a => ({
        id: a.id,
        type: a.alert_type,
        message: a.message,
        sent_at: a.published_at?.toISOString() || a.created_at?.toISOString() || new Date().toISOString(),
      })),
      red_flags: result.redFlags,
      recommendations: result.recommendations,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to fetch client performance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client performance' },
      { status: 500 }
    )
  }
}

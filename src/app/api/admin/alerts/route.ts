import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic';

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertCategory =
  | 'subscription_safeguard'
  | 'state_reset_blocked'
  | 'sync_failure'
  | 'api_error'
  | 'stripe_error'
  | 'auth_error'
  | 'data_integrity'
  | 'checkout_error'
  | 'billing_sync_failure'

export interface CreateAlertRequest {
  severity: AlertSeverity
  category: AlertCategory
  message: string
  metadata?: Record<string, unknown>
  sourceFile?: string
  clientId?: string
  userId?: string
}

// GET /api/admin/alerts - List alerts (admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity')
    const category = searchParams.get('category')
    const unresolvedOnly = searchParams.get('unresolved') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    const alerts = await prisma.system_alerts.findMany({
      where: {
        ...(severity && { severity }),
        ...(category && { category }),
        ...(unresolvedOnly && { resolved_at: null }),
      },
      orderBy: { created_at: 'desc' },
      take: Math.min(limit, 100),
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

// POST /api/admin/alerts - Create alert (internal use, no auth required for server-side calls)
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateAlertRequest
    const { severity, category, message, metadata, sourceFile, clientId, userId } = body

    if (!severity || !category || !message) {
      return NextResponse.json(
        { error: 'severity, category, and message are required' },
        { status: 400 }
      )
    }

    const alert = await prisma.system_alerts.create({
      data: {
        severity,
        category,
        message,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
        source_file: sourceFile,
        client_id: clientId,
        user_id: userId,
      },
    })

    // Log critical alerts to console for immediate visibility
    if (severity === 'critical') {
      console.error(`[CRITICAL ALERT] ${category}: ${message}`, metadata)
    } else if (severity === 'warning') {
      console.warn(`[WARNING ALERT] ${category}: ${message}`, metadata)
    }

    return NextResponse.json({ alert })
  } catch (error) {
    console.error('Error creating alert:', error)
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/alerts - Resolve alert(s) (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { alertId, alertIds, resolved } = body as {
      alertId?: string
      alertIds?: string[]
      resolved: boolean
    }

    // Support batch resolving
    if (alertIds && alertIds.length > 0) {
      console.log('Batch resolving alerts:', alertIds.length, 'resolved:', resolved)
      const result = await prisma.system_alerts.updateMany({
        where: { id: { in: alertIds } },
        data: {
          resolved_at: resolved ? new Date() : null,
        },
      })
      console.log('Batch resolve result:', result)
      return NextResponse.json({ updated: result.count })
    }

    // Single alert resolve (backwards compatible)
    if (!alertId) {
      return NextResponse.json(
        { error: 'alertId or alertIds is required' },
        { status: 400 }
      )
    }

    const alert = await prisma.system_alerts.update({
      where: { id: alertId },
      data: {
        resolved_at: resolved ? new Date() : null,
      },
    })

    return NextResponse.json({ alert })
  } catch (error) {
    console.error('Error updating alert:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}

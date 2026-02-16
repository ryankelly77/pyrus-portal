import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface Contact {
  email: string
  name: string | null
  type: string | null
  enrolledAt: string
}

interface StepCount {
  count: number
  contacts: Contact[]
}

/**
 * GET /api/admin/automations/[id]/enrollment-counts
 * Get enrollment counts per step for displaying on workflow nodes
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await context.params

    // Verify automation exists
    const automation = await prisma.email_automations.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { step_order: 'asc' },
        },
      },
    })

    if (!automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      )
    }

    // Get all active enrollments for this automation
    const enrollments = await prisma.email_automation_enrollments.findMany({
      where: {
        automation_id: id,
        status: 'active',
      },
      select: {
        id: true,
        recipient_email: true,
        recipient_name: true,
        trigger_record_type: true,
        current_step_order: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    })

    // Group enrollments by current_step_order
    // current_step_order = 0 means they haven't completed any steps yet (waiting for step 1)
    // current_step_order = 1 means they completed step 1 (waiting for step 2)
    const countsByStep: Record<number, StepCount> = {}

    for (const enrollment of enrollments) {
      const stepOrder = enrollment.current_step_order
      if (!countsByStep[stepOrder]) {
        countsByStep[stepOrder] = { count: 0, contacts: [] }
      }
      countsByStep[stepOrder].count++
      countsByStep[stepOrder].contacts.push({
        email: enrollment.recipient_email,
        name: enrollment.recipient_name,
        type: enrollment.trigger_record_type,
        enrolledAt: enrollment.created_at?.toISOString() || '',
      })
    }

    // Also get total active count for the trigger node
    const totalActive = enrollments.length

    return NextResponse.json({
      totalActive,
      stepCounts: countsByStep,
      // Map step_order to help frontend correlate with nodes
      steps: automation.steps.map(step => ({
        stepOrder: step.step_order,
        templateSlug: step.template_slug,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch enrollment counts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrollment counts' },
      { status: 500 }
    )
  }
}

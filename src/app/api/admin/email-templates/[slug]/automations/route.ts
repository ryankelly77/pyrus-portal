import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/admin/email-templates/[slug]/automations
 * Get all automations that use this email template
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { slug } = await context.params

    const supabase = await createClient() as any

    // Find all automation steps that use this template
    const { data: steps, error: stepsError } = await supabase
      .from('email_automation_steps')
      .select(`
        id,
        step_order,
        delay_days,
        delay_hours,
        automation_id,
        email_automations(
          id,
          name,
          slug,
          trigger_type,
          is_active
        )
      `)
      .eq('template_slug', slug)

    if (stepsError) {
      console.error('Failed to fetch automations for template:', stepsError)
      return NextResponse.json(
        { error: 'Failed to fetch automations' },
        { status: 500 }
      )
    }

    // Group by automation and format the response
    const automationMap = new Map<string, any>()

    for (const step of steps || []) {
      const automation = step.email_automations
      if (!automation) continue

      if (!automationMap.has(automation.id)) {
        automationMap.set(automation.id, {
          id: automation.id,
          name: automation.name,
          slug: automation.slug,
          triggerType: automation.trigger_type,
          isActive: automation.is_active,
          steps: [],
        })
      }

      automationMap.get(automation.id).steps.push({
        stepOrder: step.step_order,
        delayDays: step.delay_days,
        delayHours: step.delay_hours,
      })
    }

    // Convert to array and sort steps within each automation
    const automations = Array.from(automationMap.values()).map(a => ({
      ...a,
      steps: a.steps.sort((x: any, y: any) => x.stepOrder - y.stepOrder),
    }))

    return NextResponse.json({ automations })
  } catch (error) {
    console.error('Failed to fetch automations for template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automations' },
      { status: 500 }
    )
  }
}

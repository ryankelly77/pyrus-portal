import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// POST /api/admin/clients/[id]/checklist/sync - Re-sync checklist items based on onboarding responses
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id: clientId } = await params

    // Get all checklist items for this client with their templates
    const checklistItems = await prisma.client_checklist_items.findMany({
      where: { client_id: clientId },
      include: {
        template: true,
      },
    })

    if (checklistItems.length === 0) {
      return NextResponse.json({ synced: 0, message: 'No checklist items to sync' })
    }

    // Get all onboarding responses for this client
    const responses = await prisma.client_onboarding_responses.findMany({
      where: { client_id: clientId },
    })
    const responseMap = new Map(responses.map(r => [r.question_id, r]))

    // Check each checklist item for auto-completion
    let syncedCount = 0
    const updates = await Promise.all(
      checklistItems.map(async (item) => {
        // Skip if already completed
        if (item.is_completed) {
          return null
        }

        const template = item.template

        // Check if this item should be auto-completed
        if (template.auto_complete_question_id && template.auto_complete_values) {
          const response = responseMap.get(template.auto_complete_question_id)

          if (response) {
            const autoCompleteValues = template.auto_complete_values as string[]
            const responseValue = response.response_text || ''
            const responseOptions = (response.response_options as string[]) || []

            // Check if response matches any auto-complete value
            const shouldComplete = autoCompleteValues.some(val =>
              responseValue.toLowerCase() === val.toLowerCase() ||
              responseOptions.some(opt => opt.toLowerCase() === val.toLowerCase())
            )

            if (shouldComplete) {
              syncedCount++
              return await prisma.client_checklist_items.update({
                where: { id: item.id },
                data: {
                  is_completed: true,
                  completed_at: new Date(),
                  notes: 'Auto-completed based on onboarding form response (synced)',
                },
              })
            }
          }
        }

        return null
      })
    )

    return NextResponse.json({
      synced: syncedCount,
      message: syncedCount > 0
        ? `${syncedCount} checklist item(s) auto-completed based on onboarding responses`
        : 'No items matched auto-complete criteria',
    })
  } catch (error) {
    console.error('Failed to sync checklist items:', error)
    return NextResponse.json(
      { error: 'Failed to sync checklist items' },
      { status: 500 }
    )
  }
}

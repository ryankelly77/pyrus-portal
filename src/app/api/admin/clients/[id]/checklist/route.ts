import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { validateRequest } from '@/lib/validation/validateRequest'
import { checklistGenerateSchema } from '@/lib/validation/schemas'

export const dynamic = 'force-dynamic';

// GET /api/admin/clients/[id]/checklist - Get client's checklist items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id: clientId } = await params

    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { id: true },
    })
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get all checklist items for this client with template info
    const checklistItems = await prisma.client_checklist_items.findMany({
      where: { client_id: clientId },
      include: {
        template: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: [
        { template: { product_id: 'asc' } },
        { template: { sort_order: 'asc' } },
      ],
    })

    // Format the response
    const items = checklistItems.map((item) => ({
      id: item.id,
      templateId: item.template_id,
      title: item.template.title,
      description: item.template.description,
      actionType: item.template.action_type,
      actionUrl: item.template.action_url,
      actionLabel: item.template.action_label,
      isCompleted: item.is_completed,
      completedAt: item.completed_at,
      notes: item.notes,
      product: item.template.product,
    }))

    return NextResponse.json(items)
  } catch (error) {
    console.error('Failed to fetch client checklist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client checklist' },
      { status: 500 }
    )
  }
}

// POST /api/admin/clients/[id]/checklist - Generate checklist items from purchased products
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any

    const { id: clientId } = await params
    const validated = await validateRequest(checklistGenerateSchema, request)
    if ((validated as any).error) return (validated as any).error
    const { productIds } = (validated as any).data

    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { id: true },
    })
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'Product IDs are required' },
        { status: 400 }
      )
    }

    // Get all active checklist templates for the given products
    const templates = await prisma.onboarding_checklist_templates.findMany({
      where: {
        product_id: { in: productIds },
        is_active: true,
      },
    })

    if (templates.length === 0) {
      return NextResponse.json({ created: 0 })
    }

    // Get all onboarding responses for this client to check for auto-completion
    const responses = await prisma.client_onboarding_responses.findMany({
      where: { client_id: clientId },
    })
    const responseMap = new Map(responses.map(r => [r.question_id, r]))

    // Create checklist items for each template (skip if already exists)
    const results = await Promise.all(
      templates.map(async (template) => {
        try {
          // Check if this item should be auto-completed based on a linked question response
          let shouldAutoComplete = false
          if (template.auto_complete_question_id && template.auto_complete_values) {
            const response = responseMap.get(template.auto_complete_question_id)
            if (response) {
              const autoCompleteValues = template.auto_complete_values as string[]
              const responseValue = response.response_text || ''
              const responseOptions = (response.response_options as string[]) || []

              // Check if response matches any auto-complete value
              shouldAutoComplete = autoCompleteValues.some(val =>
                responseValue.toLowerCase() === val.toLowerCase() ||
                responseOptions.some(opt => opt.toLowerCase() === val.toLowerCase())
              )
            }
          }

          return await prisma.client_checklist_items.upsert({
            where: {
              client_id_template_id: {
                client_id: clientId,
                template_id: template.id,
              },
            },
            update: shouldAutoComplete ? {
              is_completed: true,
              completed_at: new Date(),
              notes: 'Auto-completed based on onboarding form response',
            } : {},
            create: {
              client_id: clientId,
              template_id: template.id,
              is_completed: shouldAutoComplete,
              completed_at: shouldAutoComplete ? new Date() : null,
              notes: shouldAutoComplete ? 'Auto-completed based on onboarding form response' : null,
            },
          })
        } catch (upsertError) {
          console.warn(`Failed to upsert checklist item for template ${template.id}:`, upsertError)
          return null
        }
      })
    )

    const created = results.filter(Boolean).length

    return NextResponse.json({ created }, { status: 201 })
  } catch (error) {
    console.error('Failed to generate checklist items:', error)
    return NextResponse.json(
      { error: 'Failed to generate checklist items' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/clients/[id]/checklist - Get client's checklist items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params

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
    const { id: clientId } = await params
    const body = await request.json()
    const { productIds } = body

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

    // Create checklist items for each template (skip if already exists)
    const results = await Promise.all(
      templates.map(async (template) => {
        try {
          return await prisma.client_checklist_items.upsert({
            where: {
              client_id_template_id: {
                client_id: clientId,
                template_id: template.id,
              },
            },
            update: {}, // Don't update if exists
            create: {
              client_id: clientId,
              template_id: template.id,
            },
          })
        } catch {
          // Skip if constraint violation (already exists)
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

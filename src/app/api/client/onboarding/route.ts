import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Helper function to get product IDs for a client from subscriptions and recommendations
async function getClientProductIds(clientId: string): Promise<string[]> {
  const productIds = new Set<string>()

  // Get products from active subscriptions
  const subscriptions = await prisma.subscriptions.findMany({
    where: {
      client_id: clientId,
      status: { in: ['active', 'trialing'] },
    },
    include: {
      subscription_items: {
        include: {
          product: { select: { id: true } },
          bundle: {
            include: {
              bundle_products: {
                include: {
                  product: { select: { id: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  subscriptions.forEach((sub) => {
    sub.subscription_items.forEach((item) => {
      if (item.product?.id) productIds.add(item.product.id)
      if (item.bundle?.bundle_products) {
        item.bundle.bundle_products.forEach((bp) => {
          if (bp.product?.id) productIds.add(bp.product.id)
        })
      }
    })
  })

  // Also get products from purchased recommendations
  const recommendations = await prisma.recommendations.findMany({
    where: {
      client_id: clientId,
      purchased_tier: { not: null },
    },
    include: {
      recommendation_items: {
        include: {
          product: { select: { id: true } },
          bundle: {
            include: {
              bundle_products: {
                include: {
                  product: { select: { id: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  recommendations.forEach((rec) => {
    if (rec.purchased_tier) {
      rec.recommendation_items
        .filter((item) => item.tier === rec.purchased_tier)
        .forEach((item) => {
          if (item.product?.id) productIds.add(item.product.id)
          if (item.bundle?.bundle_products) {
            item.bundle.bundle_products.forEach((bp) => {
              if (bp.product?.id) productIds.add(bp.product.id)
            })
          }
        })
    }
  })

  return Array.from(productIds)
}

// Helper function to generate checklist items for a client
async function generateChecklistItems(clientId: string, productIds: string[]): Promise<number> {
  if (productIds.length === 0) return 0

  // Get all active checklist templates for the given products
  const templates = await prisma.onboarding_checklist_templates.findMany({
    where: {
      product_id: { in: productIds },
      is_active: true,
    },
  })

  if (templates.length === 0) return 0

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

  return results.filter(Boolean).length
}

// GET /api/client/onboarding - Get client's onboarding data (checklist + responses)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Get client info
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        contact_name: true,
        contact_email: true,
        start_date: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // First check if checklist items exist, if not, auto-generate them
    const existingItemsCount = await prisma.client_checklist_items.count({
      where: { client_id: clientId },
    })

    if (existingItemsCount === 0) {
      // Get product IDs for this client and generate checklist items
      const productIds = await getClientProductIds(clientId)
      if (productIds.length > 0) {
        await generateChecklistItems(clientId, productIds)
      }
    }

    // Get checklist items with template info
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
        { template: { sort_order: 'asc' } },
      ],
    })

    // Get onboarding responses with question info
    const responses = await prisma.client_onboarding_responses.findMany({
      where: { client_id: clientId },
      include: {
        question: {
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
        { question: { sort_order: 'asc' } },
      ],
    })

    // Format checklist items
    const checklist = checklistItems.map((item) => ({
      id: item.id,
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

    // Group responses by section for onboarding summary
    const responsesBySection: Record<string, Array<{
      id: string
      question: string
      answer: string | string[] | null
      questionType: string
      product: { id: string; name: string; category: string }
    }>> = {}

    responses.forEach((r) => {
      const section = r.question.section || 'General'
      if (!responsesBySection[section]) {
        responsesBySection[section] = []
      }

      // Format answer based on type
      let answer: string | string[] | null = null
      if (r.response_text) {
        answer = r.response_text
      } else if (r.response_options) {
        answer = r.response_options as string[]
      }

      responsesBySection[section].push({
        id: r.id,
        question: r.question.question_text,
        answer,
        questionType: r.question.question_type,
        product: r.question.product,
      })
    })

    // Calculate checklist progress
    const completedCount = checklist.filter(c => c.isCompleted).length
    const totalCount = checklist.length
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        contactName: client.contact_name,
        contactEmail: client.contact_email,
        startDate: client.start_date,
      },
      checklist: {
        items: checklist,
        progress: {
          completed: completedCount,
          total: totalCount,
          percent: progressPercent,
        },
      },
      onboardingSummary: responsesBySection,
    })
  } catch (error) {
    console.error('Failed to fetch client onboarding data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding data' },
      { status: 500 }
    )
  }
}

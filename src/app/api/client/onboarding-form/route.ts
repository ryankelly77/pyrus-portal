import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/client/onboarding-form - Get questions for client's purchased products
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

    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    })
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get products from client's active subscriptions
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

    // Also get products from purchased recommendations (for clients who haven't set up Stripe yet)
    const recommendations = await prisma.recommendations.findMany({
      where: {
        client_id: clientId,
        purchased_tier: { not: null },
      },
      include: {
        recommendation_items: {
          where: {
            tier: { not: null },
          },
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

    // Collect all product IDs
    const productIds = new Set<string>()

    // From subscriptions
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

    // From recommendations (if no subscriptions)
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

    // If no products found, return empty
    if (productIds.size === 0) {
      return NextResponse.json({
        questions: [],
        grouped: {},
        hasProducts: false,
      })
    }

    // Get all active question templates for these products
    const questions = await prisma.onboarding_question_templates.findMany({
      where: {
        is_active: true,
        product_id: { in: Array.from(productIds) },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: [
        { sort_order: 'asc' },
        { section: 'asc' },
      ],
    })

    // Get existing responses for this client
    const existingResponses = await prisma.client_onboarding_responses.findMany({
      where: { client_id: clientId },
    })

    // Map responses to questions
    const responseMap = new Map(
      existingResponses.map((r) => [r.question_id, r])
    )

    // Format the response with questions and any existing answers
    const formData = questions.map((q) => {
      const response = responseMap.get(q.id)
      return {
        id: q.id,
        questionText: q.question_text,
        questionType: q.question_type,
        options: q.options,
        placeholder: q.placeholder,
        helpText: q.help_text,
        videoUrl: q.video_url,
        imageUrl: q.image_url,
        isRequired: q.is_required,
        section: q.section,
        product: q.product,
        response: response
          ? {
              id: response.id,
              text: response.response_text,
              options: response.response_options,
            }
          : null,
      }
    })

    // Group by section for easier rendering
    const grouped: Record<string, typeof formData> = {}
    formData.forEach((item) => {
      const section = item.section || 'General'
      if (!grouped[section]) grouped[section] = []
      grouped[section].push(item)
    })

    // Calculate progress
    const answeredCount = formData.filter((q) => q.response !== null).length
    const totalCount = formData.length
    const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0

    return NextResponse.json({
      questions: formData,
      grouped,
      hasProducts: true,
      progress: {
        answered: answeredCount,
        total: totalCount,
        percent: progressPercent,
      },
    })
  } catch (error) {
    console.error('Failed to fetch onboarding form:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding form' },
      { status: 500 }
    )
  }
}

// POST /api/client/onboarding-form - Submit responses
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const body = await request.json()
    const { responses } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

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

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'Responses array is required' },
        { status: 400 }
      )
    }

    // Upsert each response
    const results = await Promise.all(
      responses.map(async (response: {
        questionId: string
        text?: string
        options?: string[]
      }) => {
        return await prisma.client_onboarding_responses.upsert({
          where: {
            client_id_question_id: {
              client_id: clientId,
              question_id: response.questionId,
            },
          },
          update: {
            response_text: response.text || null,
            response_options: response.options ? response.options : Prisma.JsonNull,
            updated_at: new Date(),
          },
          create: {
            client_id: clientId,
            question_id: response.questionId,
            response_text: response.text || null,
            response_options: response.options ? response.options : Prisma.JsonNull,
          },
        })
      })
    )

    return NextResponse.json({ saved: results.length }, { status: 201 })
  } catch (error) {
    console.error('Failed to save onboarding responses:', error)
    return NextResponse.json(
      { error: 'Failed to save onboarding responses' },
      { status: 500 }
    )
  }
}

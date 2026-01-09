import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET /api/admin/clients/[id]/onboarding-form - Get questions and responses for purchased products
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const { searchParams } = new URL(request.url)
    const productIds = searchParams.get('productIds')?.split(',').filter(Boolean)

    // Build the where clause for question templates
    const whereClause: { is_active: boolean; product_id?: { in: string[] } } = {
      is_active: true,
    }
    if (productIds && productIds.length > 0) {
      whereClause.product_id = { in: productIds }
    }

    // Get all active question templates (optionally filtered by products)
    const questions = await prisma.onboarding_question_templates.findMany({
      where: whereClause,
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
        { product_id: 'asc' },
        { section: 'asc' },
        { sort_order: 'asc' },
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

    return NextResponse.json({
      questions: formData,
      grouped,
    })
  } catch (error) {
    console.error('Failed to fetch onboarding form:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding form' },
      { status: 500 }
    )
  }
}

// POST /api/admin/clients/[id]/onboarding-form - Submit responses
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const body = await request.json()
    const { responses } = body

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

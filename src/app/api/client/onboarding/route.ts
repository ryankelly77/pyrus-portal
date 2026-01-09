import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

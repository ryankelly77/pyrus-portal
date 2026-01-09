import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/onboarding/checklist-templates - List all checklist templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    const templates = await prisma.onboarding_checklist_templates.findMany({
      where: {
        ...(productId ? { product_id: productId } : {}),
        is_active: true,
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
        { product_id: 'asc' },
        { sort_order: 'asc' },
      ],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Failed to fetch checklist templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch checklist templates' },
      { status: 500 }
    )
  }
}

// POST /api/admin/onboarding/checklist-templates - Create a new checklist template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      productId,
      title,
      description,
      actionType,
      actionUrl,
      actionLabel,
      sortOrder,
      autoCompleteQuestionId,
      autoCompleteValues,
    } = body

    if (!productId || !title) {
      return NextResponse.json(
        { error: 'Product ID and title are required' },
        { status: 400 }
      )
    }

    // Parse auto-complete values from comma-separated string to array
    const autoCompleteValuesArray = autoCompleteValues
      ? autoCompleteValues.split(',').map((v: string) => v.trim()).filter(Boolean)
      : null

    // Get max sort_order for the product
    const maxSortOrder = await prisma.onboarding_checklist_templates.aggregate({
      where: { product_id: productId },
      _max: { sort_order: true },
    })

    const template = await prisma.onboarding_checklist_templates.create({
      data: {
        product_id: productId,
        title,
        description: description || null,
        action_type: actionType || null,
        action_url: actionUrl || null,
        action_label: actionLabel || null,
        sort_order: sortOrder ?? (maxSortOrder._max.sort_order ?? 0) + 1,
        auto_complete_question_id: autoCompleteQuestionId || null,
        auto_complete_values: autoCompleteValuesArray,
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
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Failed to create checklist template:', error)
    return NextResponse.json(
      { error: 'Failed to create checklist template' },
      { status: 500 }
    )
  }
}

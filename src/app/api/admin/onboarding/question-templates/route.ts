import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { validateRequest } from '@/lib/validation/validateRequest'
import { questionTemplateSchema } from '@/lib/validation/schemas'

export const dynamic = 'force-dynamic'

// GET /api/admin/onboarding/question-templates - List all question templates
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    const templates = await prisma.onboarding_question_templates.findMany({
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
        { section: 'asc' },
        { sort_order: 'asc' },
      ],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Failed to fetch question templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch question templates' },
      { status: 500 }
    )
  }
}

// POST /api/admin/onboarding/question-templates - Create a new question template
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth

    const validated = await validateRequest(questionTemplateSchema, request)
    if ((validated as any).error) return (validated as any).error

    const {
      productId,
      questionText,
      questionType,
      options,
      placeholder,
      helpText,
      videoUrl,
      imageUrl,
      isRequired,
      section,
      sortOrder,
    } = (validated as any).data

    // Get max sort_order for the product and section
    const maxSortOrder = await prisma.onboarding_question_templates.aggregate({
      where: {
        product_id: productId,
        ...(section ? { section } : {}),
      },
      _max: { sort_order: true },
    })

    const template = await prisma.onboarding_question_templates.create({
      data: {
        product_id: productId,
        question_text: questionText,
        question_type: questionType,
        options: options || null,
        placeholder: placeholder || null,
        help_text: helpText || null,
        video_url: videoUrl || null,
        image_url: imageUrl || null,
        is_required: isRequired || false,
        section: section || null,
        sort_order: sortOrder ?? (maxSortOrder._max.sort_order ?? 0) + 1,
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
    console.error('Failed to create question template:', error)
    return NextResponse.json(
      { error: 'Failed to create question template' },
      { status: 500 }
    )
  }
}

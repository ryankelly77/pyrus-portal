import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic';

// GET /api/admin/onboarding/question-templates/[id] - Get single question template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params

    const template = await prisma.onboarding_question_templates.findUnique({
      where: { id },
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

    if (!template) {
      return NextResponse.json(
        { error: 'Question template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Failed to fetch question template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch question template' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/onboarding/question-templates/[id] - Update a question template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params
    const body = await request.json()

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
      isActive,
    } = body

    // Validate question type if provided
    if (questionType) {
      const validTypes = ['text', 'textarea', 'select', 'multiselect', 'radio', 'checkbox', 'url', 'email', 'phone']
      if (!validTypes.includes(questionType)) {
        return NextResponse.json(
          { error: `Invalid question type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const template = await prisma.onboarding_question_templates.update({
      where: { id },
      data: {
        ...(productId !== undefined && { product_id: productId }),
        ...(questionText !== undefined && { question_text: questionText }),
        ...(questionType !== undefined && { question_type: questionType }),
        ...(options !== undefined && { options }),
        ...(placeholder !== undefined && { placeholder }),
        ...(helpText !== undefined && { help_text: helpText }),
        ...(videoUrl !== undefined && { video_url: videoUrl }),
        ...(imageUrl !== undefined && { image_url: imageUrl }),
        ...(isRequired !== undefined && { is_required: isRequired }),
        ...(section !== undefined && { section }),
        ...(sortOrder !== undefined && { sort_order: sortOrder }),
        ...(isActive !== undefined && { is_active: isActive }),
        updated_at: new Date(),
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

    return NextResponse.json(template)
  } catch (error) {
    console.error('Failed to update question template:', error)
    return NextResponse.json(
      { error: 'Failed to update question template' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/onboarding/question-templates/[id] - Delete a question template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params

    await prisma.onboarding_question_templates.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete question template:', error)
    return NextResponse.json(
      { error: 'Failed to delete question template' },
      { status: 500 }
    )
  }
}

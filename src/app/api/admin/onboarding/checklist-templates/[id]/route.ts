import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/onboarding/checklist-templates/[id] - Get single checklist template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const template = await prisma.onboarding_checklist_templates.findUnique({
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
        { error: 'Checklist template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Failed to fetch checklist template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch checklist template' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/onboarding/checklist-templates/[id] - Update a checklist template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      productId,
      title,
      description,
      actionType,
      actionUrl,
      actionLabel,
      sortOrder,
      isActive,
    } = body

    const template = await prisma.onboarding_checklist_templates.update({
      where: { id },
      data: {
        ...(productId !== undefined && { product_id: productId }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(actionType !== undefined && { action_type: actionType }),
        ...(actionUrl !== undefined && { action_url: actionUrl }),
        ...(actionLabel !== undefined && { action_label: actionLabel }),
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
    console.error('Failed to update checklist template:', error)
    return NextResponse.json(
      { error: 'Failed to update checklist template' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/onboarding/checklist-templates/[id] - Delete a checklist template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.onboarding_checklist_templates.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete checklist template:', error)
    return NextResponse.json(
      { error: 'Failed to delete checklist template' },
      { status: 500 }
    )
  }
}

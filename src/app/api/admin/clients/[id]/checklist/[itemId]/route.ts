import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// PATCH /api/admin/clients/[id]/checklist/[itemId] - Toggle completion or update notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id: clientId, itemId } = await params
    const body = await request.json()
    const { isCompleted, notes } = body

    // Verify the item exists and belongs to this client
    const existingItem = await prisma.client_checklist_items.findFirst({
      where: { id: itemId, client_id: clientId },
      select: { id: true },
    })
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Checklist item not found' },
        { status: 404 }
      )
    }

    const updateData: {
      is_completed?: boolean
      completed_at?: Date | null
      notes?: string | null
    } = {}

    if (typeof isCompleted === 'boolean') {
      updateData.is_completed = isCompleted
      updateData.completed_at = isCompleted ? new Date() : null
    }

    if (notes !== undefined) {
      updateData.notes = notes || null
    }

    const item = await prisma.client_checklist_items.update({
      where: { id: itemId },
      data: updateData,
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
    })

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Failed to update checklist item:', error)
    return NextResponse.json(
      { error: 'Failed to update checklist item' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/clients/[id]/checklist/[itemId] - Remove a checklist item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id: clientId, itemId } = await params

    // Verify the item exists and belongs to this client
    const existingItem = await prisma.client_checklist_items.findFirst({
      where: { id: itemId, client_id: clientId },
      select: { id: true },
    })
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Checklist item not found' },
        { status: 404 }
      )
    }

    await prisma.client_checklist_items.delete({
      where: { id: itemId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete checklist item:', error)
    return NextResponse.json(
      { error: 'Failed to delete checklist item' },
      { status: 500 }
    )
  }
}

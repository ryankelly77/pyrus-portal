import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

interface ReorderRequest {
  categoryId: string | null
  templateIds: string[]
}

/**
 * POST /api/admin/email-templates/reorder
 * Update sort_order for templates within a category
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body: ReorderRequest = await request.json()
    const { categoryId, templateIds } = body

    // Validate request
    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json(
        { error: 'templateIds array is required' },
        { status: 400 }
      )
    }

    // Verify all templates exist and belong to the specified category
    const templates = await prisma.email_templates.findMany({
      where: {
        id: { in: templateIds },
        category_id: categoryId,
      },
      select: { id: true },
    })

    if (templates.length !== templateIds.length) {
      return NextResponse.json(
        { error: 'One or more template IDs are invalid or do not belong to this category' },
        { status: 400 }
      )
    }

    // Update sort_order for each template using a transaction
    await prisma.$transaction(
      templateIds.map((id, index) =>
        prisma.email_templates.update({
          where: { id },
          data: { sort_order: (index + 1) * 10 },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reorder email templates:', error)
    return NextResponse.json(
      { error: 'Failed to reorder email templates' },
      { status: 500 }
    )
  }
}

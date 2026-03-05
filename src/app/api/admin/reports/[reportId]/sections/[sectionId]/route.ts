import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/reports/[reportId]/sections/[sectionId] - Update a section
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string; sectionId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { reportId, sectionId } = await params
    const body = await request.json()

    // Check if section exists and belongs to the report
    const existing = await prisma.report_sections.findFirst({
      where: {
        id: sectionId,
        report_id: reportId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (body.data !== undefined) updateData.data = body.data
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder

    const section = await prisma.report_sections.update({
      where: { id: sectionId },
      data: updateData,
    })

    return NextResponse.json(section)
  } catch (error) {
    console.error('Failed to update section:', error)
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/reports/[reportId]/sections/[sectionId] - Delete a section
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string; sectionId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { reportId, sectionId } = await params

    // Check if section exists and belongs to the report
    const existing = await prisma.report_sections.findFirst({
      where: {
        id: sectionId,
        report_id: reportId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    await prisma.report_sections.delete({
      where: { id: sectionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete section:', error)
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 }
    )
  }
}

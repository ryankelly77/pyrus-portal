import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { SECTION_TYPES, type SectionType } from '@/lib/reportSections'

export const dynamic = 'force-dynamic'

// GET /api/admin/reports/[reportId]/sections - List all sections for a report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { reportId } = await params

    // Verify report exists
    const report = await prisma.campaign_reports.findUnique({
      where: { id: reportId },
      select: { id: true },
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    const sections = await prisma.report_sections.findMany({
      where: { report_id: reportId },
      orderBy: { sort_order: 'asc' },
    })

    return NextResponse.json(sections)
  } catch (error) {
    console.error('Failed to list sections:', error)
    return NextResponse.json(
      { error: 'Failed to list sections' },
      { status: 500 }
    )
  }
}

// POST /api/admin/reports/[reportId]/sections - Upsert a section by sectionType
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { reportId } = await params
    const body = await request.json()
    const { sectionType, sortOrder, data, notes } = body

    // Validate required fields
    if (!sectionType || data === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: sectionType, data' },
        { status: 400 }
      )
    }

    // Validate sectionType
    if (!SECTION_TYPES.includes(sectionType as SectionType)) {
      return NextResponse.json(
        { error: `Invalid sectionType. Must be one of: ${SECTION_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify report exists
    const report = await prisma.campaign_reports.findUnique({
      where: { id: reportId },
      select: { id: true },
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Check if section with this type already exists
    const existingSection = await prisma.report_sections.findFirst({
      where: {
        report_id: reportId,
        section_type: sectionType,
      },
    })

    let section

    if (existingSection) {
      // Update existing section
      section = await prisma.report_sections.update({
        where: { id: existingSection.id },
        data: {
          sort_order: sortOrder ?? existingSection.sort_order,
          data,
          notes: notes !== undefined ? notes : existingSection.notes,
        },
      })
    } else {
      // Create new section
      section = await prisma.report_sections.create({
        data: {
          report_id: reportId,
          section_type: sectionType,
          sort_order: sortOrder ?? 0,
          data,
          notes: notes || null,
        },
      })
    }

    return NextResponse.json(section, { status: existingSection ? 200 : 201 })
  } catch (error) {
    console.error('Failed to upsert section:', error)
    return NextResponse.json(
      { error: 'Failed to upsert section' },
      { status: 500 }
    )
  }
}

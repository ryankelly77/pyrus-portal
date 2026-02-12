import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/admin/email-templates/[slug]/versions
 * Fetch version history for a template
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { slug } = await context.params

    // Get template ID from slug
    const template = await prisma.email_templates.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Fetch last 20 versions
    const versions = await prisma.email_template_versions.findMany({
      where: { template_id: template.id },
      orderBy: { version_number: 'desc' },
      take: 20,
      include: {
        changer: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        versionNumber: v.version_number,
        subjectTemplate: v.subject_template,
        bodyHtml: v.body_html,
        bodyText: v.body_text,
        changeNote: v.change_note,
        createdAt: v.created_at?.toISOString(),
        changedBy: v.changer ? {
          id: v.changer.id,
          name: v.changer.full_name || v.changer.email,
        } : null,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch template versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template versions' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { invalidateTemplateCache } from '@/lib/email/template-service'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ slug: string }>
}

/**
 * POST /api/admin/email-templates/[slug]/restore
 * Restore a template to a previous version
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { slug } = await context.params
    const body = await request.json()

    const { versionId, changeNote } = body

    if (!versionId) {
      return NextResponse.json(
        { error: 'Version ID is required' },
        { status: 400 }
      )
    }

    // Get current template
    const template = await prisma.email_templates.findUnique({
      where: { slug },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Get the version to restore
    const version = await prisma.email_template_versions.findUnique({
      where: { id: versionId },
    })

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    // Verify version belongs to this template
    if (version.template_id !== template.id) {
      return NextResponse.json(
        { error: 'Version does not belong to this template' },
        { status: 400 }
      )
    }

    // Update template with version content
    // The DB trigger will automatically create a version of the current state
    const updated = await prisma.email_templates.update({
      where: { slug },
      data: {
        subject_template: version.subject_template,
        body_html: version.body_html,
        body_text: version.body_text,
        updated_by: user.id,
      },
    })

    // Optionally add a change note to the new version that was just created
    if (changeNote) {
      // Find the latest version (just created by trigger)
      const latestVersion = await prisma.email_template_versions.findFirst({
        where: { template_id: template.id },
        orderBy: { version_number: 'desc' },
      })

      if (latestVersion) {
        await prisma.email_template_versions.update({
          where: { id: latestVersion.id },
          data: { change_note: changeNote || `Restored to version ${version.version_number}` },
        })
      }
    }

    // Invalidate cache
    invalidateTemplateCache(slug)

    return NextResponse.json({
      success: true,
      restoredFromVersion: version.version_number,
      template: {
        id: updated.id,
        slug: updated.slug,
        subjectTemplate: updated.subject_template,
        bodyHtml: updated.body_html,
        bodyText: updated.body_text,
        updatedAt: updated.updated_at?.toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to restore template version:', error)
    return NextResponse.json(
      { error: 'Failed to restore template version' },
      { status: 500 }
    )
  }
}

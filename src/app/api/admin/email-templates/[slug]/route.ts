import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { invalidateTemplateCache } from '@/lib/email/template-service'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/admin/email-templates/[slug]
 * Fetch a single email template by slug
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { slug } = await context.params

    const template = await prisma.email_templates.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: template.id,
      slug: template.slug,
      name: template.name,
      description: template.description,
      triggerEvent: template.trigger_event,
      triggerDescription: template.trigger_description,
      recipientType: template.recipient_type,
      subjectTemplate: template.subject_template,
      bodyHtml: template.body_html,
      bodyText: template.body_text,
      availableVariables: template.available_variables,
      isActive: template.is_active,
      isSystem: template.is_system,
      createdAt: template.created_at?.toISOString(),
      updatedAt: template.updated_at?.toISOString(),
      category: template.category ? {
        id: template.category.id,
        slug: template.category.slug,
        name: template.category.name,
      } : null,
    })
  } catch (error) {
    console.error('Failed to fetch email template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email template' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/email-templates/[slug]
 * Update an email template
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { slug } = await context.params
    const body = await request.json()

    // Validate slug exists
    const existing = await prisma.email_templates.findUnique({
      where: { slug },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: {
      name?: string
      is_active?: boolean
      description?: string
      subject_template?: string
      body_html?: string
      body_text?: string | null
      available_variables?: Array<{ key: string; description: string; example: string }>
      updated_by: string
    } = {
      updated_by: user.id,
    }

    // Handle all updatable fields
    if (typeof body.name === 'string') {
      if (!body.name.trim()) {
        return NextResponse.json(
          { error: 'Template name is required' },
          { status: 400 }
        )
      }
      if (body.name.length > 100) {
        return NextResponse.json(
          { error: 'Template name must be 100 characters or less' },
          { status: 400 }
        )
      }
      updateData.name = body.name.trim()
    }

    if (typeof body.isActive === 'boolean') {
      updateData.is_active = body.isActive
    }

    if (typeof body.description === 'string') {
      updateData.description = body.description
    }

    if (typeof body.subjectTemplate === 'string') {
      if (!body.subjectTemplate.trim()) {
        return NextResponse.json(
          { error: 'Subject template is required' },
          { status: 400 }
        )
      }
      if (body.subjectTemplate.length > 500) {
        return NextResponse.json(
          { error: 'Subject template must be 500 characters or less' },
          { status: 400 }
        )
      }
      updateData.subject_template = body.subjectTemplate
    }

    if (typeof body.bodyHtml === 'string') {
      if (!body.bodyHtml.trim()) {
        return NextResponse.json(
          { error: 'HTML body is required' },
          { status: 400 }
        )
      }
      updateData.body_html = body.bodyHtml
    }

    if (body.bodyText !== undefined) {
      updateData.body_text = body.bodyText || null
    }

    if (body.availableVariables !== undefined) {
      // Validate it's an array
      if (!Array.isArray(body.availableVariables)) {
        return NextResponse.json(
          { error: 'Available variables must be an array' },
          { status: 400 }
        )
      }
      updateData.available_variables = body.availableVariables
    }

    // Update template (version is created automatically by DB trigger)
    const updated = await prisma.email_templates.update({
      where: { slug },
      data: updateData,
    })

    // Invalidate cache for this template
    invalidateTemplateCache(slug)

    return NextResponse.json({
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      description: updated.description,
      subjectTemplate: updated.subject_template,
      bodyHtml: updated.body_html,
      bodyText: updated.body_text,
      isActive: updated.is_active,
      updatedAt: updated.updated_at?.toISOString(),
    })
  } catch (error) {
    console.error('Failed to update email template:', error)
    return NextResponse.json(
      { error: 'Failed to update email template' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

interface EmailTemplateRecord {
  id: string
  slug: string
  name: string
  description: string | null
  trigger_event: string
  trigger_description: string | null
  recipient_type: string
  is_active: boolean
  is_system: boolean
  updated_at: Date | null
  category_id: string | null
}

interface EmailCategoryRecord {
  id: string
  slug: string
  name: string
  description: string | null
  sort_order: number
}

export interface EmailTemplateWithCategory extends EmailTemplateRecord {
  category: EmailCategoryRecord | null
}

export interface EmailTemplatesResponse {
  categories: Array<{
    id: string
    slug: string
    name: string
    description: string | null
    sort_order: number
    templates: Array<{
      id: string
      slug: string
      name: string
      description: string | null
      triggerEvent: string
      triggerDescription: string | null
      recipientType: string
      isActive: boolean
      isSystem: boolean
      updatedAt: string | null
    }>
  }>
  uncategorized: Array<{
    id: string
    slug: string
    name: string
    description: string | null
    triggerEvent: string
    triggerDescription: string | null
    recipientType: string
    isActive: boolean
    isSystem: boolean
    updatedAt: string | null
  }>
}

/**
 * GET /api/admin/email-templates
 * Fetch all email templates grouped by category
 */
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Fetch categories ordered by sort_order
    const categories = await prisma.email_categories.findMany({
      orderBy: { sort_order: 'asc' },
    })

    // Fetch all templates with their category info
    const templates = await prisma.email_templates.findMany({
      orderBy: [
        { category_id: 'asc' },
        { name: 'asc' },
      ],
    })

    // Group templates by category
    const categoryMap = new Map<string, EmailTemplateRecord[]>()
    const uncategorizedTemplates: EmailTemplateRecord[] = []

    for (const template of templates) {
      if (template.category_id) {
        const existing = categoryMap.get(template.category_id) || []
        existing.push(template)
        categoryMap.set(template.category_id, existing)
      } else {
        uncategorizedTemplates.push(template)
      }
    }

    // Transform to response format
    const transformTemplate = (t: EmailTemplateRecord) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      triggerEvent: t.trigger_event,
      triggerDescription: t.trigger_description,
      recipientType: t.recipient_type,
      isActive: t.is_active,
      isSystem: t.is_system,
      updatedAt: t.updated_at?.toISOString() || null,
    })

    const response: EmailTemplatesResponse = {
      categories: categories.map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sort_order: cat.sort_order,
        templates: (categoryMap.get(cat.id) || []).map(transformTemplate),
      })),
      uncategorized: uncategorizedTemplates.map(transformTemplate),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to fetch email templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/email-templates
 * Create a new email template
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const {
      name,
      slug,
      description,
      categoryId,
      recipientType,
      triggerEvent,
      triggerDescription,
      subjectTemplate,
      bodyHtml,
      bodyText,
      availableVariables,
      isActive = true,
    } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!slug?.trim()) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }
    if (!subjectTemplate?.trim()) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }
    if (!bodyHtml?.trim()) {
      return NextResponse.json({ error: 'HTML body is required' }, { status: 400 })
    }

    // Validate slug format (lowercase, alphanumeric with hyphens)
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!slugPattern.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase with hyphens only (e.g., my-template-name)' },
        { status: 400 }
      )
    }

    // Check if slug is unique
    const existingTemplate = await prisma.email_templates.findUnique({
      where: { slug },
    })
    if (existingTemplate) {
      return NextResponse.json(
        { error: 'A template with this slug already exists' },
        { status: 400 }
      )
    }

    // Create the template
    const template = await prisma.email_templates.create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        description: description?.trim() || null,
        category_id: categoryId || null,
        recipient_type: recipientType || 'any',
        trigger_event: triggerEvent?.trim() || 'manual',
        trigger_description: triggerDescription?.trim() || null,
        subject_template: subjectTemplate.trim(),
        body_html: bodyHtml,
        body_text: bodyText?.trim() || null,
        available_variables: availableVariables || [],
        is_active: isActive,
        is_system: false,
        updated_by: auth.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        slug: template.slug,
        name: template.name,
      },
    })
  } catch (error) {
    console.error('Failed to create email template:', error)
    return NextResponse.json(
      { error: 'Failed to create email template' },
      { status: 500 }
    )
  }
}

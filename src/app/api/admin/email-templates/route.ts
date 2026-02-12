import { NextResponse } from 'next/server'
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

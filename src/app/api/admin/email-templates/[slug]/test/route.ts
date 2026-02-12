import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { sendEmail } from '@/lib/email/mailgun'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ slug: string }>
}

// Simple in-memory rate limiting for test emails
const testEmailRateLimit = new Map<string, { count: number; resetAt: number }>()
const MAX_TEST_EMAILS_PER_HOUR = 10

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const hourMs = 60 * 60 * 1000

  const userLimit = testEmailRateLimit.get(userId)

  if (!userLimit || now > userLimit.resetAt) {
    testEmailRateLimit.set(userId, { count: 1, resetAt: now + hourMs })
    return true
  }

  if (userLimit.count >= MAX_TEST_EMAILS_PER_HOUR) {
    return false
  }

  userLimit.count++
  return true
}

/**
 * Get role-specific access items for admin invite email testing
 */
function getRoleAccessItems(role: string): string[] {
  const roleAccessItems: Record<string, string[]> = {
    super_admin: [
      'Full admin dashboard access',
      'User and team management',
      'System settings and configuration',
    ],
    admin: [
      'Full admin dashboard access',
      'Client and user management',
      'Analytics and reporting',
    ],
    production_team: [
      'Content workflow management',
      'Client content review tools',
      'Production dashboard access',
    ],
    sales: [
      'Sales pipeline and proposals',
      'Client onboarding tools',
      'Revenue reporting access',
    ],
  }
  return roleAccessItems[role] || roleAccessItems.admin
}

/**
 * Generate HTML for the access list in invite emails
 */
function generateAccessListHtml(role: string): string {
  const items = getRoleAccessItems(role)
  return items
    .map(
      (item) =>
        `<tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> ${item}</td></tr>`
    )
    .join('\n                      ')
}

/**
 * Get human-readable role display name
 */
function getRoleDisplayName(role: string): string {
  const roleDisplayNames: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    production_team: 'Production Team',
    sales: 'Sales',
  }
  return roleDisplayNames[role] || role
}

/**
 * Build example variables from template's available_variables
 * For admin invite template, can override with dynamic role-based content
 */
function buildExampleVariables(
  availableVariables: Array<{ key: string; example?: string }> | unknown,
  overrides?: Record<string, string>
): Record<string, string> {
  const variables: Record<string, string> = {}

  if (!Array.isArray(availableVariables)) {
    return { ...variables, ...overrides }
  }

  for (const v of availableVariables) {
    if (v.key) {
      variables[v.key] = v.example || `[${v.key}]`
    }
  }

  // Apply any overrides (e.g., dynamic role-based content)
  if (overrides) {
    Object.assign(variables, overrides)
  }

  return variables
}

/**
 * Replace variables in a template string
 */
function replaceVariables(
  template: string,
  variables: Record<string, string>
): string {
  // Pattern matches ${varName} or {{varName}}
  const pattern = /\$\{([^}]+)\}|\{\{([^}]+)\}\}/g

  return template.replace(pattern, (match, dollarVar, bracketVar) => {
    const varName = (dollarVar || bracketVar).trim()
    return variables[varName] ?? match
  })
}

/**
 * POST /api/admin/email-templates/[slug]/test
 * Send a test email using the template
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Maximum ${MAX_TEST_EMAILS_PER_HOUR} test emails per hour.` },
        { status: 429 }
      )
    }

    const { slug } = await context.params
    const body = await request.json()

    let { recipientEmail, testRole } = body

    // Default to current user's email if not provided
    if (!recipientEmail) {
      recipientEmail = user.email
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Get template
    const template = await prisma.email_templates.findUnique({
      where: { slug },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Build dynamic overrides for admin invite template
    let overrides: Record<string, string> | undefined
    if (slug === 'user-invite-admin' && testRole) {
      const validRoles = ['super_admin', 'admin', 'production_team', 'sales']
      if (validRoles.includes(testRole)) {
        overrides = {
          roleDisplay: getRoleDisplayName(testRole),
          accessListHtml: generateAccessListHtml(testRole),
        }
      }
    }

    // Build example variables with any dynamic overrides
    const exampleVars = buildExampleVariables(template.available_variables, overrides)

    // Render template with example values
    const subject = `[TEST] ${replaceVariables(template.subject_template, exampleVars)}`
    const html = replaceVariables(template.body_html, exampleVars)
    const text = template.body_text
      ? replaceVariables(template.body_text, exampleVars)
      : undefined

    // Send test email
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
      tags: ['test-email', template.slug],
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${recipientEmail}`,
      messageId: result.messageId,
      variablesUsed: exampleVars,
    })
  } catch (error) {
    console.error('Failed to send test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}

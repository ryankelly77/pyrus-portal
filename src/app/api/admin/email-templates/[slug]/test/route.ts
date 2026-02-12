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
 * Build example variables from template's available_variables
 */
function buildExampleVariables(
  availableVariables: Array<{ key: string; example?: string }> | unknown
): Record<string, string> {
  const variables: Record<string, string> = {}

  if (!Array.isArray(availableVariables)) {
    return variables
  }

  for (const v of availableVariables) {
    if (v.key) {
      variables[v.key] = v.example || `[${v.key}]`
    }
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

    let { recipientEmail } = body

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

    // Build example variables
    const exampleVars = buildExampleVariables(template.available_variables)

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

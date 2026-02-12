/**
 * Email Template Service
 *
 * Service layer for sending templated emails:
 * 1. Fetches templates from database (with caching)
 * 2. Renders variables into templates
 * 3. Sends via Mailgun
 * 4. Logs all sends to email_logs table
 */

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { sendEmail } from './mailgun'
import {
  TemplateNotFoundError,
  TemplateInactiveError,
  InvalidSlugError,
} from './template-errors'
import type {
  EmailTemplate,
  RenderResult,
  SendTemplatedEmailOptions,
  SendTemplatedEmailResult,
  CreateEmailLogData,
  CachedTemplate,
  EmailLogStatus,
  TemplateVariable,
} from '@/types/email'

// ============================================================
// Constants
// ============================================================

/** Cache time-to-live in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000

/** Valid slug pattern: lowercase letters, numbers, hyphens, 1-100 chars */
const SLUG_PATTERN = /^[a-z0-9-]{1,100}$/

/** Keys that should be redacted in logs */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'resetlink',
  'invitelink',
  'apikey',
  'credential',
]

/** Variable suffixes that should NOT be HTML-escaped */
const UNESCAPED_SUFFIXES = ['html', 'link', 'url']

// ============================================================
// Template Cache
// ============================================================

const templateCache = new Map<string, CachedTemplate>()

/**
 * Check if a cached template is still valid
 */
function isCacheValid(cached: CachedTemplate): boolean {
  return Date.now() - cached.cachedAt < CACHE_TTL_MS
}

/**
 * Invalidate template cache
 * @param slug - Specific template slug to invalidate, or undefined to clear all
 */
export function invalidateTemplateCache(slug?: string): void {
  if (slug) {
    templateCache.delete(slug)
  } else {
    templateCache.clear()
  }
}

// ============================================================
// Slug Validation
// ============================================================

/**
 * Validate a template slug
 * @throws InvalidSlugError if slug is invalid
 */
function validateSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new InvalidSlugError(slug)
  }
}

// ============================================================
// HTML Escaping
// ============================================================

/**
 * HTML-escape a string to prevent XSS
 */
function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char] || char)
}

/**
 * Check if a variable key should skip HTML escaping
 * Variables ending in Html, Link, or Url are not escaped
 */
function shouldSkipEscaping(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return UNESCAPED_SUFFIXES.some((suffix) => lowerKey.endsWith(suffix))
}

// ============================================================
// Variable Rendering
// ============================================================

/**
 * Get a nested value from an object using dot notation
 * @example getValue({ client: { name: 'Acme' } }, 'client.name') => 'Acme'
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Convert a value to string for template rendering
 */
function valueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  // For objects/arrays, return JSON
  return JSON.stringify(value)
}

/**
 * Replace variables in a template string
 * Supports ${variableName} and {{variableName}} syntax
 * Also supports nested paths like ${client.name}
 *
 * @param template - Template string with variable placeholders
 * @param variables - Object containing variable values
 * @param escapeValues - Whether to HTML-escape values (default: true)
 * @returns Rendered string with variables replaced
 */
function replaceVariables(
  template: string,
  variables: Record<string, unknown>,
  escapeValues: boolean = true
): { result: string; missingVars: string[] } {
  const missingVars: string[] = []

  // Pattern matches ${varName} or {{varName}} including nested paths
  const pattern = /\$\{([^}]+)\}|\{\{([^}]+)\}\}/g

  const result = template.replace(pattern, (match, dollarVar, bracketVar) => {
    const varPath = (dollarVar || bracketVar).trim()
    const value = getNestedValue(variables, varPath)

    if (value === undefined) {
      missingVars.push(varPath)
      return ''
    }

    const stringValue = valueToString(value)

    // Apply HTML escaping unless the variable key ends with Html/Link/Url
    if (escapeValues && !shouldSkipEscaping(varPath)) {
      return escapeHtml(stringValue)
    }

    return stringValue
  })

  return { result, missingVars }
}

// ============================================================
// Database Operations
// ============================================================

/**
 * Transform database record to EmailTemplate interface
 */
function transformDbTemplate(dbTemplate: {
  id: string
  category_id: string | null
  slug: string
  name: string
  description: string | null
  trigger_event: string
  trigger_description: string | null
  recipient_type: string
  subject_template: string
  body_html: string
  body_text: string | null
  available_variables: unknown
  is_active: boolean
  is_system: boolean
  created_at: Date | null
  updated_at: Date | null
  updated_by: string | null
}): EmailTemplate {
  // Parse available_variables JSON
  let availableVariables: TemplateVariable[] = []
  if (dbTemplate.available_variables) {
    try {
      const parsed = dbTemplate.available_variables
      if (Array.isArray(parsed)) {
        availableVariables = parsed as TemplateVariable[]
      }
    } catch {
      // If parsing fails, leave as empty array
    }
  }

  return {
    id: dbTemplate.id,
    categoryId: dbTemplate.category_id,
    slug: dbTemplate.slug,
    name: dbTemplate.name,
    description: dbTemplate.description,
    triggerEvent: dbTemplate.trigger_event,
    triggerDescription: dbTemplate.trigger_description,
    recipientType: dbTemplate.recipient_type as EmailTemplate['recipientType'],
    subjectTemplate: dbTemplate.subject_template,
    bodyHtml: dbTemplate.body_html,
    bodyText: dbTemplate.body_text,
    availableVariables,
    isActive: dbTemplate.is_active,
    isSystem: dbTemplate.is_system,
    createdAt: dbTemplate.created_at || new Date(),
    updatedAt: dbTemplate.updated_at || new Date(),
    updatedBy: dbTemplate.updated_by,
  }
}

/**
 * Fetch template from database
 */
async function fetchTemplateFromDb(slug: string): Promise<EmailTemplate | null> {
  const dbTemplate = await prisma.email_templates.findUnique({
    where: { slug },
  })

  if (!dbTemplate) {
    return null
  }

  return transformDbTemplate(dbTemplate)
}

// ============================================================
// Public API: Template Fetching
// ============================================================

/**
 * Get template from cache or database
 * @param slug - Template slug
 * @throws TemplateNotFoundError if template doesn't exist
 * @throws InvalidSlugError if slug is invalid
 */
export async function getTemplate(slug: string): Promise<EmailTemplate> {
  validateSlug(slug)

  // Check cache first
  const cached = templateCache.get(slug)
  if (cached && isCacheValid(cached)) {
    return cached.template
  }

  // Fetch from database
  const template = await fetchTemplateFromDb(slug)
  if (!template) {
    throw new TemplateNotFoundError(slug)
  }

  // Update cache
  templateCache.set(slug, {
    template,
    cachedAt: Date.now(),
  })

  return template
}

// ============================================================
// Public API: Template Rendering
// ============================================================

/**
 * Render a template with provided variables
 * @param slug - Template slug
 * @param variables - Variables to substitute into template
 * @returns Rendered subject, HTML, and text
 * @throws TemplateNotFoundError if template doesn't exist
 * @throws TemplateInactiveError if template is deactivated
 */
export async function renderTemplate(
  slug: string,
  variables: Record<string, unknown>
): Promise<RenderResult> {
  const template = await getTemplate(slug)

  if (!template.isActive) {
    throw new TemplateInactiveError(slug)
  }

  // Render subject (no HTML escaping needed for subject)
  const { result: subject, missingVars: subjectMissing } = replaceVariables(
    template.subjectTemplate,
    variables,
    false
  )

  // Render HTML body (with escaping)
  const { result: html, missingVars: htmlMissing } = replaceVariables(
    template.bodyHtml,
    variables,
    true
  )

  // Render text body (no escaping needed for plain text)
  const { result: text, missingVars: textMissing } = replaceVariables(
    template.bodyText || '',
    variables,
    false
  )

  // Log warnings for missing variables
  const allMissing = new Set(subjectMissing.concat(htmlMissing, textMissing))
  if (allMissing.size > 0) {
    console.warn(
      `[template-service] Missing variables in template "${slug}": ${Array.from(allMissing).join(', ')}`
    )
  }

  return { subject, html, text }
}

// ============================================================
// Email Logging
// ============================================================

/**
 * Redact sensitive values from variables before logging
 */
function redactSensitiveVariables(
  variables: Record<string, unknown>
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(variables)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = SENSITIVE_KEYS.some((sensitive) =>
      lowerKey.includes(sensitive)
    )

    if (isSensitive) {
      redacted[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively redact nested objects
      redacted[key] = redactSensitiveVariables(value as Record<string, unknown>)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * Create an email log entry
 * @returns Log entry ID
 */
async function createEmailLog(data: CreateEmailLogData): Promise<string> {
  try {
    const log = await prisma.email_logs.create({
      data: {
        template_id: data.templateId,
        template_slug: data.templateSlug,
        recipient_email: data.recipientEmail,
        recipient_user_id: data.recipientUserId || null,
        recipient_client_id: data.recipientClientId || null,
        subject: data.subject,
        variables_used: redactSensitiveVariables(data.variablesUsed) as Prisma.InputJsonValue,
        status: data.status,
        mailgun_message_id: data.mailgunMessageId || null,
        error_message: data.errorMessage || null,
        status_updated_at: new Date(),
      },
    })
    return log.id
  } catch (error) {
    // Never throw on logging failures - log to console and continue
    console.error('[template-service] Failed to create email log:', error)
    return ''
  }
}

/**
 * Update an email log entry status
 */
async function updateEmailLog(
  logId: string,
  updates: {
    status?: EmailLogStatus
    mailgunMessageId?: string
    errorMessage?: string
  }
): Promise<void> {
  if (!logId) return

  try {
    await prisma.email_logs.update({
      where: { id: logId },
      data: {
        ...(updates.status && { status: updates.status }),
        ...(updates.mailgunMessageId && {
          mailgun_message_id: updates.mailgunMessageId,
        }),
        ...(updates.errorMessage && { error_message: updates.errorMessage }),
        status_updated_at: new Date(),
      },
    })
  } catch (error) {
    // Never throw on logging failures
    console.error('[template-service] Failed to update email log:', error)
  }
}

/**
 * Update email log status by Mailgun message ID
 * Used for webhook updates (delivered, opened, clicked, etc.)
 */
export async function updateEmailLogStatus(
  messageId: string,
  status: 'delivered' | 'opened' | 'clicked' | 'failed' | 'bounced' | 'complained' | 'unsubscribed'
): Promise<void> {
  try {
    await prisma.email_logs.updateMany({
      where: { mailgun_message_id: messageId },
      data: {
        status,
        status_updated_at: new Date(),
      },
    })
  } catch (error) {
    console.error('[template-service] Failed to update email log status:', error)
  }
}

// ============================================================
// Public API: Send Templated Email
// ============================================================

/**
 * Send an email using a database template
 *
 * Flow:
 * 1. Fetch template by slug (from cache or DB)
 * 2. Check template.is_active - if false, throw error
 * 3. Render subject, html, text with variables
 * 4. If options.subject provided, use it instead of rendered subject
 * 5. Create email_logs record with status='sending'
 * 6. Call sendEmail() from mailgun.ts
 * 7. Update email_logs with status='sent' and messageId on success
 * 8. Update email_logs with status='failed' and error on failure
 * 9. Return result
 *
 * @param options - Email sending options
 * @returns Result with success status, messageId, and logId
 */
export async function sendTemplatedEmail(
  options: SendTemplatedEmailOptions
): Promise<SendTemplatedEmailResult> {
  const { templateSlug, to, variables, userId, clientId, replyTo, tags } = options

  let template: EmailTemplate
  let rendered: RenderResult
  let logId = ''

  try {
    // 1. Fetch template
    template = await getTemplate(templateSlug)

    // 2. Check if active
    if (!template.isActive) {
      throw new TemplateInactiveError(templateSlug)
    }

    // 3. Render template
    rendered = await renderTemplate(templateSlug, variables)

    // 4. Apply subject override if provided
    const finalSubject = options.subject || rendered.subject

    // 5. Create log entry with status='sending'
    logId = await createEmailLog({
      templateId: template.id,
      templateSlug,
      recipientEmail: to,
      recipientUserId: userId,
      recipientClientId: clientId,
      subject: finalSubject,
      variablesUsed: variables,
      status: 'sending',
    })

    // 6. Send via Mailgun
    const result = await sendEmail({
      to,
      subject: finalSubject,
      html: rendered.html,
      text: rendered.text,
      replyTo,
      tags: tags || [template.triggerEvent, templateSlug],
    })

    // 7-8. Update log based on result
    if (result.success) {
      await updateEmailLog(logId, {
        status: 'sent',
        mailgunMessageId: result.messageId,
      })

      return {
        success: true,
        messageId: result.messageId,
        logId,
      }
    } else {
      await updateEmailLog(logId, {
        status: 'failed',
        errorMessage: result.error,
      })

      return {
        success: false,
        error: result.error,
        logId,
      }
    }
  } catch (error) {
    // Handle known error types
    if (
      error instanceof TemplateNotFoundError ||
      error instanceof TemplateInactiveError ||
      error instanceof InvalidSlugError
    ) {
      return {
        success: false,
        error: error.message,
        logId: logId || undefined,
      }
    }

    // Unknown error - log and return
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error('[template-service] sendTemplatedEmail error:', error)

    if (logId) {
      await updateEmailLog(logId, {
        status: 'failed',
        errorMessage,
      })
    }

    return {
      success: false,
      error: errorMessage,
      logId: logId || undefined,
    }
  }
}

// ============================================================
// Exports
// ============================================================

export {
  // Re-export types for convenience
  type EmailTemplate,
  type RenderResult,
  type SendTemplatedEmailOptions,
  type SendTemplatedEmailResult,
}

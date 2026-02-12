/**
 * Email template types
 * Types for the email template management system
 */

/**
 * Recipient types for email templates
 */
export type EmailRecipientType = 'user' | 'client' | 'admin' | 'prospect' | 'any'

/**
 * Email delivery status
 */
export type EmailLogStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'failed'
  | 'bounced'
  | 'complained'
  | 'unsubscribed'

/**
 * Template variable documentation
 */
export interface TemplateVariable {
  key: string
  description: string
  example: string
}

/**
 * Email template from database
 */
export interface EmailTemplate {
  id: string
  categoryId: string | null
  slug: string
  name: string
  description: string | null
  triggerEvent: string
  triggerDescription: string | null
  recipientType: EmailRecipientType
  subjectTemplate: string
  bodyHtml: string
  bodyText: string | null
  availableVariables: TemplateVariable[]
  isActive: boolean
  isSystem: boolean
  createdAt: Date
  updatedAt: Date
  updatedBy: string | null
}

/**
 * Result of rendering a template
 */
export interface RenderResult {
  subject: string
  html: string
  text: string
}

/**
 * Options for sending a templated email
 */
export interface SendTemplatedEmailOptions {
  templateSlug: string
  to: string
  variables: Record<string, unknown>
  userId?: string
  clientId?: string
  replyTo?: string
  subject?: string // Override template subject
  tags?: string[]
}

/**
 * Result of sending a templated email
 */
export interface SendTemplatedEmailResult {
  success: boolean
  messageId?: string
  error?: string
  logId?: string
}

/**
 * Data for creating an email log entry
 */
export interface CreateEmailLogData {
  templateId: string | null
  templateSlug: string
  recipientEmail: string
  recipientUserId?: string
  recipientClientId?: string
  subject: string
  variablesUsed: Record<string, unknown>
  status: EmailLogStatus
  mailgunMessageId?: string
  errorMessage?: string
}

/**
 * Cached template entry
 */
export interface CachedTemplate {
  template: EmailTemplate
  cachedAt: number
}

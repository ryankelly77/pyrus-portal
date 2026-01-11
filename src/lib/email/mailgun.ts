import Mailgun from 'mailgun.js'
import FormData from 'form-data'

// Initialize Mailgun client
const mailgun = new Mailgun(FormData)

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'mail.pyrusdigitalmedia.com'
const MAILGUN_FROM = process.env.MAILGUN_FROM_EMAIL || 'Pyrus Digital Media <hello@mail.pyrusdigitalmedia.com>'

// Check if Mailgun is configured
export function isMailgunConfigured(): boolean {
  return Boolean(MAILGUN_API_KEY && MAILGUN_DOMAIN)
}

// Alias for backward compatibility
export const isEmailConfigured = isMailgunConfigured

// Get Mailgun client instance
function getClient() {
  if (!MAILGUN_API_KEY) {
    throw new Error('MAILGUN_API_KEY is not configured')
  }
  return mailgun.client({
    username: 'api',
    key: MAILGUN_API_KEY,
  })
}

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  tags?: string[]
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email via Mailgun
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!isMailgunConfigured()) {
    console.warn('Mailgun not configured, skipping email send')
    return { success: false, error: 'Mailgun not configured' }
  }

  try {
    const client = getClient()

    const result = await client.messages.create(MAILGUN_DOMAIN, {
      from: options.from || MAILGUN_FROM,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      'h:Reply-To': options.replyTo || 'support@pyrusdigitalmedia.com',
      'o:tag': options.tags || ['transactional'],
      'o:tracking': 'yes',
      'o:tracking-clicks': 'htmlonly',
      'o:tracking-opens': 'yes',
    })

    console.log(`Email sent to ${options.to}: ${result.id}`)
    return { success: true, messageId: result.id }
  } catch (error) {
    console.error('Failed to send email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

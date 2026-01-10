import Mailgun from 'mailgun.js'
import formData from 'form-data'

const mailgun = new Mailgun(formData)

// Initialize client - will fail gracefully if env vars not set
const mg = process.env.MAILGUN_API_KEY
  ? mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
    })
  : null

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text, from } = options

  // Check if Mailgun is configured
  if (!mg || !process.env.MAILGUN_DOMAIN) {
    console.warn('Mailgun not configured - email not sent')
    return {
      success: false,
      error: 'Mailgun not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.',
    }
  }

  const fromEmail = from || process.env.MAILGUN_FROM_EMAIL || `Pyrus Digital Media <noreply@${process.env.MAILGUN_DOMAIN}>`

  try {
    const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: fromEmail,
      to: [to],
      subject,
      html,
      text: text || stripHtml(html),
    })

    console.log(`Email sent to ${to}: ${result.id}`)
    return {
      success: true,
      messageId: result.id,
    }
  } catch (error) {
    console.error('Failed to send email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email',
    }
  }
}

// Simple HTML to plain text converter
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

// Check if email is configured and ready
export function isEmailConfigured(): boolean {
  return !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN)
}

/**
 * Unit tests for Email Template Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock prisma before importing the module
vi.mock('@/lib/prisma', () => ({
  prisma: {
    email_templates: {
      findUnique: vi.fn(),
    },
    email_logs: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

// Mock mailgun
vi.mock('../mailgun', () => ({
  sendEmail: vi.fn(),
}))

// Import after mocks are set up
import { prisma } from '@/lib/prisma'
import { sendEmail } from '../mailgun'
import {
  getTemplate,
  renderTemplate,
  sendTemplatedEmail,
  invalidateTemplateCache,
  updateEmailLogStatus,
} from '../template-service'
import {
  TemplateNotFoundError,
  TemplateInactiveError,
  InvalidSlugError,
} from '../template-errors'

// Sample template data
const mockTemplate = {
  id: 'template-123',
  category_id: 'cat-123',
  slug: 'password-reset',
  name: 'Password Reset',
  description: 'Password reset email',
  trigger_event: 'password_reset_requested',
  trigger_description: 'User clicks forgot password',
  recipient_type: 'any',
  subject_template: 'Reset Your Password, ${firstName}',
  body_html: '<h1>Hi ${firstName}</h1><p>Click <a href="${resetUrl}">here</a> to reset.</p>',
  body_text: 'Hi ${firstName}, reset at ${resetUrl}',
  available_variables: [
    { key: 'firstName', description: 'User first name', example: 'John' },
    { key: 'resetUrl', description: 'Reset link', example: 'https://...' },
  ],
  is_active: true,
  is_system: true,
  created_at: new Date(),
  updated_at: new Date(),
  updated_by: null,
}

describe('Template Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateTemplateCache() // Clear cache between tests
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================
  // Slug Validation Tests
  // ============================================================
  describe('Slug Validation', () => {
    it('should reject slugs with uppercase letters', async () => {
      await expect(getTemplate('Password-Reset')).rejects.toThrow(InvalidSlugError)
    })

    it('should reject slugs with spaces', async () => {
      await expect(getTemplate('password reset')).rejects.toThrow(InvalidSlugError)
    })

    it('should reject slugs with special characters', async () => {
      await expect(getTemplate('password_reset')).rejects.toThrow(InvalidSlugError)
      await expect(getTemplate('password.reset')).rejects.toThrow(InvalidSlugError)
      await expect(getTemplate('password@reset')).rejects.toThrow(InvalidSlugError)
    })

    it('should reject empty slugs', async () => {
      await expect(getTemplate('')).rejects.toThrow(InvalidSlugError)
    })

    it('should reject slugs over 100 characters', async () => {
      const longSlug = 'a'.repeat(101)
      await expect(getTemplate(longSlug)).rejects.toThrow(InvalidSlugError)
    })

    it('should accept valid slugs', async () => {
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(mockTemplate as any)

      // These should not throw InvalidSlugError
      await expect(getTemplate('password-reset')).resolves.toBeDefined()

      invalidateTemplateCache()
      await expect(getTemplate('user-invite-123')).resolves.toBeDefined()

      invalidateTemplateCache()
      await expect(getTemplate('a')).resolves.toBeDefined()
    })
  })

  // ============================================================
  // Template Fetching Tests
  // ============================================================
  describe('getTemplate', () => {
    it('should fetch template from database', async () => {
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(mockTemplate as any)

      const template = await getTemplate('password-reset')

      expect(template.slug).toBe('password-reset')
      expect(template.name).toBe('Password Reset')
      expect(template.isActive).toBe(true)
      expect(prisma.email_templates.findUnique).toHaveBeenCalledWith({
        where: { slug: 'password-reset' },
      })
    })

    it('should throw TemplateNotFoundError when template does not exist', async () => {
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(null)

      await expect(getTemplate('nonexistent')).rejects.toThrow(TemplateNotFoundError)
    })

    it('should cache templates', async () => {
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(mockTemplate as any)

      // First call - fetches from DB
      await getTemplate('password-reset')
      expect(prisma.email_templates.findUnique).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      await getTemplate('password-reset')
      expect(prisma.email_templates.findUnique).toHaveBeenCalledTimes(1)
    })

    it('should invalidate specific template from cache', async () => {
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(mockTemplate as any)

      await getTemplate('password-reset')
      expect(prisma.email_templates.findUnique).toHaveBeenCalledTimes(1)

      invalidateTemplateCache('password-reset')

      await getTemplate('password-reset')
      expect(prisma.email_templates.findUnique).toHaveBeenCalledTimes(2)
    })

    it('should invalidate all templates from cache', async () => {
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(mockTemplate as any)

      await getTemplate('password-reset')
      await getTemplate('password-reset')
      expect(prisma.email_templates.findUnique).toHaveBeenCalledTimes(1)

      invalidateTemplateCache() // Clear all

      await getTemplate('password-reset')
      expect(prisma.email_templates.findUnique).toHaveBeenCalledTimes(2)
    })
  })

  // ============================================================
  // Variable Replacement Tests
  // ============================================================
  describe('renderTemplate - Variable Replacement', () => {
    beforeEach(() => {
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(mockTemplate as any)
    })

    it('should replace ${variable} syntax', async () => {
      const result = await renderTemplate('password-reset', {
        firstName: 'John',
        resetUrl: 'https://example.com/reset',
      })

      expect(result.subject).toBe('Reset Your Password, John')
      expect(result.html).toContain('<h1>Hi John</h1>')
      expect(result.text).toContain('Hi John')
    })

    it('should replace {{variable}} syntax', async () => {
      const templateWithBrackets = {
        ...mockTemplate,
        subject_template: 'Hello {{firstName}}',
        body_html: '<p>Hi {{firstName}}</p>',
        body_text: 'Hi {{firstName}}',
      }
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(templateWithBrackets as any)
      invalidateTemplateCache()

      const result = await renderTemplate('password-reset', { firstName: 'Jane' })

      expect(result.subject).toBe('Hello Jane')
      expect(result.html).toBe('<p>Hi Jane</p>')
    })

    it('should support nested variables like ${client.name}', async () => {
      const templateWithNested = {
        ...mockTemplate,
        subject_template: 'Hello ${client.name}',
        body_html: '<p>Company: ${client.company.name}</p>',
        body_text: '${client.name} at ${client.company.name}',
      }
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(templateWithNested as any)
      invalidateTemplateCache()

      const result = await renderTemplate('password-reset', {
        client: {
          name: 'John',
          company: { name: 'Acme Corp' },
        },
      })

      expect(result.subject).toBe('Hello John')
      expect(result.html).toBe('<p>Company: Acme Corp</p>')
      expect(result.text).toBe('John at Acme Corp')
    })

    it('should replace missing variables with empty string', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await renderTemplate('password-reset', {
        firstName: 'John',
        // resetUrl is missing
      })

      expect(result.html).toContain('href=""')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing variables')
      )

      consoleWarnSpy.mockRestore()
    })

    it('should handle null and undefined values', async () => {
      const result = await renderTemplate('password-reset', {
        firstName: null,
        resetUrl: undefined,
      })

      expect(result.subject).toBe('Reset Your Password, ')
    })

    it('should convert non-string values to strings', async () => {
      const templateWithNumbers = {
        ...mockTemplate,
        subject_template: 'Order #${orderId} - ${amount} items',
        body_html: '<p>Active: ${isActive}</p>',
        body_text: 'Order ${orderId}',
      }
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(templateWithNumbers as any)
      invalidateTemplateCache()

      const result = await renderTemplate('password-reset', {
        orderId: 12345,
        amount: 3,
        isActive: true,
      })

      expect(result.subject).toBe('Order #12345 - 3 items')
      expect(result.html).toBe('<p>Active: true</p>')
    })
  })

  // ============================================================
  // HTML Escaping Tests
  // ============================================================
  describe('renderTemplate - HTML Escaping', () => {
    beforeEach(() => {
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(mockTemplate as any)
    })

    it('should HTML-escape variable values in HTML body', async () => {
      const result = await renderTemplate('password-reset', {
        firstName: '<script>alert("xss")</script>',
        resetUrl: 'https://example.com',
      })

      expect(result.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
      expect(result.html).not.toContain('<script>')
    })

    it('should escape special HTML characters', async () => {
      const result = await renderTemplate('password-reset', {
        firstName: 'John & Jane <test> "quoted" \'apostrophe\'',
        resetUrl: 'https://example.com',
      })

      expect(result.html).toContain('John &amp; Jane &lt;test&gt; &quot;quoted&quot; &#39;apostrophe&#39;')
    })

    it('should NOT escape subject line', async () => {
      const result = await renderTemplate('password-reset', {
        firstName: 'John & Jane',
        resetUrl: 'https://example.com',
      })

      // Subject should not be escaped
      expect(result.subject).toBe('Reset Your Password, John & Jane')
    })

    it('should NOT escape plain text body', async () => {
      const result = await renderTemplate('password-reset', {
        firstName: 'John & Jane',
        resetUrl: 'https://example.com',
      })

      // Plain text should not be escaped
      expect(result.text).toContain('Hi John & Jane')
    })

    it('should NOT escape variables ending in Html', async () => {
      const templateWithHtmlVar = {
        ...mockTemplate,
        body_html: '<div>${customHtml}</div>',
        body_text: '',
      }
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(templateWithHtmlVar as any)
      invalidateTemplateCache()

      const result = await renderTemplate('password-reset', {
        customHtml: '<strong>Bold text</strong>',
      })

      // Should NOT be escaped because variable ends in 'Html'
      expect(result.html).toBe('<div><strong>Bold text</strong></div>')
    })

    it('should NOT escape variables ending in Link or Url', async () => {
      const templateWithLinkVar = {
        ...mockTemplate,
        body_html: '<a href="${resetLink}">Reset</a> or <a href="${inviteUrl}">Invite</a>',
        body_text: '',
      }
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(templateWithLinkVar as any)
      invalidateTemplateCache()

      const result = await renderTemplate('password-reset', {
        resetLink: 'https://example.com/reset?token=abc&user=123',
        inviteUrl: 'https://example.com/invite?id=456',
      })

      // URLs should NOT have & escaped to &amp;
      expect(result.html).toContain('href="https://example.com/reset?token=abc&user=123"')
      expect(result.html).toContain('href="https://example.com/invite?id=456"')
    })
  })

  // ============================================================
  // Template Inactive Tests
  // ============================================================
  describe('renderTemplate - Inactive Templates', () => {
    it('should throw TemplateInactiveError for inactive templates', async () => {
      const inactiveTemplate = { ...mockTemplate, is_active: false }
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(inactiveTemplate as any)

      await expect(
        renderTemplate('password-reset', { firstName: 'John', resetUrl: 'https://...' })
      ).rejects.toThrow(TemplateInactiveError)
    })
  })

  // ============================================================
  // Send Templated Email Tests
  // ============================================================
  describe('sendTemplatedEmail', () => {
    beforeEach(() => {
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(mockTemplate as any)
      vi.mocked(prisma.email_logs.create).mockResolvedValue({ id: 'log-123' } as any)
      vi.mocked(prisma.email_logs.update).mockResolvedValue({} as any)
    })

    it('should send email successfully', async () => {
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      })

      const result = await sendTemplatedEmail({
        templateSlug: 'password-reset',
        to: 'user@example.com',
        variables: { firstName: 'John', resetUrl: 'https://example.com/reset' },
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg-123')
      expect(result.logId).toBe('log-123')

      // Verify sendEmail was called with correct params
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Reset Your Password, John',
        })
      )

      // Verify log was created and updated
      expect(prisma.email_logs.create).toHaveBeenCalled()
      expect(prisma.email_logs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log-123' },
          data: expect.objectContaining({
            status: 'sent',
            mailgun_message_id: 'msg-123',
          }),
        })
      )
    })

    it('should handle send failure', async () => {
      vi.mocked(sendEmail).mockResolvedValue({
        success: false,
        error: 'Mailgun error',
      })

      const result = await sendTemplatedEmail({
        templateSlug: 'password-reset',
        to: 'user@example.com',
        variables: { firstName: 'John', resetUrl: 'https://example.com/reset' },
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Mailgun error')

      // Verify log was updated with failure
      expect(prisma.email_logs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            error_message: 'Mailgun error',
          }),
        })
      )
    })

    it('should use subject override when provided', async () => {
      vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'msg-123' })

      await sendTemplatedEmail({
        templateSlug: 'password-reset',
        to: 'user@example.com',
        variables: { firstName: 'John', resetUrl: 'https://...' },
        subject: 'Custom Subject Override',
      })

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Custom Subject Override',
        })
      )
    })

    it('should pass userId and clientId to log', async () => {
      vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'msg-123' })

      await sendTemplatedEmail({
        templateSlug: 'password-reset',
        to: 'user@example.com',
        variables: { firstName: 'John', resetUrl: 'https://...' },
        userId: 'user-456',
        clientId: 'client-789',
      })

      expect(prisma.email_logs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipient_user_id: 'user-456',
            recipient_client_id: 'client-789',
          }),
        })
      )
    })

    it('should return error for invalid slug', async () => {
      const result = await sendTemplatedEmail({
        templateSlug: 'Invalid Slug!',
        to: 'user@example.com',
        variables: {},
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid template slug')
    })

    it('should return error for inactive template', async () => {
      const inactiveTemplate = { ...mockTemplate, is_active: false }
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(inactiveTemplate as any)

      const result = await sendTemplatedEmail({
        templateSlug: 'password-reset',
        to: 'user@example.com',
        variables: { firstName: 'John', resetUrl: 'https://...' },
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('inactive')
    })
  })

  // ============================================================
  // Log Status Update Tests
  // ============================================================
  describe('updateEmailLogStatus', () => {
    it('should update log status by message ID', async () => {
      vi.mocked(prisma.email_logs.updateMany).mockResolvedValue({ count: 1 })

      await updateEmailLogStatus('msg-123', 'delivered')

      expect(prisma.email_logs.updateMany).toHaveBeenCalledWith({
        where: { mailgun_message_id: 'msg-123' },
        data: expect.objectContaining({
          status: 'delivered',
        }),
      })
    })

    it('should handle update errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(prisma.email_logs.updateMany).mockRejectedValue(new Error('DB error'))

      // Should not throw
      await expect(updateEmailLogStatus('msg-123', 'delivered')).resolves.not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  // ============================================================
  // Variable Redaction Tests
  // ============================================================
  describe('Variable Redaction in Logs', () => {
    beforeEach(() => {
      vi.mocked(prisma.email_templates.findUnique).mockResolvedValue(mockTemplate as any)
      vi.mocked(prisma.email_logs.create).mockResolvedValue({ id: 'log-123' } as any)
      vi.mocked(prisma.email_logs.update).mockResolvedValue({} as any)
      vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'msg-123' })
    })

    it('should redact sensitive variables in logs', async () => {
      await sendTemplatedEmail({
        templateSlug: 'password-reset',
        to: 'user@example.com',
        variables: {
          firstName: 'John',
          resetUrl: 'https://example.com/reset?token=secret123',
          password: 'mysecretpassword',
          apiKey: 'sk-123456',
          resetToken: 'abc123',
        },
      })

      const createCall = vi.mocked(prisma.email_logs.create).mock.calls[0][0]
      const loggedVars = createCall.data.variables_used as Record<string, unknown>

      expect(loggedVars.firstName).toBe('John')
      expect(loggedVars.password).toBe('[REDACTED]')
      expect(loggedVars.apiKey).toBe('[REDACTED]')
      expect(loggedVars.resetToken).toBe('[REDACTED]')
      // resetUrl contains 'token' but is not a sensitive key itself
      expect(loggedVars.resetUrl).toBe('https://example.com/reset?token=secret123')
    })

    it('should redact nested sensitive variables', async () => {
      await sendTemplatedEmail({
        templateSlug: 'password-reset',
        to: 'user@example.com',
        variables: {
          firstName: 'John',
          resetUrl: 'https://...',
          auth: {
            token: 'secret-token',
            password: 'secret-password',
            username: 'john',
          },
        },
      })

      const createCall = vi.mocked(prisma.email_logs.create).mock.calls[0][0]
      const loggedVars = createCall.data.variables_used as Record<string, unknown>
      const auth = loggedVars.auth as Record<string, unknown>

      expect(auth.token).toBe('[REDACTED]')
      expect(auth.password).toBe('[REDACTED]')
      expect(auth.username).toBe('john')
    })
  })
})

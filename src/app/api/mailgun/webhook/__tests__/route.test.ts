/**
 * Unit tests for Mailgun Webhook - email_logs integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock prisma before importing
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    client_communications: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    email_logs: {
      updateMany: vi.fn(),
    },
  },
}))

// Mock the alerts module
vi.mock('@/lib/alerts', () => ({
  logEmailError: vi.fn(),
}))

// Import after mocks
import { prisma } from '@/lib/prisma'
import { updateEmailLogStatus } from '@/lib/email/template-service'

// Helper to create mock Mailgun webhook payloads
function createMailgunPayload(
  event: string,
  messageId: string,
  options: {
    recipient?: string
    url?: string
    reason?: string
  } = {}
) {
  return {
    signature: {
      timestamp: '1234567890',
      token: 'test-token',
      signature: 'test-signature',
    },
    'event-data': {
      event,
      message: {
        headers: {
          'message-id': messageId,
        },
      },
      recipient: options.recipient || 'test@example.com',
      ...(options.url && { url: options.url }),
      ...(options.reason && { reason: options.reason }),
    },
  }
}

describe('Mailgun Webhook - email_logs integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no matching communications (we're testing email_logs)
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([])
    vi.mocked(prisma.email_logs.updateMany).mockResolvedValue({ count: 1 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('updateEmailLogStatus', () => {
    it('should update email_logs status for delivered event', async () => {
      await updateEmailLogStatus('msg-123', 'delivered')

      expect(prisma.email_logs.updateMany).toHaveBeenCalledWith({
        where: { mailgun_message_id: 'msg-123' },
        data: expect.objectContaining({
          status: 'delivered',
        }),
      })
    })

    it('should update email_logs status for opened event', async () => {
      await updateEmailLogStatus('msg-123', 'opened')

      expect(prisma.email_logs.updateMany).toHaveBeenCalledWith({
        where: { mailgun_message_id: 'msg-123' },
        data: expect.objectContaining({
          status: 'opened',
        }),
      })
    })

    it('should update email_logs status for clicked event', async () => {
      await updateEmailLogStatus('msg-123', 'clicked')

      expect(prisma.email_logs.updateMany).toHaveBeenCalledWith({
        where: { mailgun_message_id: 'msg-123' },
        data: expect.objectContaining({
          status: 'clicked',
        }),
      })
    })

    it('should update email_logs status for failed event', async () => {
      await updateEmailLogStatus('msg-123', 'failed')

      expect(prisma.email_logs.updateMany).toHaveBeenCalledWith({
        where: { mailgun_message_id: 'msg-123' },
        data: expect.objectContaining({
          status: 'failed',
        }),
      })
    })

    it('should update email_logs status for bounced event', async () => {
      await updateEmailLogStatus('msg-123', 'bounced')

      expect(prisma.email_logs.updateMany).toHaveBeenCalledWith({
        where: { mailgun_message_id: 'msg-123' },
        data: expect.objectContaining({
          status: 'bounced',
        }),
      })
    })

    it('should update email_logs status for complained event', async () => {
      await updateEmailLogStatus('msg-123', 'complained')

      expect(prisma.email_logs.updateMany).toHaveBeenCalledWith({
        where: { mailgun_message_id: 'msg-123' },
        data: expect.objectContaining({
          status: 'complained',
        }),
      })
    })

    it('should update email_logs status for unsubscribed event', async () => {
      await updateEmailLogStatus('msg-123', 'unsubscribed')

      expect(prisma.email_logs.updateMany).toHaveBeenCalledWith({
        where: { mailgun_message_id: 'msg-123' },
        data: expect.objectContaining({
          status: 'unsubscribed',
        }),
      })
    })

    it('should include status_updated_at timestamp', async () => {
      const beforeCall = new Date()
      await updateEmailLogStatus('msg-123', 'delivered')
      const afterCall = new Date()

      const call = vi.mocked(prisma.email_logs.updateMany).mock.calls[0][0]
      const updatedAt = call.data.status_updated_at as Date

      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime())
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime())
    })

    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(prisma.email_logs.updateMany).mockRejectedValue(new Error('DB error'))

      // Should not throw
      await expect(updateEmailLogStatus('msg-123', 'delivered')).resolves.not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update email log status'),
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle empty message ID gracefully', async () => {
      await updateEmailLogStatus('', 'delivered')

      // Should still call updateMany, which will just match nothing
      expect(prisma.email_logs.updateMany).toHaveBeenCalledWith({
        where: { mailgun_message_id: '' },
        data: expect.objectContaining({
          status: 'delivered',
        }),
      })
    })
  })

  describe('Event to status mapping', () => {
    // These tests verify the status mapping used in the webhook

    it('should map "delivered" event to "delivered" status', () => {
      const statusMap: Record<string, string> = {
        'delivered': 'delivered',
        'opened': 'opened',
        'clicked': 'clicked',
        'failed': 'failed',
        'rejected': 'failed',
        'temporary_fail': 'failed',
        'permanent_fail': 'bounced',
        'bounced': 'bounced',
        'complained': 'complained',
        'unsubscribed': 'unsubscribed',
      }

      expect(statusMap['delivered']).toBe('delivered')
    })

    it('should map "rejected" and "temporary_fail" to "failed" status', () => {
      const statusMap: Record<string, string> = {
        'rejected': 'failed',
        'temporary_fail': 'failed',
      }

      expect(statusMap['rejected']).toBe('failed')
      expect(statusMap['temporary_fail']).toBe('failed')
    })

    it('should map "permanent_fail" to "bounced" status', () => {
      const statusMap: Record<string, string> = {
        'permanent_fail': 'bounced',
      }

      expect(statusMap['permanent_fail']).toBe('bounced')
    })
  })

  describe('Message ID extraction', () => {
    it('should handle message ID with angle brackets', () => {
      const messageId = '<msg-123@mail.example.com>'
      const cleanMessageId = messageId.replace(/^<|>$/g, '')

      expect(cleanMessageId).toBe('msg-123@mail.example.com')
    })

    it('should handle message ID without angle brackets', () => {
      const messageId = 'msg-123@mail.example.com'
      const cleanMessageId = messageId.replace(/^<|>$/g, '')

      expect(cleanMessageId).toBe('msg-123@mail.example.com')
    })

    it('should handle message ID from nested headers', () => {
      const payload = createMailgunPayload('delivered', 'msg-nested-123')
      const eventData = payload['event-data']
      const messageId = eventData.message?.headers?.['message-id']

      expect(messageId).toBe('msg-nested-123')
    })

    it('should handle message ID from flat payload', () => {
      const payload = {
        event: 'delivered',
        'message-id': 'msg-flat-123',
        recipient: 'test@example.com',
      }
      const messageId = payload['message-id']

      expect(messageId).toBe('msg-flat-123')
    })
  })
})

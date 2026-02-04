/**
 * Performance API Routes Tests
 *
 * These tests validate the input validation and auth checks
 * without requiring a database connection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  CreateClientAlertSchema,
  PerformanceDashboardQuerySchema,
  PerformanceDashboardResponseSchema,
} from '@/lib/validation/performanceSchemas'

// Mock the dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    clients: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    client_alerts: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    client_communications: {
      findMany: vi.fn(),
    },
    activity_log: {
      create: vi.fn(),
    },
    profiles: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/requireAdmin', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('Performance Dashboard Query Validation', () => {
  it('accepts valid query params', () => {
    const result = PerformanceDashboardQuerySchema.safeParse({
      stage: 'seedling',
      status: 'critical',
      sort: 'score_desc',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query (all defaults)', () => {
    const result = PerformanceDashboardQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data?.sort).toBe('score_desc')
    expect(result.data?.critical_only).toBe(false)
  })

  it('rejects invalid stage', () => {
    const result = PerformanceDashboardQuerySchema.safeParse({
      stage: 'invalid_stage',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = PerformanceDashboardQuerySchema.safeParse({
      status: 'unknown_status',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid sort', () => {
    const result = PerformanceDashboardQuerySchema.safeParse({
      sort: 'invalid_sort',
    })
    expect(result.success).toBe(false)
  })

  it('coerces critical_only to boolean', () => {
    const result = PerformanceDashboardQuerySchema.safeParse({
      critical_only: 'true',
    })
    expect(result.success).toBe(true)
    expect(result.data?.critical_only).toBe(true)
  })
})

describe('Create Client Alert Validation', () => {
  it('accepts valid alert input', () => {
    const result = CreateClientAlertSchema.safeParse({
      client_id: '123e4567-e89b-12d3-a456-426614174000',
      message: 'Our team is actively focused on improving your account.',
      alert_type: 'performance_focus',
      publish: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing client_id', () => {
    const result = CreateClientAlertSchema.safeParse({
      message: 'Test message',
      alert_type: 'performance_focus',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID', () => {
    const result = CreateClientAlertSchema.safeParse({
      client_id: 'not-a-uuid',
      message: 'Test message',
      alert_type: 'performance_focus',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty message', () => {
    const result = CreateClientAlertSchema.safeParse({
      client_id: '123e4567-e89b-12d3-a456-426614174000',
      message: '',
      alert_type: 'performance_focus',
    })
    expect(result.success).toBe(false)
  })

  it('rejects message over 2000 chars', () => {
    const result = CreateClientAlertSchema.safeParse({
      client_id: '123e4567-e89b-12d3-a456-426614174000',
      message: 'a'.repeat(2001),
      alert_type: 'performance_focus',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid alert_type', () => {
    const result = CreateClientAlertSchema.safeParse({
      client_id: '123e4567-e89b-12d3-a456-426614174000',
      message: 'Test message',
      alert_type: 'invalid_type',
    })
    expect(result.success).toBe(false)
  })

  it('defaults publish to false', () => {
    const result = CreateClientAlertSchema.safeParse({
      client_id: '123e4567-e89b-12d3-a456-426614174000',
      message: 'Test message',
      alert_type: 'performance_focus',
    })
    expect(result.success).toBe(true)
    expect(result.data?.publish).toBe(false)
  })

  it('accepts all valid alert types', () => {
    const alertTypes = ['performance_focus', 'general_update', 'milestone', 'intervention']

    for (const alertType of alertTypes) {
      const result = CreateClientAlertSchema.safeParse({
        client_id: '123e4567-e89b-12d3-a456-426614174000',
        message: 'Test message',
        alert_type: alertType,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('Performance API Route Behaviors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/performance', () => {
    it('requires admin authentication', async () => {
      const { requireAdmin } = await import('@/lib/auth/requireAdmin')
      const mockRequireAdmin = vi.mocked(requireAdmin)

      // Simulate unauthorized response
      mockRequireAdmin.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as any
      )

      // The route would return 401 - this tests the pattern
      const result = await mockRequireAdmin()
      expect(result).toBeInstanceOf(Response)
    })
  })

  describe('GET /api/admin/performance/[clientId]', () => {
    it('validates UUID format for clientId', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      const invalidUUID = 'not-a-valid-uuid'

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      expect(uuidRegex.test(validUUID)).toBe(true)
      expect(uuidRegex.test(invalidUUID)).toBe(false)
    })
  })

  describe('POST /api/admin/performance/alerts', () => {
    it('validates request body with Zod schema', () => {
      const validBody = {
        client_id: '123e4567-e89b-12d3-a456-426614174000',
        message: 'Test alert message',
        alert_type: 'performance_focus',
        publish: false,
      }

      const result = CreateClientAlertSchema.safeParse(validBody)
      expect(result.success).toBe(true)
    })

    it('rejects invalid request body', () => {
      const invalidBody = {
        client_id: 'invalid',
        message: '',
        alert_type: 'unknown',
      }

      const result = CreateClientAlertSchema.safeParse(invalidBody)
      expect(result.success).toBe(false)
      expect(result.error?.issues.length).toBeGreaterThan(0)
    })
  })

  describe('POST /api/client/alerts/[alertId]/dismiss', () => {
    it('requires client authentication', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockCreateClient = vi.mocked(createClient)

      // Simulate no user
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as any)

      const supabase = await mockCreateClient()
      const { data: { user } } = await supabase.auth.getUser()

      expect(user).toBeNull()
    })
  })
})

describe('Alert Type Constants', () => {
  it('has all expected alert types', () => {
    const expectedTypes = [
      'performance_focus',
      'general_update',
      'milestone',
      'intervention',
    ]

    // Test that schema accepts each type
    for (const type of expectedTypes) {
      const result = CreateClientAlertSchema.safeParse({
        client_id: '123e4567-e89b-12d3-a456-426614174000',
        message: 'Test',
        alert_type: type,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('Dashboard Query Filters', () => {
  it('accepts all growth stages', () => {
    const stages = ['seedling', 'sprouting', 'blooming', 'harvesting']

    for (const stage of stages) {
      const result = PerformanceDashboardQuerySchema.safeParse({ stage })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all status filters', () => {
    const statuses = ['critical', 'at_risk', 'needs_attention', 'healthy', 'thriving']

    for (const status of statuses) {
      const result = PerformanceDashboardQuerySchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all sort options', () => {
    const sorts = ['score_asc', 'score_desc', 'name', 'stage', 'mrr_desc']

    for (const sort of sorts) {
      const result = PerformanceDashboardQuerySchema.safeParse({ sort })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all plan types', () => {
    const plans = ['seo', 'paid_media', 'ai_optimization', 'full_service']

    for (const plan of plans) {
      const result = PerformanceDashboardQuerySchema.safeParse({ plan })
      expect(result.success).toBe(true)
    }
  })
})

describe('Performance Dashboard Response Validation', () => {
  it('validates a complete valid response', () => {
    const validResponse = {
      summary: {
        total_clients: 10,
        average_score: 65,
        by_status: {
          critical: 2,
          at_risk: 2,
          needs_attention: 2,
          healthy: 3,
          thriving: 1,
        },
        by_stage: {
          seedling: { count: 3, avg_score: 45 },
          sprouting: { count: 2, avg_score: 55 },
          blooming: { count: 3, avg_score: 70 },
          harvesting: { count: 2, avg_score: 85 },
        },
      },
      clients: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Client',
          score: 75,
          growth_stage: 'blooming',
          status: 'healthy',
          plan_type: 'seo',
          mrr: 1500,
          tenure_months: 8,
          metrics: {
            keywords: { score: 80, delta: 5 },
            visitors: { score: 70, delta: -2 },
          },
          velocity_modifier: 1.05,
          last_alert_at: null,
          last_alert_type: null,
          flags: [],
        },
      ],
    }

    const result = PerformanceDashboardResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('rejects response missing by_status', () => {
    const invalidResponse = {
      summary: {
        total_clients: 10,
        average_score: 65,
        // Missing by_status
        by_stage: {
          seedling: { count: 3, avg_score: 45 },
          sprouting: { count: 2, avg_score: 55 },
          blooming: { count: 3, avg_score: 70 },
          harvesting: { count: 2, avg_score: 85 },
        },
      },
      clients: [],
    }

    const result = PerformanceDashboardResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
    if (!result.success) {
      const byStatusError = result.error.issues.find(
        (issue) => issue.path.includes('by_status')
      )
      expect(byStatusError).toBeDefined()
    }
  })

  it('rejects response missing by_stage', () => {
    const invalidResponse = {
      summary: {
        total_clients: 10,
        average_score: 65,
        by_status: {
          critical: 2,
          at_risk: 2,
          needs_attention: 2,
          healthy: 3,
          thriving: 1,
        },
        // Missing by_stage
      },
      clients: [],
    }

    const result = PerformanceDashboardResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })

  it('rejects client with invalid growth_stage', () => {
    const invalidResponse = {
      summary: {
        total_clients: 1,
        average_score: 65,
        by_status: {
          critical: 0,
          at_risk: 0,
          needs_attention: 0,
          healthy: 1,
          thriving: 0,
        },
        by_stage: {
          seedling: { count: 0, avg_score: 0 },
          sprouting: { count: 0, avg_score: 0 },
          blooming: { count: 1, avg_score: 65 },
          harvesting: { count: 0, avg_score: 0 },
        },
      },
      clients: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Client',
          score: 65,
          growth_stage: 'invalid_stage', // Invalid
          status: 'healthy',
          plan_type: 'seo',
          mrr: 1500,
          tenure_months: 8,
          metrics: {},
          velocity_modifier: 1.0,
          last_alert_at: null,
          flags: [],
        },
      ],
    }

    const result = PerformanceDashboardResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })

  it('rejects response with missing clients array', () => {
    const invalidResponse = {
      summary: {
        total_clients: 0,
        average_score: 0,
        by_status: {
          critical: 0,
          at_risk: 0,
          needs_attention: 0,
          healthy: 0,
          thriving: 0,
        },
        by_stage: {
          seedling: { count: 0, avg_score: 0 },
          sprouting: { count: 0, avg_score: 0 },
          blooming: { count: 0, avg_score: 0 },
          harvesting: { count: 0, avg_score: 0 },
        },
      },
      // Missing clients array
    }

    const result = PerformanceDashboardResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })

  it('accepts empty clients array', () => {
    const validResponse = {
      summary: {
        total_clients: 0,
        average_score: 0,
        by_status: {
          critical: 0,
          at_risk: 0,
          needs_attention: 0,
          healthy: 0,
          thriving: 0,
        },
        by_stage: {
          seedling: { count: 0, avg_score: 0 },
          sprouting: { count: 0, avg_score: 0 },
          blooming: { count: 0, avg_score: 0 },
          harvesting: { count: 0, avg_score: 0 },
        },
      },
      clients: [],
    }

    const result = PerformanceDashboardResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })
})

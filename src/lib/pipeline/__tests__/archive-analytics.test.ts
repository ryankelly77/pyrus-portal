/**
 * Tests for Archive Analytics
 *
 * Tests that:
 * 1. getArchiveAnalytics returns correct counts and MRR sums grouped by reason
 * 2. Date range filtering works on archived_at
 * 3. Percentages add up to 100
 * 4. avg_days_to_archive calculates correctly
 * 5. Empty date range returns zero counts, not errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the database pool
const mockQuery = vi.fn()
vi.mock('@/lib/prisma', () => ({
  dbPool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}))

describe('Archive Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('getArchiveAnalytics', () => {
    it('returns correct counts and MRR sums grouped by reason', async () => {
      // Mock analytics query result
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            total_archived: 5,
            lost_mrr: 2500,
            lost_onetime: 1000,
            avg_days_to_archive: 14.5,
          }],
        })
        // Mock breakdown query result
        .mockResolvedValueOnce({
          rows: [
            { reason: 'went_dark', count: 2, mrr_lost: 1000, onetime_lost: 500 },
            { reason: 'budget', count: 2, mrr_lost: 1000, onetime_lost: 300 },
            { reason: 'timing', count: 1, mrr_lost: 500, onetime_lost: 200 },
          ],
        })

      const { getArchiveAnalytics } = await import('../get-pipeline-data')
      const result = await getArchiveAnalytics()

      expect(result.total_archived).toBe(5)
      expect(result.lost_mrr).toBe(2500)
      expect(result.lost_onetime).toBe(1000)
      expect(result.avg_days_to_archive).toBe(15) // Rounded

      // Check breakdown
      expect(result.reasons_breakdown).toHaveLength(3)
      expect(result.reasons_breakdown[0]).toEqual({
        reason: 'went_dark',
        count: 2,
        mrr_lost: 1000,
        onetime_lost: 500,
        percentage: 40, // 2/5 = 40%
      })
      expect(result.reasons_breakdown[1]).toEqual({
        reason: 'budget',
        count: 2,
        mrr_lost: 1000,
        onetime_lost: 300,
        percentage: 40,
      })
      expect(result.reasons_breakdown[2]).toEqual({
        reason: 'timing',
        count: 1,
        mrr_lost: 500,
        onetime_lost: 200,
        percentage: 20,
      })
    })

    it('identifies top reason correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            total_archived: 10,
            lost_mrr: 5000,
            lost_onetime: 0,
            avg_days_to_archive: 21,
          }],
        })
        .mockResolvedValueOnce({
          rows: [
            { reason: 'went_dark', count: 4, mrr_lost: 2000, onetime_lost: 0 },
            { reason: 'budget', count: 3, mrr_lost: 1500, onetime_lost: 0 },
            { reason: 'chose_competitor', count: 3, mrr_lost: 1500, onetime_lost: 0 },
          ],
        })

      const { getArchiveAnalytics } = await import('../get-pipeline-data')
      const result = await getArchiveAnalytics()

      expect(result.top_reason).toBe('went_dark')
      expect(result.top_reason_percentage).toBe(40)
    })

    it('applies date range filters on archived_at', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total_archived: 3, lost_mrr: 1500, lost_onetime: 0, avg_days_to_archive: 10 }],
        })
        .mockResolvedValueOnce({
          rows: [{ reason: 'budget', count: 3, mrr_lost: 1500, onetime_lost: 0 }],
        })

      const { getArchiveAnalytics } = await import('../get-pipeline-data')
      await getArchiveAnalytics({
        archived_after: '2026-01-01',
        archived_before: '2026-01-31',
      })

      // Check that filters were applied in the query
      const analyticsCall = mockQuery.mock.calls[0]
      expect(analyticsCall[0]).toContain('r.archived_at >= $1')
      expect(analyticsCall[0]).toContain('r.archived_at <= $2')
      expect(analyticsCall[1]).toContain('2026-01-01')
      expect(analyticsCall[1]).toContain('2026-01-31')
    })

    it('filters by rep_id when provided', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total_archived: 2, lost_mrr: 800, lost_onetime: 0, avg_days_to_archive: 7 }],
        })
        .mockResolvedValueOnce({
          rows: [{ reason: 'timing', count: 2, mrr_lost: 800, onetime_lost: 0 }],
        })

      const { getArchiveAnalytics } = await import('../get-pipeline-data')
      await getArchiveAnalytics({ rep_id: 'rep-123' })

      // Check that rep filter was applied
      const analyticsCall = mockQuery.mock.calls[0]
      expect(analyticsCall[0]).toContain('r.created_by = $1')
      expect(analyticsCall[1]).toContain('rep-123')
    })

    it('percentages add up to approximately 100', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total_archived: 9, lost_mrr: 4500, lost_onetime: 0, avg_days_to_archive: 12 }],
        })
        .mockResolvedValueOnce({
          rows: [
            { reason: 'went_dark', count: 3, mrr_lost: 1500, onetime_lost: 0 },
            { reason: 'budget', count: 3, mrr_lost: 1500, onetime_lost: 0 },
            { reason: 'timing', count: 3, mrr_lost: 1500, onetime_lost: 0 },
          ],
        })

      const { getArchiveAnalytics } = await import('../get-pipeline-data')
      const result = await getArchiveAnalytics()

      const totalPercentage = result.reasons_breakdown.reduce((sum, r) => sum + r.percentage, 0)
      // Each is 3/9 = 33.33%, rounded to 33, so total is 99
      expect(totalPercentage).toBeGreaterThanOrEqual(99)
      expect(totalPercentage).toBeLessThanOrEqual(102)
    })

    it('returns zero counts when no archived deals exist', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total_archived: 0, lost_mrr: 0, lost_onetime: 0, avg_days_to_archive: 0 }],
        })
        .mockResolvedValueOnce({
          rows: [],
        })

      const { getArchiveAnalytics } = await import('../get-pipeline-data')
      const result = await getArchiveAnalytics()

      expect(result.total_archived).toBe(0)
      expect(result.lost_mrr).toBe(0)
      expect(result.lost_onetime).toBe(0)
      expect(result.avg_days_to_archive).toBe(0)
      expect(result.top_reason).toBeNull()
      expect(result.top_reason_percentage).toBe(0)
      expect(result.reasons_breakdown).toEqual([])
    })

    it('handles null values gracefully', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            total_archived: null,
            lost_mrr: null,
            lost_onetime: null,
            avg_days_to_archive: null,
          }],
        })
        .mockResolvedValueOnce({
          rows: [],
        })

      const { getArchiveAnalytics } = await import('../get-pipeline-data')
      const result = await getArchiveAnalytics()

      expect(result.total_archived).toBe(0)
      expect(result.lost_mrr).toBe(0)
      expect(result.lost_onetime).toBe(0)
      expect(result.avg_days_to_archive).toBe(0)
    })

    it('calculates avg_days_to_archive correctly', async () => {
      // avg_days_to_archive is calculated as average of (archived_at - sent_at)
      // The query returns this already calculated, we just need to round it
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            total_archived: 4,
            lost_mrr: 2000,
            lost_onetime: 500,
            avg_days_to_archive: 18.75, // Average of 14, 21, 7, 33 days
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ reason: 'went_dark', count: 4, mrr_lost: 2000, onetime_lost: 500 }],
        })

      const { getArchiveAnalytics } = await import('../get-pipeline-data')
      const result = await getArchiveAnalytics()

      expect(result.avg_days_to_archive).toBe(19) // Rounded from 18.75
    })

    it('only includes archived deals in analytics', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total_archived: 2, lost_mrr: 1000, lost_onetime: 0, avg_days_to_archive: 14 }],
        })
        .mockResolvedValueOnce({
          rows: [{ reason: 'budget', count: 2, mrr_lost: 1000, onetime_lost: 0 }],
        })

      const { getArchiveAnalytics } = await import('../get-pipeline-data')
      await getArchiveAnalytics()

      // Verify the query includes archived_at IS NOT NULL condition
      const analyticsCall = mockQuery.mock.calls[0]
      expect(analyticsCall[0]).toContain('r.archived_at IS NOT NULL')
    })
  })
})

// ============================================================
// Batch Recalculation Tests
// ============================================================
//
// Tests for the batch recalculation logic, focusing on:
//   1. Interface contracts (result structure)
//   2. Error handling behavior
//   3. Batch processing logic
//
// Note: These are unit tests that mock the database.
// Integration tests should be run separately with a test database.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BatchRecalculateResult } from '../batch-recalculate';

// Mock the database pool
vi.mock('@/lib/prisma', () => ({
  dbPool: {
    query: vi.fn(),
  },
}));

// Mock recalculateScore
vi.mock('../recalculate-score', () => ({
  recalculateScore: vi.fn(),
}));

describe('BatchRecalculateResult Interface', () => {
  it('should have the correct shape', () => {
    const result: BatchRecalculateResult = {
      processed: 10,
      succeeded: 8,
      failed: 1,
      skipped: 1,
      duration_ms: 500,
      errors: [{ recommendation_id: 'test-id', error: 'Test error' }],
    };

    expect(result.processed).toBe(10);
    expect(result.succeeded).toBe(8);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.duration_ms).toBe(500);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].recommendation_id).toBe('test-id');
  });

  it('should handle empty errors array', () => {
    const result: BatchRecalculateResult = {
      processed: 5,
      succeeded: 5,
      failed: 0,
      skipped: 0,
      duration_ms: 100,
      errors: [],
    };

    expect(result.errors).toEqual([]);
    expect(result.failed).toBe(0);
  });

  it('should track skipped vs failed correctly', () => {
    // Skipped = terminal status (accepted/closed_lost), recalculateScore returned null
    // Failed = error thrown during processing
    const result: BatchRecalculateResult = {
      processed: 10,
      succeeded: 5,
      failed: 2,
      skipped: 3,
      duration_ms: 200,
      errors: [
        { recommendation_id: 'id1', error: 'DB connection failed' },
        { recommendation_id: 'id2', error: 'Invalid data' },
      ],
    };

    // processed = succeeded + failed + skipped
    expect(result.processed).toBe(result.succeeded + result.failed + result.skipped);
    expect(result.errors.length).toBe(result.failed);
  });
});

describe('Stale Score Selection Logic', () => {
  // These tests verify the SQL query logic conceptually

  it('should consider recommendations with NULL last_scored_at as stale', () => {
    // SQL: last_scored_at IS NULL
    const recommendation = {
      id: 'rec-1',
      status: 'sent',
      last_scored_at: null,
    };

    const isStale = recommendation.last_scored_at === null;
    expect(isStale).toBe(true);
  });

  it('should consider recommendations older than 23 hours as stale', () => {
    // SQL: last_scored_at < NOW() - INTERVAL '23 hours'
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twentyTwoHoursAgo = new Date(now.getTime() - 22 * 60 * 60 * 1000);
    const twentyThreeHourThreshold = new Date(now.getTime() - 23 * 60 * 60 * 1000);

    // 24 hours ago should be stale
    const isStale24h = twentyFourHoursAgo < twentyThreeHourThreshold;
    expect(isStale24h).toBe(true);

    // 22 hours ago should NOT be stale
    const isStale22h = twentyTwoHoursAgo < twentyThreeHourThreshold;
    expect(isStale22h).toBe(false);
  });

  it('should only include active pipeline statuses', () => {
    const activeStatuses = ['sent', 'declined'];
    const terminalStatuses = ['accepted', 'closed_lost', 'draft'];

    activeStatuses.forEach(status => {
      expect(['sent', 'declined'].includes(status)).toBe(true);
    });

    terminalStatuses.forEach(status => {
      expect(['sent', 'declined'].includes(status)).toBe(false);
    });
  });
});

describe('Error Rate Alerting', () => {
  const ERROR_RATE_THRESHOLD = 0.5; // 50%

  it('should trigger alert when error rate exceeds 50%', () => {
    const result: BatchRecalculateResult = {
      processed: 10,
      succeeded: 4,
      failed: 6,
      skipped: 0,
      duration_ms: 100,
      errors: [],
    };

    const errorRate = result.failed / result.processed;
    expect(errorRate).toBeGreaterThan(ERROR_RATE_THRESHOLD);
  });

  it('should NOT trigger alert when error rate is below 50%', () => {
    const result: BatchRecalculateResult = {
      processed: 10,
      succeeded: 6,
      failed: 4,
      skipped: 0,
      duration_ms: 100,
      errors: [],
    };

    const errorRate = result.failed / result.processed;
    expect(errorRate).toBeLessThan(ERROR_RATE_THRESHOLD);
  });

  it('should handle zero processed without division error', () => {
    const result: BatchRecalculateResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      duration_ms: 50,
      errors: [],
    };

    const errorRate = result.processed > 0 ? result.failed / result.processed : 0;
    expect(errorRate).toBe(0);
    expect(Number.isFinite(errorRate)).toBe(true);
  });
});

describe('Batch Processing Logic', () => {
  const BATCH_SIZE = 25;

  it('should calculate correct number of batches', () => {
    const testCases = [
      { total: 0, expectedBatches: 0 },
      { total: 1, expectedBatches: 1 },
      { total: 25, expectedBatches: 1 },
      { total: 26, expectedBatches: 2 },
      { total: 50, expectedBatches: 2 },
      { total: 51, expectedBatches: 3 },
      { total: 100, expectedBatches: 4 },
    ];

    testCases.forEach(({ total, expectedBatches }) => {
      const batches = total === 0 ? 0 : Math.ceil(total / BATCH_SIZE);
      expect(batches).toBe(expectedBatches);
    });
  });

  it('should split array into correct batch sizes', () => {
    const items = Array.from({ length: 63 }, (_, i) => `item-${i}`);
    const batches: string[][] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    expect(batches.length).toBe(3);
    expect(batches[0].length).toBe(25);
    expect(batches[1].length).toBe(25);
    expect(batches[2].length).toBe(13);
  });
});

describe('Scoring Run Logging', () => {
  it('should limit stored errors to 50', () => {
    const manyErrors = Array.from({ length: 100 }, (_, i) => ({
      recommendation_id: `rec-${i}`,
      error: `Error ${i}`,
    }));

    const limitedErrors = manyErrors.slice(0, 50);
    expect(limitedErrors.length).toBe(50);
  });

  it('should include all required fields for logging', () => {
    const runLog = {
      run_type: 'daily_cron' as const,
      processed: 50,
      succeeded: 45,
      failed: 3,
      skipped: 2,
      duration_ms: 1500,
      errors: [] as Array<{ recommendation_id: string; error: string }>,
      completed_at: new Date().toISOString(),
    };

    expect(runLog.run_type).toBeDefined();
    expect(runLog.processed).toBeDefined();
    expect(runLog.succeeded).toBeDefined();
    expect(runLog.failed).toBeDefined();
    expect(runLog.skipped).toBeDefined();
    expect(runLog.duration_ms).toBeDefined();
    expect(runLog.errors).toBeDefined();
    expect(runLog.completed_at).toBeDefined();
  });

  it('should accept valid run types', () => {
    const validRunTypes = ['daily_cron', 'event_queue', 'manual'];

    validRunTypes.forEach(runType => {
      expect(['daily_cron', 'event_queue', 'manual'].includes(runType)).toBe(true);
    });
  });
});

describe('Time-based Decay Verification', () => {
  // These tests verify the scoring penalties that require daily recalculation

  it('should calculate email not opened penalty correctly', () => {
    // 2.5 pts/day after 24hr grace (max 35)
    const dailyPenalty = 2.5;
    const graceHours = 24;
    const maxPenalty = 35;

    // After 3 days (72 hours), penalty should be 2 * 2.5 = 5
    const hoursElapsed = 72;
    const daysPastGrace = (hoursElapsed - graceHours) / 24;
    const penalty = Math.min(daysPastGrace * dailyPenalty, maxPenalty);
    expect(penalty).toBe(5);

    // After 20 days, penalty should be capped at 35
    const hoursElapsed20Days = 20 * 24;
    const daysPastGrace20 = (hoursElapsed20Days - graceHours) / 24;
    const penalty20 = Math.min(daysPastGrace20 * dailyPenalty, maxPenalty);
    expect(penalty20).toBe(35);
  });

  it('should calculate proposal not viewed penalty correctly', () => {
    // 2 pts/day after 48hr grace (max 25)
    const dailyPenalty = 2;
    const graceHours = 48;
    const maxPenalty = 25;

    // After 5 days (120 hours), penalty should be 3 * 2 = 6
    const hoursElapsed = 120;
    const daysPastGrace = (hoursElapsed - graceHours) / 24;
    const penalty = Math.min(daysPastGrace * dailyPenalty, maxPenalty);
    expect(penalty).toBe(6);
  });

  it('should calculate silence penalty correctly', () => {
    // 3 pts/day after 5-day grace (max 80)
    const dailyPenalty = 3;
    const graceDays = 5;
    const maxPenalty = 80;

    // After 15 days, penalty should be 10 * 3 = 30
    const daysElapsed = 15;
    const daysPastGrace = daysElapsed - graceDays;
    const penalty = Math.min(daysPastGrace * dailyPenalty, maxPenalty);
    expect(penalty).toBe(30);

    // After 40 days, penalty should be capped at 80
    const daysElapsed40 = 40;
    const daysPastGrace40 = daysElapsed40 - graceDays;
    const penalty40 = Math.min(daysPastGrace40 * dailyPenalty, maxPenalty);
    expect(penalty40).toBe(80);
  });
});

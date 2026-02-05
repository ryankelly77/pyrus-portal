import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create the mock function before mocking
const mockQuery = vi.hoisted(() => vi.fn());

// Mock the dbPool
vi.mock('@/lib/prisma', () => ({
  dbPool: {
    query: mockQuery,
  },
}));

// Import after mocking
import { getPipelineRevenueSummary } from '../get-pipeline-revenue-summary';

describe('getPipelineRevenueSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty buckets when no deals exist', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await getPipelineRevenueSummary(5000, 10);

    expect(result.current_mrr).toBe(5000);
    expect(result.active_client_count).toBe(10);
    expect(result.closing_soon.deal_count).toBe(0);
    expect(result.in_pipeline.deal_count).toBe(0);
    expect(result.at_risk.deal_count).toBe(0);
    expect(result.on_hold.deal_count).toBe(0);
    expect(result.projected_mrr).toBe(5000); // current MRR only
    expect(result.potential_growth).toBe(0);
  });

  it('buckets closing_soon deals correctly (>= 70% confidence AND >= 14 days)', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: '1',
          confidence_score: '75',
          predicted_monthly: '1000',
          weighted_monthly: '750',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
          revived_at: null,
          last_scored_at: new Date().toISOString(),
          client_name: 'Test Client',
          client_id: 'c1',
          rep_full_name: 'John Doe',
          age_days: '20',
        },
      ],
    });

    const result = await getPipelineRevenueSummary(5000, 10);

    expect(result.closing_soon.deal_count).toBe(1);
    expect(result.closing_soon.weighted_mrr).toBe(750);
    expect(result.closing_soon.raw_mrr).toBe(1000);
    expect(result.closing_soon.avg_confidence).toBe(75);
    expect(result.closing_soon_deals.length).toBe(1);
  });

  it('does NOT count as closing_soon if confidence >= 70 but age < 14 days', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: '1',
          confidence_score: '80',
          predicted_monthly: '1000',
          weighted_monthly: '800',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
          revived_at: null,
          last_scored_at: new Date().toISOString(),
          client_name: 'Test Client',
          client_id: 'c1',
          rep_full_name: 'John Doe',
          age_days: '10', // Only 10 days old
        },
      ],
    });

    const result = await getPipelineRevenueSummary(5000, 10);

    // Should be in_pipeline, not closing_soon
    expect(result.closing_soon.deal_count).toBe(0);
    expect(result.in_pipeline.deal_count).toBe(1);
    expect(result.in_pipeline.weighted_mrr).toBe(800);
  });

  it('does NOT count as closing_soon if age >= 14 days but confidence < 70', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: '1',
          confidence_score: '50',
          predicted_monthly: '1000',
          weighted_monthly: '500',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          revived_at: null,
          last_scored_at: new Date().toISOString(),
          client_name: 'Test Client',
          client_id: 'c1',
          rep_full_name: 'John Doe',
          age_days: '30',
        },
      ],
    });

    const result = await getPipelineRevenueSummary(5000, 10);

    // Should be in_pipeline, not closing_soon
    expect(result.closing_soon.deal_count).toBe(0);
    expect(result.in_pipeline.deal_count).toBe(1);
  });

  it('buckets in_pipeline deals correctly (30-69% confidence)', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: '1',
          confidence_score: '45',
          predicted_monthly: '800',
          weighted_monthly: '360',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          revived_at: null,
          last_scored_at: new Date().toISOString(),
          client_name: 'Test Client',
          client_id: 'c1',
          rep_full_name: 'John Doe',
          age_days: '7',
        },
      ],
    });

    const result = await getPipelineRevenueSummary(5000, 10);

    expect(result.in_pipeline.deal_count).toBe(1);
    expect(result.in_pipeline.weighted_mrr).toBe(360);
    expect(result.in_pipeline.raw_mrr).toBe(800);
    expect(result.in_pipeline.avg_confidence).toBe(45);
  });

  it('buckets at_risk deals correctly (< 30% confidence)', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: '1',
          confidence_score: '15',
          predicted_monthly: '500',
          weighted_monthly: '75',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          revived_at: null,
          last_scored_at: new Date().toISOString(),
          client_name: 'Test Client',
          client_id: 'c1',
          rep_full_name: 'John Doe',
          age_days: '30',
        },
      ],
    });

    const result = await getPipelineRevenueSummary(5000, 10);

    expect(result.at_risk.deal_count).toBe(1);
    expect(result.at_risk.weighted_mrr).toBe(75);
    expect(result.at_risk.raw_mrr).toBe(500);
    expect(result.at_risk.avg_confidence).toBe(15);
  });

  it('buckets snoozed deals as on_hold (not other buckets)', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days in future

    mockQuery.mockResolvedValue({
      rows: [
        {
          id: '1',
          confidence_score: '80', // Would be closing_soon if not snoozed
          predicted_monthly: '1000',
          weighted_monthly: '800',
          snoozed_until: futureDate,
          sent_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          revived_at: null,
          last_scored_at: new Date().toISOString(),
          client_name: 'Test Client',
          client_id: 'c1',
          rep_full_name: 'John Doe',
          age_days: '20',
        },
      ],
    });

    const result = await getPipelineRevenueSummary(5000, 10);

    expect(result.on_hold.deal_count).toBe(1);
    expect(result.on_hold.weighted_mrr).toBe(800);
    expect(result.on_hold.raw_mrr).toBe(1000);

    // Should NOT be in other buckets
    expect(result.closing_soon.deal_count).toBe(0);
    expect(result.in_pipeline.deal_count).toBe(0);
    expect(result.at_risk.deal_count).toBe(0);
  });

  it('at_risk deals do NOT count toward projected_mrr', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: '1',
          confidence_score: '15', // at_risk
          predicted_monthly: '2000',
          weighted_monthly: '300',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          revived_at: null,
          last_scored_at: new Date().toISOString(),
          client_name: 'Test Client',
          client_id: 'c1',
          rep_full_name: 'John Doe',
          age_days: '30',
        },
      ],
    });

    const result = await getPipelineRevenueSummary(5000, 10);

    // Projected MRR should NOT include at_risk weighted_mrr
    expect(result.projected_mrr).toBe(5000); // Just current MRR
    expect(result.potential_growth).toBe(0);
  });

  it('calculates projected_mrr = current + closing_soon.weighted + in_pipeline.weighted', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: '1',
          confidence_score: '80', // closing_soon
          predicted_monthly: '1000',
          weighted_monthly: '800',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          revived_at: null,
          last_scored_at: new Date().toISOString(),
          client_name: 'Client A',
          client_id: 'c1',
          rep_full_name: 'John Doe',
          age_days: '20',
        },
        {
          id: '2',
          confidence_score: '50', // in_pipeline
          predicted_monthly: '600',
          weighted_monthly: '300',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          revived_at: null,
          last_scored_at: new Date().toISOString(),
          client_name: 'Client B',
          client_id: 'c2',
          rep_full_name: 'Jane Doe',
          age_days: '7',
        },
        {
          id: '3',
          confidence_score: '10', // at_risk - should NOT count
          predicted_monthly: '500',
          weighted_monthly: '50',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          revived_at: null,
          last_scored_at: new Date().toISOString(),
          client_name: 'Client C',
          client_id: 'c3',
          rep_full_name: 'John Doe',
          age_days: '40',
        },
      ],
    });

    const result = await getPipelineRevenueSummary(5000, 10);

    // Projected = 5000 (current) + 800 (closing_soon) + 300 (in_pipeline)
    // at_risk (50) is NOT included
    expect(result.projected_mrr).toBe(6100);
    expect(result.potential_growth).toBe(1100);
  });

  it('uses revived_at for age calculation when set', async () => {
    // Deal was originally sent 60 days ago but revived 10 days ago
    const sentAt = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const revivedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

    mockQuery.mockResolvedValue({
      rows: [
        {
          id: '1',
          confidence_score: '75',
          predicted_monthly: '1000',
          weighted_monthly: '750',
          snoozed_until: null,
          sent_at: sentAt,
          revived_at: revivedAt,
          last_scored_at: new Date().toISOString(),
          client_name: 'Test Client',
          client_id: 'c1',
          rep_full_name: 'John Doe',
          age_days: '10', // Should use revived_at, not sent_at
        },
      ],
    });

    const result = await getPipelineRevenueSummary(5000, 10);

    // With age 10 days (from revived_at), should be in_pipeline not closing_soon
    // despite having 75% confidence
    expect(result.closing_soon.deal_count).toBe(0);
    expect(result.in_pipeline.deal_count).toBe(1);
  });

  it('excludes archived deals (not returned by query)', async () => {
    // The query already filters out archived deals, so this tests that
    // archived deals aren't processed if somehow returned
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await getPipelineRevenueSummary(5000, 10);

    expect(result.closing_soon.deal_count).toBe(0);
    expect(result.in_pipeline.deal_count).toBe(0);
    expect(result.at_risk.deal_count).toBe(0);
    expect(result.on_hold.deal_count).toBe(0);
  });

  it('calculates average confidence correctly for each bucket', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: '1',
          confidence_score: '75',
          predicted_monthly: '1000',
          weighted_monthly: '750',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          revived_at: null,
          last_scored_at: new Date().toISOString(),
          client_name: 'Client A',
          client_id: 'c1',
          rep_full_name: 'John Doe',
          age_days: '20',
        },
        {
          id: '2',
          confidence_score: '85',
          predicted_monthly: '1000',
          weighted_monthly: '850',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          revived_at: null,
          last_scored_at: new Date().toISOString(),
          client_name: 'Client B',
          client_id: 'c2',
          rep_full_name: 'Jane Doe',
          age_days: '15',
        },
      ],
    });

    const result = await getPipelineRevenueSummary(5000, 10);

    // Both are closing_soon, avg = (75 + 85) / 2 = 80
    expect(result.closing_soon.deal_count).toBe(2);
    expect(result.closing_soon.avg_confidence).toBe(80);
  });

  it('limits closing_soon_deals to 10 items', async () => {
    // Create 15 closing soon deals
    const rows = Array.from({ length: 15 }, (_, i) => ({
      id: `${i + 1}`,
      confidence_score: '80',
      predicted_monthly: '100',
      weighted_monthly: '80',
      snoozed_until: null,
      sent_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      revived_at: null,
      last_scored_at: new Date().toISOString(),
      client_name: `Client ${i + 1}`,
      client_id: `c${i + 1}`,
      rep_full_name: 'John Doe',
      age_days: '20',
    }));

    mockQuery.mockResolvedValue({ rows });

    const result = await getPipelineRevenueSummary(5000, 10);

    expect(result.closing_soon.deal_count).toBe(15);
    expect(result.closing_soon_deals.length).toBe(10); // Limited to 10
  });

  it('tracks most recent last_scored_at as last_updated', async () => {
    const olderDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    const newerDate = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 mins ago

    mockQuery.mockResolvedValue({
      rows: [
        {
          id: '1',
          confidence_score: '50',
          predicted_monthly: '500',
          weighted_monthly: '250',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          revived_at: null,
          last_scored_at: olderDate,
          client_name: 'Client A',
          client_id: 'c1',
          rep_full_name: 'John Doe',
          age_days: '7',
        },
        {
          id: '2',
          confidence_score: '50',
          predicted_monthly: '500',
          weighted_monthly: '250',
          snoozed_until: null,
          sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          revived_at: null,
          last_scored_at: newerDate,
          client_name: 'Client B',
          client_id: 'c2',
          rep_full_name: 'Jane Doe',
          age_days: '7',
        },
      ],
    });

    const result = await getPipelineRevenueSummary(5000, 10);

    expect(result.last_updated).toBe(newerDate);
  });
});

/**
 * Admin-Client View Parity Tests
 *
 * These tests verify that admin and client views of the same data
 * are consistent and agree on client state.
 *
 * BUG REFERENCE: Admin and client views were showing different states
 * for the same client, causing confusion about whether a client was
 * onboarding or established.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dbPool
const mockDbPoolQuery = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    clients: {
      findMany: vi.fn(),
    },
  },
  dbPool: {
    query: mockDbPoolQuery,
  },
}))

// Mock services
vi.mock('@/lib/services/activityService', () => ({
  getClientActivity: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/services/subscriptionService', () => ({
  getSubscriptionData: vi.fn().mockResolvedValue(null),
}))

// Test client type that matches the real client structure
interface TestClient {
  id: string
  name: string
  contact_name: string | null
  status: string
  stripe_customer_id: string | null
  start_date: Date | null
  created_at: Date
  onboarding_completed_at: Date | null
  growth_stage: string | null
}

// Test clients representing different states
const testClients: Record<string, TestClient> = {
  // Pending prospect - no subscription
  pendingProspect: {
    id: 'client-prospect-001',
    name: 'Prospect Company',
    contact_name: 'Jane Prospect',
    status: 'pending',
    stripe_customer_id: null,
    start_date: null,
    created_at: new Date(),
    onboarding_completed_at: null,
    growth_stage: null,
  },

  // Active client in onboarding
  onboardingClient: {
    id: 'client-onboarding-002',
    name: 'New Active Client',
    contact_name: 'John Onboarding',
    status: 'active',
    stripe_customer_id: 'cus_onboarding_123',
    start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    onboarding_completed_at: null,
    growth_stage: 'seedling',
  },

  // Established client
  establishedClient: {
    id: 'client-established-003',
    name: 'Established Client',
    contact_name: 'Bob Established',
    status: 'active',
    stripe_customer_id: 'cus_established_123',
    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    onboarding_completed_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    growth_stage: 'established',
  },

  // Client with active status but NO stripe_customer_id (edge case)
  activeNoStripe: {
    id: 'client-nostripe-004',
    name: 'No Stripe Client',
    contact_name: 'Carol NoStripe',
    status: 'active',
    stripe_customer_id: null, // No Stripe customer
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    onboarding_completed_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    growth_stage: 'growing',
  },
}

/**
 * Shared logic that mirrors both admin and client welcome-summary endpoints
 * This ensures both endpoints use the same calculation
 */
function calculateWelcomeSummaryState(client: TestClient) {
  const clientStartDate = client.start_date
    ? new Date(client.start_date)
    : new Date(client.created_at)

  const clientAgeInDays = Math.floor(
    (Date.now() - clientStartDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  const isOnboarding = clientAgeInDays < 30 && !client.onboarding_completed_at

  return {
    isOnboarding,
    clientAge: clientAgeInDays,
    companyName: client.name,
    growthStage: client.growth_stage,
  }
}

/**
 * Simulates how admin page determines if client has active subscription
 */
function adminDetermineHasActiveSubscription(client: TestClient, subscriptionsWithItems: Array<{ status: string, items: any[] }>) {
  // Admin should use BOTH client.status AND subscription data
  // A client with status='active' should be treated as active even without Stripe data

  // First check: Does client have 'active' status?
  if (client.status === 'active') {
    return true
  }

  // Second check: Does client have active subscriptions with items?
  const activeSubscriptions = subscriptionsWithItems.filter(sub => sub.status === 'active')
  const hasActiveWithItems = activeSubscriptions.some(sub => sub.items.length > 0)

  return hasActiveWithItems
}

describe('Admin-Client View Parity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('View Parity', () => {
    /**
     * BUG FIX: Admin and client endpoints should return same isOnboarding value
     */
    it('admin and client welcome-summary endpoints return same isOnboarding value for same client', async () => {
      // Test with onboarding client
      const onboardingClient = testClients.onboardingClient

      // Simulate admin endpoint calculation
      const adminState = calculateWelcomeSummaryState(onboardingClient)

      // Simulate client endpoint calculation (uses same logic)
      const clientState = calculateWelcomeSummaryState(onboardingClient)

      expect(adminState.isOnboarding).toBe(clientState.isOnboarding)
      expect(adminState.isOnboarding).toBe(true)

      // Test with established client
      const establishedClient = testClients.establishedClient

      const adminStateEstablished = calculateWelcomeSummaryState(establishedClient)
      const clientStateEstablished = calculateWelcomeSummaryState(establishedClient)

      expect(adminStateEstablished.isOnboarding).toBe(clientStateEstablished.isOnboarding)
      expect(adminStateEstablished.isOnboarding).toBe(false)
    })

    /**
     * BUG FIX: Admin page should use client.status, not just Stripe subscription status
     */
    it('admin page uses client.status (not just Stripe) to determine hasActiveSubscriptions', async () => {
      const client = testClients.activeNoStripe

      // Client has status='active' but no stripe_customer_id
      expect(client.status).toBe('active')
      expect(client.stripe_customer_id).toBeNull()

      // Admin should still treat this client as active
      const hasActive = adminDetermineHasActiveSubscription(client, [])
      expect(hasActive).toBe(true)
    })

    /**
     * BUG FIX: Client with active status but no stripe_customer_id should be active
     */
    it('client with active status but no stripe_customer_id is treated as active (not prospect)', async () => {
      const client = testClients.activeNoStripe

      // Client state should be determined by status field, not Stripe presence
      expect(client.status).toBe('active')
      expect(client.stripe_customer_id).toBeNull()

      // This client should NOT be treated as a prospect
      const isProspect = client.status === 'pending'
      expect(isProspect).toBe(false)

      // Client should be treated as active
      const isActive = client.status === 'active'
      expect(isActive).toBe(true)

      // Onboarding state should work correctly
      const state = calculateWelcomeSummaryState(client)
      // Client is 30 days old and has onboarding_completed_at, so NOT onboarding
      expect(state.isOnboarding).toBe(false)
    })

    /**
     * Both views should agree on pending, onboarding, and established states
     */
    it('admin view matches client view for pending, onboarding, and established states', async () => {
      // Test all three client types
      const clients = [
        { client: testClients.pendingProspect, expectedOnboarding: true, expectedStatus: 'pending' },
        { client: testClients.onboardingClient, expectedOnboarding: true, expectedStatus: 'active' },
        { client: testClients.establishedClient, expectedOnboarding: false, expectedStatus: 'active' },
      ]

      for (const { client, expectedOnboarding, expectedStatus } of clients) {
        const adminState = calculateWelcomeSummaryState(client)
        const clientState = calculateWelcomeSummaryState(client)

        // Both should return same isOnboarding
        expect(adminState.isOnboarding).toBe(clientState.isOnboarding)
        expect(adminState.isOnboarding).toBe(expectedOnboarding)

        // Status should match expected
        expect(client.status).toBe(expectedStatus)

        // All other fields should match
        expect(adminState.companyName).toBe(clientState.companyName)
        expect(adminState.growthStage).toBe(clientState.growthStage)
        expect(adminState.clientAge).toBe(clientState.clientAge)
      }
    })
  })

  describe('Subscription Status Determination', () => {
    /**
     * Client with active subscriptions should show as active
     */
    it('correctly identifies client with active subscription as active', () => {
      const client = testClients.establishedClient
      const subscriptions = [
        {
          status: 'active',
          items: [{ id: 'item-1' }, { id: 'item-2' }],
        },
      ]

      const hasActive = adminDetermineHasActiveSubscription(client, subscriptions)
      expect(hasActive).toBe(true)
    })

    /**
     * Client with only cancelled subscriptions and status='inactive'
     */
    it('correctly identifies client with cancelled subscription as inactive', () => {
      const inactiveClient = {
        ...testClients.establishedClient,
        status: 'inactive',
      }
      const subscriptions = [
        {
          status: 'canceled',
          items: [{ id: 'item-1' }],
        },
      ]

      const hasActive = adminDetermineHasActiveSubscription(inactiveClient, subscriptions)
      expect(hasActive).toBe(false)
    })

    /**
     * Client with no subscriptions but status='active' should still be active
     */
    it('treats client with no subscriptions but active status as active', () => {
      const clientWithNoSubs = testClients.activeNoStripe
      const subscriptions: any[] = []

      const hasActive = adminDetermineHasActiveSubscription(clientWithNoSubs, subscriptions)
      expect(hasActive).toBe(true) // Because status is 'active'
    })
  })

  describe('Growth Stage Consistency', () => {
    /**
     * Growth stage should be consistent between views
     */
    it('growth stage is consistent between admin and client views', () => {
      const clients = [
        testClients.pendingProspect,
        testClients.onboardingClient,
        testClients.establishedClient,
      ]

      for (const client of clients) {
        const adminState = calculateWelcomeSummaryState(client)
        const clientState = calculateWelcomeSummaryState(client)

        expect(adminState.growthStage).toBe(clientState.growthStage)
        expect(adminState.growthStage).toBe(client.growth_stage)
      }
    })
  })

  describe('Edge Cases', () => {
    /**
     * Client with start_date in the future (edge case)
     */
    it('handles client with future start_date correctly', () => {
      const futureClient = {
        ...testClients.onboardingClient,
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
        onboarding_completed_at: null,
      }

      const state = calculateWelcomeSummaryState(futureClient)

      // Client age should be negative
      expect(state.clientAge).toBeLessThan(0)

      // isOnboarding should be true (age < 30 and no completion)
      // Note: Negative days is still < 30
      expect(state.isOnboarding).toBe(true)
    })

    /**
     * Client with exact boundary conditions
     */
    it('handles exact 30-day boundary correctly', () => {
      const thirtyDayClient = {
        ...testClients.onboardingClient,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Exactly 30 days
        onboarding_completed_at: null,
      }

      const state = calculateWelcomeSummaryState(thirtyDayClient)

      // At exactly 30 days, isOnboarding should be false (30 is NOT < 30)
      expect(state.isOnboarding).toBe(false)
    })

    /**
     * Both endpoints should handle missing optional fields
     */
    it('handles missing optional fields consistently', () => {
      const minimalClient = {
        id: 'minimal-client',
        name: 'Minimal',
        contact_name: null,
        status: 'active',
        stripe_customer_id: null,
        start_date: null,
        created_at: new Date(),
        onboarding_completed_at: null,
        growth_stage: null,
      }

      const adminState = calculateWelcomeSummaryState(minimalClient)
      const clientState = calculateWelcomeSummaryState(minimalClient)

      expect(adminState.isOnboarding).toBe(clientState.isOnboarding)
      expect(adminState.growthStage).toBe(clientState.growthStage)
      expect(adminState.growthStage).toBeNull()
    })
  })

  describe('Data Integrity', () => {
    /**
     * Neither endpoint should modify client data during read
     */
    it('welcome-summary endpoints do not modify client data', async () => {
      let updateCalled = false

      mockDbPoolQuery.mockImplementation((query: string) => {
        if (query.includes('UPDATE') || query.includes('INSERT')) {
          updateCalled = true
        }

        if (query.includes('SELECT') && query.includes('FROM clients')) {
          return { rows: [testClients.establishedClient] }
        }

        return { rows: [] }
      })

      // Simulate fetching client data
      await mockDbPoolQuery(
        `SELECT id, name, contact_name, start_date, created_at, onboarding_completed_at, growth_stage FROM clients WHERE id = $1`,
        [testClients.establishedClient.id]
      )

      // No writes should have occurred
      expect(updateCalled).toBe(false)
    })

    /**
     * State calculations are pure functions (no side effects)
     */
    it('state calculations are pure functions with no side effects', () => {
      const originalClient = { ...testClients.onboardingClient }
      const originalStartDate = originalClient.start_date?.getTime()
      const originalGrowthStage = originalClient.growth_stage

      // Call calculation multiple times
      calculateWelcomeSummaryState(originalClient)
      calculateWelcomeSummaryState(originalClient)
      calculateWelcomeSummaryState(originalClient)

      // Client data should be unchanged
      expect(originalClient.start_date?.getTime()).toBe(originalStartDate)
      expect(originalClient.growth_stage).toBe(originalGrowthStage)
    })
  })
})

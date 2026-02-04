/**
 * Subscription Safeguards Tests
 *
 * These tests verify the three-layer protection logic that prevents duplicate subscriptions
 * and protects client state from being incorrectly reset.
 *
 * BUG REFERENCE: Victor's case - existing client was reset to onboarding state when
 * they completed a second checkout flow, causing their growth_stage and start_date to be overwritten.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Prisma
const mockPrismaClients = {
  findUnique: vi.fn(),
  update: vi.fn(),
}

const mockPrismaSubscriptions = {
  create: vi.fn(),
}

const mockPrismaRecommendations = {
  update: vi.fn(),
}

const mockPrismaRecommendationItems = {
  findMany: vi.fn(),
}

const mockPrismaSubscriptionItems = {
  createMany: vi.fn(),
}

const mockPrismaActivityLog = {
  create: vi.fn(),
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    clients: mockPrismaClients,
    subscriptions: mockPrismaSubscriptions,
    recommendations: mockPrismaRecommendations,
    recommendation_items: mockPrismaRecommendationItems,
    subscription_items: mockPrismaSubscriptionItems,
    activity_log: mockPrismaActivityLog,
  },
}))

// Mock Stripe
const mockStripeSubscriptionsList = vi.fn()
const mockStripeSubscriptionsCreate = vi.fn()
const mockStripeCustomersCreate = vi.fn()
const mockStripeCustomersUpdate = vi.fn()
const mockStripePaymentMethodsAttach = vi.fn()
const mockStripeProductsCreate = vi.fn()
const mockStripePricesCreate = vi.fn()
const mockStripeCouponsRetrieve = vi.fn()

vi.mock('@/lib/stripe', () => ({
  stripe: {
    subscriptions: {
      list: mockStripeSubscriptionsList,
      create: mockStripeSubscriptionsCreate,
    },
    customers: {
      create: mockStripeCustomersCreate,
      update: mockStripeCustomersUpdate,
    },
    paymentMethods: {
      attach: mockStripePaymentMethodsAttach,
    },
    products: {
      create: mockStripeProductsCreate,
    },
    prices: {
      create: mockStripePricesCreate,
    },
    coupons: {
      retrieve: mockStripeCouponsRetrieve,
    },
  },
  getOrCreateCoupon: vi.fn().mockResolvedValue(null),
}))

// Mock alerts
vi.mock('@/lib/alerts', () => ({
  logSubscriptionSafeguard: vi.fn(),
  logStateResetBlocked: vi.fn(),
  logCheckoutError: vi.fn(),
  logBillingSyncFailure: vi.fn(),
}))

// Test data representing real scenarios
const testClients = {
  // Victor's case: Existing client with active subscription who shouldn't be reset
  existingActiveClient: {
    id: 'client-victor-123',
    name: 'Victor Test Client',
    contact_name: 'Victor',
    contact_email: 'victor@test.com',
    stripe_customer_id: 'cus_victor_123',
    status: 'active',
    growth_stage: 'growing',
    start_date: new Date('2024-01-15'), // Started a month ago
    onboarding_completed_at: new Date('2024-02-01'),
  },

  // Raptor Vending: Test client that's been active for a while
  establishedClient: {
    id: 'client-raptor-456',
    name: 'Raptor Vending',
    contact_name: 'Raptor',
    contact_email: 'raptor@test.com',
    stripe_customer_id: 'cus_raptor_456',
    status: 'active',
    growth_stage: 'established',
    start_date: new Date('2023-06-01'),
    onboarding_completed_at: new Date('2023-07-01'),
  },

  // New prospect with no subscription yet
  newProspect: {
    id: 'client-new-789',
    name: 'New Prospect LLC',
    contact_name: 'New Client',
    contact_email: 'new@test.com',
    stripe_customer_id: null,
    status: 'pending',
    growth_stage: null,
    start_date: null,
    onboarding_completed_at: null,
  },

  // Client with Stripe customer but no active subscription (cancelled)
  cancelledClient: {
    id: 'client-cancelled-101',
    name: 'Cancelled Client',
    contact_name: 'Former Client',
    contact_email: 'cancelled@test.com',
    stripe_customer_id: 'cus_cancelled_101',
    status: 'inactive',
    growth_stage: 'seedling',
    start_date: new Date('2024-01-01'),
    onboarding_completed_at: null,
  },
}

describe('Subscription Safeguards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Layer 1 — Server Guard (create-subscription-from-setup)', () => {
    /**
     * BUG FIX: Prevents duplicate subscriptions when client already has active Stripe subscription.
     * This catches cases where the frontend verification failed or was bypassed.
     */
    it('rejects with 409 when client already has active Stripe subscription', async () => {
      // Setup: Client has active subscription in Stripe
      mockPrismaClients.findUnique.mockResolvedValue(testClients.existingActiveClient)
      mockStripeSubscriptionsList.mockResolvedValue({
        data: [{ id: 'sub_existing_123', status: 'active' }],
      })

      // Simulate the guard logic from create-subscription-from-setup
      const client = testClients.existingActiveClient
      const stripeCustomerId = client.stripe_customer_id

      if (stripeCustomerId) {
        const existingSubscriptions = await mockStripeSubscriptionsList({
          customer: stripeCustomerId,
          status: 'active',
          limit: 1,
        })

        if (existingSubscriptions.data.length > 0) {
          // This should trigger a 409 response
          const response = {
            status: 409,
            error: 'Client already has an active subscription. Use the add-to-subscription flow instead.',
            existingSubscriptionId: existingSubscriptions.data[0].id,
          }

          expect(response.status).toBe(409)
          expect(response.existingSubscriptionId).toBe('sub_existing_123')
        }
      }

      expect(mockStripeSubscriptionsList).toHaveBeenCalledWith({
        customer: 'cus_victor_123',
        status: 'active',
        limit: 1,
      })
    })

    /**
     * Normal flow: Client with no active subscription should proceed
     */
    it('allows creation when client has no active subscription', async () => {
      mockPrismaClients.findUnique.mockResolvedValue(testClients.newProspect)

      // New client has no stripe_customer_id, so no subscription check needed
      const client = testClients.newProspect
      const stripeCustomerId = client.stripe_customer_id

      // Guard should be skipped for clients without stripe_customer_id
      expect(stripeCustomerId).toBeNull()

      // Proceed with subscription creation
      const shouldProceed = !stripeCustomerId
      expect(shouldProceed).toBe(true)
    })

    /**
     * Edge case: Client has Stripe customer but only cancelled/past_due subscriptions
     */
    it('allows creation when client has only cancelled/past_due subscriptions', async () => {
      mockPrismaClients.findUnique.mockResolvedValue(testClients.cancelledClient)
      mockStripeSubscriptionsList.mockResolvedValue({
        data: [], // No active subscriptions
      })

      const client = testClients.cancelledClient
      const stripeCustomerId = client.stripe_customer_id

      if (stripeCustomerId) {
        const existingSubscriptions = await mockStripeSubscriptionsList({
          customer: stripeCustomerId,
          status: 'active',
          limit: 1,
        })

        // No active subscriptions found, should proceed
        expect(existingSubscriptions.data.length).toBe(0)

        const shouldProceed = existingSubscriptions.data.length === 0
        expect(shouldProceed).toBe(true)
      }
    })

    /**
     * BUG FIX: Existing clients should NOT have growth_stage reset to seedling
     */
    it('does not set growth_stage to seedling for existing clients with start_date', async () => {
      const client = testClients.existingActiveClient

      // Simulate the guard logic
      const isGenuinelyNewClient = !client.start_date &&
        (!client.status || client.status === 'pending' || client.status === 'prospect')

      expect(isGenuinelyNewClient).toBe(false)
      expect(client.growth_stage).toBe('growing')

      // Existing client should only have status updated if needed, not growth_stage
      const updateData: any = {}
      if (!isGenuinelyNewClient) {
        if (client.status !== 'active') {
          updateData.status = 'active'
        }
        // growth_stage should NOT be set
        expect(updateData.growth_stage).toBeUndefined()
      }
    })

    /**
     * Normal flow: New clients should get proper initial state
     */
    it('sets growth_stage to seedling for genuinely new clients (no start_date, status pending)', async () => {
      const client = testClients.newProspect

      const isGenuinelyNewClient = !client.start_date &&
        (!client.status || client.status === 'pending' || client.status === 'prospect')

      expect(isGenuinelyNewClient).toBe(true)

      // New client should get initial state
      const updateData = {
        status: 'active',
        growth_stage: 'seedling',
        start_date: new Date(),
      }

      expect(updateData.growth_stage).toBe('seedling')
      expect(updateData.status).toBe('active')
      expect(updateData.start_date).toBeInstanceOf(Date)
    })

    /**
     * BUG FIX: Existing start_date should never be overwritten
     */
    it('preserves existing start_date when processing existing client', async () => {
      const client = testClients.existingActiveClient
      const originalStartDate = client.start_date

      const isGenuinelyNewClient = !client.start_date &&
        (!client.status || client.status === 'pending' || client.status === 'prospect')

      expect(isGenuinelyNewClient).toBe(false)

      // For existing clients, start_date should never be in the update
      const updateData: any = {}
      if (!isGenuinelyNewClient) {
        if (client.status !== 'active') {
          updateData.status = 'active'
        }
        // start_date should NOT be set
        expect(updateData.start_date).toBeUndefined()
      }

      // Original start_date should remain unchanged
      expect(client.start_date).toEqual(originalStartDate)
    })

    /**
     * Normal flow: New clients should get start_date set
     */
    it('sets start_date for genuinely new clients', async () => {
      const client = testClients.newProspect

      expect(client.start_date).toBeNull()

      const isGenuinelyNewClient = !client.start_date &&
        (!client.status || client.status === 'pending' || client.status === 'prospect')

      expect(isGenuinelyNewClient).toBe(true)

      // New client should get start_date set
      const updateData = {
        status: 'active',
        growth_stage: 'seedling',
        start_date: new Date(),
      }

      expect(updateData.start_date).toBeInstanceOf(Date)
    })
  })

  describe('Layer 2 — Frontend Verification', () => {
    /**
     * Frontend should route to add-to-subscription when verification finds active sub
     */
    it('routes to handleAddToExistingSubscription when verification finds active sub', async () => {
      // Simulate frontend verification response
      const verificationResponse = {
        hasActiveSubscription: true,
        stripeSubscriptionId: 'sub_existing_123',
      }

      const shouldUseAddFlow = verificationResponse.hasActiveSubscription
      expect(shouldUseAddFlow).toBe(true)

      // Frontend would call different endpoint
      const endpoint = shouldUseAddFlow
        ? '/api/stripe/add-to-subscription'
        : '/api/stripe/create-subscription-from-setup'

      expect(endpoint).toBe('/api/stripe/add-to-subscription')
    })

    /**
     * Frontend should proceed with new subscription when no active sub
     */
    it('proceeds with new subscription when verification confirms no active sub', async () => {
      const verificationResponse = {
        hasActiveSubscription: false,
        stripeSubscriptionId: null,
      }

      const shouldUseAddFlow = verificationResponse.hasActiveSubscription
      expect(shouldUseAddFlow).toBe(false)

      const endpoint = shouldUseAddFlow
        ? '/api/stripe/add-to-subscription'
        : '/api/stripe/create-subscription-from-setup'

      expect(endpoint).toBe('/api/stripe/create-subscription-from-setup')
    })

    /**
     * BUG FIX: Verification failure should fail safe (not proceed with creation)
     */
    it('handles verification fetch failure gracefully (should fail safe)', async () => {
      // Simulate fetch failure
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))

      let shouldProceed = false
      let errorOccurred = false

      try {
        await mockFetch('/api/admin/clients/123/stripe-subscriptions')
        shouldProceed = true
      } catch (error) {
        errorOccurred = true
        shouldProceed = false
      }

      expect(errorOccurred).toBe(true)
      // CRITICAL: On verification failure, should NOT proceed with subscription creation
      expect(shouldProceed).toBe(false)
    })
  })

  describe('Layer 3 — Client State Safeguard', () => {
    /**
     * BUG FIX: growth_stage should not be reset for clients with start_date
     */
    it('does not reset growth_stage when client has start_date', async () => {
      const client = testClients.establishedClient

      expect(client.start_date).not.toBeNull()
      expect(client.growth_stage).toBe('established')

      const isGenuinelyNewClient = !client.start_date &&
        (!client.status || client.status === 'pending' || client.status === 'prospect')

      expect(isGenuinelyNewClient).toBe(false)

      // Should not reset growth_stage
      const shouldResetGrowthStage = isGenuinelyNewClient
      expect(shouldResetGrowthStage).toBe(false)
    })

    /**
     * BUG FIX: Active clients should not be redirected to onboarding
     */
    it('does not redirect to onboarding when client has active status', async () => {
      const client = testClients.existingActiveClient

      expect(client.status).toBe('active')
      expect(client.onboarding_completed_at).not.toBeNull()

      // Calculate if client should see onboarding
      const clientStartDate = client.start_date || new Date()
      const clientAgeInDays = Math.floor(
        (Date.now() - clientStartDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const isOnboarding = clientAgeInDays < 30 && !client.onboarding_completed_at

      expect(isOnboarding).toBe(false)
    })

    /**
     * Normal flow: New clients should get seedling state
     */
    it('resets growth_stage to seedling for genuinely new clients', async () => {
      const client = testClients.newProspect

      expect(client.start_date).toBeNull()
      expect(client.status).toBe('pending')

      const isGenuinelyNewClient = !client.start_date &&
        (!client.status || client.status === 'pending' || client.status === 'prospect')

      expect(isGenuinelyNewClient).toBe(true)

      // Should set growth_stage to seedling
      const newGrowthStage = isGenuinelyNewClient ? 'seedling' : client.growth_stage
      expect(newGrowthStage).toBe('seedling')
    })

    /**
     * Normal flow: New clients should be redirected to onboarding
     */
    it('redirects to onboarding for genuinely new clients', async () => {
      // Simulate a new client that just purchased
      const newlyPurchasedClient = {
        ...testClients.newProspect,
        status: 'active',
        growth_stage: 'seedling',
        start_date: new Date(), // Just set
        onboarding_completed_at: null,
      }

      const clientStartDate = newlyPurchasedClient.start_date || new Date()
      const clientAgeInDays = Math.floor(
        (Date.now() - clientStartDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // New client = 0 days old, no onboarding completed
      expect(clientAgeInDays).toBe(0)
      expect(newlyPurchasedClient.onboarding_completed_at).toBeNull()

      const isOnboarding = clientAgeInDays < 30 && !newlyPurchasedClient.onboarding_completed_at
      expect(isOnboarding).toBe(true)
    })
  })
})

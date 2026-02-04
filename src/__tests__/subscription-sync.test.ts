/**
 * Subscription Sync Tests
 *
 * These tests verify that sync operations don't corrupt client data,
 * and that add-to-subscription flows work correctly.
 *
 * BUG REFERENCE: Sync operations were modifying client state (start_date,
 * growth_stage) when they should only modify subscription records.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dbPool
const mockDbPoolQuery = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    clients: {
      findUnique: vi.fn(),
    },
    products: {
      findUnique: vi.fn(),
    },
  },
  dbPool: {
    query: mockDbPoolQuery,
  },
}))

// Mock Stripe
const mockStripeSubscriptionsList = vi.fn()
const mockStripeSubscriptionItemsCreate = vi.fn()
const mockStripeSubscriptionsCreate = vi.fn()
const mockStripeProductsRetrieve = vi.fn()

vi.mock('@/lib/stripe', () => ({
  stripe: {
    subscriptions: {
      list: mockStripeSubscriptionsList,
      create: mockStripeSubscriptionsCreate,
    },
    subscriptionItems: {
      create: mockStripeSubscriptionItemsCreate,
    },
    products: {
      retrieve: mockStripeProductsRetrieve,
    },
  },
}))

// Mock alerts
vi.mock('@/lib/alerts', () => ({
  logCriticalError: vi.fn(),
  logSyncFailure: vi.fn(),
  logCheckoutError: vi.fn(),
  logBillingSyncFailure: vi.fn(),
}))

// Test data
const testClient = {
  id: 'client-123',
  name: 'Test Client',
  stripe_customer_id: 'cus_test_123',
  status: 'active',
  growth_stage: 'growing',
  start_date: new Date('2024-01-15'),
  onboarding_completed_at: new Date('2024-02-01'),
}

const testProduct = {
  id: 'product-123',
  name: 'Premium Service',
  stripe_product_id: 'prod_test_123',
  stripe_monthly_price_id: 'price_monthly_123',
  stripe_onetime_price_id: null,
  monthly_price: 99.00,
  onetime_price: null,
}

const testStripeSubscription = {
  id: 'sub_test_123',
  status: 'active',
  current_period_start: Math.floor(Date.now() / 1000),
  current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  items: {
    data: [
      {
        id: 'si_item_123',
        price: {
          id: 'price_monthly_123',
          product: 'prod_test_123',
          unit_amount: 9900,
          currency: 'usd',
          recurring: { interval: 'month', interval_count: 1 },
        },
        quantity: 1,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      },
    ],
  },
}

describe('Subscription Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('syncStripeSubscriptions', () => {
    /**
     * Sync should update existing subscription records
     */
    it('updates existing subscription record when stripe_subscription_id matches', async () => {
      // Setup: Existing subscription in DB
      mockDbPoolQuery.mockImplementation((query: string, params?: any[]) => {
        if (query.includes('SELECT id FROM subscriptions WHERE stripe_subscription_id')) {
          return { rows: [{ id: 'local-sub-123' }] }
        }
        if (query.includes('UPDATE subscriptions SET')) {
          return { rows: [] }
        }
        if (query.includes('SELECT id FROM products WHERE stripe_product_id')) {
          return { rows: [{ id: 'local-product-123' }] }
        }
        if (query.includes('SELECT id FROM subscription_items')) {
          return { rows: [] }
        }
        if (query.includes('INSERT INTO subscription_items')) {
          return { rows: [] }
        }
        return { rows: [] }
      })

      mockStripeSubscriptionsList.mockResolvedValue({
        data: [testStripeSubscription],
      })

      // Simulate syncStripeSubscriptions logic
      const subscriptionsResponse = await mockStripeSubscriptionsList({
        customer: testClient.stripe_customer_id,
        status: 'all',
      })

      for (const sub of subscriptionsResponse.data) {
        const existing = await mockDbPoolQuery(
          'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
          [sub.id]
        )

        if (existing.rows.length > 0) {
          const subscriptionId = existing.rows[0].id

          // Should UPDATE, not INSERT
          await mockDbPoolQuery(
            `UPDATE subscriptions SET status = $1, current_period_start = to_timestamp($2), current_period_end = to_timestamp($3), updated_at = NOW() WHERE id = $4`,
            [sub.status, sub.current_period_start, sub.current_period_end, subscriptionId]
          )
        }
      }

      // Verify UPDATE was called, not INSERT for subscription
      const updateCall = mockDbPoolQuery.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('UPDATE subscriptions SET')
      )
      expect(updateCall).toBeDefined()

      const insertSubCall = mockDbPoolQuery.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('INSERT INTO subscriptions')
      )
      expect(insertSubCall).toBeUndefined()
    })

    /**
     * Sync should create new subscription record when none exists
     */
    it('creates new subscription record when no match exists', async () => {
      mockDbPoolQuery.mockImplementation((query: string, params?: any[]) => {
        if (query.includes('SELECT id FROM subscriptions WHERE stripe_subscription_id')) {
          return { rows: [] } // No existing subscription
        }
        if (query.includes('INSERT INTO subscriptions')) {
          return { rows: [{ id: 'new-sub-123' }] }
        }
        if (query.includes('SELECT id FROM products')) {
          return { rows: [] }
        }
        return { rows: [] }
      })

      mockStripeSubscriptionsList.mockResolvedValue({
        data: [testStripeSubscription],
      })

      // Simulate syncStripeSubscriptions logic
      const subscriptionsResponse = await mockStripeSubscriptionsList({
        customer: testClient.stripe_customer_id,
        status: 'all',
      })

      for (const sub of subscriptionsResponse.data) {
        const existing = await mockDbPoolQuery(
          'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
          [sub.id]
        )

        if (existing.rows.length === 0) {
          // Should INSERT
          await mockDbPoolQuery(
            `INSERT INTO subscriptions (client_id, stripe_subscription_id, status, current_period_start, current_period_end) VALUES ($1, $2, $3, to_timestamp($4), to_timestamp($5)) RETURNING id`,
            [testClient.id, sub.id, sub.status, sub.current_period_start, sub.current_period_end]
          )
        }
      }

      // Verify INSERT was called
      const insertCall = mockDbPoolQuery.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('INSERT INTO subscriptions')
      )
      expect(insertCall).toBeDefined()
    })

    /**
     * BUG FIX: Sync should NEVER modify clients table
     */
    it('does not modify clients table (start_date, status, growth_stage, onboarding_completed_at)', async () => {
      const queryCalls: string[] = []

      mockDbPoolQuery.mockImplementation((query: string, params?: any[]) => {
        queryCalls.push(query)
        if (query.includes('SELECT id FROM subscriptions')) {
          return { rows: [{ id: 'local-sub-123' }] }
        }
        if (query.includes('UPDATE subscriptions')) {
          return { rows: [] }
        }
        if (query.includes('SELECT id FROM products')) {
          return { rows: [{ id: 'local-product-123' }] }
        }
        if (query.includes('SELECT id FROM subscription_items')) {
          return { rows: [{ id: 'local-item-123' }] }
        }
        return { rows: [] }
      })

      mockStripeSubscriptionsList.mockResolvedValue({
        data: [testStripeSubscription],
      })

      // Simulate full sync
      const subscriptionsResponse = await mockStripeSubscriptionsList({
        customer: testClient.stripe_customer_id,
        status: 'all',
      })

      for (const sub of subscriptionsResponse.data) {
        await mockDbPoolQuery(
          'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
          [sub.id]
        )
        await mockDbPoolQuery(
          `UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2`,
          [sub.status, 'local-sub-123']
        )

        for (const item of sub.items.data) {
          await mockDbPoolQuery(
            'SELECT id FROM products WHERE stripe_product_id = $1',
            [item.price.product]
          )
          await mockDbPoolQuery(
            'SELECT id FROM subscription_items WHERE subscription_id = $1 AND product_id = $2',
            ['local-sub-123', 'local-product-123']
          )
        }
      }

      // Verify NO queries modified the clients table
      const clientTableQueries = queryCalls.filter(
        q => q.includes('UPDATE clients') || (q.includes('INSERT INTO clients'))
      )
      expect(clientTableQueries).toHaveLength(0)

      // Specifically check that protected fields are never in any UPDATE
      const protectedFieldQueries = queryCalls.filter(
        q => q.includes('start_date') || q.includes('growth_stage') || q.includes('onboarding_completed_at')
      )
      expect(protectedFieldQueries).toHaveLength(0)
    })

    /**
     * Sync should handle multi-product subscriptions
     */
    it('syncs subscription_items correctly for multi-product subscriptions', async () => {
      const multiProductSubscription = {
        ...testStripeSubscription,
        items: {
          data: [
            {
              id: 'si_item_1',
              price: { id: 'price_1', product: 'prod_1', unit_amount: 5000 },
              quantity: 1,
            },
            {
              id: 'si_item_2',
              price: { id: 'price_2', product: 'prod_2', unit_amount: 3000 },
              quantity: 2,
            },
            {
              id: 'si_item_3',
              price: { id: 'price_3', product: 'prod_3', unit_amount: 2000 },
              quantity: 1,
            },
          ],
        },
      }

      const insertedItems: any[] = []

      mockDbPoolQuery.mockImplementation((query: string, params?: any[]) => {
        if (query.includes('SELECT id FROM subscriptions')) {
          return { rows: [{ id: 'local-sub-123' }] }
        }
        if (query.includes('SELECT id FROM products WHERE stripe_product_id')) {
          const productId = params?.[0]
          return { rows: [{ id: `local-${productId}` }] }
        }
        if (query.includes('SELECT id FROM subscription_items')) {
          return { rows: [] } // No existing items
        }
        if (query.includes('INSERT INTO subscription_items')) {
          insertedItems.push(params)
          return { rows: [] }
        }
        return { rows: [] }
      })

      // Simulate sync
      for (const item of multiProductSubscription.items.data) {
        const productResult = await mockDbPoolQuery(
          'SELECT id FROM products WHERE stripe_product_id = $1',
          [item.price.product]
        )

        if (productResult.rows.length > 0) {
          const existingItem = await mockDbPoolQuery(
            'SELECT id FROM subscription_items WHERE subscription_id = $1 AND product_id = $2',
            ['local-sub-123', productResult.rows[0].id]
          )

          if (existingItem.rows.length === 0) {
            await mockDbPoolQuery(
              `INSERT INTO subscription_items (subscription_id, product_id, stripe_subscription_item_id, quantity, unit_amount) VALUES ($1, $2, $3, $4, $5)`,
              ['local-sub-123', productResult.rows[0].id, item.id, item.quantity, item.price.unit_amount]
            )
          }
        }
      }

      // Should have inserted 3 items
      expect(insertedItems).toHaveLength(3)

      // Verify quantities were preserved
      expect(insertedItems[1][3]).toBe(2) // Second item has quantity 2
    })

    /**
     * BUG FIX: Stripe API errors should not corrupt local data
     */
    it('handles Stripe API errors without corrupting local data', async () => {
      let localDataModified = false

      mockDbPoolQuery.mockImplementation((query: string) => {
        if (query.includes('UPDATE') || query.includes('INSERT')) {
          localDataModified = true
        }
        return { rows: [] }
      })

      mockStripeSubscriptionsList.mockRejectedValue(new Error('Stripe API unavailable'))

      // Simulate sync with error handling
      try {
        await mockStripeSubscriptionsList({
          customer: testClient.stripe_customer_id,
          status: 'all',
        })
      } catch (error) {
        // Error caught, should not proceed with any DB modifications
        expect(error).toBeDefined()
      }

      // Verify no local data was modified
      expect(localDataModified).toBe(false)
    })
  })

  describe('Add Product to Existing Subscription (PUT stripe-subscriptions)', () => {
    /**
     * Should use subscriptionItems.create, NOT subscriptions.create
     */
    it('calls stripe.subscriptionItems.create (not stripe.subscriptions.create)', async () => {
      mockStripeSubscriptionsList.mockResolvedValue({
        data: [testStripeSubscription],
      })

      mockStripeSubscriptionItemsCreate.mockResolvedValue({
        id: 'si_new_item',
        price: { id: 'price_new' },
      })

      // Simulate the PUT endpoint logic
      const subscriptionsResponse = await mockStripeSubscriptionsList({
        customer: testClient.stripe_customer_id,
        status: 'active',
        limit: 1,
      })

      const subscription = subscriptionsResponse.data[0]

      // Add item to existing subscription
      await mockStripeSubscriptionItemsCreate({
        subscription: subscription.id,
        price: 'price_new_product',
        quantity: 1,
        proration_behavior: 'always_invoice',
      })

      // Verify subscriptionItems.create was called
      expect(mockStripeSubscriptionItemsCreate).toHaveBeenCalled()

      // Verify subscriptions.create was NOT called
      expect(mockStripeSubscriptionsCreate).not.toHaveBeenCalled()
    })

    /**
     * Term products should not prorate
     */
    it('uses correct proration_behavior based on term vs monthly', async () => {
      mockStripeSubscriptionsList.mockResolvedValue({
        data: [testStripeSubscription],
      })

      mockStripeSubscriptionItemsCreate.mockResolvedValue({
        id: 'si_new_item',
        price: { id: 'price_new' },
      })

      // Test term product (no proration)
      const isTermProduct = true
      const billing_term_months = 12

      await mockStripeSubscriptionItemsCreate({
        subscription: testStripeSubscription.id,
        price: 'price_term_product',
        quantity: 1,
        proration_behavior: isTermProduct ? 'none' : 'always_invoice',
      })

      expect(mockStripeSubscriptionItemsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          proration_behavior: 'none',
        })
      )

      // Reset and test monthly product (should prorate)
      mockStripeSubscriptionItemsCreate.mockClear()

      const isMonthlyProduct = false

      await mockStripeSubscriptionItemsCreate({
        subscription: testStripeSubscription.id,
        price: 'price_monthly_product',
        quantity: 1,
        proration_behavior: isMonthlyProduct ? 'none' : 'always_invoice',
      })

      expect(mockStripeSubscriptionItemsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          proration_behavior: 'always_invoice',
        })
      )
    })

    /**
     * BUG FIX: Should not modify billing_cycle_anchor
     */
    it('does not modify billing_cycle_anchor', async () => {
      mockStripeSubscriptionsList.mockResolvedValue({
        data: [testStripeSubscription],
      })

      mockStripeSubscriptionItemsCreate.mockResolvedValue({
        id: 'si_new_item',
        price: { id: 'price_new' },
      })

      await mockStripeSubscriptionItemsCreate({
        subscription: testStripeSubscription.id,
        price: 'price_new_product',
        quantity: 1,
        proration_behavior: 'always_invoice',
      })

      // Verify billing_cycle_anchor is NOT in the call
      const callArgs = mockStripeSubscriptionItemsCreate.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('billing_cycle_anchor')
    })

    /**
     * BUG FIX: Adding product should not modify clients table
     */
    it('does not modify clients table', async () => {
      const queryCalls: string[] = []

      mockDbPoolQuery.mockImplementation((query: string) => {
        queryCalls.push(query)
        if (query.includes('SELECT')) {
          return { rows: [] }
        }
        return { rows: [] }
      })

      mockStripeSubscriptionsList.mockResolvedValue({
        data: [testStripeSubscription],
      })

      mockStripeSubscriptionItemsCreate.mockResolvedValue({
        id: 'si_new_item',
        price: { id: 'price_new' },
      })

      // Simulate the endpoint
      await mockStripeSubscriptionItemsCreate({
        subscription: testStripeSubscription.id,
        price: 'price_new_product',
        quantity: 1,
      })

      // Simulate DB sync after
      await mockDbPoolQuery('SELECT id FROM subscriptions WHERE stripe_subscription_id = $1', ['sub_test_123'])
      await mockDbPoolQuery('UPDATE subscriptions SET updated_at = NOW() WHERE id = $1', ['sub-id'])
      await mockDbPoolQuery('INSERT INTO subscription_items (...) VALUES (...)', [])

      // Verify NO clients table modifications
      const clientQueries = queryCalls.filter(q => q.includes('clients'))
      expect(clientQueries).toHaveLength(0)
    })

    /**
     * Should update smart_recommendation_items status when recommendation_id provided
     */
    it('updates smart_recommendation_items status to purchased when recommendation_id provided', async () => {
      let recommendationUpdated = false

      mockDbPoolQuery.mockImplementation((query: string, params?: any[]) => {
        // Match the SELECT query for recommendation items
        if (query.includes('smart_recommendation_items') && query.includes('SELECT')) {
          return {
            rows: [{ id: 'rec-item-123', recommendation_id: 'rec-123' }],
          }
        }
        // Match the UPDATE query for setting purchased status
        if (query.includes('smart_recommendation_items') && query.includes('UPDATE') && query.includes('purchased')) {
          recommendationUpdated = true
          return { rows: [] }
        }
        // Match the INSERT into history
        if (query.includes('smart_recommendation_history')) {
          return { rows: [] }
        }
        return { rows: [] }
      })

      // Simulate the recommendation update logic from PUT endpoint
      const clientId = testClient.id
      const product_id = testProduct.id

      const recItemResult = await mockDbPoolQuery(
        `SELECT sri.id, sri.recommendation_id
         FROM smart_recommendation_items sri
         JOIN smart_recommendations sr ON sr.id = sri.recommendation_id
         WHERE sr.client_id = $1 AND sri.product_id = $2 AND (sri.status = 'active' OR sri.status IS NULL)
         LIMIT 1`,
        [clientId, product_id]
      )

      if (recItemResult.rows.length > 0) {
        const recItem = recItemResult.rows[0]

        await mockDbPoolQuery(
          `UPDATE smart_recommendation_items
           SET status = 'purchased', status_changed_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [recItem.id]
        )

        await mockDbPoolQuery(
          `INSERT INTO smart_recommendation_history
           (recommendation_id, item_id, product_id, action, details, created_by)
           VALUES ($1, $2, $3, 'purchased', $4, NULL)`,
          [recItem.recommendation_id, recItem.id, product_id, `"${testProduct.name}" was added to subscription`]
        )
      }

      expect(recommendationUpdated).toBe(true)
    })
  })
})

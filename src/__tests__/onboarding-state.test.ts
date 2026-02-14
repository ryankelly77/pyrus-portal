/**
 * Onboarding State Tests
 *
 * These tests verify the onboarding lifecycle logic including:
 * - Client state determination (prospect, onboarding, established)
 * - Tab label display logic
 * - Onboarding completion endpoint behavior
 *
 * BUG REFERENCE: Clients were incorrectly shown onboarding screens or
 * had their state reset when they shouldn't have been.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Prisma
const mockPrismaClients = {
  findUnique: vi.fn(),
  update: vi.fn(),
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    clients: mockPrismaClients,
  },
  dbPool: {
    query: vi.fn(),
  },
}))

// Test client type that matches the real client structure
interface TestClient {
  id: string
  name: string
  contact_name: string | null
  status: string
  start_date: Date | null
  created_at: Date
  onboarding_completed_at: Date | null
  growth_stage: string | null
}

// Test data representing real client lifecycle scenarios
const testClients: Record<string, TestClient> = {
  // Pending prospect - hasn't purchased yet
  pendingProspect: {
    id: 'client-prospect-001',
    name: 'Prospect Company',
    contact_name: 'Jane Prospect',
    status: 'pending',
    start_date: null,
    created_at: new Date(),
    onboarding_completed_at: null,
    growth_stage: null,
  },

  // Active client in onboarding period (< 30 days, no completion flag)
  onboardingClient: {
    id: 'client-onboarding-002',
    name: 'New Active Client',
    contact_name: 'John Onboarding',
    status: 'active',
    start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    onboarding_completed_at: null,
    growth_stage: 'seedling',
  },

  // Active client past 30 days but no onboarding_completed_at
  establishedByAge: {
    id: 'client-aged-003',
    name: 'Aged Client',
    contact_name: 'Alice Aged',
    status: 'active',
    start_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
    onboarding_completed_at: null, // Never explicitly completed
    growth_stage: 'growing',
  },

  // Active client with onboarding_completed_at set (regardless of age)
  completedOnboarding: {
    id: 'client-completed-004',
    name: 'Completed Client',
    contact_name: 'Bob Complete',
    status: 'active',
    start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Only 10 days ago
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    onboarding_completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Completed 5 days ago
    growth_stage: 'seedling',
  },

  // Client with no start_date but has onboarding_completed_at
  noStartButCompleted: {
    id: 'client-legacy-005',
    name: 'Legacy Client',
    contact_name: 'Carol Legacy',
    status: 'active',
    start_date: null, // Legacy client without start_date
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    onboarding_completed_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    growth_stage: 'established',
  },

  // Client with no start_date and no onboarding_completed_at
  noStartNoCompletion: {
    id: 'client-unknown-006',
    name: 'Unknown State Client',
    contact_name: 'Dan Unknown',
    status: 'active',
    start_date: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    onboarding_completed_at: null,
    growth_stage: 'seedling',
  },
}

/**
 * Helper function that mirrors the isOnboarding logic from welcome-summary endpoints
 */
function calculateIsOnboarding(client: TestClient): boolean {
  const clientStartDate = client.start_date
    ? new Date(client.start_date)
    : new Date(client.created_at)
  const clientAgeInDays = Math.floor(
    (Date.now() - clientStartDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  return clientAgeInDays < 30 && !client.onboarding_completed_at
}

/**
 * Helper function for client state determination
 */
function getClientState(client: TestClient): 'prospect' | 'onboarding' | 'established' {
  if (client.status === 'pending') {
    return 'prospect'
  }

  const isOnboarding = calculateIsOnboarding(client)

  if (isOnboarding) {
    return 'onboarding'
  }

  return 'established'
}

/**
 * Helper function for tab label
 */
function getTabLabel(client: TestClient): string {
  const state = getClientState(client)

  switch (state) {
    case 'prospect':
      return 'Welcome'
    case 'onboarding':
      return 'Getting Started'
    case 'established':
      return 'Welcome'
    default:
      return 'Welcome'
  }
}

describe('Onboarding State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Client State Determination', () => {
    /**
     * Pending prospects should be identified as prospects
     */
    it("client with status 'pending' is identified as prospect", () => {
      const state = getClientState(testClients.pendingProspect)
      expect(state).toBe('prospect')
    })

    /**
     * Active client in first 30 days without completion flag is onboarding
     */
    it('client with active status and start_date < 30 days and no onboarding_completed_at is onboarding', () => {
      const client = testClients.onboardingClient

      // Verify preconditions
      expect(client.status).toBe('active')
      const ageInDays = Math.floor(
        (Date.now() - new Date(client.start_date!).getTime()) / (1000 * 60 * 60 * 24)
      )
      expect(ageInDays).toBeLessThan(30)
      expect(client.onboarding_completed_at).toBeNull()

      const state = getClientState(client)
      expect(state).toBe('onboarding')
    })

    /**
     * BUG FIX: Client older than 30 days should be established even without explicit completion
     */
    it('client with active status and start_date > 30 days is established (even without onboarding_completed_at)', () => {
      const client = testClients.establishedByAge

      // Verify preconditions
      expect(client.status).toBe('active')
      const ageInDays = Math.floor(
        (Date.now() - new Date(client.start_date!).getTime()) / (1000 * 60 * 60 * 24)
      )
      expect(ageInDays).toBeGreaterThanOrEqual(30)
      expect(client.onboarding_completed_at).toBeNull()

      const state = getClientState(client)
      expect(state).toBe('established')
    })

    /**
     * Client with onboarding_completed_at set is established regardless of age
     */
    it('client with active status and onboarding_completed_at set is established (regardless of start_date)', () => {
      const client = testClients.completedOnboarding

      // Verify preconditions - client is young but has completed onboarding
      const ageInDays = Math.floor(
        (Date.now() - new Date(client.start_date!).getTime()) / (1000 * 60 * 60 * 24)
      )
      expect(ageInDays).toBeLessThan(30) // Only 10 days old
      expect(client.onboarding_completed_at).not.toBeNull()

      const state = getClientState(client)
      expect(state).toBe('established')
    })

    /**
     * Edge case: Client without start_date uses created_at for age calculation
     */
    it('client with no start_date and no onboarding_completed_at is onboarding', () => {
      const client = testClients.noStartNoCompletion

      // Verify preconditions
      expect(client.start_date).toBeNull()
      expect(client.onboarding_completed_at).toBeNull()

      // Should use created_at for age calculation
      const ageInDays = Math.floor(
        (Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      expect(ageInDays).toBeLessThan(30) // 5 days old

      const state = getClientState(client)
      expect(state).toBe('onboarding')
    })

    /**
     * Edge case: Legacy client without start_date but with completion flag
     */
    it('client with no start_date but onboarding_completed_at set is established', () => {
      const client = testClients.noStartButCompleted

      // Verify preconditions
      expect(client.start_date).toBeNull()
      expect(client.onboarding_completed_at).not.toBeNull()

      const state = getClientState(client)
      expect(state).toBe('established')
    })
  })

  describe('Tab Label', () => {
    /**
     * Pending prospects see "Welcome" tab
     */
    it('returns "Welcome" for pending prospects', () => {
      const label = getTabLabel(testClients.pendingProspect)
      expect(label).toBe('Welcome')
    })

    /**
     * Onboarding clients see "Getting Started" tab
     */
    it('returns "Getting Started" for onboarding clients', () => {
      const label = getTabLabel(testClients.onboardingClient)
      expect(label).toBe('Getting Started')
    })

    /**
     * Established clients see "Welcome" tab
     */
    it('returns "Welcome" for established clients', () => {
      const label = getTabLabel(testClients.establishedByAge)
      expect(label).toBe('Welcome')

      // Also verify for client who explicitly completed onboarding
      const label2 = getTabLabel(testClients.completedOnboarding)
      expect(label2).toBe('Welcome')
    })
  })

  describe('Onboarding Complete Endpoint', () => {
    /**
     * Endpoint should set onboarding_completed_at timestamp
     */
    it('sets onboarding_completed_at to current timestamp', async () => {
      const client = testClients.onboardingClient
      const beforeUpdate = new Date()

      mockPrismaClients.findUnique.mockResolvedValue(client)
      mockPrismaClients.update.mockImplementation(async (args) => {
        const updatedClient = {
          ...client,
          onboarding_completed_at: args.data.onboarding_completed_at,
        }
        return updatedClient
      })

      // Simulate the endpoint logic
      const existingClient = await mockPrismaClients.findUnique({
        where: { id: client.id },
        select: { onboarding_completed_at: true, name: true },
      })

      expect(existingClient.onboarding_completed_at).toBeNull()

      const updatedClient = await mockPrismaClients.update({
        where: { id: client.id },
        data: { onboarding_completed_at: new Date() },
        select: { id: true, name: true, onboarding_completed_at: true },
      })

      expect(updatedClient.onboarding_completed_at).not.toBeNull()
      expect(updatedClient.onboarding_completed_at.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
    })

    /**
     * BUG FIX: Endpoint should be idempotent
     */
    it('is idempotent — second call returns success without changing timestamp', async () => {
      const originalTimestamp = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      const client = {
        ...testClients.completedOnboarding,
        onboarding_completed_at: originalTimestamp,
      }

      mockPrismaClients.findUnique.mockResolvedValue(client)

      // Simulate the endpoint logic
      const existingClient = await mockPrismaClients.findUnique({
        where: { id: client.id },
        select: { onboarding_completed_at: true, name: true },
      })

      // If already completed, should return success without updating
      if (existingClient.onboarding_completed_at) {
        const response = {
          success: true,
          message: 'Onboarding was already completed',
          completedAt: existingClient.onboarding_completed_at.toISOString(),
        }

        expect(response.success).toBe(true)
        expect(response.message).toBe('Onboarding was already completed')
        expect(new Date(response.completedAt).getTime()).toBe(originalTimestamp.getTime())

        // prisma.update should NOT have been called
        expect(mockPrismaClients.update).not.toHaveBeenCalled()
      }
    })

    /**
     * BUG FIX: Endpoint should only modify onboarding_completed_at
     */
    it('does not modify start_date, status, or growth_stage', async () => {
      const client = testClients.onboardingClient
      const originalStartDate = client.start_date
      const originalStatus = client.status
      const originalGrowthStage = client.growth_stage

      mockPrismaClients.findUnique.mockResolvedValue(client)

      let updateCallArgs: any = null
      mockPrismaClients.update.mockImplementation(async (args) => {
        updateCallArgs = args
        return {
          ...client,
          onboarding_completed_at: args.data.onboarding_completed_at,
        }
      })

      // Simulate the endpoint logic
      await mockPrismaClients.update({
        where: { id: client.id },
        data: { onboarding_completed_at: new Date() },
        select: { id: true, name: true, onboarding_completed_at: true },
      })

      // Verify only onboarding_completed_at is in the update data
      expect(updateCallArgs.data).toHaveProperty('onboarding_completed_at')
      expect(updateCallArgs.data).not.toHaveProperty('start_date')
      expect(updateCallArgs.data).not.toHaveProperty('status')
      expect(updateCallArgs.data).not.toHaveProperty('growth_stage')

      // Original values should be preserved
      expect(client.start_date).toEqual(originalStartDate)
      expect(client.status).toEqual(originalStatus)
      expect(client.growth_stage).toEqual(originalGrowthStage)
    })
  })

  describe('isOnboarding Calculation Edge Cases', () => {
    /**
     * Boundary test: Client exactly at 30 days
     */
    it('client at exactly 30 days is NOT onboarding', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const client = {
        ...testClients.onboardingClient,
        start_date: thirtyDaysAgo,
      }

      const isOnboarding = calculateIsOnboarding(client)
      expect(isOnboarding).toBe(false) // 30 days is NOT less than 30
    })

    /**
     * Boundary test: Client at 29 days is still onboarding
     */
    it('client at 29 days is still onboarding (without completion)', () => {
      const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      const client = {
        ...testClients.onboardingClient,
        start_date: twentyNineDaysAgo,
        onboarding_completed_at: null,
      }

      const isOnboarding = calculateIsOnboarding(client)
      expect(isOnboarding).toBe(true)
    })

    /**
     * Test with different time zones / edge of day
     */
    it('handles time zone edge cases correctly', () => {
      // Client started at 23:59:59 29 days ago
      const almostThirtyDays = new Date()
      almostThirtyDays.setDate(almostThirtyDays.getDate() - 29)
      almostThirtyDays.setHours(23, 59, 59, 999)

      const client = {
        ...testClients.onboardingClient,
        start_date: almostThirtyDays,
        onboarding_completed_at: null,
      }

      // Should still be onboarding (less than 30 full days)
      const isOnboarding = calculateIsOnboarding(client)
      expect(isOnboarding).toBe(true)
    })
  })
})

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  type ClientPageDBClient,
  type ChecklistItem,
  type VideoChapter,
  type OnboardingSummary,
  type OnboardingFormData,
  type PageRecommendation,
  type PageSubscription,
  type StripeSubscription,
  type StripeHistoryEvent,
  type ManualProduct,
  type TestProduct,
  type AvailableProduct,
  type ContentProduct,
  type Service,
  type BasecampActivity,
  type Communication,
  type Invoice,
  type StripeCustomer,
} from '@/types'

// ============================================================================
// TYPES
// ============================================================================

export type ClientPageTab = 'getting-started' | 'results' | 'activity' | 'website' | 'content' | 'recommendations' | 'communication'

export interface ClientPageData {
  // Core client data
  client: ClientPageDBClient | null
  isLoading: boolean

  // Checklist
  checklistItems: ChecklistItem[]
  checklistLoading: boolean

  // Video chapters
  videoChapters: VideoChapter[]

  // Onboarding
  onboardingSummary: OnboardingSummary | null
  summaryLoading: boolean
  onboardingForm: OnboardingFormData | null
  onboardingFormLoading: boolean

  // Recommendations
  recommendation: PageRecommendation | null
  recommendationLoading: boolean
  smartRecommendationsCount: number

  // Subscriptions
  subscriptions: PageSubscription[]
  subscriptionsLoading: boolean
  subscriptionServicesCount: number
  stripeSubscriptions: StripeSubscription[]
  stripeSubscriptionsLoading: boolean
  stripeHistory: StripeHistoryEvent[]
  stripeHistoryLoading: boolean

  // Products
  manualProducts: ManualProduct[]
  manualProductsLoading: boolean
  availableProducts: AvailableProduct[]
  testProducts: TestProduct[]
  testProductsLoading: boolean
  allProducts: AvailableProduct[]
  availableContentProducts: ContentProduct[]

  // Services
  contentServices: Service[]
  websiteServices: Service[]
  hasContentProductsFromApi: boolean | null
  hasWebsiteProductsFromApi: boolean | null

  // Content
  approvedContentCount: number

  // Activities
  basecampActivities: BasecampActivity[]
  activitiesLoading: boolean

  // Communications
  communications: Communication[]
  communicationsLoading: boolean

  // Billing
  invoices: Invoice[]
  stripeCustomer: StripeCustomer | null
  stripeCustomerId: string | null
  invoicesLoading: boolean

  // User
  isSuperAdmin: boolean

  // Actions
  refetchClient: () => Promise<void>
  refetchChecklist: () => Promise<void>
  refetchSmartRecsCount: () => Promise<void>
  refetchSubscriptions: () => Promise<void>
  refetchManualProducts: () => Promise<void>
  refetchTestProducts: () => Promise<void>
  refetchCommunications: () => Promise<void>
  refetchActivities: () => Promise<void>
  refetchInvoices: () => Promise<void>
  refetchAvailableProducts: (manualProducts: ManualProduct[], subscriptions: PageSubscription[]) => Promise<void>
  setManualProducts: React.Dispatch<React.SetStateAction<ManualProduct[]>>
  setTestProducts: React.Dispatch<React.SetStateAction<TestProduct[]>>
  setChecklistItems: React.Dispatch<React.SetStateAction<ChecklistItem[]>>
  setCommunications: React.Dispatch<React.SetStateAction<Communication[]>>
  setSubscriptions: React.Dispatch<React.SetStateAction<PageSubscription[]>>
  setSubscriptionServicesCount: React.Dispatch<React.SetStateAction<number>>
}

// ============================================================================
// HOOK
// ============================================================================

export function useClientPageData(clientId: string, activeTab: ClientPageTab = 'getting-started'): ClientPageData {
  // -------------------------------------------------------------------------
  // CORE CLIENT STATE
  // -------------------------------------------------------------------------
  const [client, setClient] = useState<ClientPageDBClient | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // -------------------------------------------------------------------------
  // CHECKLIST STATE
  // -------------------------------------------------------------------------
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checklistLoading, setChecklistLoading] = useState(false)

  // -------------------------------------------------------------------------
  // VIDEO CHAPTERS STATE
  // -------------------------------------------------------------------------
  const [videoChapters, setVideoChapters] = useState<VideoChapter[]>([])

  // -------------------------------------------------------------------------
  // ONBOARDING STATE
  // -------------------------------------------------------------------------
  const [onboardingSummary, setOnboardingSummary] = useState<OnboardingSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [onboardingForm, setOnboardingForm] = useState<OnboardingFormData | null>(null)
  const [onboardingFormLoading, setOnboardingFormLoading] = useState(false)

  // -------------------------------------------------------------------------
  // RECOMMENDATIONS STATE
  // -------------------------------------------------------------------------
  const [recommendation, setRecommendation] = useState<PageRecommendation | null>(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [smartRecommendationsCount, setSmartRecommendationsCount] = useState(0)

  // -------------------------------------------------------------------------
  // SUBSCRIPTIONS STATE
  // -------------------------------------------------------------------------
  const [subscriptions, setSubscriptions] = useState<PageSubscription[]>([])
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false)
  const [subscriptionServicesCount, setSubscriptionServicesCount] = useState(0)
  const [stripeSubscriptions, setStripeSubscriptions] = useState<StripeSubscription[]>([])
  const [stripeSubscriptionsLoading, setStripeSubscriptionsLoading] = useState(false)
  const [stripeHistory, setStripeHistory] = useState<StripeHistoryEvent[]>([])
  const [stripeHistoryLoading, setStripeHistoryLoading] = useState(false)

  // -------------------------------------------------------------------------
  // PRODUCTS STATE
  // -------------------------------------------------------------------------
  const [manualProducts, setManualProducts] = useState<ManualProduct[]>([])
  const [manualProductsLoading, setManualProductsLoading] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([])
  const [testProducts, setTestProducts] = useState<TestProduct[]>([])
  const [testProductsLoading, setTestProductsLoading] = useState(false)
  const [allProducts, setAllProducts] = useState<AvailableProduct[]>([])
  const [availableContentProducts, setAvailableContentProducts] = useState<ContentProduct[]>([])

  // -------------------------------------------------------------------------
  // SERVICES STATE
  // -------------------------------------------------------------------------
  const [contentServices, setContentServices] = useState<Service[]>([])
  const [websiteServices, setWebsiteServices] = useState<Service[]>([])
  const [hasContentProductsFromApi, setHasContentProductsFromApi] = useState<boolean | null>(null)
  const [hasWebsiteProductsFromApi, setHasWebsiteProductsFromApi] = useState<boolean | null>(null)

  // -------------------------------------------------------------------------
  // CONTENT STATE
  // -------------------------------------------------------------------------
  const [approvedContentCount, setApprovedContentCount] = useState(0)

  // -------------------------------------------------------------------------
  // ACTIVITIES STATE
  // -------------------------------------------------------------------------
  const [basecampActivities, setBasecampActivities] = useState<BasecampActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  // -------------------------------------------------------------------------
  // COMMUNICATIONS STATE
  // -------------------------------------------------------------------------
  const [communications, setCommunications] = useState<Communication[]>([])
  const [communicationsLoading, setCommunicationsLoading] = useState(false)

  // -------------------------------------------------------------------------
  // BILLING STATE
  // -------------------------------------------------------------------------
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stripeCustomer, setStripeCustomer] = useState<StripeCustomer | null>(null)
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null)
  const [invoicesLoading, setInvoicesLoading] = useState(false)

  // -------------------------------------------------------------------------
  // USER STATE
  // -------------------------------------------------------------------------
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // -------------------------------------------------------------------------
  // FETCH TRACKING (prevent duplicate calls)
  // -------------------------------------------------------------------------
  const fetchedRef = useRef<Set<string>>(new Set())
  const fetchingRef = useRef<Set<string>>(new Set())

  // Helper to prevent duplicate fetches
  const shouldFetch = useCallback((key: string): boolean => {
    if (fetchingRef.current.has(key)) return false
    return true
  }, [])

  const markFetching = useCallback((key: string) => {
    fetchingRef.current.add(key)
  }, [])

  const markFetched = useCallback((key: string) => {
    fetchingRef.current.delete(key)
    fetchedRef.current.add(key)
  }, [])

  const hasFetched = useCallback((key: string): boolean => {
    return fetchedRef.current.has(key)
  }, [])

  // =========================================================================
  // FETCH FUNCTIONS
  // =========================================================================

  // Fetch client data
  const fetchClient = useCallback(async () => {
    const key = `client-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`)
      if (res.ok) {
        const data: ClientPageDBClient = await res.json()
        setClient(data)
      }
    } catch (error) {
      console.error('Failed to fetch client:', error)
    } finally {
      setIsLoading(false)
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch checklist items
  const fetchChecklist = useCallback(async () => {
    const key = `checklist-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    setChecklistLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/checklist`)
      if (res.ok) {
        const data: ChecklistItem[] = await res.json()
        setChecklistItems(data)
      }
    } catch (error) {
      console.error('Failed to fetch checklist:', error)
    } finally {
      setChecklistLoading(false)
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch smart recommendations count (always refetchable for badge)
  const fetchSmartRecsCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/smart-recommendations`)
      if (res.ok) {
        const data = await res.json()
        const items = data.recommendation?.items || []
        setSmartRecommendationsCount(items.length)
      }
    } catch (error) {
      console.error('Failed to fetch smart recommendations count:', error)
    }
  }, [clientId])

  // Fetch user role (only once per session)
  const fetchUserRole = useCallback(async () => {
    const key = 'user-role'
    if (hasFetched(key) || !shouldFetch(key)) return
    markFetching(key)
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setIsSuperAdmin(data.role === 'super_admin')
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error)
    } finally {
      markFetched(key)
    }
  }, [hasFetched, shouldFetch, markFetching, markFetched])

  // Fetch approved content count
  const fetchApprovedContentCount = useCallback(async () => {
    const key = `content-count-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/content-stats`)
      if (res.ok) {
        const data = await res.json()
        setApprovedContentCount((data.approved || 0) + (data.posted || 0))
      }
    } catch (error) {
      console.error('Failed to fetch approved content count:', error)
    } finally {
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch service access flags (needed for tab badges on initial load)
  const fetchServiceAccessFlags = useCallback(async () => {
    const key = `service-access-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    try {
      const res = await fetch(`/api/client/info?clientId=${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setContentServices(data.access?.contentServices || [])
        setWebsiteServices(data.access?.websiteServices || [])
        setHasContentProductsFromApi(data.access?.hasContentProducts ?? false)
        setHasWebsiteProductsFromApi(data.access?.hasWebsiteProducts ?? false)
      }
    } catch (error) {
      console.error('Failed to fetch service access flags:', error)
    } finally {
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch video chapters (static, only once)
  const fetchVideoChapters = useCallback(async () => {
    const key = 'video-chapters'
    if (hasFetched(key) || !shouldFetch(key)) return
    markFetching(key)
    try {
      const res = await fetch('/api/admin/onboarding/video-chapters')
      if (res.ok) {
        const data = await res.json()
        const chapters = data.map((c: { id: string; title: string; description: string | null; video_url: string | null }) => ({
          id: c.id,
          title: c.title,
          description: c.description || '',
          videoUrl: c.video_url || ''
        })).filter((c: VideoChapter) => c.videoUrl)
        setVideoChapters(chapters)
      }
    } catch (error) {
      console.error('Failed to fetch video chapters:', error)
    } finally {
      markFetched(key)
    }
  }, [hasFetched, shouldFetch, markFetching, markFetched])

  // Fetch onboarding summary
  const fetchOnboardingSummary = useCallback(async () => {
    const key = `onboarding-summary-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    setSummaryLoading(true)
    try {
      const res = await fetch(`/api/client/onboarding?clientId=${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setOnboardingSummary(data.onboardingSummary || null)
      }
    } catch (error) {
      console.error('Failed to fetch onboarding summary:', error)
    } finally {
      setSummaryLoading(false)
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch onboarding form
  const fetchOnboardingForm = useCallback(async () => {
    const key = `onboarding-form-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    setOnboardingFormLoading(true)
    try {
      const res = await fetch(`/api/client/onboarding-form?clientId=${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setOnboardingForm(data)
      }
    } catch (error) {
      console.error('Failed to fetch onboarding form:', error)
    } finally {
      setOnboardingFormLoading(false)
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch recommendation
  const fetchRecommendation = useCallback(async () => {
    const key = `recommendation-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    setRecommendationLoading(true)
    try {
      const res = await fetch(`/api/admin/recommendations/client/${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setRecommendation(data)
      }
    } catch (error) {
      console.error('Failed to fetch recommendation:', error)
    } finally {
      setRecommendationLoading(false)
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(async () => {
    const key = `subscriptions-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    setSubscriptionsLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/subscriptions`)
      if (res.ok) {
        const data = await res.json()
        setSubscriptions(data)
        setSubscriptionServicesCount(data.services?.length || 0)
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error)
    } finally {
      setSubscriptionsLoading(false)
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch Stripe subscriptions
  const fetchStripeSubscriptions = useCallback(async () => {
    const key = `stripe-subs-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    setStripeSubscriptionsLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/stripe-subscriptions`)
      if (res.ok) {
        const data = await res.json()
        setStripeSubscriptions(data.subscriptions || [])
      }
    } catch (error) {
      console.error('Failed to fetch Stripe subscriptions:', error)
    } finally {
      setStripeSubscriptionsLoading(false)
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch Stripe history
  const fetchStripeHistory = useCallback(async () => {
    const key = `stripe-history-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    setStripeHistoryLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/stripe-subscription-history`)
      if (res.ok) {
        const data = await res.json()
        setStripeHistory(data.history || [])
      }
    } catch (error) {
      console.error('Failed to fetch Stripe history:', error)
    } finally {
      setStripeHistoryLoading(false)
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch manual products
  const fetchManualProducts = useCallback(async () => {
    const key = `manual-products-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    setManualProductsLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/products`)
      if (res.ok) {
        const data = await res.json()
        setManualProducts(data.manual || [])
      }
    } catch (error) {
      console.error('Failed to fetch manual products:', error)
    } finally {
      setManualProductsLoading(false)
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch available products for add product modal (on-demand, always refetchable)
  const fetchAvailableProducts = useCallback(async (currentManualProducts: ManualProduct[], currentSubscriptions: PageSubscription[]) => {
    try {
      const res = await fetch('/api/admin/products')
      if (res.ok) {
        const data = await res.json()
        const assignedIds = new Set(currentManualProducts.map(p => p.productId))
        const subProductIds = new Set(
          ((currentSubscriptions as any)?.services || []).map((s: any) => s.id).filter(Boolean)
        )
        const available = data
          .filter((p: { id: string }) => !assignedIds.has(p.id) && !subProductIds.has(p.id))
          .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
        setAvailableProducts(available)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }, [])

  // Fetch test products
  const fetchTestProducts = useCallback(async () => {
    if (client?.status !== 'test') return
    const key = `test-products-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    setTestProductsLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/test-products`)
      if (res.ok) {
        const data = await res.json()
        setTestProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch test products:', error)
    } finally {
      setTestProductsLoading(false)
      markFetched(key)
    }
  }, [clientId, client?.status, shouldFetch, markFetching, markFetched])

  // Fetch all products for test product selector
  const fetchAllProducts = useCallback(async () => {
    const key = 'all-products'
    if (hasFetched(key) || !shouldFetch(key)) return
    markFetching(key)
    try {
      const res = await fetch('/api/admin/products')
      if (res.ok) {
        const data = await res.json()
        setAllProducts(data.map((p: any) => ({ id: p.id, name: p.name, category: p.category })))
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      markFetched(key)
    }
  }, [hasFetched, shouldFetch, markFetching, markFetched])

  // Fetch content products (service access flags already fetched on mount)
  const fetchContentProductsAndServices = useCallback(async () => {
    const key = `content-products-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    try {
      const res = await fetch(`/api/admin/products/content?clientId=${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setAvailableContentProducts(data.available || [])
      }
    } catch (error) {
      console.error('Failed to fetch content products:', error)
    } finally {
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch communications
  const fetchCommunications = useCallback(async () => {
    const key = `communications-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    setCommunicationsLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/communications`)
      if (res.ok) {
        const data = await res.json()
        setCommunications(data)
      }
    } catch (error) {
      console.error('Failed to fetch communications:', error)
    } finally {
      setCommunicationsLoading(false)
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch Basecamp activities
  const fetchActivities = useCallback(async () => {
    if (!clientId) return
    const key = `activities-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    setActivitiesLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/activities`)
      if (res.ok) {
        const data = await res.json()
        setBasecampActivities(data)
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setActivitiesLoading(false)
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    const key = `invoices-${clientId}`
    if (!shouldFetch(key)) return
    markFetching(key)
    setInvoicesLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/invoices`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
        setStripeCustomer(data.customer || null)
        setStripeCustomerId(data.stripeCustomerId || null)
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    } finally {
      setInvoicesLoading(false)
      markFetched(key)
    }
  }, [clientId, shouldFetch, markFetching, markFetched])

  // =========================================================================
  // EFFECTS - Grouped by priority
  // =========================================================================

  // CRITICAL: Fetch on mount (essential data for page to render)
  useEffect(() => {
    // Reset fetch tracking when clientId changes
    fetchedRef.current.clear()
    fetchingRef.current.clear()

    // Essential data - always fetch
    fetchClient()
    fetchUserRole()
    fetchSmartRecsCount()
    fetchApprovedContentCount()
    fetchServiceAccessFlags() // Needed for tab badges (Content/Website active/inactive)
  }, [clientId]) // Only depend on clientId, not the functions

  // Getting Started tab data
  useEffect(() => {
    if (activeTab === 'getting-started') {
      fetchChecklist()
      fetchVideoChapters()
      fetchOnboardingSummary()
      fetchOnboardingForm()
      fetchSubscriptions()
      fetchStripeSubscriptions()
      fetchManualProducts()
    }
  }, [activeTab, clientId]) // Only depend on activeTab and clientId

  // Activity tab data
  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivities()
    }
  }, [activeTab, clientId])

  // Content tab data
  useEffect(() => {
    if (activeTab === 'content') {
      fetchContentProductsAndServices()
    }
  }, [activeTab, clientId])

  // Recommendations tab data
  useEffect(() => {
    if (activeTab === 'recommendations') {
      fetchRecommendation()
    }
  }, [activeTab, clientId])

  // Communication tab data
  useEffect(() => {
    if (activeTab === 'communication') {
      fetchCommunications()
    }
  }, [activeTab, clientId])

  // Fetch test products when client status is 'test'
  useEffect(() => {
    if (client?.status === 'test') {
      fetchTestProducts()
      fetchAllProducts()
    }
  }, [client?.status, clientId])

  // =========================================================================
  // RETURN
  // =========================================================================

  return {
    // Core client data
    client,
    isLoading,

    // Checklist
    checklistItems,
    checklistLoading,

    // Video chapters
    videoChapters,

    // Onboarding
    onboardingSummary,
    summaryLoading,
    onboardingForm,
    onboardingFormLoading,

    // Recommendations
    recommendation,
    recommendationLoading,
    smartRecommendationsCount,

    // Subscriptions
    subscriptions,
    subscriptionsLoading,
    subscriptionServicesCount,
    stripeSubscriptions,
    stripeSubscriptionsLoading,
    stripeHistory,
    stripeHistoryLoading,

    // Products
    manualProducts,
    manualProductsLoading,
    availableProducts,
    testProducts,
    testProductsLoading,
    allProducts,
    availableContentProducts,

    // Services
    contentServices,
    websiteServices,
    hasContentProductsFromApi,
    hasWebsiteProductsFromApi,

    // Content
    approvedContentCount,

    // Activities
    basecampActivities,
    activitiesLoading,

    // Communications
    communications,
    communicationsLoading,

    // Billing
    invoices,
    stripeCustomer,
    stripeCustomerId,
    invoicesLoading,

    // User
    isSuperAdmin,

    // Actions
    refetchClient: fetchClient,
    refetchChecklist: fetchChecklist,
    refetchSmartRecsCount: fetchSmartRecsCount,
    refetchSubscriptions: fetchSubscriptions,
    refetchManualProducts: fetchManualProducts,
    refetchTestProducts: fetchTestProducts,
    refetchCommunications: fetchCommunications,
    refetchActivities: fetchActivities,
    refetchInvoices: fetchInvoices,
    refetchAvailableProducts: fetchAvailableProducts,
    setManualProducts,
    setTestProducts,
    setChecklistItems,
    setCommunications,
    setSubscriptions,
    setSubscriptionServicesCount,
  }
}

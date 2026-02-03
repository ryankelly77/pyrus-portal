'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type TabType = 'smart-recommendations' | 'original-plan' | 'current-services'

// Format price - show cents only when there's a fractional part
const formatPrice = (amount: number): string => {
  const hasCents = amount % 1 !== 0
  if (hasCents) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return Math.round(amount).toLocaleString('en-US')
}

// Available coupon codes for admin selection
const AVAILABLE_COUPON_CODES = [
  { code: 'SAVE10', label: 'SAVE10 - 10% Off' },
  { code: 'BIGDEAL100', label: 'BIGDEAL100 - 100% Off' },
]

interface RecommendationItem {
  id: string
  tier: string | null
  quantity?: number | null
  monthly_price: string | null
  onetime_price: string | null
  is_free: boolean | null
  product: { id: string; name: string; category: string; short_description: string | null; long_description: string | null; monthly_price: string | null; onetime_price: string | null } | null
  bundle: { id: string; name: string; description: string | null; long_description: string | null; monthly_price: string | null; onetime_price: string | null } | null
  addon: { id: string; name: string; description: string | null; long_description: string | null; price?: string | null; monthly_price?: string | null; onetime_price?: string | null } | null
}

interface RecommendationHistory {
  id: string
  action: string
  details: string | null
  created_at: string
  created_by: string | null
}

interface Recommendation {
  id: string
  status: string
  purchased_tier: string | null
  purchased_at: string | null
  discount_applied: string | null
  good_description: string | null
  better_description: string | null
  best_description: string | null
  recommendation_items: RecommendationItem[]
  history?: RecommendationHistory[]
}

interface DBClient {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  growth_stage: string | null
  status?: string | null
  start_date?: string | null
}

interface SubscriptionItem {
  id: string
  quantity: number | null
  unit_amount: string | null
  product: { id: string; name: string; category: string; short_description: string | null; monthly_price: string | null } | null
  bundle: { id: string; name: string; description: string | null; monthly_price: string | null } | null
}

interface Subscription {
  id: string
  status: string | null
  current_period_start: string | null
  current_period_end: string | null
  monthly_amount: string | null
  created_at: string | null
  subscription_items: SubscriptionItem[]
}

interface StripeSubscriptionItem {
  id: string
  priceId: string
  product: {
    id: string
    name: string
    description?: string
  }
  quantity: number | null
  unitAmount: number
  currency: string
  interval: string
  intervalCount: number
}

interface StripeSubscription {
  id: string
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd?: boolean
  canceledAt?: string | null
  created?: string
  items: StripeSubscriptionItem[]
}

interface ManualProduct {
  id: string
  productId: string
  name: string
  category: string
  description: string | null
  source: 'manual'
  assignedAt: string | null
  notes: string | null
  monthlyPrice: number
  hasCustomPrice: boolean
}

interface StripeHistoryEvent {
  id: string
  type?: string
  date: string
  action: string
  details: string
  products?: string[]
}

interface StripeInvoice {
  id: string
  number: string | null
  status: string | null
  amountDue?: number
  amountPaid?: number
  amountRemaining?: number
  subtotal?: number
  total: number
  tax?: number | null
  currency?: string
  created: string | null
  dueDate?: string | null
  paidAt?: string | null
  periodStart?: string | null
  periodEnd?: string | null
  hostedInvoiceUrl?: string | null
  invoicePdf: string | null
  description?: string | null
  subscriptionId?: string | null
}

// Smart Recommendations interfaces
interface SmartRecommendationProduct {
  id: string
  name: string
  short_description: string | null
  long_description: string | null
  category: string
  monthly_price: string | null
  onetime_price: string | null
  stripe_monthly_price_id: string | null
  stripe_onetime_price_id: string | null
}

interface SmartRecommendationItem {
  id: string
  product_id: string
  priority: number
  why_note: string | null
  is_featured: boolean
  price_option: 'monthly' | 'onetime' | 'client_choice' | null
  coupon_code: string | null
  status?: 'active' | 'purchased' | 'declined' | null
  status_changed_at?: string | null
  created_at: string | null
  product: SmartRecommendationProduct
}

interface SmartRecommendation {
  id: string
  status: string
  published_at: string | null
  next_refresh_at: string | null
}

interface SmartRecommendationHistoryItem {
  id: string
  itemId: string | null
  productId: string | null
  productName: string | null
  action: string
  details: string | null
  createdAt: string
  createdBy: string | null
  createdByEmail: string | null
  clientName: string | null
}

interface AvailableProduct {
  id: string
  name: string
  short_description: string | null
  smart_rec_why_text: string | null
  category: string
  monthly_price: string | null
  onetime_price: string | null
}

interface RecommendationsViewProps {
  clientId: string
  isAdmin?: boolean
  isDemo?: boolean
  clientName?: string
  defaultTab?: TabType
  // For admin view - pass pre-loaded data
  dbClient?: DBClient | null
  recommendation?: Recommendation | null
  recommendationLoading?: boolean
  subscriptions?: Subscription[]
  subscriptionsLoading?: boolean
  stripeSubscriptions?: StripeSubscription[]
  stripeSubscriptionsLoading?: boolean
  manualProducts?: ManualProduct[]
  manualProductsLoading?: boolean
  isActiveClient?: boolean
  // Admin-specific data for Current Services subtab
  stripeHistory?: StripeHistoryEvent[]
  stripeHistoryLoading?: boolean
  invoices?: StripeInvoice[]
  invoicesLoading?: boolean
  stripeCustomerId?: string | null
  // For client view only
  isPending?: boolean
  demoState?: string | null
  viewingAs?: string | null
  // Callback when recommendations change (decline/purchase)
  onRecommendationChange?: () => void
  // Super admin can delete history items
  isSuperAdmin?: boolean
}

// Growth Rewards tier thresholds - shared constant
const REWARD_TIERS = [
  { threshold: 0, discount: 0, coupon: null },
  { threshold: 1000, discount: 5, coupon: 'HARVEST5X' },
  { threshold: 1500, discount: 5, coupon: 'HARVEST5X' },
  { threshold: 2000, discount: 10, coupon: 'CULTIVATE10' },
]

// Format relative time for recommendations using calendar days
const formatRecommendedDate = (dateString: string | null) => {
  if (!dateString) return null
  const date = new Date(dateString)
  const now = new Date()

  // Compare calendar dates by setting both to midnight
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  }
  // For older dates, show the actual date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

const formatCategory = (category: string | null) => {
  if (!category) return null
  // Capitalize first letter and append " Product"
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase() + ' Product'
}

// Icon mapping based on service name
const getServiceIcon = (name: string) => {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('seo')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    )
  } else if (lowerName.includes('ads') || lowerName.includes('google ads')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
    )
  } else if (lowerName.includes('business profile') || lowerName.includes('gbp') || lowerName.includes('local')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    )
  } else if (lowerName.includes('analytics') || lowerName.includes('tracking')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    )
  } else if (lowerName.includes('content') || lowerName.includes('writing')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    )
  } else if (lowerName.includes('ai') || lowerName.includes('visibility')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
    )
  } else if (lowerName.includes('website') || lowerName.includes('site') || lowerName.includes('care')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    )
  } else if (lowerName.includes('brand')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
      </svg>
    )
  } else {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    )
  }
}

export function RecommendationsView({
  clientId,
  isAdmin = false,
  isDemo = false,
  clientName,
  defaultTab = 'smart-recommendations',
  dbClient: propDbClient,
  recommendation: propRecommendation,
  recommendationLoading: propRecommendationLoading,
  subscriptions: propSubscriptions,
  subscriptionsLoading: propSubscriptionsLoading,
  stripeSubscriptions: propStripeSubscriptions,
  stripeSubscriptionsLoading: propStripeSubscriptionsLoading,
  manualProducts: propManualProducts,
  manualProductsLoading: propManualProductsLoading,
  isActiveClient: propIsActiveClient,
  stripeHistory: propStripeHistory,
  stripeHistoryLoading: propStripeHistoryLoading,
  invoices: propInvoices,
  invoicesLoading: propInvoicesLoading,
  stripeCustomerId: propStripeCustomerId,
  isPending: propIsPending,
  demoState,
  viewingAs,
  onRecommendationChange,
  isSuperAdmin = false,
}: RecommendationsViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<TabType>(defaultTab)
  const [modalContent, setModalContent] = useState<{ name: string; html: string } | null>(null)

  // Sync activeTab when defaultTab changes (e.g., from parent navigation)
  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  // Client-side data fetching (when not admin)
  const [localDbClient, setLocalDbClient] = useState<DBClient | null>(null)
  const [localRecommendation, setLocalRecommendation] = useState<Recommendation | null>(null)
  // subscriptionService returns { subscription, services, discounts, invoices, ... }
  const [localSubscriptionData, setLocalSubscriptionData] = useState<any>(null)
  const [localLoading, setLocalLoading] = useState(!isAdmin)

  // Smart Recommendations state
  const [smartRecommendation, setSmartRecommendation] = useState<SmartRecommendation | null>(null)
  const [smartRecommendationItems, setSmartRecommendationItems] = useState<SmartRecommendationItem[]>([])
  const [smartRecommendationsLoading, setSmartRecommendationsLoading] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([])
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [editingItem, setEditingItem] = useState<SmartRecommendationItem | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<SmartRecommendationItem | null>(null)
  const [savingSmartRec, setSavingSmartRec] = useState(false)
  const [addingToPlan, setAddingToPlan] = useState<string | null>(null) // product_id being added

  // Password protection for Add to Plan
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pendingAddToPlan, setPendingAddToPlan] = useState<{ item: SmartRecommendationItem; priceType: 'monthly' | 'onetime' } | null>(null)
  const [addToPlanPassword, setAddToPlanPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [verifyingPassword, setVerifyingPassword] = useState(false)

  // Decline recommendation state
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false)
  const [pendingDecline, setPendingDecline] = useState<SmartRecommendationItem | null>(null)
  const [declining, setDeclining] = useState(false)

  // Admin history state
  const [recommendationHistory, setRecommendationHistory] = useState<SmartRecommendationHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null)

  // Use prop data for admin, local data for client
  const dbClient = isAdmin ? propDbClient : localDbClient
  const recommendation = isAdmin ? propRecommendation : localRecommendation
  const recommendationLoading = isAdmin ? propRecommendationLoading : localLoading
  // Both admin and client now use subscriptionService data format
  const subscriptions = isAdmin ? propSubscriptions : localSubscriptionData
  const subscriptionsLoading = isAdmin ? propSubscriptionsLoading : localLoading
  const stripeSubscriptions = propStripeSubscriptions || []
  const stripeSubscriptionsLoading = propStripeSubscriptionsLoading || false
  const manualProducts = propManualProducts || []
  const manualProductsLoading = propManualProductsLoading || false

  // Determine active status
  const isActiveClient = isAdmin
    ? propIsActiveClient
    : (dbClient?.status === 'active' || dbClient?.status === 'client')
  const isPending = propIsPending ?? (dbClient?.status === 'pending' || dbClient?.status === 'prospect')

  // Calculate months since client start date
  const monthsSinceStart = (() => {
    // Use client's start_date if available (most accurate)
    if (dbClient?.start_date) {
      const startDate = new Date(dbClient.start_date)
      const now = new Date()
      const months = (now.getFullYear() - startDate.getFullYear()) * 12
        + (now.getMonth() - startDate.getMonth())
      return Math.max(1, months + 1)
    }

    // Fall back to earliest Stripe subscription date
    const subscriptionDates = stripeSubscriptions
      .filter(s => s.created)
      .map(s => new Date(s.created!))

    if (subscriptionDates.length === 0) return 1

    const earliestDate = new Date(Math.min(...subscriptionDates.map(d => d.getTime())))
    const now = new Date()
    const months = (now.getFullYear() - earliestDate.getFullYear()) * 12
      + (now.getMonth() - earliestDate.getMonth())

    return Math.max(1, months + 1)
  })()

  // Demo data for preview mode
  const demoDbClient: DBClient = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Raptor Vending',
    contact_name: 'John Smith',
    contact_email: 'john@raptorvendingco.com',
    growth_stage: 'seedling',
    status: demoState === 'locked' ? 'pending' : 'active',
    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago = ~3 months
  }

  // Client-side data fetching
  useEffect(() => {
    if (isAdmin) return // Skip for admin (data passed via props)

    // For demo mode, set demo data immediately
    if (isDemo) {
      setLocalDbClient(demoDbClient)
      setLocalLoading(false)
      return
    }

    async function fetchData() {
      try {
        const apiUrl = `/api/client/recommendation?clientId=${clientId}`
        const res = await fetch(apiUrl)
        if (res.ok) {
          const data = await res.json()
          if (data) {
            setLocalDbClient(data.client)
            setLocalRecommendation(data.recommendation)
            // subscriptions is now subscriptionService data format
            setLocalSubscriptionData(data.subscriptions || null)
          }
        }
      } catch (error) {
        console.error('Failed to fetch recommendation:', error)
      } finally {
        setLocalLoading(false)
      }
    }

    fetchData()
  }, [clientId, isAdmin, isDemo, demoState])

  // Fetch smart recommendations
  useEffect(() => {
    async function fetchSmartRecommendations() {
      if (!clientId || isDemo) return

      setSmartRecommendationsLoading(true)
      try {
        // Use different API based on admin/client
        const apiUrl = isAdmin
          ? `/api/admin/clients/${clientId}/smart-recommendations`
          : `/api/client/smart-recommendations?clientId=${clientId}`

        const res = await fetch(apiUrl)
        if (res.ok) {
          const data = await res.json()
          if (data.recommendation) {
            setSmartRecommendation(data.recommendation)
            setSmartRecommendationItems(data.recommendation.items || data.items || [])
          } else if (data.items) {
            // Client API returns items separately
            setSmartRecommendationItems(data.items)
          }
        }
      } catch (error) {
        console.error('Failed to fetch smart recommendations:', error)
      } finally {
        setSmartRecommendationsLoading(false)
      }
    }

    fetchSmartRecommendations()
  }, [clientId, isAdmin, isDemo])

  // Fetch available products for admin (to add to recommendations)
  useEffect(() => {
    async function fetchProducts() {
      if (!isAdmin || !clientId) return

      try {
        const res = await fetch('/api/admin/products')
        if (res.ok) {
          const data = await res.json()
          // Products API returns array directly, not wrapped in { products }
          setAvailableProducts(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
      }
    }

    fetchProducts()
  }, [isAdmin, clientId])

  // Fetch recommendation history
  useEffect(() => {
    async function fetchHistory() {
      if (!clientId) return

      setHistoryLoading(true)
      try {
        // Use different API based on admin/client
        const apiUrl = isAdmin
          ? `/api/admin/clients/${clientId}/smart-recommendations/history`
          : `/api/client/smart-recommendations/history?clientId=${clientId}`

        const res = await fetch(apiUrl)
        if (res.ok) {
          const data = await res.json()
          setRecommendationHistory(data.history || [])
        }
      } catch (error) {
        console.error('Failed to fetch recommendation history:', error)
      } finally {
        setHistoryLoading(false)
      }
    }

    fetchHistory()
  }, [isAdmin, clientId])

  // Add product to smart recommendations
  const handleAddProduct = async (productId: string, whyNote: string, priceOption: string | null, couponCode: string | null) => {
    if (!clientId) return

    console.log('[DEBUG] handleAddProduct called with:', { productId, whyNote, priceOption, couponCode })

    setSavingSmartRec(true)
    try {
      const payload = { product_id: productId, why_note: whyNote, price_option: priceOption, coupon_code: couponCode }
      console.log('[DEBUG] Sending payload:', JSON.stringify(payload))
      const res = await fetch(`/api/admin/clients/${clientId}/smart-recommendations/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        setSmartRecommendationItems(prev => [...prev, data.item])
        setShowAddProductModal(false)
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('Failed to add recommendation:', res.status, errorData)
        alert(errorData.error || 'Failed to add recommendation')
      }
    } catch (error) {
      console.error('Failed to add product:', error)
      alert('Failed to add recommendation. Please try again.')
    } finally {
      setSavingSmartRec(false)
    }
  }

  // Update recommendation item
  const handleUpdateItem = async (itemId: string, whyNote: string, isFeatured: boolean, couponCode: string | null) => {
    if (!clientId) return

    setSavingSmartRec(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/smart-recommendations/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, why_note: whyNote, is_featured: isFeatured, coupon_code: couponCode }),
      })

      if (res.ok) {
        const data = await res.json()
        setSmartRecommendationItems(prev =>
          prev.map(item => item.id === itemId ? data.item : item)
        )
        setEditingItem(null)
      }
    } catch (error) {
      console.error('Failed to update item:', error)
    } finally {
      setSavingSmartRec(false)
    }
  }

  // Remove product from smart recommendations
  const handleRemoveItem = async (itemId: string) => {
    if (!clientId || !confirm('Remove this recommendation?')) return

    setSavingSmartRec(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/smart-recommendations/items?item_id=${itemId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const data = await res.json()
        setSmartRecommendationItems(prev => prev.filter(item => item.id !== itemId))

        // If no items remain, the backend resets to draft - update local state too
        if (data.remainingItems === 0 && smartRecommendation) {
          setSmartRecommendation({
            ...smartRecommendation,
            status: 'draft',
            published_at: null
          })
        }
      }
    } catch (error) {
      console.error('Failed to remove item:', error)
    } finally {
      setSavingSmartRec(false)
    }
  }

  // Publish smart recommendations
  const handlePublishRecommendations = async () => {
    if (!clientId || smartRecommendationItems.length === 0) return

    setSavingSmartRec(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/smart-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: smartRecommendationItems.map((item, index) => ({
            product_id: item.product_id,
            priority: index + 1,
            why_note: item.why_note,
            is_featured: item.is_featured,
            price_option: item.price_option,
            coupon_code: item.coupon_code,
          })),
          status: 'published',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSmartRecommendation(data.recommendation)
        setSmartRecommendationItems(data.recommendation.items || [])
      }
    } catch (error) {
      console.error('Failed to publish recommendations:', error)
    } finally {
      setSavingSmartRec(false)
    }
  }

  // Add product to client's Stripe subscription - requires password
  const handleAddToPlan = async (item: SmartRecommendationItem, priceType: 'monthly' | 'onetime') => {
    if (!clientId) return

    const priceId = priceType === 'monthly'
      ? item.product.stripe_monthly_price_id
      : item.product.stripe_onetime_price_id

    if (!priceId) {
      alert(`No ${priceType} Stripe price configured for this product`)
      return
    }

    // Show password modal for super admin verification
    setPendingAddToPlan({ item, priceType })
    setAddToPlanPassword('')
    setPasswordError('')
    setShowPasswordModal(true)
  }

  // Execute the add to plan after password verification
  const executeAddToPlan = async () => {
    if (!pendingAddToPlan || !clientId) return

    const { item, priceType } = pendingAddToPlan
    const priceId = priceType === 'monthly'
      ? item.product.stripe_monthly_price_id
      : item.product.stripe_onetime_price_id

    // Verify password
    setVerifyingPassword(true)
    try {
      const verifyRes = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: addToPlanPassword }),
      })
      const verifyData = await verifyRes.json()

      if (!verifyData.valid) {
        setPasswordError('Invalid password. Only super admins can add items to client plans.')
        setVerifyingPassword(false)
        return
      }
    } catch (error) {
      setPasswordError('Failed to verify password. Please try again.')
      setVerifyingPassword(false)
      return
    }
    setVerifyingPassword(false)

    // Close modal and proceed
    setShowPasswordModal(false)
    setPendingAddToPlan(null)

    setAddingToPlan(item.product_id)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/stripe-subscriptions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: item.product_id,
          price_id: priceId,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        alert(`${item.product.name} has been added to the subscription`)
        // Optionally remove from recommendations after adding
        // handleRemoveItem(item.id)
      } else {
        alert(data.error || 'Failed to add product to subscription')
      }
    } catch (error) {
      console.error('Failed to add to plan:', error)
      alert('Failed to add product to subscription. Please try again.')
    } finally {
      setAddingToPlan(null)
    }
  }

  // Handle client declining a recommendation
  const handleDeclineClick = (item: SmartRecommendationItem) => {
    setPendingDecline(item)
    setShowDeclineConfirm(true)
  }

  const handleDeclineConfirm = async () => {
    if (!pendingDecline) return

    setDeclining(true)
    try {
      // Use admin endpoint if in admin context, otherwise use client endpoint
      const apiUrl = isAdmin
        ? `/api/admin/clients/${clientId}/smart-recommendations/decline`
        : '/api/client/smart-recommendations/decline'

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: pendingDecline.id }),
      })

      if (res.ok) {
        // Remove the item from the local state
        setSmartRecommendationItems(prev =>
          prev.filter(item => item.id !== pendingDecline.id)
        )
        setShowDeclineConfirm(false)
        setPendingDecline(null)
        // Notify parent to refresh count
        onRecommendationChange?.()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to decline recommendation')
      }
    } catch (error) {
      console.error('Failed to decline:', error)
      alert('Failed to decline recommendation. Please try again.')
    } finally {
      setDeclining(false)
    }
  }

  // Handle deleting a history item (super admin only)
  const handleDeleteHistoryItem = async (historyId: string) => {
    if (!isSuperAdmin) return
    if (!confirm('Are you sure you want to delete this history item?')) return

    setDeletingHistoryId(historyId)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/smart-recommendations/history/${historyId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        // Remove the item from local state
        setRecommendationHistory(prev => prev.filter(item => item.id !== historyId))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete history item')
      }
    } catch (error) {
      console.error('Failed to delete history item:', error)
      alert('Failed to delete history item. Please try again.')
    } finally {
      setDeletingHistoryId(null)
    }
  }

  // Get display name
  const displayName = clientName || dbClient?.name || 'this client'

  // Loading state
  if (recommendationLoading) {
    return (
      <div className="recommendations-loading">
        <div className="spinner" style={{ width: 40, height: 40 }}></div>
        <p>Loading your recommendations...</p>
      </div>
    )
  }

  return (
    <div className="recommendations-content">
      {/* Growth Stage Hero Section - Show for active clients */}
      {isActiveClient && !isPending && (
        <div className="growth-stage-hero">
          <div className="growth-stage-main">
            <div className="stage-icon-large">
              {dbClient?.growth_stage === 'seedling' && '🌱'}
              {dbClient?.growth_stage === 'sprouting' && '🌿'}
              {dbClient?.growth_stage === 'blooming' && '🌸'}
              {dbClient?.growth_stage === 'harvesting' && '🌾'}
              {!dbClient?.growth_stage && '🌱'}
            </div>
            <div className="stage-content">
              <div className="stage-label">{isAdmin ? 'Growth Stage' : 'Your Growth Stage'}</div>
              <div className="stage-name-large">
                {dbClient?.growth_stage === 'seedling' && 'Seedling'}
                {dbClient?.growth_stage === 'sprouting' && 'Sprouting'}
                {dbClient?.growth_stage === 'blooming' && 'Blooming'}
                {dbClient?.growth_stage === 'harvesting' && 'Harvesting'}
                {!dbClient?.growth_stage && 'Seedling'}
                <span className="month-badge">Month {monthsSinceStart}</span>
              </div>
              <div className="stage-description-large">
                {dbClient?.growth_stage === 'seedling' && (isAdmin
                  ? "Just getting started! Foundation being established."
                  : "Just getting started! We're laying the groundwork for your marketing success."
                )}
                {dbClient?.growth_stage === 'sprouting' && (isAdmin
                  ? "Building momentum with early results appearing."
                  : "Building momentum with early results appearing. Your marketing foundation is taking root!"
                )}
                {dbClient?.growth_stage === 'blooming' && (isAdmin
                  ? "Thriving with strong results and growth."
                  : "Your marketing is flourishing with strong results. Time to optimize and scale!"
                )}
                {dbClient?.growth_stage === 'harvesting' && (isAdmin
                  ? "Reaping the rewards of sustained growth."
                  : "Peak performance achieved! Reaping the rewards of your marketing investment."
                )}
                {!dbClient?.growth_stage && (isAdmin
                  ? "Just getting started! Foundation being established."
                  : "Just getting started! We're laying the groundwork for your marketing success."
                )}
              </div>
            </div>
            <div className="stage-stats">
              <div className="stage-stat">
                <span className="stage-stat-value">--</span>
                <span className="stage-stat-label">Keywords Ranking</span>
              </div>
              <div className="stage-stat">
                <span className="stage-stat-value">--</span>
                <span className="stage-stat-label">Leads This Month</span>
              </div>
              <div className="stage-stat">
                <span className="stage-stat-value">--</span>
                <span className="stage-stat-label">Traffic Growth</span>
              </div>
            </div>
          </div>
          <div className="growth-progress-section">
            <div className="progress-track-large">
              <div className={`progress-stage ${dbClient?.growth_stage === 'seedling' ? 'current' : ['sprouting', 'blooming', 'harvesting'].includes(dbClient?.growth_stage || '') ? 'completed' : 'current'}`}>
                <div className="stage-icon">🌱</div>
                <div className="progress-dot"></div>
                <span>Seedling</span>
              </div>
              <div className={`progress-line ${['sprouting', 'blooming', 'harvesting'].includes(dbClient?.growth_stage || '') ? 'completed' : ''}`}></div>
              <div className={`progress-stage ${dbClient?.growth_stage === 'sprouting' ? 'current' : ['blooming', 'harvesting'].includes(dbClient?.growth_stage || '') ? 'completed' : ''}`}>
                <div className="stage-icon">🌿</div>
                <div className="progress-dot"></div>
                <span>Sprouting</span>
              </div>
              <div className={`progress-line ${['blooming', 'harvesting'].includes(dbClient?.growth_stage || '') ? 'completed' : ''}`}></div>
              <div className={`progress-stage ${dbClient?.growth_stage === 'blooming' ? 'current' : dbClient?.growth_stage === 'harvesting' ? 'completed' : ''}`}>
                <div className="stage-icon">🌸</div>
                <div className="progress-dot"></div>
                <span>Blooming</span>
              </div>
              <div className={`progress-line ${dbClient?.growth_stage === 'harvesting' ? 'completed' : ''}`}></div>
              <div className={`progress-stage ${dbClient?.growth_stage === 'harvesting' ? 'current' : ''}`}>
                <div className="stage-icon">🌾</div>
                <div className="progress-dot"></div>
                <span>Harvesting</span>
              </div>
            </div>
            {smartRecommendation?.next_refresh_at && (
              <div className="refresh-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                Next recommendations update: {new Date(smartRecommendation.next_refresh_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtabs Navigation */}
      <div className="recommendations-tabs">
        <button
          className={`recommendations-tab ${activeTab === 'original-plan' ? 'active' : ''}`}
          onClick={() => setActiveTab('original-plan')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          Original Plan
        </button>
        <button
          className={`recommendations-tab ${activeTab === 'current-services' ? 'active' : ''}`}
          onClick={() => setActiveTab('current-services')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          Your Current Services
          {!isActiveClient && (
            <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          )}
        </button>
        <button
          className={`recommendations-tab ${activeTab === 'smart-recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('smart-recommendations')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          Smart Recommendations
          {!isActiveClient ? (
            <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          ) : smartRecommendationItems.length > 0 ? (
            <span className={`tab-badge count${activeTab === 'smart-recommendations' ? ' active' : ''}`}>{smartRecommendationItems.length}</span>
          ) : (
            <span className="tab-badge coming-soon">Coming Soon</span>
          )}
        </button>
      </div>

      {/* Smart Recommendations Subtab */}
      {activeTab === 'smart-recommendations' && (
        <>
          {!isActiveClient ? (
            <div className="locked-placeholder">
              <div className="locked-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3>Smart Recommendations</h3>
              <p>
                {isAdmin
                  ? `Once ${displayName} is an active client, we'll analyze their marketing data to provide AI-powered recommendations tailored to their growth goals.`
                  : "Once you're an active client, we'll analyze your marketing data to provide AI-powered recommendations tailored to your growth goals."
                }
              </p>
            </div>
          ) : isAdmin ? (
            /* Admin View - Manage Smart Recommendations */
            <div className="smart-recommendations-admin">
              <div className="smart-rec-header">
                <div className="smart-rec-title">
                  <h3>Smart Recommendations</h3>
                  <p>Recommend products tailored to {displayName}&apos;s needs</p>
                </div>
                <div className="smart-rec-actions">
                  {smartRecommendation?.status === 'published' && smartRecommendationItems.some(i => i.status !== 'declined') && (
                    <span className="status-badge published">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Published
                    </span>
                  )}
                  <button
                    className="btn-add-product"
                    onClick={() => setShowAddProductModal(true)}
                    disabled={savingSmartRec}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Recommendation
                  </button>
                  {smartRecommendationItems.some(i => i.status !== 'declined') && smartRecommendation?.status !== 'published' && (
                    <button
                      className="btn-publish"
                      onClick={handlePublishRecommendations}
                      disabled={savingSmartRec}
                    >
                      {savingSmartRec ? 'Publishing...' : 'Publish'}
                    </button>
                  )}
                </div>
              </div>

              {smartRecommendationsLoading ? (
                <div className="loading-placeholder">Loading smart recommendations...</div>
              ) : smartRecommendationItems.filter(i => i.status !== 'declined').length === 0 ? (
                <div className="empty-recommendations">
                  <div className="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <h4>No recommendations yet</h4>
                  <p>Add products you recommend for {displayName} to help them grow their business.</p>
                  <button className="btn-add-first" onClick={() => setShowAddProductModal(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add First Recommendation
                  </button>
                </div>
              ) : (
                <div className="smart-rec-grid">
                  {smartRecommendationItems.filter(i => i.status !== 'declined').map((item, index) => {
                    // Determine which prices to show based on price_option
                    const showMonthly = item.price_option === 'monthly' || item.price_option === 'client_choice' || (!item.price_option && Number(item.product.monthly_price) > 0)
                    const showOnetime = item.price_option === 'onetime' || item.price_option === 'client_choice' || (!item.price_option && Number(item.product.onetime_price) > 0 && !Number(item.product.monthly_price))
                    const isClientChoice = item.price_option === 'client_choice'

                    return (
                      <div key={item.id} className={`smart-rec-card${item.is_featured ? ' featured' : ''}${item.status === 'purchased' ? ' purchased' : ''}`}>
                        {item.is_featured && !item.status && (
                          <div className="smart-rec-card-badge">Top Recommendation</div>
                        )}
                        {isClientChoice && !item.status && (
                          <div className="smart-rec-card-badge client-choice">Client Chooses</div>
                        )}
                        {item.status === 'purchased' && (
                          <div className="smart-rec-card-badge purchased">Purchased</div>
                        )}
                        <div className="smart-rec-card-body">
                          {item.created_at && (
                            <div className="smart-rec-card-date">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              {formatRecommendedDate(item.created_at)}
                            </div>
                          )}
                          <div className="smart-rec-card-header">
                            <div className="smart-rec-card-icon">
                              {getServiceIcon(item.product.name)}
                            </div>
                            <div className="smart-rec-card-title-wrap">
                              <div className="smart-rec-card-title">{item.product.name}</div>
                              <div className="smart-rec-card-category">{formatCategory(item.product.category)}</div>
                            </div>
                          </div>

                          {(item.why_note || item.product.short_description) && (
                            <div className="smart-rec-card-description">
                              {item.why_note || item.product.short_description}
                            </div>
                          )}

                          <div className="smart-rec-card-pricing">
                            {showMonthly && Number(item.product.monthly_price) > 0 && (
                              <div className="pricing-option">
                                <span className="price">${formatPrice(Number(item.product.monthly_price))}</span>
                                <span className="period">/mo</span>
                              </div>
                            )}
                            {isClientChoice && Number(item.product.monthly_price) > 0 && Number(item.product.onetime_price) > 0 && (
                              <div className="pricing-or">or</div>
                            )}
                            {showOnetime && Number(item.product.onetime_price) > 0 && (
                              <div className="pricing-option onetime">
                                <span className="price">${formatPrice(Number(item.product.onetime_price))}</span>
                                <span className="period">one-time</span>
                              </div>
                            )}
                          </div>

                          {item.coupon_code && (
                            <div className="coupon-code-display admin">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"></path>
                                <path d="M14 2h6a2 2 0 0 1 2 2v6"></path>
                                <path d="M10 14L20 4"></path>
                              </svg>
                              Code: <strong>{item.coupon_code}</strong>
                            </div>
                          )}

                          <div className="smart-rec-card-footer">
                            <div className="smart-rec-card-actions">
                              {/* Add to Plan button logic based on price_option */}
                              {isClientChoice ? (
                                <div className="add-to-plan-options">
                                  <button
                                    className="btn-add-to-plan"
                                    onClick={() => handleAddToPlan(item, 'monthly')}
                                    disabled={addingToPlan === item.product_id}
                                  >
                                    {addingToPlan === item.product_id ? '...' : 'Add Monthly'}
                                  </button>
                                  <button
                                    className="btn-add-to-plan secondary"
                                    onClick={() => handleAddToPlan(item, 'onetime')}
                                    disabled={addingToPlan === item.product_id}
                                  >
                                    {addingToPlan === item.product_id ? '...' : 'Add One-time'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="btn-add-to-plan"
                                  onClick={() => handleAddToPlan(item, item.price_option === 'onetime' ? 'onetime' : 'monthly')}
                                  disabled={addingToPlan === item.product_id}
                                >
                                  {addingToPlan === item.product_id ? 'Adding...' : (
                                    <>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                      </svg>
                                      Add to Plan
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            <div className="btn-icons-row">
                              <button
                                className="btn-icon-sm"
                                onClick={() => setEditingItem(item)}
                                title="Edit"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                className="btn-icon-sm danger"
                                onClick={() => handleRemoveItem(item.id)}
                                title="Remove"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Recommendation History Section */}
              {recommendationHistory.length > 0 && (
                <div className="smart-rec-history">
                  <div className="smart-rec-history-header">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                      </svg>
                      Recommendation History
                    </h4>
                  </div>
                  <div className="smart-rec-history-list">
                    {historyLoading ? (
                      <div className="loading-placeholder">Loading history...</div>
                    ) : (
                      recommendationHistory.map((entry) => (
                        <div key={entry.id} className={`history-item ${entry.action}`}>
                          <div className="history-item-icon">
                            {entry.action === 'item_added' && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                              </svg>
                            )}
                            {entry.action === 'item_removed' && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                              </svg>
                            )}
                            {entry.action === 'declined' && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            )}
                            {entry.action === 'purchased' && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                          <div className="history-item-content">
                            <div className="history-item-action">
                              {entry.details ? (
                                <span dangerouslySetInnerHTML={{ __html: entry.details.replace(/"([^"]+)"/, '<strong>$1</strong>') }} />
                              ) : (
                                <>
                                  {entry.action === 'item_added' && 'Added'}
                                  {entry.action === 'item_removed' && 'Removed'}
                                  {entry.action === 'declined' && 'Declined'}
                                  {entry.action === 'purchased' && 'Purchased'}
                                  {entry.productName && <strong> {entry.productName}</strong>}
                                </>
                              )}
                            </div>
                            <div className="history-item-meta">
                              {new Date(entry.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                              {entry.createdByEmail && ` by ${entry.createdByEmail}`}
                            </div>
                          </div>
                          {isSuperAdmin && (
                            <button
                              className="history-item-delete"
                              onClick={() => handleDeleteHistoryItem(entry.id)}
                              disabled={deletingHistoryId === entry.id}
                              title="Delete history item"
                            >
                              {deletingHistoryId === entry.id ? (
                                <span className="spinner-small"></span>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : smartRecommendationItems.length > 0 && smartRecommendation?.status === 'published' ? (
            /* Client View - Show Published Recommendations */
            <div className="smart-recommendations-client">
              <div className="smart-rec-intro">
                <div className="smart-rec-intro-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <div className="smart-rec-intro-content">
                  <h2>Recommended for You</h2>
                  <p>Based on your business goals and current marketing performance, we recommend these services to accelerate your growth.</p>
                </div>
              </div>

              <div className="smart-rec-grid client-view">
                {smartRecommendationItems.map((item, index) => {
                  // Determine which prices to show based on price_option
                  const showMonthly = item.price_option === 'monthly' || item.price_option === 'client_choice' || (!item.price_option && Number(item.product.monthly_price) > 0)
                  const showOnetime = item.price_option === 'onetime' || item.price_option === 'client_choice' || (!item.price_option && Number(item.product.onetime_price) > 0 && !Number(item.product.monthly_price))
                  const isClientChoice = item.price_option === 'client_choice'

                  return (
                    <div key={item.id} className={`smart-rec-card client${item.is_featured ? ' featured' : ''}`}>
                      {item.is_featured && (
                        <div className="smart-rec-card-badge">Top Recommendation</div>
                      )}
                      <div className="smart-rec-card-body">
                        {item.created_at && (
                          <div className="smart-rec-card-date">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            {formatRecommendedDate(item.created_at)}
                          </div>
                        )}
                        <div className="smart-rec-card-header">
                          <div className="smart-rec-card-icon">
                            {getServiceIcon(item.product.name)}
                          </div>
                          <div className="smart-rec-card-title-wrap">
                            <div className="smart-rec-card-title">{item.product.name}</div>
                            <div className="smart-rec-card-category">{formatCategory(item.product.category)}</div>
                          </div>
                        </div>

                        {item.why_note && (
                          <div className="smart-rec-card-why">
                            <div className="why-label">Why we recommend this</div>
                            <p>{item.why_note}</p>
                          </div>
                        )}

                        {item.product.short_description && !item.why_note && (
                          <div className="smart-rec-card-description">
                            {item.product.short_description}
                          </div>
                        )}

                        <div className="smart-rec-card-footer client">
                          <div className="smart-rec-card-pricing">
                            {/* If both prices exist and not client choice, show "for 12 months" format */}
                            {!isClientChoice && Number(item.product.monthly_price) > 0 && Number(item.product.onetime_price) > 0 ? (
                              <div className="pricing-option">
                                <span className="price">${formatPrice(Number(item.product.monthly_price))}</span>
                                <span className="period">/mo for 12 months</span>
                              </div>
                            ) : (
                              <>
                                {showMonthly && Number(item.product.monthly_price) > 0 && (
                                  <div className="pricing-option">
                                    <span className="price">${formatPrice(Number(item.product.monthly_price))}</span>
                                    <span className="period">/mo</span>
                                  </div>
                                )}
                                {isClientChoice && Number(item.product.monthly_price) > 0 && Number(item.product.onetime_price) > 0 && (
                                  <div className="pricing-or">or</div>
                                )}
                                {showOnetime && Number(item.product.onetime_price) > 0 && (
                                  <div className="pricing-option onetime">
                                    <span className="price">${formatPrice(Number(item.product.onetime_price))}</span>
                                    <span className="period">one-time</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          {item.coupon_code && (
                            <div className="coupon-code-display">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"></path>
                                <path d="M14 2h6a2 2 0 0 1 2 2v6"></path>
                                <path d="M10 14L20 4"></path>
                              </svg>
                              Use code <strong>{item.coupon_code}</strong> at checkout
                            </div>
                          )}
                          <div className="smart-rec-card-buttons">
                            {item.product.long_description && (
                              <button
                                className="btn-learn-more"
                                onClick={() => setSelectedProduct(item)}
                              >
                                Learn More
                              </button>
                            )}
                            {isClientChoice ? (
                              <div className="add-to-plan-options client">
                                <a
                                  href={`/checkout?product=${item.product_id}&price=monthly${item.coupon_code ? `&coupon=${item.coupon_code}` : ''}${viewingAs ? `&viewingAs=${viewingAs}` : ''}`}
                                  className="btn-add-to-plan"
                                >
                                  Add Monthly
                                </a>
                                <a
                                  href={`/checkout?product=${item.product_id}&price=onetime${item.coupon_code ? `&coupon=${item.coupon_code}` : ''}${viewingAs ? `&viewingAs=${viewingAs}` : ''}`}
                                  className="btn-add-to-plan secondary"
                                >
                                  Add One-time
                                </a>
                              </div>
                            ) : (
                              <a
                                href={`/checkout?product=${item.product_id}&price=${item.price_option || (Number(item.product.monthly_price) > 0 ? 'monthly' : 'onetime')}${item.coupon_code ? `&coupon=${item.coupon_code}` : ''}${viewingAs ? `&viewingAs=${viewingAs}` : ''}`}
                                className="btn-add-to-plan"
                              >
                                Add to Plan
                              </a>
                            )}
                          </div>
                          {/* Not interested button */}
                          <button
                            className="btn-not-interested"
                            onClick={() => handleDeclineClick(item)}
                          >
                            Not interested at this time
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {smartRecommendation?.next_refresh_at && (
                <div className="refresh-info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  Next recommendations update: {new Date(smartRecommendation.next_refresh_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                </div>
              )}
            </div>
          ) : smartRecommendation?.status === 'published' ? (
            /* Client View - All recommendations reviewed (declined/purchased) */
            <div className="smart-recommendations-client all-reviewed">
              <div className="smart-rec-intro">
                <div className="smart-rec-intro-icon completed">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div className="smart-rec-intro-content">
                  <h2>All Caught Up!</h2>
                  <p>You&apos;ve reviewed all current recommendations. We&apos;ll notify you when new personalized recommendations are available.</p>
                </div>
              </div>

              {smartRecommendation?.next_refresh_at && (
                <div className="refresh-info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  Next recommendations update: {new Date(smartRecommendation.next_refresh_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                </div>
              )}

              {/* Show recommendation history for client */}
              {recommendationHistory.length > 0 && (
                <div className="smart-rec-history client-history">
                  <div className="smart-rec-history-header">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                      </svg>
                      Your Activity
                    </h4>
                  </div>
                  <div className="smart-rec-history-list">
                    {recommendationHistory.filter(e => e.action === 'declined' || e.action === 'purchased').map((entry) => (
                      <div key={entry.id} className={`history-item ${entry.action}`}>
                        <div className="history-item-icon">
                          {entry.action === 'declined' && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          )}
                          {entry.action === 'purchased' && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                        <div className="history-item-content">
                          <div className="history-item-action">
                            {entry.action === 'declined' && 'Declined'}
                            {entry.action === 'purchased' && 'Added to plan'}
                            {entry.productName && <strong> {entry.productName}</strong>}
                          </div>
                          <div className="history-item-meta">
                            {new Date(entry.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Client View - No recommendations published yet */
            <div className="coming-soon-placeholder">
              <div className="coming-soon-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <h2>Smart Recommendations Coming Soon</h2>
              <p>
                We&apos;re analyzing your marketing performance data to generate personalized recommendations. The first set of smart recommendations will be available soon.
              </p>
              <div className="coming-soon-timeline">
                <div className="timeline-item">
                  <div className="timeline-dot active"></div>
                  <span>Campaign data collection started</span>
                </div>
                <div className="timeline-item">
                  <div className="timeline-dot pending"></div>
                  <span>Performance analysis in progress</span>
                </div>
                <div className="timeline-item">
                  <div className="timeline-dot pending"></div>
                  <span>Personalized recommendations generation</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Original Plan Subtab */}
      {activeTab === 'original-plan' && (
        <div className="original-plan-content">
          {recommendationLoading ? (
            <div className="loading-placeholder">Loading recommendation data...</div>
          ) : recommendation ? (
            <>
              {/* Plan Intro Header */}
              <div className="original-plan-header">
                <div className="plan-intro-card">
                  <div className="plan-intro-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div className="plan-intro-content">
                    <h2>{isAdmin ? 'Marketing Proposal' : 'Your Marketing Proposal'}</h2>
                    <p>
                      {isAdmin
                        ? `Three service tiers tailored to ${displayName}'s business goals.`
                        : "We've prepared three service tiers tailored to your business goals. Choose the option that best fits your growth objectives and budget."
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Good / Better / Best Pricing Tiers */}
              <div className="pricing-tiers">
                {(['good', 'better', 'best'] as const).map(tierName => {
                  const tierItems = recommendation.recommendation_items.filter(item => item.tier === tierName)
                  const isPurchased = recommendation.purchased_tier === tierName

                  // Calculate full pricing breakdown
                  let fullPriceMonthly = 0
                  let fullPriceOnetime = 0
                  let freeItemsValueMonthly = 0
                  let freeItemsValueOnetime = 0
                  let yourPriceMonthlyRaw = 0
                  let yourPriceOnetimeRaw = 0
                  let baseTotalForRewards = 0

                  tierItems.forEach(item => {
                    const qty = item.quantity || 1
                    const itemMonthly = Number(item.monthly_price || 0)
                    const itemOnetime = Number(item.onetime_price || 0)
                    const itemName = item.product?.name || item.bundle?.name || item.addon?.name || ''
                    const isAnalytics = itemName.includes('Analytics Tracking')

                    if (item.is_free) {
                      const productMonthly = Number(item.product?.monthly_price || item.bundle?.monthly_price || 0)
                      const productOnetime = Number(item.product?.onetime_price || item.bundle?.onetime_price || 0)
                      fullPriceMonthly += productMonthly * qty
                      fullPriceOnetime += productOnetime * qty
                      freeItemsValueMonthly += productMonthly * qty
                      freeItemsValueOnetime += productOnetime * qty
                    } else {
                      fullPriceMonthly += itemMonthly * qty
                      fullPriceOnetime += itemOnetime * qty
                      if (!isAnalytics) {
                        baseTotalForRewards += itemMonthly * qty
                      }
                    }

                    yourPriceMonthlyRaw += itemMonthly * qty
                    yourPriceOnetimeRaw += itemOnetime * qty
                  })

                  // Determine reward tier
                  let rewardTierIndex = 0
                  for (let i = REWARD_TIERS.length - 1; i >= 0; i--) {
                    if (baseTotalForRewards >= REWARD_TIERS[i].threshold) {
                      rewardTierIndex = i
                      break
                    }
                  }
                  const currentRewardTier = REWARD_TIERS[rewardTierIndex]

                  const discountPercent = currentRewardTier.discount
                  const couponCode = currentRewardTier.coupon
                  const discountAmount = Math.round(yourPriceMonthlyRaw * (discountPercent / 100) * 100) / 100
                  const yourPriceMonthly = yourPriceMonthlyRaw - discountAmount
                  const yourPriceOnetime = yourPriceOnetimeRaw

                  const totalSavings = (fullPriceMonthly - yourPriceMonthly) + (fullPriceOnetime - yourPriceOnetime)
                  const hasFreeItems = freeItemsValueMonthly > 0 || freeItemsValueOnetime > 0
                  const afterFreeMonthly = fullPriceMonthly - freeItemsValueMonthly
                  const afterFreeOnetime = fullPriceOnetime - freeItemsValueOnetime

                  const tierDescriptions: Record<string, string> = {
                    good: recommendation.good_description || 'Establish a professional foundation to help customers find and trust your business.',
                    better: recommendation.better_description || 'Build your online presence and start attracting qualified leads through search.',
                    best: recommendation.best_description || 'Comprehensive marketing to dominate your local market across all channels.',
                  }

                  return (
                    <div key={tierName} className={`pricing-tier${isPurchased ? ' selected' : ''}`}>
                      <div className="pricing-tier-header">
                        <div className="pricing-tier-label">
                          {tierName.charAt(0).toUpperCase() + tierName.slice(1)}
                          {isPurchased && <span className="selected-badge">Selected</span>}
                        </div>
                        <div className="pricing-tier-desc">{tierDescriptions[tierName]}</div>
                      </div>
                      <div className="pricing-tier-services">
                        {tierItems.length === 0 ? (
                          <div className="pricing-service-item empty">
                            <div className="pricing-service-info">
                              <div className="pricing-service-name">No items in this tier</div>
                            </div>
                          </div>
                        ) : (
                          tierItems.map(item => {
                            const itemName = item.product?.name || item.bundle?.name || item.addon?.name || 'Service'
                            const itemDesc = item.product?.short_description || item.bundle?.description || item.addon?.description || ''
                            const itemLongDesc = item.product?.long_description || item.bundle?.long_description || item.addon?.long_description || ''
                            const monthlyPrice = Number(item.monthly_price || 0)
                            const onetimePrice = Number(item.onetime_price || 0)
                            const isFree = item.is_free

                            return (
                              <div key={item.id} className={`pricing-service-item${isFree ? ' free' : ''}`}>
                                <div className={`pricing-service-check${isPurchased ? ' included' : ''}`}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                </div>
                                <div className="pricing-service-info">
                                  <div className="pricing-service-name">
                                    {itemName}
                                    {isFree && <span className="free-badge">FREE</span>}
                                    {itemLongDesc && (
                                      <button
                                        type="button"
                                        className="product-info-btn"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setModalContent({ name: itemName, html: itemLongDesc })
                                        }}
                                        aria-label={`More info about ${itemName}`}
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                          <circle cx="12" cy="12" r="10"></circle>
                                          <line x1="12" y1="16" x2="12" y2="12"></line>
                                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                  {itemDesc && <div className="pricing-service-desc">{itemDesc}</div>}
                                </div>
                                <div className="pricing-service-price">
                                  {isFree ? (
                                    <>$0<br /><span>included</span></>
                                  ) : monthlyPrice > 0 ? (
                                    <>${monthlyPrice.toLocaleString()}<br /><span>/month</span></>
                                  ) : onetimePrice > 0 ? (
                                    <>${onetimePrice.toLocaleString()}<br /><span>one-time</span></>
                                  ) : (
                                    <>Included</>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                      <div className="pricing-tier-footer">
                        <div className="pricing-breakdown">
                          {totalSavings > 0 && (
                            <div className="pricing-line strikethrough">
                              <span className="pricing-line-label">Full Price</span>
                              <span className="pricing-line-value">
                                {fullPriceOnetime > 0
                                  ? `$${formatPrice(fullPriceOnetime + fullPriceMonthly)} today, then $${formatPrice(fullPriceMonthly)}/mo`
                                  : `$${formatPrice(fullPriceMonthly)}/mo`
                                }
                              </span>
                            </div>
                          )}
                          {hasFreeItems && (
                            <div className="pricing-line">
                              <span className="pricing-line-label">After Free Items</span>
                              <span className="pricing-line-value">
                                {afterFreeOnetime > 0
                                  ? `$${formatPrice(afterFreeOnetime + afterFreeMonthly)} today, then $${formatPrice(afterFreeMonthly)}/mo`
                                  : `$${formatPrice(afterFreeMonthly)}/mo`
                                }
                              </span>
                            </div>
                          )}
                          <div className="pricing-line highlight">
                            <span className="pricing-line-label">{totalSavings > 0 ? 'Your Price' : 'Total'}</span>
                            <span className="pricing-line-value highlight">
                              {yourPriceOnetime > 0
                                ? `$${formatPrice(yourPriceOnetime + yourPriceMonthly)} today, then $${formatPrice(yourPriceMonthly)}/mo`
                                : `$${formatPrice(yourPriceMonthly)}/mo`
                              }
                            </span>
                          </div>
                          {totalSavings > 0 && (
                            <div className="pricing-line savings">
                              <span className="pricing-line-label">You Save</span>
                              <span className="pricing-line-value savings">
                                ${formatPrice(totalSavings)}/mo
                                {discountPercent > 0 && ` (includes ${discountPercent}% discount)`}
                              </span>
                            </div>
                          )}
                          {couponCode && (
                            <div className="coupon-display">
                              <span className="coupon-label">Use code at checkout:</span>
                              <span className="coupon-code">{couponCode}</span>
                            </div>
                          )}
                        </div>
                        {isPurchased ? (
                          <button className="pricing-tier-btn selected">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Selected Plan
                            {recommendation.purchased_at && (
                              <span style={{ fontWeight: 400, marginLeft: '8px', opacity: 0.8 }}>
                                ({new Date(recommendation.purchased_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                              </span>
                            )}
                          </button>
                        ) : isAdmin ? (
                          <div className="pricing-tier-btn-placeholder" style={{ height: '44px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                            {tierName === 'good' ? 'Starter Option' : tierName === 'better' ? 'Popular Choice' : 'Premium Option'}
                          </div>
                        ) : recommendation.purchased_tier ? (
                          <div className="pricing-tier-btn-placeholder" style={{ height: '44px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                            {tierName === 'good' ? 'Starter Option' : tierName === 'better' ? 'Popular Choice' : 'Premium Option'}
                          </div>
                        ) : (
                          <button
                            className="pricing-tier-btn primary"
                            onClick={() => router.push(`/checkout?tier=${tierName}${viewingAs ? `&viewingAs=${viewingAs}` : ''}${couponCode ? `&coupon=${couponCode}` : ''}`)}
                          >
                            {tierName === 'good' ? 'Select the Starter Option' : tierName === 'better' ? 'Select the Popular Choice' : 'Select the Premium Option'}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                              <path d="M5 12h14"></path>
                              <path d="M12 5l7 7-7 7"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Recommendation History */}
              {recommendation.history && recommendation.history.length > 0 && (
                <div className="recommendation-history" style={{ marginTop: '2rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Recommendation History
                  </h4>
                  <div className="history-list" style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem', border: '1px solid #e5e7eb' }}>
                    {recommendation.history.map((entry, index) => (
                      <div key={entry.id} className="history-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.75rem 0', borderBottom: index < recommendation.history!.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                        <div className="history-date" style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap', minWidth: '100px' }}>
                          {new Date(entry.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                          <br />
                          <span style={{ opacity: 0.8 }}>
                            {new Date(entry.created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="history-content" style={{ flex: 1 }}>
                          <span className="history-action" style={{ fontWeight: 500, color: '#111827' }}>{entry.action}</span>
                          {entry.details && <span className="history-details" style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>{entry.details}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-recommendation-message">
              <div className="placeholder-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
              <h3>{isAdmin ? 'No Recommendation Found' : 'No Recommendation Yet'}</h3>
              <p>
                {isAdmin
                  ? 'Create a recommendation for this client to see their original plan options here.'
                  : 'Your personalized marketing plan is being prepared. Check back soon!'
                }
              </p>
              {isAdmin && (
                <Link href={`/admin/recommendation-builder/${clientId}`} className="btn btn-primary" style={{ marginTop: '16px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Create Recommendation
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Current Services Subtab */}
      {activeTab === 'current-services' && (
        <div className="current-services-content">
          {isPending || !isActiveClient ? (
            <div className="locked-placeholder" style={{ textAlign: 'center', padding: '3rem', background: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <div className="locked-icon" style={{ marginBottom: '1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48" style={{ color: '#9CA3AF' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3 style={{ marginBottom: '0.5rem', color: '#374151' }}>Your Current Services</h3>
              <p style={{ color: '#6B7280', maxWidth: '400px', margin: '0 auto' }}>
                {isAdmin
                  ? `After this client chooses a plan and completes checkout, their active services will appear here with progress tracking and growth metrics.`
                  : `After you choose a plan and complete checkout, your active services will appear here with progress tracking and growth metrics.`
                }
              </p>
            </div>
          ) : subscriptionsLoading ? (
            <div className="loading-state">Loading services...</div>
          ) : (() => {
            // Get services from subscriptionService (includes discount info)
            const subData = subscriptions as any
            const servicesList = (subData?.services || []) as Array<{
              id: string
              name: string
              quantity: number
              price: number
              discountedPrice: number
              discountAmount: number
            }>
            const subscriptionInfo = subData?.subscription as {
              monthlyAmount: number
              monthlyAmountAfterDiscount: number
              totalDiscount: number
            } | null
            const discountsList = (subData?.discounts || []) as Array<{
              id: string
              couponCode: string | null
              couponName: string | null
              amountOff: number | null
              percentOff: number | null
            }>

            const hasServices = servicesList.length > 0

            // If no subscriptions but has purchased tier, fall back to recommendation items
            const fallbackItems = !hasServices && recommendation?.purchased_tier
              ? recommendation.recommendation_items.filter(item => item.tier === recommendation.purchased_tier)
              : []

            const hasAnyProducts = hasServices || fallbackItems.length > 0

            if (!hasAnyProducts) {
              return (
                <div className="no-services-message">
                  <div className="placeholder-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                      <polyline points="9 11 12 14 22 4"></polyline>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                  </div>
                  <h3>No Active Services Yet</h3>
                  <p>Once you select a plan from the Original Plan tab, your services will appear here.</p>
                </div>
              )
            }

            // Calculate totals - use discounted amounts if available
            let totalMonthly = 0
            let totalAfterDiscount = 0
            let totalDiscount = 0

            if (hasServices && subscriptionInfo) {
              totalMonthly = subscriptionInfo.monthlyAmount || 0
              totalAfterDiscount = subscriptionInfo.monthlyAmountAfterDiscount || totalMonthly
              totalDiscount = subscriptionInfo.totalDiscount || 0
            } else if (hasServices) {
              totalMonthly = servicesList.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
              totalAfterDiscount = servicesList.reduce((sum, item) => {
                const effectivePrice = item.discountedPrice !== undefined ? item.discountedPrice : item.price
                return sum + (effectivePrice * (item.quantity || 1))
              }, 0)
              totalDiscount = totalMonthly - totalAfterDiscount
            } else {
              totalMonthly = fallbackItems.reduce((sum, item) => sum + Number(item.monthly_price || 0), 0)
              totalAfterDiscount = totalMonthly
            }

            // Get the start date (from subscription object or recommendation)
            const startDate = subData?.subscription?.createdAt || recommendation?.purchased_at

            // Determine which items to display
            let displayItems: { id: string; name: string; desc: string; price: number; discountedPrice: number; discountAmount: number; isFree?: boolean }[] = []

            if (hasServices) {
              displayItems = servicesList.map(item => ({
                id: item.id,
                name: item.name || 'Service',
                desc: '',
                price: item.price * (item.quantity || 1),
                discountedPrice: (item.discountedPrice !== undefined ? item.discountedPrice : item.price) * (item.quantity || 1),
                discountAmount: item.discountAmount || 0,
              }))
            } else {
              displayItems = fallbackItems.map(item => ({
                id: item.id,
                name: item.product?.name || item.bundle?.name || item.addon?.name || 'Service',
                desc: item.product?.short_description || item.bundle?.description || item.addon?.description || '',
                price: Number(item.monthly_price || 0),
                discountedPrice: Number(item.monthly_price || 0),
                discountAmount: 0,
                isFree: item.is_free || false,
              }))
            }

            // Get coupon info for display
            const activeCoupon = discountsList.length > 0 ? discountsList[0] : null
            const couponDisplay = activeCoupon?.couponCode || activeCoupon?.couponName || null

            return (
              <div className="current-services-list">
                <div className="current-services-list-header">
                  <h3>{isAdmin ? `${displayName}'s Current Services` : 'Your Current Services'}</h3>
                  <span>Monthly Investment</span>
                </div>
                {displayItems.map(item => (
                  <div key={item.id} className="current-service-row">
                    <div className="current-service-icon">
                      {getServiceIcon(item.name)}
                    </div>
                    <div className="current-service-info">
                      <div className="current-service-name">
                        {item.name}
                        {item.isFree && <span className="free-badge">FREE</span>}
                        {item.discountAmount > 0 && <span className="discount-badge">-${item.discountAmount.toLocaleString()}</span>}
                      </div>
                      {item.desc && <div className="current-service-desc">{item.desc}</div>}
                    </div>
                    <div className="current-service-price">
                      {item.isFree ? (
                        <><strong>$0</strong><br /><span>included</span></>
                      ) : item.discountAmount > 0 ? (
                        <>
                          <strong>${item.discountedPrice.toLocaleString()}</strong>
                          <br />
                          <span style={{ textDecoration: 'line-through', color: '#9CA3AF', fontSize: '0.75rem' }}>${item.price.toLocaleString()}</span>
                          <span>/month</span>
                        </>
                      ) : (
                        <><strong>${item.price.toLocaleString()}</strong><br /><span>/month</span></>
                      )}
                    </div>
                  </div>
                ))}

                {/* Discount summary if applicable */}
                {totalDiscount > 0 && (
                  <div className="current-services-discount" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: '#F0FDF4',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    border: '1px solid #BBF7D0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" width="18" height="18">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                        <line x1="7" y1="7" x2="7.01" y2="7"></line>
                      </svg>
                      <span style={{ color: '#166534', fontWeight: 500 }}>
                        {couponDisplay ? `Coupon "${couponDisplay}" applied` : 'Discount applied'}
                      </span>
                    </div>
                    <span style={{ color: '#16A34A', fontWeight: 600 }}>
                      -${totalDiscount.toLocaleString()}/mo
                    </span>
                  </div>
                )}

                <div className="current-services-total">
                  <div className="current-services-total-label">
                    Total Monthly Investment
                    <span>{displayItems.length} active service{displayItems.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="current-services-total-value">
                    ${totalAfterDiscount.toLocaleString()}<span> per month</span>
                  </div>
                </div>

                {/* Admin-only: Subscription History */}
                {isAdmin && (
                  <div className="recommendation-history" style={{ marginTop: '2rem' }}>
                    <h4>Subscription History</h4>
                    {propStripeHistoryLoading ? (
                      <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: '0.5rem 0' }}>Loading subscription history...</p>
                    ) : !propStripeHistory || propStripeHistory.length === 0 ? (
                      <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: '0.5rem 0' }}>No subscription history available.</p>
                    ) : (
                      <ul className="history-list">
                        {propStripeHistory.map((event) => (
                          <li key={event.id} className="history-item">
                            <div className="history-date">
                              {new Date(event.date).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                timeZone: 'America/Chicago'
                              })}
                            </div>
                            <div className="history-content">
                              <span className="history-action">{event.action}</span>
                              <span className="history-details">{event.details}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Admin-only: Invoices Section */}
                {isAdmin && (
                  <div className="invoices-section" style={{ marginTop: '2rem', padding: '1.5rem', background: '#FAFAFA', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0 }}>Invoices</h4>
                    </div>

                    {propInvoicesLoading ? (
                      <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Loading invoices...</p>
                    ) : !propStripeCustomerId ? (
                      <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: '0.5rem 0' }}>No Stripe customer linked</p>
                    ) : !propInvoices || propInvoices.length === 0 ? (
                      <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: '0.5rem 0' }}>No invoices found</p>
                    ) : (
                      <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                          <thead>
                            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 500, color: '#6B7280' }}>Invoice</th>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 500, color: '#6B7280' }}>Date</th>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 500, color: '#6B7280' }}>Status</th>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 500, color: '#6B7280' }}>Amount</th>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 500, color: '#6B7280' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {propInvoices.map((invoice, index) => (
                              <tr key={invoice.id} style={{ borderBottom: index < propInvoices.length - 1 ? '1px solid #E5E7EB' : undefined }}>
                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                  <div style={{ fontWeight: 500, color: '#111827' }}>{invoice.number || invoice.id.slice(0, 10)}</div>
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', color: '#6B7280' }}>
                                  {invoice.created ? new Date(invoice.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.7rem',
                                    fontWeight: 500,
                                    background: invoice.status === 'paid' ? '#D1FAE5' : invoice.status === 'open' ? '#FEF3C7' : '#E5E7EB',
                                    color: invoice.status === 'paid' ? '#065F46' : invoice.status === 'open' ? '#92400E' : '#374151',
                                  }}>
                                    {invoice.status}
                                  </span>
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 500 }}>
                                  ${invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                  {invoice.invoicePdf && (
                                    <a
                                      href={invoice.invoicePdf}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-outline btn-sm"
                                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ marginRight: '0.25rem' }}>
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                      </svg>
                                      PDF
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Product Info Modal */}
      {modalContent && (
        <div className="product-info-modal-overlay" onClick={() => setModalContent(null)}>
          <div className="product-info-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="product-info-modal-close"
              onClick={() => setModalContent(null)}
              aria-label="Close modal"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div
              className="product-info-modal-content"
              dangerouslySetInnerHTML={{ __html: modalContent.html }}
            />
          </div>
        </div>
      )}

      {/* Add Recommendation Modal (Admin Only) */}
      {showAddProductModal && isAdmin && (
        <AddProductModal
          availableProducts={availableProducts.filter(
            p => !smartRecommendationItems.some(item => item.product_id === p.id)
          )}
          onAdd={(productId, whyNote, priceOption, couponCode) => handleAddProduct(productId, whyNote, priceOption, couponCode)}
          onClose={() => setShowAddProductModal(false)}
          saving={savingSmartRec}
        />
      )}

      {/* Edit Item Modal (Admin Only) */}
      {editingItem && isAdmin && (
        <EditItemModal
          item={editingItem}
          onSave={(whyNote, isFeatured, couponCode) => handleUpdateItem(editingItem.id, whyNote, isFeatured, couponCode)}
          onClose={() => setEditingItem(null)}
          saving={savingSmartRec}
        />
      )}

      {/* Product Detail Modal (Learn More) */}
      {selectedProduct && (
        <div className="product-modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <div className="product-modal-header">
              <h3>{selectedProduct.product.name}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedProduct(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="product-modal-body">
              {selectedProduct.product.long_description && (
                <div
                  className="product-long-description"
                  dangerouslySetInnerHTML={{ __html: selectedProduct.product.long_description }}
                />
              )}
              {selectedProduct.why_note && (
                <div className="product-why-note">
                  <strong>Why we recommend this:</strong> {selectedProduct.why_note}
                </div>
              )}
            </div>
            <div className="product-modal-footer">
              <div className="modal-price">
                {Number(selectedProduct.product.monthly_price) > 0 && Number(selectedProduct.product.onetime_price) > 0 ? (
                  <span>${formatPrice(Number(selectedProduct.product.monthly_price))}/mo for 12 months</span>
                ) : Number(selectedProduct.product.monthly_price) > 0 ? (
                  <span>${formatPrice(Number(selectedProduct.product.monthly_price))}/mo</span>
                ) : Number(selectedProduct.product.onetime_price) > 0 ? (
                  <span>${formatPrice(Number(selectedProduct.product.onetime_price))} one-time</span>
                ) : null}
              </div>
              <a
                href={`/checkout?product=${selectedProduct.product_id}&price=${selectedProduct.price_option || (Number(selectedProduct.product.monthly_price) > 0 ? 'monthly' : 'onetime')}${viewingAs ? `&viewingAs=${viewingAs}` : ''}`}
                className="btn btn-primary"
              >
                Add to Plan
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal for Add to Plan */}
      {showPasswordModal && (
        <div className="smart-rec-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="smart-rec-modal" onClick={(e) => e.stopPropagation()}>
            <div className="smart-rec-modal-header">
              <h3>Super Admin Verification</h3>
              <button className="modal-close-btn" onClick={() => setShowPasswordModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="smart-rec-modal-body">
              <p style={{ marginBottom: '1rem', color: '#666' }}>
                Adding items to a client's plan requires super admin authorization. Please enter the admin password to continue.
              </p>
              {pendingAddToPlan && (
                <p style={{ marginBottom: '1rem', fontWeight: 500 }}>
                  Adding: <strong>{pendingAddToPlan.item.product.name}</strong> ({pendingAddToPlan.priceType})
                </p>
              )}
              <div className="form-group">
                <label htmlFor="admin-password">Admin Password</label>
                <input
                  type="password"
                  id="admin-password"
                  value={addToPlanPassword}
                  onChange={(e) => {
                    setAddToPlanPassword(e.target.value)
                    setPasswordError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && addToPlanPassword) {
                      executeAddToPlan()
                    }
                  }}
                  placeholder="Enter admin password"
                  className="form-control"
                  autoFocus
                />
                {passwordError && (
                  <div style={{ color: '#DC2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    {passwordError}
                  </div>
                )}
              </div>
            </div>
            <div className="smart-rec-modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowPasswordModal(false)
                  setPendingAddToPlan(null)
                }}
                disabled={verifyingPassword}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={executeAddToPlan}
                disabled={!addToPlanPassword || verifyingPassword}
              >
                {verifyingPassword ? 'Verifying...' : 'Add to Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Confirmation Modal */}
      {showDeclineConfirm && pendingDecline && (
        <div className="smart-rec-modal-overlay" onClick={() => setShowDeclineConfirm(false)}>
          <div className="smart-rec-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="smart-rec-modal-header">
              <h3>Decline Recommendation</h3>
              <button className="modal-close-btn" onClick={() => setShowDeclineConfirm(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="smart-rec-modal-body">
              <p style={{ marginBottom: '1rem' }}>
                Are you sure you want to decline <strong>{pendingDecline.product.name}</strong>?
              </p>
              <p style={{ color: '#666', fontSize: '0.875rem' }}>
                This recommendation will be removed from your view. You can always contact us if you change your mind.
              </p>
            </div>
            <div className="smart-rec-modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeclineConfirm(false)
                  setPendingDecline(null)
                }}
                disabled={declining}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeclineConfirm}
                disabled={declining}
              >
                {declining ? 'Declining...' : 'Yes, Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Add Recommendation Modal Component
function AddProductModal({
  availableProducts,
  onAdd,
  onClose,
  saving,
}: {
  availableProducts: AvailableProduct[]
  onAdd: (productId: string, whyNote: string, priceOption: string | null, couponCode: string | null) => void
  onClose: () => void
  saving: boolean
}) {
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [whyNote, setWhyNote] = useState('')
  const [priceOption, setPriceOption] = useState<string>('auto')
  const [couponCode, setCouponCode] = useState('')

  // Get the selected product details
  const selectedProductData = availableProducts.find(p => p.id === selectedProduct)
  const hasMonthly = selectedProductData && Number(selectedProductData.monthly_price) > 0
  const hasOnetime = selectedProductData && Number(selectedProductData.onetime_price) > 0
  const hasBothPrices = hasMonthly && hasOnetime

  // Reset price option and auto-populate why note when product changes
  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId)
    setPriceOption('auto')
    // Auto-populate why note from product's default text
    const product = availableProducts.find(p => p.id === productId)
    if (product?.smart_rec_why_text) {
      setWhyNote(product.smart_rec_why_text)
    } else {
      setWhyNote('')
    }
  }

  return (
    <div className="smart-rec-modal-overlay" onClick={onClose}>
      <div className="smart-rec-modal" onClick={(e) => e.stopPropagation()}>
        <div className="smart-rec-modal-header">
          <h3>Add Recommendation</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="smart-rec-modal-body">
          <div className="form-group">
            <label htmlFor="product-select">Select Product</label>
            <select
              id="product-select"
              value={selectedProduct}
              onChange={(e) => handleProductChange(e.target.value)}
              className="form-control"
            >
              <option value="">Choose a product...</option>
              {availableProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.category}
                </option>
              ))}
            </select>
          </div>

          {/* Show product pricing info when selected */}
          {selectedProductData && (
            <div className="selected-product-info">
              <div className="product-pricing-display">
                {hasMonthly && (
                  <div className="price-badge monthly">
                    <span className="price-value">${Number(selectedProductData.monthly_price).toLocaleString()}</span>
                    <span className="price-label">/month</span>
                  </div>
                )}
                {hasOnetime && (
                  <div className="price-badge onetime">
                    <span className="price-value">${Number(selectedProductData.onetime_price).toLocaleString()}</span>
                    <span className="price-label">one-time</span>
                  </div>
                )}
              </div>

              {/* Pricing option selector - only show if product has both prices */}
              {hasBothPrices && (
                <div className="form-group pricing-options">
                  <label>Pricing Option</label>
                  <div className="pricing-option-buttons">
                    <button
                      type="button"
                      className={`pricing-option-btn ${priceOption === 'monthly' ? 'active' : ''}`}
                      onClick={() => setPriceOption('monthly')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      Monthly Only
                    </button>
                    <button
                      type="button"
                      className={`pricing-option-btn ${priceOption === 'onetime' ? 'active' : ''}`}
                      onClick={() => setPriceOption('onetime')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                      </svg>
                      One-Time Only
                    </button>
                    <button
                      type="button"
                      className={`pricing-option-btn ${priceOption === 'client_choice' ? 'active' : ''}`}
                      onClick={() => setPriceOption('client_choice')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <polyline points="17 11 19 13 23 9"></polyline>
                      </svg>
                      Client Chooses
                    </button>
                  </div>
                  <small className="pricing-option-hint">
                    {priceOption === 'monthly' && 'Only the monthly subscription price will be shown'}
                    {priceOption === 'onetime' && 'Only the one-time price will be shown'}
                    {priceOption === 'client_choice' && 'Client can choose between monthly or one-time'}
                    {priceOption === 'auto' && 'Select how pricing should be displayed'}
                  </small>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="why-note">Why we recommend this (optional)</label>
            <textarea
              id="why-note"
              value={whyNote}
              onChange={(e) => setWhyNote(e.target.value)}
              placeholder="Explain why this service would benefit the client..."
              className="form-control"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="coupon-code">Discount Code (optional)</label>
            <select
              id="coupon-code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="form-control"
            >
              <option value="">No discount code</option>
              {AVAILABLE_COUPON_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <small className="form-hint">Select a discount code to auto-apply at checkout</small>
          </div>
        </div>
        <div className="smart-rec-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              console.log('[DEBUG] Modal Add clicked - priceOption state:', priceOption, '- sending:', priceOption === 'auto' ? null : priceOption)
              onAdd(selectedProduct, whyNote, priceOption === 'auto' ? null : priceOption, couponCode || null)
            }}
            disabled={!selectedProduct || saving || (hasBothPrices && priceOption === 'auto')}
          >
            {saving ? 'Adding...' : 'Add Recommendation'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Edit Item Modal Component
function EditItemModal({
  item,
  onSave,
  onClose,
  saving,
}: {
  item: SmartRecommendationItem
  onSave: (whyNote: string, isFeatured: boolean, couponCode: string | null) => void
  onClose: () => void
  saving: boolean
}) {
  const [whyNote, setWhyNote] = useState(item.why_note || '')
  const [isFeatured, setIsFeatured] = useState(item.is_featured)
  const [couponCode, setCouponCode] = useState(item.coupon_code || '')

  return (
    <div className="smart-rec-modal-overlay" onClick={onClose}>
      <div className="smart-rec-modal" onClick={(e) => e.stopPropagation()}>
        <div className="smart-rec-modal-header">
          <h3>Edit Recommendation</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="smart-rec-modal-body">
          <div className="edit-product-info">
            <strong>{item.product.name}</strong>
            <span>{item.product.category}</span>
          </div>
          <div className="form-group">
            <label htmlFor="edit-why-note">Why we recommend this</label>
            <textarea
              id="edit-why-note"
              value={whyNote}
              onChange={(e) => setWhyNote(e.target.value)}
              placeholder="Explain why this service would benefit the client..."
              className="form-control"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-coupon-code">Discount Code</label>
            <select
              id="edit-coupon-code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="form-control"
            >
              <option value="">No discount code</option>
              {AVAILABLE_COUPON_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <small className="form-hint">Select a discount code to auto-apply at checkout</small>
          </div>
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              <span>Featured recommendation</span>
            </label>
            <small>Featured recommendations are highlighted at the top</small>
          </div>
        </div>
        <div className="smart-rec-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(whyNote, isFeatured, couponCode || null)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

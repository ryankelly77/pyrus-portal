'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useClientPageData, type ClientPageTab } from '@/hooks/use-client-page-data'
import { CommunicationItem, formatTimelineDate } from '@/components'
import { ContentView, ResultsView, WebsiteView, ActivityView, RecommendationsView, CommunicationView, WelcomeView } from '@/components/client-views'
import { EditClientModal, ResultAlertModal, AddProductModal } from '@/components/admin/clients/modals'
import {
  type MainTab,
  type GettingStartedSubtab,
  type ResultsSubtab,
  type RecommendationsSubtab,
  type ActivityFilter,
  type ClientPageDBClient,
  type RequestStatus,
  type EditRequest,
  type ClientData,
  type ChecklistItem,
  type OnboardingResponse,
  type OnboardingSummary,
  type OnboardingQuestion,
  type OnboardingFormData,
  type VideoChapter,
  type PageRecommendationItem,
  type RecommendationHistory,
  type PageRecommendation,
  type PageSubscriptionItem,
  type SubscriptionHistory,
  type PageSubscription,
  type StripeSubscriptionItem,
  type StripeSubscription,
  type StripeHistoryEvent,
  type ManualProduct,
  type TestProduct,
  type ContentProduct,
  type AvailableProduct,
  type Service,
  type BasecampActivity,
  type Activity,
  type Communication,
  type CommForExport,
  type PaymentMethod,
  type InvoiceLine,
  type Invoice,
  type StripeCustomer,
  type KeywordRow,
  type ResultAlertType,
  type EditFormData,
  AVATAR_COLORS,
} from '@/types'

// Type aliases to maintain compatibility with existing code
type DBClient = ClientPageDBClient
type RecommendationItem = PageRecommendationItem
type Recommendation = PageRecommendation
type SubscriptionItem = PageSubscriptionItem
type Subscription = PageSubscription

// Helper to generate initials from name (same as Clients page)
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Helper to generate a consistent color from a string (same as Clients page)
function getAvatarColor(str: string): string {
  const colors = ['#885430', '#2563EB', '#7C3AED', '#0B7277', '#DC2626', '#6B7280', '#059669', '#D97706']
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Helper to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// Format price - show cents only when there's a fractional part
function formatPrice(amount: number): string {
  const hasCents = amount % 1 !== 0
  if (hasCents) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return Math.round(amount).toLocaleString('en-US')
}

// Export communications to CSV
function exportCommunicationsToCSV(communications: CommForExport[], filename: string) {
  const headers = ['Date', 'Type', 'Title', 'Subject', 'Status', 'Direction', 'Source', 'Body']
  const rows = communications.map(comm => [
    comm.sentAt ? new Date(comm.sentAt).toLocaleString() : '',
    comm.type,
    comm.title,
    comm.subject || '',
    comm.status || '',
    comm.direction || '',
    comm.source || 'database',
    (comm.body || '').replace(/"/g, '""').substring(0, 500),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

// Use AVATAR_COLORS from types
const avatarColors = AVATAR_COLORS

// Client database (legacy hardcoded data for fallback)
const clients: Record<string, ClientData> = {
  'tc-clinical': {
    id: 'tc-clinical',
    name: 'TC Clinical Services',
    initials: 'TC',
    avatarColor: '#885430',
    email: 'dlg.mdservices@gmail.com',
    clientSince: 'Sep 2025',
    status: 'active',
    growthStage: 'sprouting',
    servicesCount: 4,
    hasWebsite: true,
    hasContent: true,
    websiteData: {
      domain: 'tc-clinicalservices.com',
      previewUrl: 'https://app.landingsite.ai/website-preview?id=8869fd44-f6ea-4bd7-bc24-92a7a14f17a5',
      plan: 'Seed Site (AI-Built)',
      carePlan: 'Website Care Plan',
      status: 'active',
      launchDate: 'Dec 30, 2025',
      hosting: {
        provider: 'Landingsite.ai',
        uptime: '99.9%',
        lastUpdated: 'Jan 3, 2026',
      },
    },
    editRequests: [
      { id: 1, title: 'Update contact page hours', type: 'Content Update', status: 'completed', date: 'Jan 3, 2026' },
      { id: 2, title: 'Add new wound care service page', type: 'New Feature', status: 'in-progress', date: 'Jan 2, 2026' },
      { id: 3, title: 'Fix mobile menu alignment', type: 'Bug Fix', status: 'completed', date: 'Dec 28, 2025' },
      { id: 4, title: 'Update footer contact info', type: 'Content Update', status: 'completed', date: 'Dec 20, 2025' },
    ],
    checklistProgress: { completed: 5, total: 6 },
  },
  'raptor-vending': {
    id: 'raptor-vending',
    name: 'Raptor Vending',
    initials: 'RV',
    avatarColor: '#2563EB',
    email: 'info@raptorvending.com',
    clientSince: 'Nov 2025',
    status: 'active',
    growthStage: 'seedling',
    servicesCount: 2,
    hasWebsite: false,
    hasContent: false,
    checklistProgress: { completed: 3, total: 6 },
  },
}

export default function ClientDetailPage() {
  const { user, hasNotifications } = useUserProfile()
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  // Tab state (declared before hook so it can be passed for lazy loading)
  const [activeTab, setActiveTab] = useState<ClientPageTab>('getting-started')

  // =========================================================================
  // DATA FROM CUSTOM HOOK
  // =========================================================================
  const {
    client: dbClient,
    isLoading,
    checklistItems,
    checklistLoading,
    videoChapters,
    onboardingSummary,
    summaryLoading,
    onboardingForm,
    onboardingFormLoading,
    recommendation,
    recommendationLoading,
    smartRecommendationsCount,
    subscriptions,
    subscriptionsLoading,
    subscriptionServicesCount,
    stripeSubscriptions,
    stripeSubscriptionsLoading,
    stripeHistory,
    stripeHistoryLoading,
    manualProducts,
    manualProductsLoading,
    availableProducts,
    testProducts,
    testProductsLoading,
    allProducts,
    availableContentProducts,
    contentServices,
    websiteServices,
    hasContentProductsFromApi,
    hasWebsiteProductsFromApi,
    approvedContentCount,
    basecampActivities,
    activitiesLoading,
    communications,
    communicationsLoading,
    invoices,
    stripeCustomer,
    stripeCustomerId,
    invoicesLoading,
    isSuperAdmin,
    // Actions
    refetchClient,
    refetchChecklist,
    refetchSmartRecsCount,
    refetchSubscriptions,
    refetchManualProducts,
    refetchTestProducts,
    refetchCommunications,
    refetchInvoices,
    refetchAvailableProducts,
    setManualProducts,
    setTestProducts,
    setChecklistItems,
    setCommunications,
    setSubscriptions,
    setSubscriptionServicesCount,
  } = useClientPageData(clientId, activeTab)

  // =========================================================================
  // UI STATE (kept in component)
  // =========================================================================
  const [activeSubtab, setActiveSubtab] = useState<GettingStartedSubtab>('questions')
  const [resultsSubtab, setResultsSubtab] = useState<ResultsSubtab>('overview')
  const [recommendationsSubtab, setRecommendationsSubtab] = useState<RecommendationsSubtab>('original-plan')
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [isClientView, setIsClientView] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // Checklist sync UI state
  const [syncingChecklist, setSyncingChecklist] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  // Video chapter selection
  const [activeVideoChapter, setActiveVideoChapter] = useState<string>('')

  // Set active video chapter when chapters load
  useEffect(() => {
    if (videoChapters.length > 0 && !activeVideoChapter) {
      setActiveVideoChapter(videoChapters[0].id)
    }
  }, [videoChapters, activeVideoChapter])

  // Add product modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [removingProductId, setRemovingProductId] = useState<string | null>(null)
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editingPriceValue, setEditingPriceValue] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)

  // Test products UI state
  const [addingTestProduct, setAddingTestProduct] = useState(false)
  const [removingTestProductId, setRemovingTestProductId] = useState<string | null>(null)

  // Content modals
  const [showContentRequirementsModal, setShowContentRequirementsModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ContentProduct | null>(null)

  // Result Alert modal
  const [showResultAlertModal, setShowResultAlertModal] = useState(false)

  // Communications UI state
  const [commFilter, setCommFilter] = useState<'all' | 'emails' | 'alerts' | 'sms' | 'chat' | 'content'>('all')
  const [commDateRange, setCommDateRange] = useState<'all' | '7days' | '30days' | '90days'>('all')
  const [showCommDateDropdown, setShowCommDateDropdown] = useState(false)
  const commDateDropdownRef = useRef<HTMLDivElement>(null)

  // Resend invitation state
  const [isResendingInvite, setIsResendingInvite] = useState(false)
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Fetch available products when add modal opens
  useEffect(() => {
    if (showAddProductModal) {
      refetchAvailableProducts(manualProducts, subscriptions)
    }
  }, [showAddProductModal, manualProducts, subscriptions, refetchAvailableProducts])

  // Fetch invoices when viewing billing tab
  useEffect(() => {
    if (activeTab === 'recommendations' && recommendationsSubtab === 'current-services') {
      refetchInvoices()
    }
  }, [activeTab, recommendationsSubtab, refetchInvoices])

  // Close date dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (commDateDropdownRef.current && !commDateDropdownRef.current.contains(event.target as Node)) {
        setShowCommDateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle adding a product to the plan
  const handleAddProductToPlan = (product: ContentProduct) => {
    const cartItem = {
      id: product.id,
      productId: product.id,
      name: product.name,
      description: product.short_description || '',
      quantity: 1,
      monthlyPrice: Number(product.monthly_price) || 0,
      onetimePrice: Number(product.onetime_price) || 0,
      pricingType: 'monthly' as const,
      category: 'product',
      supportsQuantity: product.supports_quantity || false,
    }

    // Store in sessionStorage and navigate to checkout
    sessionStorage.setItem(`checkout_${clientId}_addon`, JSON.stringify([cartItem]))
    router.push(`/admin/checkout/${clientId}?tier=addon`)
  }

  // Toggle checklist item completion
  const handleChecklistToggle = async (itemId: string, isCompleted: boolean) => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      })
      if (res.ok) {
        const updated: ChecklistItem = await res.json()
        setChecklistItems(items =>
          items.map(item => item.id === itemId ? updated : item)
        )
      }
    } catch (error) {
      console.error('Failed to toggle checklist item:', error)
    }
  }

  // Sync checklist items with onboarding responses
  const handleSyncChecklist = async () => {
    setSyncingChecklist(true)
    setSyncMessage(null)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/checklist/sync`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        // Refresh the checklist
        const refreshRes = await fetch(`/api/admin/clients/${clientId}/checklist`)
        if (refreshRes.ok) {
          setChecklistItems(await refreshRes.json())
        }
        // Show result message
        if (data.synced > 0) {
          setSyncMessage(`${data.synced} item${data.synced > 1 ? 's' : ''} synced`)
        } else {
          setSyncMessage('All synced')
        }
        // Clear message after 3 seconds
        setTimeout(() => setSyncMessage(null), 3000)
      }
    } catch (error) {
      console.error('Failed to sync checklist:', error)
      setSyncMessage('Sync failed')
      setTimeout(() => setSyncMessage(null), 3000)
    } finally {
      setSyncingChecklist(false)
    }
  }

  // Handle resending invitation email
  const handleResendInvitation = async () => {
    if (!dbClient) return

    setIsResendingInvite(true)
    setResendMessage(null)

    try {
      const res = await fetch(`/api/admin/clients/${clientId}/resend-invite`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend invitation')
      }

      if (data.emailSent) {
        setResendMessage({
          type: 'success',
          text: `Invitation sent to ${data.recipientEmail}`,
        })
      } else {
        setResendMessage({
          type: 'error',
          text: data.emailError || 'Invitation created but email not sent',
        })
      }

      // Refresh communications
      const commsRes = await fetch(`/api/admin/clients/${clientId}/communications`)
      if (commsRes.ok) {
        setCommunications(await commsRes.json())
      }

      // Clear message after 5 seconds
      setTimeout(() => setResendMessage(null), 5000)
    } catch (error) {
      console.error('Failed to resend invitation:', error)
      setResendMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to resend invitation',
      })
      setTimeout(() => setResendMessage(null), 5000)
    } finally {
      setIsResendingInvite(false)
    }
  }

  // Add product to client (manual products)
  const handleAddProduct = async (productId: string, notes: string) => {
    const res = await fetch(`/api/admin/clients/${clientId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        notes: notes || null,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setManualProducts(prev => [data, ...prev])
      setShowAddProductModal(false)
    } else {
      throw new Error(data.error || 'Failed to add product')
    }
  }

  // Remove product from client
  const handleRemoveProduct = async (clientProductId: string) => {
    if (!confirm('Remove this product from the client?')) return
    setRemovingProductId(clientProductId)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/products?clientProductId=${clientProductId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setManualProducts(prev => prev.filter(p => p.id !== clientProductId))
      }
    } catch (error) {
      console.error('Failed to remove product:', error)
    } finally {
      setRemovingProductId(null)
    }
  }

  // Update product price
  const handleUpdatePrice = async (clientProductId: string) => {
    const price = parseFloat(editingPriceValue)
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price')
      return
    }
    setSavingPrice(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientProductId,
          monthlyPrice: price,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setManualProducts(prev => prev.map(p => p.id === clientProductId ? data : p))
        setEditingPriceId(null)
        setEditingPriceValue('')
      } else {
        alert(data.error || 'Failed to update price')
      }
    } catch (error) {
      console.error('Failed to update price:', error)
      alert('Failed to update price')
    } finally {
      setSavingPrice(false)
    }
  }

  // Add test product
  const handleAddTestProduct = async (productId: string) => {
    setAddingTestProduct(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/test-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      if (res.ok) {
        await refetchTestProducts()
        // Refresh subscriptions to update feature flags
        await refetchSubscriptions()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to add product')
      }
    } catch (error) {
      console.error('Failed to add test product:', error)
      alert('Failed to add product')
    } finally {
      setAddingTestProduct(false)
    }
  }

  // Remove test product
  const handleRemoveTestProduct = async (productId: string) => {
    setRemovingTestProductId(productId)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/test-products?productId=${productId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await refetchTestProducts()
        // Refresh subscriptions to update feature flags
        await refetchSubscriptions()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to remove product')
      }
    } catch (error) {
      console.error('Failed to remove test product:', error)
      alert('Failed to remove product')
    } finally {
      setRemovingTestProductId(null)
    }
  }

  // Content upsell products - matched to database
  const contentUpsellProducts = {
    contentWriting: {
      id: '9c1028ad-0eb0-45ad-8896-9f186a165034',
      name: 'Content Writing',
      description: 'SEO and AI-optimized content up to 1,000 words for your blog or website.',
      monthlyPrice: 99,
      onetimePrice: 0,
      pricingType: 'monthly' as const,
      category: 'growth',
    },
    aiCreativeAssets: {
      id: '1d16c9f5-2311-4082-96e0-29c436fd1064',
      name: 'AI Creative Assets',
      description: 'A monthly package of custom visuals to fuel your social media, ads, and website.',
      monthlyPrice: 299,
      onetimePrice: 0,
      pricingType: 'monthly' as const,
      category: 'growth',
    },
    businessBranding: {
      id: 'e1716d43-4453-4197-941c-35e412bc004a',
      name: 'Business Branding Foundation',
      description: 'The strategic foundation every business needs. Four essential documents that guide all your marketing efforts.',
      monthlyPrice: 99,
      onetimePrice: 899,
      pricingType: 'monthly' as const,
      category: 'root',
    },
  }

  // Handler for adding upsell item to cart and navigating to checkout
  const handleAddToCart = (productKey: keyof typeof contentUpsellProducts, pricingType: 'monthly' | 'onetime' = 'monthly') => {
    const product = contentUpsellProducts[productKey]
    const cartItem = {
      id: product.id,
      productId: product.id, // Required for onboarding form to find questions
      name: product.name,
      description: product.description,
      quantity: 1,
      monthlyPrice: product.monthlyPrice,
      onetimePrice: product.onetimePrice,
      pricingType: pricingType,
      category: product.category,
    }

    // Store in sessionStorage for checkout page
    sessionStorage.setItem(`checkout_${clientId}_upsell`, JSON.stringify([cartItem]))

    // Navigate to checkout
    router.push(`/admin/checkout/${clientId}?tier=upsell`)
  }

  // Derived client data from database or fallback
  // isActiveClient is true if client has active status OR has active Stripe subscriptions
  const hasSubscriptions = stripeSubscriptions.some(s => s.status === 'active' && s.items.length > 0)
  const isActiveClient = (dbClient && (dbClient.status === 'active' || dbClient.status === 'onboarding')) || hasSubscriptions

  // Determine which tabs should be active based on integrations and purchased products
  const hasResultsAccess = !!dbClient?.agency_dashboard_share_key
  const hasActivityAccess = !!dbClient?.basecamp_project_id
  const hasWebsiteAccess = !!dbClient?.website_url

  // Check purchased products from ACTIVE Stripe subscriptions
  const activeSubscriptionProducts = Array.from(new Set(
    stripeSubscriptions
      .filter(sub => sub.status === 'active' && sub.items.length > 0)
      .flatMap(sub => sub.items)
      .map(item => (item.product?.name || '').toLowerCase())
      .filter(Boolean)
  ))

  // Use API flags (based on includes_content/includes_website product fields) when available
  // Fall back to name matching only while API is loading
  const websiteProductNames = ['bloom site', 'seedling site', 'seed site', 'harvest site', 'website care', 'wordpress care', 'harvest seo', 'harvest']
  const contentProductNames = ['content writing', 'blog writing', 'social media', 'content marketing', 'ai creative', 'branding foundation', 'harvest seo', 'harvest', 'google business profile', 'gbp']

  const hasWebsiteProductsByName = activeSubscriptionProducts.some(name =>
    websiteProductNames.some(wp => name.includes(wp))
  )
  const hasContentProductsByName = activeSubscriptionProducts.some(name =>
    contentProductNames.some(cp => name.includes(cp))
  )

  // Prefer API values when loaded, otherwise use name matching as fallback
  const hasWebsiteProducts = hasWebsiteProductsFromApi !== null ? hasWebsiteProductsFromApi : hasWebsiteProductsByName
  const hasContentProducts = hasContentProductsFromApi !== null ? hasContentProductsFromApi : hasContentProductsByName

  // Recommendation state - determines which template to show
  // Match client portal logic: check database status field, with Stripe as fallback
  const hasActiveSubscriptions = dbClient?.status !== 'pending' || stripeSubscriptions.some(s => s.status === 'active' && s.items.length > 0)

  // Determine if client is still in onboarding phase (< 30 days since start and not completed)
  const isOnboarding = dbClient?.start_date
    ? (Math.floor((Date.now() - new Date(dbClient.start_date).getTime()) / (1000 * 60 * 60 * 24)) < 30 && !dbClient.onboarding_completed_at)
    : !dbClient?.onboarding_completed_at
  const isEstablished = hasActiveSubscriptions && !isOnboarding
  const activeStripeSubscriptions = stripeSubscriptions.filter(s => s.status === 'active' && s.items.length > 0)
  const firstPurchaseDate = activeStripeSubscriptions.length > 0
    ? activeStripeSubscriptions.reduce((oldest, sub) =>
        new Date(sub.created) < new Date(oldest.created) ? sub : oldest
      ).created
    : null
  const daysSincePurchase = firstPurchaseDate
    ? Math.floor((new Date().getTime() - new Date(firstPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const daysUntilSmartRec = Math.max(0, 90 - daysSincePurchase)
  // 'pending' = not purchased, 'purchased' = purchased but < 90 days, 'smart_available' = 90+ days
  const recommendationState: 'pending' | 'purchased' | 'smart_available' =
    !hasActiveSubscriptions ? 'pending' :
    daysSincePurchase >= 90 ? 'smart_available' : 'purchased'

  // Generate website data only when preview URL is available in database
  const realWebsiteData = hasWebsiteAccess && dbClient ? {
    domain: `${dbClient.name.toLowerCase().replace(/\s+/g, '')}.com`,
    previewUrl: dbClient.landingsite_preview_url!,
    plan: 'Seed Site (AI-Built)', // TODO: Get from purchased products
    carePlan: 'Website Care Plan', // TODO: Get from purchased products
    status: 'active' as const,
    launchDate: 'Coming Soon', // TODO: Track actual launch date
    hosting: {
      provider: 'Landingsite.ai',
      uptime: '99.9%',
      lastUpdated: 'Jan 3, 2026',
    },
  } : undefined

  // Generate dummy edit requests for active clients
  const dummyEditRequests = isActiveClient ? [
    { id: 1, title: 'Update contact page hours', type: 'Content Update', status: 'completed' as RequestStatus, date: 'Jan 3, 2026' },
    { id: 2, title: 'Add new service page', type: 'New Feature', status: 'in-progress' as RequestStatus, date: 'Jan 2, 2026' },
    { id: 3, title: 'Fix mobile menu alignment', type: 'Bug Fix', status: 'completed' as RequestStatus, date: 'Dec 28, 2025' },
    { id: 4, title: 'Update footer contact info', type: 'Content Update', status: 'completed' as RequestStatus, date: 'Dec 20, 2025' },
  ] : undefined

  const client: ClientData = dbClient ? {
    id: dbClient.id,
    name: dbClient.name,
    initials: getInitials(dbClient.name),
    avatarColor: dbClient.avatar_color || getAvatarColor(dbClient.name),
    email: dbClient.contact_email || '',
    clientSince: formatDate(dbClient.created_at),
    status: (dbClient.status as 'active' | 'paused' | 'onboarding' | 'test' | 'prospect') || 'active',
    growthStage: (dbClient.growth_stage as 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting') || 'prospect',
    servicesCount: subscriptionServicesCount,
    hasWebsite: hasWebsiteProducts,
    hasContent: hasContentProducts,
    websiteData: realWebsiteData,
    editRequests: dummyEditRequests,
    checklistProgress: isActiveClient ? { completed: 5, total: 6 } : { completed: 0, total: 6 },
  } : clients['tc-clinical'] // Fallback to hardcoded data while loading

  // Activity data - varies by client (dummy data for now)
  const activitiesByClient: Record<string, Activity[]> = {
    'tc-clinical': [
      { id: 1, type: 'content' as const, title: 'Content approved and published', description: '"January Services Update" blog post is now live on your website', time: 'Today, 3:30 PM' },
      { id: 2, type: 'alert' as const, title: 'Keyword reached Page 1!', description: '"precision wound care San Antonio" moved to position #7', time: 'Today, 2:45 PM' },
      { id: 3, type: 'content' as const, title: 'New content ready for review', description: '"Q1 2026 Marketing Goals" blog post submitted for your approval', time: 'Today, 11:00 AM' },
      { id: 4, type: 'task' as const, title: 'Monthly blog post published', description: '"5 Signs Your Wound Care Needs a Specialist" is now live', time: 'Today, 10:30 AM' },
      { id: 5, type: 'alert' as const, title: 'Traffic milestone: 2,500 visitors!', description: 'Monthly website traffic exceeded 2,500 unique visitors', time: 'Yesterday, 4:30 PM' },
      { id: 6, type: 'update' as const, title: 'Google Ads campaign optimized', description: 'Adjusted bid strategy based on conversion data', time: 'Yesterday, 3:00 PM' },
      { id: 7, type: 'task' as const, title: 'Google Business Profile updated', description: 'Added new photos and updated business hours', time: 'Yesterday, 11:15 AM' },
      { id: 8, type: 'task' as const, title: 'Website launched!', description: 'tc-clinicalservices.com is now live and indexed by Google', time: 'Dec 30, 4:00 PM' },
    ],
    'raptor-vending': [
      { id: 1, type: 'update' as const, title: 'Google Ads campaign launched', description: 'Search campaign now live targeting vending machine keywords', time: 'Today, 2:00 PM' },
      { id: 2, type: 'alert' as const, title: 'First lead received!', description: 'New lead from Google Ads: Office building in Austin', time: 'Today, 11:30 AM' },
      { id: 3, type: 'task' as const, title: 'Google Business Profile claimed', description: 'Business verified and profile optimized', time: 'Yesterday, 4:00 PM' },
      { id: 4, type: 'update' as const, title: 'Ad copy approved', description: 'Client approved Google Ads copy and extensions', time: 'Jan 3, 2026' },
      { id: 5, type: 'task' as const, title: 'Onboarding completed', description: 'Initial setup and strategy call completed', time: 'Jan 2, 2026' },
    ],
  }

  const activities: Activity[] = activitiesByClient[clientId] || activitiesByClient['tc-clinical']

  const filteredActivities = activities.filter(
    (activity: Activity) => activityFilter === 'all' || activity.type === activityFilter
  )

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'completed':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )
      case 'in-progress':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        )
      case 'pending':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        )
    }
  }

  // Show loading state - wait for both client AND stripe subscriptions to load
  // This prevents a flash of incorrect tab states while stripe data loads
  if (isLoading || stripeSubscriptionsLoading) {
    return (
      <>
        <AdminHeader
          title="Client Details"
          user={user}
          hasNotifications={hasNotifications}
          breadcrumb={
            <>
              <Link href="/admin/clients">Clients</Link>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span>Loading...</span>
            </>
          }
        />
        <div className="admin-content">
          <div className="loading-state">
            <p>Loading client details...</p>
          </div>
        </div>
      </>
    )
  }

  // Show not found state
  if (!dbClient) {
    return (
      <>
        <AdminHeader
          title="Client Details"
          user={user}
          hasNotifications={hasNotifications}
          breadcrumb={
            <>
              <Link href="/admin/clients">Clients</Link>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span>Not Found</span>
            </>
          }
        />
        <div className="admin-content">
          <div className="no-results">
            <p>Client not found. <Link href="/admin/clients">Return to Clients</Link></p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Client Details"
        user={user}
        hasNotifications={hasNotifications}
        breadcrumb={
          <>
            <Link href="/admin/clients">Clients</Link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span>{client.name}</span>
          </>
        }
        actions={
          <Link href={`/getting-started?viewingAs=${params.id}`} className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            View as Client
          </Link>
        }
      />

      <div className="admin-content">
        {/* Client Header Card */}
        <div className="client-header-card">
          <div className="client-header">
            <div className="client-info">
              <div className="client-avatar" style={{ background: client.avatarColor }}>{client.initials}</div>
              <div className="client-details">
                <h1>
                  {client.name}
                  {(() => {
                    // Use same logic as client list page - based on db status/growth_stage
                    const growthStage = dbClient?.growth_stage || 'prospect'
                    const isProspect = growthStage === 'prospect'
                    let displayStatus: 'active' | 'inactive' | 'paused' | 'prospect' | 'test' = 'active'
                    if (dbClient?.status === 'test') {
                      displayStatus = 'test'
                    } else if (dbClient?.status === 'inactive') {
                      displayStatus = 'inactive'
                    } else if (dbClient?.status === 'paused') {
                      displayStatus = 'paused'
                    } else if (dbClient?.status === 'pending' || isProspect) {
                      displayStatus = 'prospect'
                    }
                    const labels: Record<string, string> = {
                      active: 'Active',
                      inactive: 'Inactive',
                      paused: 'Paused',
                      prospect: 'Prospect',
                      test: 'Test',
                    }
                    return (
                      <span className={`status-badge ${displayStatus}`}>
                        {labels[displayStatus]}
                      </span>
                    )
                  })()}
                  {/* Content Approval Mode Badge */}
                  {(() => {
                    const mode = dbClient?.content_approval_mode || 'full_approval'
                    const badges: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
                      full_approval: {
                        label: 'Full Approval',
                        color: '#1D4ED8',
                        bg: '#DBEAFE',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                          </svg>
                        ),
                      },
                      initial_approval: {
                        label: 'Initial Approval',
                        color: '#B45309',
                        bg: '#FEF3C7',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                          </svg>
                        ),
                      },
                      auto: {
                        label: 'Auto Approve',
                        color: '#047857',
                        bg: '#D1FAE5',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ),
                      },
                    }
                    const badge = badges[mode] || badges.full_approval
                    return (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginLeft: '8px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 500,
                          borderRadius: '9999px',
                          background: badge.bg,
                          color: badge.color,
                        }}
                        title={`Content approval mode: ${badge.label}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                    )
                  })()}
                </h1>
                <p className="client-meta">
                  {client.email}
                  {(() => {
                    // Use Stripe subscriptions for accurate "Client since" date
                    const activeStripeSubs = stripeSubscriptions.filter(s => s.status === 'active' && s.items.length > 0)
                    if (activeStripeSubs.length > 0) {
                      // Find the oldest subscription creation date from Stripe
                      const oldestSub = activeStripeSubs.reduce((oldest, sub) =>
                        new Date(sub.created) < new Date(oldest.created) ? sub : oldest
                      )
                      const date = new Date(oldestSub.created)
                      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      return ` • Client since ${monthYear}`
                    } else if (dbClient?.created_at) {
                      const date = new Date(dbClient.created_at)
                      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      return ` • Prospect since ${monthYear}`
                    }
                    return ''
                  })()}
                  {' • '}
                  <span
                    className="services-link"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setActiveTab('recommendations')
                      setRecommendationsSubtab('current-services')
                    }}
                  >{subscriptionServicesCount} services</span>
                </p>
              </div>
            </div>
            <div className="header-actions">
              {resendMessage && (
                <span style={{
                  fontSize: '13px',
                  color: resendMessage.type === 'success' ? '#059669' : '#DC2626',
                  padding: '6px 12px',
                  background: resendMessage.type === 'success' ? '#E8F5E9' : '#FEE2E2',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {resendMessage.text}
                </span>
              )}
              {hasActiveSubscriptions && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowResultAlertModal(true)}
                  disabled={!dbClient?.contact_email}
                  title={!dbClient?.contact_email ? 'No contact email on file' : 'Send a result alert email to this client'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  Send Result Alert
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={handleResendInvitation}
                disabled={isResendingInvite || !recommendation || !dbClient?.contact_email}
                title={!dbClient?.contact_email ? 'No contact email on file' : !recommendation ? 'No recommendation to send' : 'Resend proposal invitation email'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                {isResendingInvite ? 'Sending...' : 'Resend Invitation'}
              </button>
              <button className="btn btn-primary" onClick={() => setShowEditModal(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                Edit Client
              </button>
            </div>
          </div>
        </div>

        {/* Test Products Section - Only for test clients */}
        {dbClient?.status === 'test' && (
          <div className="test-products-section" style={{
            background: 'linear-gradient(135deg, #EDE9FE 0%, #F3E8FF 100%)',
            border: '1px solid #DDD6FE',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#7C3AED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="20" height="20">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#5B21B6', margin: 0 }}>Test Products</h3>
                  <p style={{ fontSize: '13px', color: '#7C3AED', margin: 0 }}>Add/remove products to test feature activation without checkout</p>
                </div>
              </div>
              <select
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #C4B5FD',
                  background: 'white',
                  color: '#5B21B6',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddTestProduct(e.target.value)
                    e.target.value = ''
                  }
                }}
                disabled={addingTestProduct}
              >
                <option value="">+ Add Product...</option>
                {allProducts
                  .filter(p => !testProducts.some(tp => tp.product_id === p.id))
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                  ))}
              </select>
            </div>

            {testProductsLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#7C3AED' }}>Loading test products...</div>
            ) : testProducts.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.5)',
                borderRadius: '8px',
                color: '#6B7280',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32" style={{ margin: '0 auto 8px' }}>
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <p style={{ margin: 0 }}>No test products added yet. Select a product from the dropdown to add it.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {testProducts.map(product => (
                  <div
                    key={product.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: 'white',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, color: '#1F2937', fontSize: '14px' }}>{product.name}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        {product.category} {product.monthly_price > 0 && `• $${product.monthly_price}/mo`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveTestProduct(product.product_id)}
                      disabled={removingTestProductId === product.product_id}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        color: '#9CA3AF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Remove product"
                    >
                      {removingTestProductId === product.product_id ? (
                        <div style={{ width: '16px', height: '16px', border: '2px solid #7C3AED', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button className={`tab-btn ${activeTab === 'getting-started' ? 'active' : ''}`} onClick={() => setActiveTab('getting-started')}>
            {!hasActiveSubscriptions ? 'Welcome' : isOnboarding ? 'Getting Started' : 'Welcome'}
          </button>
          <button className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>
            Results
            {!hasActiveSubscriptions && <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
            {hasActiveSubscriptions && !hasResultsAccess && <span className="tab-badge coming-soon">Coming Soon</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
            Activity
            {!hasActiveSubscriptions && <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
            {hasActiveSubscriptions && !hasActivityAccess && <span className="tab-badge coming-soon">Coming Soon</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'website' ? 'active' : ''}`} onClick={() => setActiveTab('website')}>
            Website
            {!hasActiveSubscriptions && <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
            {hasActiveSubscriptions && hasWebsiteProducts && !hasWebsiteAccess && <span className="tab-badge coming-soon">Coming Soon</span>}
            {hasActiveSubscriptions && !hasWebsiteProducts && <span className="tab-badge inactive">Inactive</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>
            Content
            {!hasActiveSubscriptions && <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
            {hasActiveSubscriptions && hasContentProducts && approvedContentCount === 0 && <span className="tab-badge coming-soon">Coming Soon</span>}
            {hasActiveSubscriptions && !hasContentProducts && <span className="tab-badge inactive">Inactive</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>
            Recommendations
            {smartRecommendationsCount > 0 && (
              <span className={`tab-badge count${activeTab === 'recommendations' ? ' active' : ''}`}>{smartRecommendationsCount}</span>
            )}
          </button>
          <button className={`tab-btn ${activeTab === 'communication' ? 'active' : ''}`} onClick={() => setActiveTab('communication')}>
            Communication
            {!hasActiveSubscriptions && <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
          </button>
        </div>

        {/* ==================== GETTING STARTED TAB ==================== */}
        {activeTab === 'getting-started' && (
          <>
            {!hasActiveSubscriptions ? (
              /* Pending Client Welcome View */
              <div className="pending-client-view">
                {/* Welcome Section */}
                <div className="welcome-hero">
                  <div className="welcome-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <h2>Welcome to Pyrus, {dbClient?.contact_name || dbClient?.name || 'Client'}!</h2>
                  <p>We&apos;ve prepared a personalized marketing proposal for {dbClient?.name}. Review your options and choose the plan that fits your goals.</p>
                </div>

                {/* Three Column Action Cards */}
                <div className="pending-action-grid three-col">
                  {/* View Recommendation Card */}
                  <div className="pending-action-card primary">
                    <div className="action-card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </div>
                    <h3>View Your Proposal</h3>
                    <p>We&apos;ve analyzed your business and prepared tailored marketing recommendations with transparent pricing.</p>
                    <Link
                      href={`/recommendations?viewingAs=${clientId}`}
                      className="btn btn-primary"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      Review Recommendations
                    </Link>
                  </div>

                  {/* Why Choose Pyrus Card */}
                  <div className="pending-action-card">
                    <div className="action-card-icon secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h3>Why Choose Pyrus?</h3>
                    <div className="benefits-list">
                      <div className="benefit-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>30-day money-back guarantee</span>
                      </div>
                      <div className="benefit-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Month-to-month, no contracts</span>
                      </div>
                      <div className="benefit-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>AI-powered marketing tools</span>
                      </div>
                      <div className="benefit-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Local business expertise</span>
                      </div>
                    </div>
                    <div className="tagline-small">Simple. Scalable. Results-driven.</div>
                  </div>

                  {/* What Happens Next Card */}
                  <div className="pending-action-card">
                    <div className="action-card-icon secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <h3>What Happens Next?</h3>
                    <div className="next-steps-list">
                      <div className="next-step">
                        <span className="step-num">1</span>
                        <span>Review your personalized proposal</span>
                      </div>
                      <div className="next-step">
                        <span className="step-num">2</span>
                        <span>Select a plan that fits your goals</span>
                      </div>
                      <div className="next-step">
                        <span className="step-num">3</span>
                        <span>Complete quick onboarding questions</span>
                      </div>
                      <div className="next-step">
                        <span className="step-num">4</span>
                        <span>We get to work growing your business!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isEstablished ? (
              /* Established Client Welcome Dashboard */
              <WelcomeView clientId={clientId} isAdmin={true} />
            ) : (
              <>
            {/* Getting Started Sub-tabs - for onboarding clients */}
            <div className="getting-started-subtabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className={`getting-started-subtab ${activeSubtab === 'questions' ? 'active' : ''}`}
                  onClick={() => setActiveSubtab('questions')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  Questions
                </button>
                <button
                  className={`getting-started-subtab ${activeSubtab === 'checklist' ? 'active' : ''}`}
                  onClick={() => setActiveSubtab('checklist')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Checklist
                </button>
                <button
                  className={`getting-started-subtab ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`}
                  onClick={() => setActiveSubtab('onboarding-summary')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Summary
                </button>
              </div>
              {activeSubtab === 'checklist' && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {resendMessage && (
                    <span style={{
                      fontSize: '13px',
                      color: resendMessage.type === 'success' ? '#059669' : '#DC2626',
                      padding: '4px 8px',
                      background: resendMessage.type === 'success' ? '#E8F5E9' : '#FEE2E2',
                      borderRadius: '4px',
                    }}>
                      {resendMessage.text}
                    </span>
                  )}
                  {recommendation && (
                    <button
                      onClick={handleResendInvitation}
                      disabled={isResendingInvite || !dbClient?.contact_email}
                      className="getting-started-subtab"
                      title={!dbClient?.contact_email ? 'No contact email on file' : 'Resend proposal invitation email'}
                      style={{ opacity: isResendingInvite || !dbClient?.contact_email ? 0.6 : 1 }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                      {isResendingInvite ? 'Sending...' : 'Resend Invitation'}
                    </button>
                  )}
                  <button
                    onClick={handleSyncChecklist}
                    disabled={syncingChecklist || !!syncMessage}
                    className="getting-started-subtab"
                    title="Re-sync checklist with onboarding responses"
                    style={{ opacity: syncingChecklist ? 0.6 : 1 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    {syncMessage || (syncingChecklist ? 'Syncing...' : 'Sync')}
                  </button>
                </div>
              )}
            </div>

            {/* Questions Tab Content */}
            <div className={`gs-tab-content ${activeSubtab === 'questions' ? 'active' : ''}`} id="questions">
              {dbClient?.onboarding_completed_at ? (
                /* Onboarding Complete State */
                <div className="onboarding-questions">
                  <div className="questions-card">
                    <div className="onboarding-complete-banner">
                      <div className="complete-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <h3>Onboarding Complete</h3>
                      <p>All onboarding questions have been completed.</p>
                      <p style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: '0.5rem' }}>
                        Completed on {new Date(dbClient.onboarding_completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setActiveSubtab('onboarding-summary')}
                        style={{ marginTop: '1rem' }}
                      >
                        View Summary
                      </button>
                    </div>
                  </div>
                </div>
              ) : onboardingFormLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: 40, height: 40 }}></div>
                </div>
              ) : onboardingForm?.hasProducts && onboardingForm.questions.length > 0 ? (
                <div className="onboarding-questions">
                  {/* Progress Header */}
                  <div className="questions-card">
                    <div className="questions-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600, color: '#1A1F16' }}>Onboarding Questions</h3>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>View and manage client onboarding responses</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#324438' }}>
                            {onboardingForm.progress.percent}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {onboardingForm.progress.answered} of {onboardingForm.progress.total} completed
                          </div>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#E5E7EB', borderRadius: '3px', marginTop: '1rem' }}>
                        <div style={{ width: `${onboardingForm.progress.percent}%`, height: '100%', background: '#22C55E', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Questions by Section */}
                  {Object.entries(onboardingForm.grouped).map(([section, questions]) => (
                    <div key={section} className="questions-card">
                      <div className="questions-header">
                        <h3>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          {section}
                        </h3>
                      </div>
                      <div className="questions-content">
                        {questions.map((q) => (
                          <div key={q.id} className="summary-field">
                            <label>
                              {q.questionText}
                              {q.isRequired && <span style={{ color: '#DC2626', marginLeft: '4px' }}>*</span>}
                            </label>
                            {q.helpText && (
                              <p className="help-text">{q.helpText}</p>
                            )}
                            <div className={`answer-box ${q.response ? 'answered' : 'unanswered'}`}>
                              {q.response ? (
                                q.response.text || (q.response.options && q.response.options.join(', ')) || 'Answered'
                              ) : (
                                'Not answered yet'
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="inactive-service-container">
                  <div className="inactive-service-card">
                    <div className="inactive-service-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="48" height="48">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <h3>No Onboarding Questions</h3>
                    <p>
                      {onboardingForm?.hasProducts === false
                        ? `${dbClient?.name} doesn't have any active services yet. Onboarding questions will appear here once they have purchased services.`
                        : `No onboarding question templates have been configured for ${dbClient?.name}'s services. Add question templates in Settings to see them here.`
                      }
                    </p>
                    <div className="inactive-service-info" style={{ marginTop: '1.5rem' }}>
                      <h4>What you&apos;ll see here:</h4>
                      <ul>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Business information and goals
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Target audience details
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Brand preferences and guidelines
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Service-specific requirements
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Checklist Tab Content */}
            <div className={`gs-tab-content ${activeSubtab === 'checklist' ? 'active' : ''}`} id="checklist">
              <div className="onboarding-grid">
                {dbClient?.onboarding_completed_at ? (
                  /* Onboarding Complete State */
                  <div className="checklist-card">
                    <div className="onboarding-complete-banner">
                      <div className="complete-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <h3>Onboarding Complete</h3>
                      <p>All onboarding tasks have been completed. The account is ready to go!</p>
                      <p style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: '0.5rem' }}>
                        Completed on {new Date(dbClient.onboarding_completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setActiveSubtab('onboarding-summary')}
                        style={{ marginTop: '1rem' }}
                      >
                        View Summary
                      </button>
                    </div>
                  </div>
                ) : (
                <div className="checklist-card">
                  <div className="checklist-header">
                    <h3>Onboarding Checklist</h3>
                    <p>Complete these steps to get the most from your marketing</p>
                    {checklistItems.length > 0 && (
                      <div className="progress-bar-container">
                        <div className="progress-bar-label">
                          <span>Progress</span>
                          <span>{checklistItems.filter(i => i.isCompleted).length} of {checklistItems.length} completed</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${checklistItems.length > 0
                                ? (checklistItems.filter(i => i.isCompleted).length / checklistItems.length) * 100
                                : 0}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="checklist-items">
                    {checklistLoading ? (
                      <div className="checklist-loading">Loading checklist...</div>
                    ) : checklistItems.length === 0 ? (
                      <div className="checklist-empty">
                        <p>No checklist items yet. Items will appear here after purchase.</p>
                      </div>
                    ) : (
                      checklistItems.map((item) => (
                        <div
                          key={item.id}
                          className={`checklist-item ${item.isCompleted ? 'completed' : ''}`}
                          onClick={() => handleChecklistToggle(item.id, item.isCompleted)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className={`checklist-checkbox ${item.isCompleted ? 'completed' : ''}`}>
                            {item.isCompleted && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                          <div className="checklist-item-content">
                            <div className="checklist-item-title">{item.title}</div>
                            <div className="checklist-item-desc">
                              {item.isCompleted && item.completedAt
                                ? `Completed ${new Date(item.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                : item.description || `From ${item.product.name}`
                              }
                            </div>
                          </div>
                          {item.actionType === 'link' && item.actionUrl && !item.isCompleted && (
                            <div className="checklist-item-action" onClick={(e) => e.stopPropagation()}>
                              <a href={item.actionUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                                {item.actionLabel || 'Open'}
                              </a>
                            </div>
                          )}
                          {item.actionType === 'button' && !item.isCompleted && (
                            <div className="checklist-item-action" onClick={(e) => e.stopPropagation()}>
                              <button className="btn btn-secondary">{item.actionLabel || 'Action'}</button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                )}
                <div>
                  <div className="sidebar-card video-sidebar">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      Getting Started Videos
                    </h4>
                    {videoChapters.length > 0 ? (
                      <>
                        <div className="video-player-wrapper" style={{ position: 'relative', paddingTop: '56.25%', background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                          {(() => {
                            const activeChapter = videoChapters.find(c => c.id === activeVideoChapter)
                            return activeChapter?.videoUrl ? (
                              <iframe
                                src={activeChapter.videoUrl}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                allowFullScreen
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                              />
                            ) : null
                          })()}
                        </div>
                        <div className="video-chapter-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {videoChapters.map((chapter, index) => (
                            <button
                              key={chapter.id}
                              onClick={() => setActiveVideoChapter(chapter.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                background: activeVideoChapter === chapter.id ? 'rgba(136, 84, 48, 0.08)' : 'transparent',
                                border: activeVideoChapter === chapter.id ? '1px solid rgba(136, 84, 48, 0.2)' : '1px solid transparent',
                                borderRadius: '8px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                width: '100%',
                              }}
                            >
                              <span style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: activeVideoChapter === chapter.id ? '#885430' : '#E8EDEA',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: activeVideoChapter === chapter.id ? 'white' : '#5A6358',
                                flexShrink: 0,
                              }}>{index + 1}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#1A1F16', marginBottom: '0.125rem' }}>{chapter.title}</span>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#5A6358', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chapter.description}</span>
                              </div>
                              {activeVideoChapter === chapter.id && (
                                <svg viewBox="0 0 24 24" fill="#885430" width="14" height="14" style={{ flexShrink: 0, marginTop: '0.25rem' }}>
                                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="video-container">
                        <div className="video-placeholder">
                          <div className="video-play-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                          </div>
                        </div>
                        <p className="video-caption">Videos coming soon! Learn how to navigate your portal and get the most from your marketing partnership.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Onboarding Summary Tab Content */}
            <div className={`gs-tab-content ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`} id="onboarding-summary">
              <div className="onboarding-summary">
                {/* Client Info Section - from database */}
                <div className="summary-card">
                  <div className="summary-card-header">
                    <h3>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      Client Info
                    </h3>
                  </div>
                  <div className="summary-card-content">
                    <div className="summary-field">
                      <label>Contact Name</label>
                      <div className={`answer-box ${dbClient?.contact_name ? 'answered' : 'unanswered'}`}>
                        {dbClient?.contact_name || 'Not provided'}
                      </div>
                    </div>
                    <div className="summary-field">
                      <label>Company</label>
                      <div className={`answer-box ${dbClient?.name ? 'answered' : 'unanswered'}`}>
                        {dbClient?.name || 'Not provided'}
                      </div>
                    </div>
                    <div className="summary-field">
                      <label>Email</label>
                      <div className={`answer-box ${dbClient?.contact_email ? 'answered' : 'unanswered'}`}>
                        {dbClient?.contact_email || 'Not provided'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Onboarding Responses */}
                {summaryLoading ? (
                  <div className="summary-card" style={{ padding: '1.5rem' }}>
                    <p>Loading onboarding responses...</p>
                  </div>
                ) : onboardingSummary && Object.keys(onboardingSummary).length > 0 ? (
                  Object.entries(onboardingSummary).map(([section, responses]) => (
                    <div key={section} className="summary-card">
                      <div className="summary-card-header">
                        <h3>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          {section}
                        </h3>
                      </div>
                      <div className="summary-card-content">
                        {responses.map((response) => (
                          <div key={response.id} className="summary-field">
                            <label>{response.question}</label>
                            <div className={`answer-box ${response.answer ? 'answered' : 'unanswered'}`}>
                              {response.answer || 'Not answered yet'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="summary-card" style={{ padding: '1.5rem' }}>
                    <p style={{ color: '#6B7280', fontStyle: 'italic' }}>No onboarding responses yet. The client will complete the onboarding form after checkout.</p>
                  </div>
                )}
              </div>
            </div>
              </>
            )}
          </>
        )}

        {/* ==================== RESULTS TAB ==================== */}
        {activeTab === 'results' && (
          <div className="results-content">
            {hasResultsAccess ? (
              /* Active Results - use shared ResultsView component */
              <ResultsView clientId={clientId} isAdmin={true} proDashboardUrl={dbClient?.agency_dashboard_share_key || undefined} />
            ) : checklistItems.length > 0 ? (
              /* Service purchased but not yet activated */
              <div className="coming-soon-placeholder">
                <div className="coming-soon-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </div>
                <h2>Results Coming Soon</h2>
                <p>We&apos;re setting up {dbClient?.name}&apos;s analytics dashboard. Marketing performance metrics, keyword rankings, and lead tracking will appear here once campaigns are active.</p>
                <div className="coming-soon-timeline">
                  <div className="timeline-item">
                    <div className="timeline-dot active"></div>
                    <span>Account setup complete</span>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-dot pending"></div>
                    <span>Campaign configuration in progress</span>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-dot pending"></div>
                    <span>Analytics dashboard connection</span>
                  </div>
                </div>
              </div>
            ) : (
              /* No service - Upsell */
              <div className="inactive-service-container">
                <div className="inactive-service-card">
                  <div className="inactive-service-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                  </div>
                  <h3>Results Dashboard Not Active</h3>
                  <p>This client does not currently have marketing services. Activate a marketing plan to track their website performance, SEO rankings, and lead generation.</p>

                  <div className="inactive-service-actions">
                    <button className="btn btn-primary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                      </svg>
                      Create Recommendation
                    </button>
                    <button className="btn btn-secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                      </svg>
                      View Marketing Plans
                    </button>
                  </div>
                </div>

                <div className="inactive-service-info">
                  <h4>Marketing Services Include:</h4>
                  <ul>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      SEO optimization and keyword tracking
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Google Ads management
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Website analytics and reporting
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Lead generation tracking
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Monthly performance reports
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== ACTIVITY TAB ==================== */}
        {activeTab === 'activity' && (
          <div className="activity-content">
            <ActivityView clientId={clientId} isAdmin={true} clientName={dbClient?.name} />
          </div>
        )}

        {/* ==================== WEBSITE TAB ==================== */}
        {activeTab === 'website' && (
          <div className="website-tab-content">
            <WebsiteView clientId={clientId} isAdmin={true} clientName={dbClient?.name} websiteServices={websiteServices} />
          </div>
        )}

        {/* ==================== CONTENT TAB ==================== */}
        {activeTab === 'content' && (
          <div className="content-manager-tab">
            {hasContentProducts ? (
              /* Content products purchased - use shared ContentView component */
              <ContentView
                clientId={clientId}
                isAdmin={true}
                subscriptionServices={(subscriptions as any)?.services || []}
                availableContentProducts={availableContentProducts}
                contentServices={contentServices}
                onProductClick={(product) => {
                  // Cast to local ContentProduct type
                  setSelectedProduct(product as ContentProduct)
                  setShowProductModal(true)
                }}
                onViewContentRequirements={() => setShowContentRequirementsModal(true)}
              />
            ) : (
              /* Upsell - no content products purchased */
              <div className="content-upsell-container">
                {/* Hero Section */}
                <div className="content-hero">
                  <div className="content-hero-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                      <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                      <path d="M2 2l7.586 7.586"></path>
                      <circle cx="11" cy="11" r="2"></circle>
                    </svg>
                  </div>
                  <h2 className="content-hero-title">Content is the Engine Behind Your Growth</h2>
                  <p className="content-hero-subtitle">
                    Every successful marketing channel depends on quality content. Without it, your SEO stalls,
                    social media falls flat, and paid ads underperform.
                  </p>
                </div>

                {/* Visual Hub Diagram */}
                <div className="content-hub-section">
                  <div className="content-hub-diagram">
                    {/* Center Hub */}
                    <div className="hub-center">
                      <div className="hub-center-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" width="32" height="32">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                      </div>
                      <span>Content</span>
                    </div>

                    {/* Connecting Lines */}
                    <svg className="hub-connections" viewBox="0 0 400 320">
                      <path d="M 200 150 Q 120 100 60 70" stroke="#8B5CF6" strokeWidth="3" fill="none" strokeDasharray="8 4" className="hub-line" />
                      <path d="M 200 150 Q 280 100 340 70" stroke="#22C55E" strokeWidth="3" fill="none" strokeDasharray="8 4" className="hub-line" />
                      <path d="M 200 150 L 200 295" stroke="#F59E0B" strokeWidth="3" fill="none" strokeDasharray="8 4" className="hub-line" />
                    </svg>

                    {/* Spoke: SEO */}
                    <div className="hub-spoke spoke-seo">
                      <div className="spoke-icon seo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <circle cx="11" cy="11" r="8"></circle>
                          <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                      </div>
                      <div className="spoke-content">
                        <span className="spoke-title">SEO</span>
                        <span className="spoke-desc">Blog posts, landing pages, meta content</span>
                      </div>
                    </div>

                    {/* Spoke: Social Media */}
                    <div className="hub-spoke spoke-social">
                      <div className="spoke-icon social">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                        </svg>
                      </div>
                      <div className="spoke-content">
                        <span className="spoke-title">Social Media</span>
                        <span className="spoke-desc">Posts, images, videos, brand assets</span>
                      </div>
                    </div>

                    {/* Spoke: Paid Ads */}
                    <div className="hub-spoke spoke-ads">
                      <div className="spoke-icon ads">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="3" y1="9" x2="21" y2="9"></line>
                          <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                      </div>
                      <div className="spoke-content">
                        <span className="spoke-title">Paid Advertising</span>
                        <span className="spoke-desc">Ad copy, creative assets, landing pages</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Offerings */}
                <div className="content-offerings-section">
                  <h3 className="offerings-title">Our Content Solutions</h3>
                  <p className="offerings-subtitle">Professional content that powers every marketing channel</p>

                  <div className="content-offerings-grid">
                    {/* Content Writing */}
                    <div className="content-offering-card">
                      <div className="offering-header">
                        <div className="offering-icon writing">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                            <path d="M2 2l7.586 7.586"></path>
                            <circle cx="11" cy="11" r="2"></circle>
                          </svg>
                        </div>
                        <div className="offering-price-tag">
                          <span className="price">$99</span>
                          <span className="per">per article</span>
                        </div>
                      </div>
                      <h4 className="offering-title">Content Writing</h4>
                      <p className="offering-description">
                        SEO and AI-optimized content up to 1,000 words for your blog or website.
                        Each piece is crafted to rank and convert.
                      </p>
                      <div className="offering-powers">
                        <span className="powers-label">Powers:</span>
                        <div className="powers-tags">
                          <span className="power-tag seo">SEO Rankings</span>
                          <span className="power-tag social">Blog Strategy</span>
                        </div>
                      </div>
                      <ul className="offering-features">
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Keyword-optimized for search
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          AI-enhanced for engagement
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Up to 1,000 words
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          One round of revisions
                        </li>
                      </ul>
                      <button className="btn btn-secondary" onClick={() => handleAddToCart('contentWriting')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add to Plan
                      </button>
                    </div>

                    {/* AI Creative Assets */}
                    <div className="content-offering-card featured">
                      <div className="offering-badge">Best Value</div>
                      <div className="offering-header">
                        <div className="offering-icon creative">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                        </div>
                        <div className="offering-price-tag">
                          <span className="price">$299</span>
                          <span className="per">/month</span>
                        </div>
                      </div>
                      <h4 className="offering-title">AI Creative Assets</h4>
                      <p className="offering-description">
                        A monthly package of custom visuals to fuel your social media, ads, and website
                        with scroll-stopping content.
                      </p>
                      <div className="offering-powers">
                        <span className="powers-label">Powers:</span>
                        <div className="powers-tags">
                          <span className="power-tag social">Social Media</span>
                          <span className="power-tag ads">Paid Ads</span>
                        </div>
                      </div>
                      <ul className="offering-features">
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          4 custom AI-generated images
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          1 short-form AI animated video
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          10 curated premium stock images
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          10 curated premium stock videos
                        </li>
                      </ul>
                      <button className="btn btn-primary" onClick={() => handleAddToCart('aiCreativeAssets')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add to Plan
                      </button>
                    </div>

                    {/* Business Branding Foundation */}
                    <div className="content-offering-card">
                      <div className="offering-header">
                        <div className="offering-icon branding">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                          </svg>
                        </div>
                        <div className="offering-price-tag">
                          <span className="price">$99</span>
                          <span className="per">/month</span>
                          <span className="price-alt">or $899 one-time</span>
                        </div>
                      </div>
                      <h4 className="offering-title">Business Branding Foundation</h4>
                      <p className="offering-description">
                        The strategic foundation every business needs. Four essential documents that
                        guide all your marketing efforts.
                      </p>
                      <div className="offering-powers">
                        <span className="powers-label">Powers:</span>
                        <div className="powers-tags">
                          <span className="power-tag seo">SEO</span>
                          <span className="power-tag social">Social</span>
                          <span className="power-tag ads">Ads</span>
                        </div>
                      </div>
                      <ul className="offering-features">
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Strategic Positioning &amp; Brand Framework
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Brand Messaging &amp; Go-To-Market Playbook
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Competitive Comparison Analysis
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Brand Color Guidelines
                        </li>
                      </ul>
                      <button className="btn btn-secondary" onClick={() => handleAddToCart('businessBranding')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add to Plan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== COMMUNICATION TAB ==================== */}
        {activeTab === 'communication' && (
          <CommunicationView
            clientId={clientId}
            isAdmin={true}
            clientName={dbClient?.name}
            communications={communications}
            communicationsLoading={communicationsLoading}
            onRefresh={refetchCommunications}
          />
        )}

        {/* ==================== RECOMMENDATIONS TAB ==================== */}
        {activeTab === 'recommendations' && (
          <RecommendationsView
            clientId={clientId}
            isAdmin={true}
            clientName={dbClient?.name}
            defaultTab={recommendationsSubtab}
            dbClient={dbClient}
            recommendation={recommendation}
            recommendationLoading={recommendationLoading}
            subscriptions={subscriptions}
            subscriptionsLoading={subscriptionsLoading}
            stripeSubscriptions={stripeSubscriptions}
            stripeSubscriptionsLoading={stripeSubscriptionsLoading}
            manualProducts={manualProducts}
            manualProductsLoading={manualProductsLoading}
            isActiveClient={isActiveClient}
            stripeHistory={stripeHistory}
            stripeHistoryLoading={stripeHistoryLoading}
            invoices={(subscriptions as any)?.invoices || []}
            invoicesLoading={subscriptionsLoading}
            stripeCustomerId={dbClient?.stripe_customer_id || null}
            onRecommendationChange={refetchSmartRecsCount}
            isSuperAdmin={isSuperAdmin}
          />
        )}

      </div>


      {/* Edit Client Modal */}
      {dbClient && (
        <EditClientModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          client={dbClient}
          clientId={clientId}
          approvedContentCount={approvedContentCount}
          onSave={refetchClient}
        />
      )}


      {/* Content Requirements Modal */}
      {showContentRequirementsModal && (
        <div className="modal-overlay active" onClick={() => setShowContentRequirementsModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-header-icon" style={{ background: '#DBEAFE', color: '#2563EB' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <div>
                  <h2 className="modal-title">Content Requirements</h2>
                  <p className="modal-subtitle">Guidelines for reviewing and approving content</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowContentRequirementsModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="requirements-content">
                <div className="requirements-intro">
                  <p>To ensure your content meets quality standards and can be published quickly, please review the following requirements and guidelines.</p>
                </div>

                <div className="requirements-section">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Review Timeline
                  </h3>
                  <div className="timeline-items">
                    <div className="timeline-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>Content must be reviewed within <strong>48 hours</strong> of submission</span>
                    </div>
                    <div className="timeline-item urgent">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <span>Urgent content (marked red) requires review within <strong>24 hours</strong></span>
                    </div>
                    <div className="timeline-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>After approval, content will be published within <strong>1-2 business days</strong></span>
                    </div>
                  </div>
                </div>

                <div className="requirements-section">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    Content Types
                  </h3>
                  <div className="content-types-grid">
                    <div className="content-type-item">
                      <span className="platform-badge website">Website Content</span>
                      <p>Blog posts, service pages, landing pages, and website copy updates</p>
                    </div>
                    <div className="content-type-item">
                      <span className="platform-badge gbp">Google Business Profile</span>
                      <p>Business updates, posts, offers, and event announcements</p>
                    </div>
                    <div className="content-type-item">
                      <span className="platform-badge social">Social Posts</span>
                      <p>Facebook, Instagram, and LinkedIn posts with captions and hashtags</p>
                    </div>
                    <div className="content-type-item">
                      <span className="platform-badge ai-creative">AI Creative</span>
                      <p>AI-generated graphics, banners, social images, and promotional visuals</p>
                    </div>
                  </div>
                </div>

                <div className="requirements-section">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Approval Guidelines
                  </h3>
                  <div className="checklist-items-modal">
                    <div className="checklist-item-modal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Verify all facts, dates, and contact information are accurate</span>
                    </div>
                    <div className="checklist-item-modal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Check that pricing and promotional details are correct</span>
                    </div>
                    <div className="checklist-item-modal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Ensure brand voice and tone are consistent</span>
                    </div>
                    <div className="checklist-item-modal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Review for spelling and grammatical errors</span>
                    </div>
                    <div className="checklist-item-modal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Confirm all links and calls-to-action are appropriate</span>
                    </div>
                  </div>
                </div>

                <div className="requirements-section">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    Rejection Process
                  </h3>
                  <div className="process-items">
                    <div className="process-item">
                      <span className="process-number">1</span>
                      <span>If content needs changes, click <strong>&quot;Reject&quot;</strong> and provide specific feedback</span>
                    </div>
                    <div className="process-item">
                      <span className="process-number">2</span>
                      <span>Our team will revise and resubmit within <strong>24-48 hours</strong></span>
                    </div>
                    <div className="process-item">
                      <span className="process-number">3</span>
                      <span>You&apos;ll receive a notification when revised content is ready for review</span>
                    </div>
                  </div>
                </div>

                <div className="requirements-section">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Need Help?
                  </h3>
                  <p className="help-text">If you have questions about any content or need to discuss changes before approval, use the <strong>chat widget</strong> in the bottom right corner of your screen to message our team directly.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowContentRequirementsModal(false)}>Got It</button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showProductModal && selectedProduct && (
        <div className="modal-overlay active" onClick={() => setShowProductModal(false)}>
          <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-header-icon" style={{
                  background: selectedProduct.name.toLowerCase().includes('writing') ? '#F3E8FF'
                    : selectedProduct.name.toLowerCase().includes('creative') ? '#FEF3C7'
                    : selectedProduct.name.toLowerCase().includes('branding') ? '#E0F2FE'
                    : '#F3F4F6',
                  color: selectedProduct.name.toLowerCase().includes('writing') ? '#7C3AED'
                    : selectedProduct.name.toLowerCase().includes('creative') ? '#F59E0B'
                    : selectedProduct.name.toLowerCase().includes('branding') ? '#0EA5E9'
                    : '#6B7280'
                }}>
                  {selectedProduct.name.toLowerCase().includes('writing') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  )}
                  {selectedProduct.name.toLowerCase().includes('creative') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  )}
                  {selectedProduct.name.toLowerCase().includes('branding') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="M2 17l10 5 10-5"></path>
                      <path d="M2 12l10 5 10-5"></path>
                    </svg>
                  )}
                  {!selectedProduct.name.toLowerCase().includes('writing') && !selectedProduct.name.toLowerCase().includes('creative') && !selectedProduct.name.toLowerCase().includes('branding') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="modal-title">{selectedProduct.name}</h2>
                  <p className="modal-subtitle">
                    {Number(selectedProduct.monthly_price) > 0
                      ? `$${Number(selectedProduct.monthly_price).toLocaleString()}/month`
                      : Number(selectedProduct.onetime_price) > 0
                        ? `$${Number(selectedProduct.onetime_price).toLocaleString()} one-time`
                        : 'Contact for pricing'}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowProductModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="product-detail-content">
                {selectedProduct.short_description && (
                  <p className="product-short-desc" style={{ fontSize: '1rem', color: '#374151', marginBottom: '1.5rem' }}>
                    {selectedProduct.short_description}
                  </p>
                )}

                {selectedProduct.long_description && (
                  <div
                    className="product-long-desc"
                    style={{ color: '#4B5563', lineHeight: '1.6' }}
                    dangerouslySetInnerHTML={{ __html: selectedProduct.long_description }}
                  />
                )}

                {!selectedProduct.long_description && (
                  <div className="product-features" style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                      What&apos;s Included:
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {selectedProduct.name.toLowerCase().includes('writing') && (
                        <>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Professional blog posts and articles
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            SEO-optimized website copy
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Editing and proofreading
                          </li>
                        </>
                      )}
                      {selectedProduct.name.toLowerCase().includes('creative') && (
                        <>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            AI-generated graphics and images
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Social media visuals and graphics
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Promotional banners and ad creatives
                          </li>
                        </>
                      )}
                      {selectedProduct.name.toLowerCase().includes('branding') && (
                        <>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Logo design and refinement
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Brand color palette and typography
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Brand guidelines document
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowProductModal(false)
                  handleAddProductToPlan(selectedProduct)
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add to Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Alert Modal */}
      {dbClient && (
        <ResultAlertModal
          isOpen={showResultAlertModal}
          onClose={() => setShowResultAlertModal(false)}
          clientId={clientId}
          clientName={dbClient.name}
          clientEmail={dbClient.contact_email}
          onSuccess={(msg) => {
            setResendMessage({ type: 'success', text: msg })
            setTimeout(() => setResendMessage(null), 5000)
          }}
          onError={(msg) => {
            setResendMessage({ type: 'error', text: msg })
            setTimeout(() => setResendMessage(null), 5000)
          }}
          onSent={async () => {
            const commsRes = await fetch(`/api/admin/clients/${clientId}/communications`)
            if (commsRes.ok) {
              setCommunications(await commsRes.json())
            }
          }}
        />
      )}

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        availableProducts={availableProducts}
        onAdd={handleAddProduct}
      />
    </>
  )
}

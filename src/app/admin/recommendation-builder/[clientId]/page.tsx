'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import {
  CategoryColumn,
  SelectedItemsList,
  PricingSummary,
  GrowthRewardsSection,
  ServiceInfoModal,
} from '@/components/recommendation-builder'
import { useRecommendationStore } from '@/stores/recommendation-store'
import type { Product, TierName, ServiceCategory, RecommendationItem, PricingType } from '@/types/recommendation'

// Database interfaces
interface DBProduct {
  id: string
  name: string
  short_description: string | null
  long_description: string | null
  category: string
  monthly_price: string | null
  onetime_price: string | null
  supports_quantity: boolean | null
  status: string | null
  product_dependencies?: {
    requires_product_id: string
    requires: {
      id: string
      name: string
    }
  }[]
}

interface DBBundle {
  id: string
  name: string
  description: string | null
  monthly_price: string | null
  onetime_price: string | null
  status: string | null
}

interface DBAddon {
  id: string
  name: string
  description: string | null
  price: string | null
  status: string | null
}

interface DBClient {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  avatar_url: string | null
  growth_stage: string | null
  status: string | null
}

interface DBRecommendationItem {
  id: string
  recommendation_id: string
  product_id: string | null
  bundle_id: string | null
  addon_id: string | null
  quantity: number | null
  monthly_price: string | null
  onetime_price: string | null
  is_free: boolean | null
  notes: string | null  // Used to store tier name
  product: DBProduct | null
  bundle: DBBundle | null
  addon: DBAddon | null
}

interface DBRecommendation {
  id: string
  client_id: string
  status: string | null
  recommendation_items: DBRecommendationItem[]
}

// Helper to generate initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Helper to generate a consistent color from a string
function getAvatarColor(str: string): string {
  const colors = ['#885430', '#2563EB', '#7C3AED', '#0B7277', '#DC2626', '#6B7280', '#059669', '#D97706']
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const tierTitles: Record<TierName, string> = {
  good: 'Good',
  better: 'Better',
  best: 'Best',
}

const categories: ServiceCategory[] = ['root', 'growth', 'cultivation', 'bundle', 'fertilizer']

export default function RecommendationBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string

  // Products state
  const [productsByCategory, setProductsByCategory] = useState<Record<ServiceCategory, Product[]>>({
    root: [],
    growth: [],
    cultivation: [],
    bundle: [],
    fertilizer: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  // Clients state
  const [clients, setClients] = useState<DBClient[]>([])
  const [selectedClient, setSelectedClient] = useState<DBClient | null>(null)
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    contactName: '',
    contactEmail: '',
  })
  const [isSavingClient, setIsSavingClient] = useState(false)
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [savedRecommendationId, setSavedRecommendationId] = useState<string | null>(null)

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareForm, setShareForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })
  const [isSendingInvite, setIsSendingInvite] = useState(false)

  // Store
  const {
    tiers,
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemPricingType,
    clearAllTiers,
    setTierItems,
    getTierPricing,
    getTierRewards,
    getTierClaimHints,
    getUnmetRequirements,
    infoModalOpen,
    infoModalProduct,
    openInfoModal,
    closeInfoModal,
  } = useRecommendationStore()

  // Local state
  const [dragOverTier, setDragOverTier] = useState<TierName | null>(null)

  // Fetch clients and products from database
  useEffect(() => {
    async function fetchData() {
      try {
        // Clear existing tiers when loading new client
        clearAllTiers()

        const [productsRes, bundlesRes, addonsRes, clientsRes] = await Promise.all([
          fetch('/api/admin/products'),
          fetch('/api/admin/bundles'),
          fetch('/api/admin/addons'),
          fetch('/api/admin/clients'),
        ])

        const dbProducts: DBProduct[] = await productsRes.json()
        const dbBundles: DBBundle[] = await bundlesRes.json()
        const dbAddons: DBAddon[] = await addonsRes.json()
        const dbClients: DBClient[] = await clientsRes.json()

        // Set clients
        setClients(dbClients)

        // Find selected client from URL
        const currentClient = dbClients.find(c => c.id === clientId)
        if (currentClient) {
          setSelectedClient(currentClient)
        }

        // Transform products
        const transformedProducts: Product[] = dbProducts
          .filter(p => p.status === 'active')
          .map(p => ({
            id: p.id,
            name: p.name,
            description: p.short_description || '',
            category: p.category as ServiceCategory,
            monthlyPrice: p.monthly_price ? parseFloat(p.monthly_price) : 0,
            onetimePrice: p.onetime_price ? parseFloat(p.onetime_price) : 0,
            hasQuantity: p.supports_quantity || false,
            requires: p.product_dependencies?.[0]?.requires?.name,
          }))

        // Transform bundles
        const transformedBundles: Product[] = dbBundles
          .filter(b => b.status === 'active')
          .map(b => ({
            id: b.id,
            name: b.name,
            description: b.description || '',
            category: 'bundle' as ServiceCategory,
            monthlyPrice: b.monthly_price ? parseFloat(b.monthly_price) : 0,
            onetimePrice: b.onetime_price ? parseFloat(b.onetime_price) : 0,
          }))

        // Transform addons (fertilizers)
        const transformedAddons: Product[] = dbAddons
          .filter(a => a.status === 'active')
          .map(a => ({
            id: a.id,
            name: a.name,
            description: a.description || '',
            category: 'fertilizer' as ServiceCategory,
            monthlyPrice: a.price ? parseFloat(a.price) : 0,
            onetimePrice: 0,
          }))

        // Combine all products
        const allProducts = [...transformedProducts, ...transformedBundles, ...transformedAddons]

        // Create a map for quick lookup
        const productMap = new Map<string, Product>()
        allProducts.forEach(p => productMap.set(p.id, p))

        // Group by category
        const grouped: Record<ServiceCategory, Product[]> = {
          root: [],
          growth: [],
          cultivation: [],
          bundle: [],
          fertilizer: [],
        }

        allProducts.forEach(product => {
          if (grouped[product.category]) {
            grouped[product.category].push(product)
          }
        })

        setProductsByCategory(grouped)

        // Fetch existing recommendation for this client
        if (clientId && clientId !== 'new') {
          try {
            const recRes = await fetch(`/api/admin/recommendations/client/${clientId}`)
            const existingRec: DBRecommendation | null = await recRes.json()

            if (existingRec && existingRec.id) {
              // Store the recommendation ID so Share button shows
              setSavedRecommendationId(existingRec.id)

              // Pre-fill share form with client contact info
              if (currentClient?.contact_name) {
                const nameParts = currentClient.contact_name.split(' ')
                setShareForm({
                  firstName: nameParts[0] || '',
                  lastName: nameParts.slice(1).join(' ') || '',
                  email: currentClient.contact_email || '',
                })
              } else if (currentClient?.contact_email) {
                setShareForm(prev => ({ ...prev, email: currentClient.contact_email || '' }))
              }
            }

            if (existingRec && existingRec.recommendation_items) {
              // Group items by tier
              const tierItemsMap: Record<TierName, RecommendationItem[]> = {
                good: [],
                better: [],
                best: [],
              }

              existingRec.recommendation_items.forEach(item => {
                // Find the product from our loaded products
                let product: Product | undefined

                if (item.product_id && item.product) {
                  product = productMap.get(item.product_id)
                } else if (item.bundle_id && item.bundle) {
                  product = productMap.get(item.bundle_id)
                } else if (item.addon_id && item.addon) {
                  product = productMap.get(item.addon_id)
                }

                if (!product) {
                  // Fallback: create product from DB item
                  if (item.product) {
                    product = {
                      id: item.product.id,
                      name: item.product.name,
                      description: item.product.short_description || '',
                      category: item.product.category as ServiceCategory,
                      monthlyPrice: item.product.monthly_price ? parseFloat(item.product.monthly_price) : 0,
                      onetimePrice: item.product.onetime_price ? parseFloat(item.product.onetime_price) : 0,
                      hasQuantity: item.product.supports_quantity || false,
                    }
                  } else if (item.bundle) {
                    product = {
                      id: item.bundle.id,
                      name: item.bundle.name,
                      description: item.bundle.description || '',
                      category: 'bundle' as ServiceCategory,
                      monthlyPrice: item.bundle.monthly_price ? parseFloat(item.bundle.monthly_price) : 0,
                      onetimePrice: item.bundle.onetime_price ? parseFloat(item.bundle.onetime_price) : 0,
                    }
                  } else if (item.addon) {
                    product = {
                      id: item.addon.id,
                      name: item.addon.name,
                      description: item.addon.description || '',
                      category: 'fertilizer' as ServiceCategory,
                      monthlyPrice: item.addon.price ? parseFloat(item.addon.price) : 0,
                      onetimePrice: 0,
                    }
                  }
                }

                if (!product) return

                // Determine pricing type based on stored prices
                const monthlyPrice = item.monthly_price ? parseFloat(item.monthly_price) : 0
                const pricingType: PricingType = monthlyPrice > 0 ? 'monthly' : 'onetime'

                // Get tier name from notes field (default to 'good')
                const tierName = (item.notes as TierName) || 'good'
                const validTier = ['good', 'better', 'best'].includes(tierName) ? tierName as TierName : 'good'

                const recItem: RecommendationItem = {
                  id: `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  product,
                  quantity: item.quantity || 1,
                  pricingType,
                }

                tierItemsMap[validTier].push(recItem)
              })

              // Load items into their respective tiers
              if (tierItemsMap.good.length > 0) {
                setTierItems('good', tierItemsMap.good)
              }
              if (tierItemsMap.better.length > 0) {
                setTierItems('better', tierItemsMap.better)
              }
              if (tierItemsMap.best.length > 0) {
                setTierItems('best', tierItemsMap.best)
              }
            }
          } catch (error) {
            console.error('Failed to fetch existing recommendation:', error)
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [clientId, clearAllTiers, setTierItems])

  // Handle adding a new client
  const handleAddClient = async () => {
    if (!newClientForm.name.trim()) return

    setIsSavingClient(true)
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClientForm),
      })

      if (!res.ok) throw new Error('Failed to create client')

      const newClient: DBClient = await res.json()

      // Add to clients list
      setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)))

      // Select the new client (don't navigate - keep items in place)
      setSelectedClient(newClient)

      // Update URL without full navigation to preserve state
      window.history.replaceState(null, '', `/admin/recommendation-builder/${newClient.id}`)

      // Close modal and reset form
      setShowAddClientModal(false)
      setNewClientForm({ name: '', contactName: '', contactEmail: '' })
    } catch (error) {
      console.error('Failed to create client:', error)
      alert('Failed to create client')
    } finally {
      setIsSavingClient(false)
    }
  }

  // Handle client selection change
  const handleClientChange = (clientIdValue: string) => {
    const client = clients.find(c => c.id === clientIdValue)
    setSelectedClient(client || null)
    if (clientIdValue) {
      router.push(`/admin/recommendation-builder/${clientIdValue}`)
    }
  }

  // Handle saving the plan
  const handleSavePlan = async () => {
    if (!selectedClient) {
      alert('Please select a client first')
      return
    }

    // Collect all items from all tiers
    const allItems: {
      productId?: string
      bundleId?: string
      addonId?: string
      quantity: number
      monthlyPrice: number
      onetimePrice: number
      tierName: string
    }[] = []

    let totalMonthly = 0
    let totalOnetime = 0

    // Process each tier
    const tierNames: TierName[] = ['good', 'better', 'best']
    tierNames.forEach(tierName => {
      const tierItems = tiers[tierName]
      tierItems.forEach(item => {
        const category = item.product.category
        const monthlyPrice = item.pricingType === 'monthly' ? item.product.monthlyPrice * item.quantity : 0
        const onetimePrice = item.pricingType === 'onetime' ? item.product.onetimePrice * item.quantity : 0

        allItems.push({
          productId: category === 'bundle' ? undefined : (category === 'fertilizer' ? undefined : item.product.id),
          bundleId: category === 'bundle' ? item.product.id : undefined,
          addonId: category === 'fertilizer' ? item.product.id : undefined,
          quantity: item.quantity,
          monthlyPrice,
          onetimePrice,
          tierName,
        })

        totalMonthly += monthlyPrice
        totalOnetime += onetimePrice
      })
    })

    if (allItems.length === 0) {
      alert('Please add at least one product to the plan')
      return
    }

    setIsSavingPlan(true)
    try {
      const res = await fetch('/api/admin/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          items: allItems,
          totalMonthly,
          totalOnetime,
        }),
      })

      if (!res.ok) throw new Error('Failed to save plan')

      const savedRec = await res.json()
      setSavedRecommendationId(savedRec.id)

      // Pre-fill share form with client contact info if available
      if (selectedClient.contact_name) {
        const nameParts = selectedClient.contact_name.split(' ')
        setShareForm({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: selectedClient.contact_email || '',
        })
      } else if (selectedClient.contact_email) {
        setShareForm(prev => ({ ...prev, email: selectedClient.contact_email || '' }))
      }
    } catch (error) {
      console.error('Failed to save plan:', error)
      alert('Failed to save plan')
    } finally {
      setIsSavingPlan(false)
    }
  }

  // Handle sharing the recommendation
  const handleShare = async () => {
    if (!savedRecommendationId) {
      alert('Please save the plan first')
      return
    }

    if (!shareForm.firstName || !shareForm.lastName || !shareForm.email) {
      alert('Please fill in all fields')
      return
    }

    setIsSendingInvite(true)
    try {
      const res = await fetch(`/api/admin/recommendations/${savedRecommendationId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareForm),
      })

      if (!res.ok) throw new Error('Failed to send invite')

      setShowShareModal(false)
      setShareForm({ firstName: '', lastName: '', email: '' })

      // Navigate to recommendations page after successful share
      router.push('/admin/recommendations')
    } catch (error) {
      console.error('Failed to send invite:', error)
      alert('Failed to send invite')
    } finally {
      setIsSendingInvite(false)
    }
  }

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, product: Product) => {
    e.dataTransfer.setData('application/json', JSON.stringify(product))
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, tier: TierName) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOverTier(tier)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverTier(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, tier: TierName) => {
      e.preventDefault()
      setDragOverTier(null)

      try {
        const data = e.dataTransfer.getData('application/json')
        const product: Product = JSON.parse(data)
        addItem(tier, product)
      } catch {
        console.error('Failed to parse dropped product')
      }
    },
    [addItem]
  )

  // Render a tier column
  const renderTierColumn = (tier: TierName) => {
    const items = tiers[tier]
    const pricing = getTierPricing(tier)
    const rewards = getTierRewards(tier)
    const claimHints = getTierClaimHints(tier)
    const unmetRequirements = getUnmetRequirements(tier)

    return (
      <div key={tier} className="pricing-tier" data-tier={tier}>
        <h2 className="tier-title">{tierTitles[tier]}</h2>

        <div
          className={`tier-dropzone${dragOverTier === tier ? ' drag-over' : ''}`}
          data-tier={tier}
          onDragOver={(e) => handleDragOver(e, tier)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, tier)}
        >
          <SelectedItemsList
            items={items}
            tier={tier}
            unmetRequirements={unmetRequirements}
            onRemove={(itemId) => removeItem(tier, itemId)}
            onQuantityChange={(itemId, quantity) => updateItemQuantity(tier, itemId, quantity)}
            onPricingTypeChange={(itemId, pricingType) => updateItemPricingType(tier, itemId, pricingType)}
            free99SlotUsed={pricing.free99SlotUsed}
            hasFree99Reward={pricing.hasFree99Reward}
          />
        </div>

        <PricingSummary
          pricing={pricing}
          rewards={rewards}
          claimHints={claimHints}
        />

        <GrowthRewardsSection rewards={rewards} />

        <button
          className="btn btn-purchase"
          onClick={() => {
            if (!selectedClient) {
              alert('Please select a client first')
              return
            }
            // Store cart items in sessionStorage for checkout page
            const cartItems = items.map(item => ({
              id: item.id,
              name: item.product.name,
              description: item.product.description || '',
              quantity: item.quantity,
              monthlyPrice: item.product.monthlyPrice || 0,
              onetimePrice: item.product.onetimePrice || 0,
              pricingType: item.pricingType,
            }))
            sessionStorage.setItem(`checkout_${selectedClient.id}_${tier}`, JSON.stringify(cartItems))
            router.push(`/admin/checkout/${selectedClient.id}?tier=${tier}`)
          }}
          disabled={items.length === 0 || !savedRecommendationId}
        >
          Purchase Now
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <>
        <AdminHeader
          title="Recommendation Builder"
          user={{ name: 'Ryan Kelly', initials: 'RK' }}
          hasNotifications={true}
        />
        <div className="admin-content">
          <div className="content-page-header">
            <p>Loading...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Recommendation Builder"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
        breadcrumb={
          <>
            <Link href="/admin/recommendations">Recommendations</Link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span>{selectedClient?.name || 'Select Client'}</span>
          </>
        }
      />

      <div className="rec-builder-layout">
        {/* Services Sidebar */}
        <aside className="services-sidebar">
          {categories.map((category) => (
            <CategoryColumn
              key={category}
              category={category}
              products={productsByCategory[category]}
              onDragStart={handleDragStart}
              onInfoClick={openInfoModal}
            />
          ))}
        </aside>

        {/* Builder Main Area */}
        <div className="rec-builder-main">
          {/* Client Selector */}
          <div className="client-selector-bar">
            <button
              className="btn btn-secondary add-client-btn"
              onClick={() => setShowAddClientModal(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              Add Client
            </button>
            <div className="client-dropdown-wrapper">
              <select
                className="client-dropdown"
                value={selectedClient?.id || ''}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-primary save-plan-btn"
              onClick={handleSavePlan}
              disabled={isSavingPlan}
            >
              {isSavingPlan ? 'Saving...' : 'Save Plan'}
            </button>
            {savedRecommendationId && (
              <button
                className="btn btn-primary"
                onClick={() => setShowShareModal(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Share
              </button>
            )}
          </div>

          {/* Good / Better / Best Columns */}
          <div className="pricing-tiers">
            {(['good', 'better', 'best'] as TierName[]).map(renderTierColumn)}
          </div>
        </div>
      </div>

      {/* Service Info Modal */}
      <ServiceInfoModal
        product={infoModalProduct}
        isOpen={infoModalOpen}
        onClose={closeInfoModal}
      />

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="modal-overlay active" onClick={() => setShowAddClientModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Client</h2>
              <button className="modal-close" onClick={() => setShowAddClientModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="clientName">Client/Business Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="clientName"
                  className="form-control"
                  placeholder="e.g., Acme Corporation"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="contactName">Contact Name</label>
                <input
                  type="text"
                  id="contactName"
                  className="form-control"
                  placeholder="e.g., John Smith"
                  value={newClientForm.contactName}
                  onChange={(e) => setNewClientForm({ ...newClientForm, contactName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="contactEmail">Contact Email</label>
                <input
                  type="email"
                  id="contactEmail"
                  className="form-control"
                  placeholder="e.g., john@acme.com"
                  value={newClientForm.contactEmail}
                  onChange={(e) => setNewClientForm({ ...newClientForm, contactEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddClientModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddClient}
                disabled={!newClientForm.name.trim() || isSavingClient}
              >
                {isSavingClient ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay active" onClick={() => setShowShareModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Share Recommendation</h2>
              <button className="modal-close" onClick={() => setShowShareModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Enter the details of the person you want to share this recommendation with.
              </p>
              <div className="form-group">
                <label htmlFor="shareFirstName">First Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="shareFirstName"
                  className="form-control"
                  placeholder="e.g., John"
                  value={shareForm.firstName}
                  onChange={(e) => setShareForm({ ...shareForm, firstName: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="shareLastName">Last Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="shareLastName"
                  className="form-control"
                  placeholder="e.g., Smith"
                  value={shareForm.lastName}
                  onChange={(e) => setShareForm({ ...shareForm, lastName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="shareEmail">Email <span className="required">*</span></label>
                <input
                  type="email"
                  id="shareEmail"
                  className="form-control"
                  placeholder="e.g., john@example.com"
                  value={shareForm.email}
                  onChange={(e) => setShareForm({ ...shareForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowShareModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleShare}
                disabled={!shareForm.firstName.trim() || !shareForm.lastName.trim() || !shareForm.email.trim() || isSendingInvite}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                {isSendingInvite ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

          </>
  )
}

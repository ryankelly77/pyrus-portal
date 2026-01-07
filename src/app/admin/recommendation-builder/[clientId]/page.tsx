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
import type { Product, TierName, ServiceCategory } from '@/types/recommendation'

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

  // Store
  const {
    tiers,
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemPricingType,
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
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [clientId])

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

      // Select the new client
      setSelectedClient(newClient)

      // Navigate to new client's URL
      router.push(`/admin/recommendation-builder/${newClient.id}`)

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

        <button className="btn btn-purchase">Purchase Now</button>
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
            <button className="btn btn-primary save-plan-btn">Save Plan</button>
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
        <div className="modal-overlay" onClick={() => setShowAddClientModal(false)}>
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
    </>
  )
}

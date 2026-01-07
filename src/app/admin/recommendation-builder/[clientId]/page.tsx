'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
import type { Product, TierName, ServiceCategory, Client } from '@/types/recommendation'

// Database product interface
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

// Sample clients data
const clients: Client[] = [
  { id: 'tc-clinical', name: 'TC Clinical Services', email: 'dlg.mdservices@gmail.com', initials: 'TC', avatarColor: '#885430' },
  { id: 'raptor-vending', name: 'Raptor Vending', email: 'info@raptorvending.com', initials: 'RV', avatarColor: '#2563EB' },
  { id: 'raptor-services', name: 'Raptor Services', email: 'contact@raptorservices.com', initials: 'RS', avatarColor: '#7C3AED' },
  { id: 'gohfr', name: 'Gohfr', email: 'hello@gohfr.com', initials: 'GO', avatarColor: '#0B7277' },
  { id: 'espronceda-law', name: 'Espronceda Law', email: 'maria@espronceda.law', initials: 'EL', avatarColor: '#DC2626' },
  { id: 'american-fence', name: 'American Fence & Deck', email: 'sales@americanfence.com', initials: 'AF', avatarColor: '#6B7280' },
]

const tierTitles: Record<TierName, string> = {
  good: 'Good',
  better: 'Better',
  best: 'Best',
}

const categories: ServiceCategory[] = ['root', 'growth', 'cultivation', 'bundle', 'fertilizer']

export default function RecommendationBuilderPage() {
  const params = useParams()
  const clientId = params.clientId as string

  // Get initial client from URL
  const initialClient = clients.find((c) => c.id === clientId) || null

  // Products state
  const [products, setProducts] = useState<Product[]>([])
  const [productsByCategory, setProductsByCategory] = useState<Record<ServiceCategory, Product[]>>({
    root: [],
    growth: [],
    cultivation: [],
    bundle: [],
    fertilizer: [],
  })
  const [isLoading, setIsLoading] = useState(true)

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
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialClient)
  const [dragOverTier, setDragOverTier] = useState<TierName | null>(null)

  // Fetch products from database
  useEffect(() => {
    async function fetchProducts() {
      try {
        const [productsRes, bundlesRes, addonsRes] = await Promise.all([
          fetch('/api/admin/products'),
          fetch('/api/admin/bundles'),
          fetch('/api/admin/addons'),
        ])

        const dbProducts: DBProduct[] = await productsRes.json()
        const dbBundles: DBBundle[] = await bundlesRes.json()
        const dbAddons: DBAddon[] = await addonsRes.json()

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
        setProducts(allProducts)

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
        console.error('Failed to fetch products:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

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
            <p>Loading products...</p>
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
            <button className="btn btn-secondary add-client-btn">
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
                onChange={(e) => {
                  const client = clients.find((c) => c.id === e.target.value)
                  setSelectedClient(client || null)
                }}
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
    </>
  )
}

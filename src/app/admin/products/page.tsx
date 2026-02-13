'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

type ProductCategory = 'root' | 'growth' | 'cultivation'
type ProductStatus = 'active' | 'draft' | 'inactive'
type ViewTab = 'products' | 'bundles' | 'addons'
type MainTab = 'products-main' | 'rewards'

// Rewards types
interface Threshold {
  id: string
  amount: number
  rewardType: 'discount' | 'freebie'
  rewardValue: string
}

interface FreeProduct {
  id: string
  name: string
  value: string
}

const initialThresholds: Threshold[] = [
  { id: '1', amount: 1000, rewardType: 'discount', rewardValue: '5% discount' },
  { id: '2', amount: 1500, rewardType: 'freebie', rewardValue: 'Free $99 product' },
  { id: '3', amount: 2000, rewardType: 'discount', rewardValue: '10% discount' },
]

const initialFreeProducts: FreeProduct[] = [
  { id: '1', name: 'Analytics Tracking', value: '$99 value' },
]

const availableProducts = [
  { id: 'analytics', name: 'Analytics Tracking', price: '$99' },
  { id: 'monthly-report', name: 'Monthly Report', price: '$99' },
  { id: 'gbp-posting', name: 'GBP Posting', price: '$99' },
  { id: 'review-mgmt', name: 'Review Management', price: '$99' },
]

interface Product {
  id: string
  name: string
  short_description: string | null
  category: string
  monthly_price: string | null
  onetime_price: string | null
  status: string | null
}

interface Bundle {
  id: string
  name: string
  description: string | null
  monthly_price: string | null
  onetime_price: string | null
  status: string | null
  bundle_products: {
    product: {
      id: string
      name: string
    }
  }[]
}

interface AddOn {
  id: string
  name: string
  description: string | null
  price: string
  status: string | null
}

export default function AdminProductsPage() {
  const { user, hasNotifications } = useUserProfile()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as ViewTab | null

  // Main tab state (Products vs Rewards)
  const [mainTab, setMainTab] = useState<MainTab>('products-main')

  // Products tab state
  const [activeTab, setActiveTab] = useState<ViewTab>(tabParam || 'products')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [addons, setAddons] = useState<AddOn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null)
  const [isDuplicatingBundle, setIsDuplicatingBundle] = useState<string | null>(null)
  const [isDuplicatingAddon, setIsDuplicatingAddon] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isDeletingBundle, setIsDeletingBundle] = useState<string | null>(null)
  const [isDeletingAddon, setIsDeletingAddon] = useState<string | null>(null)

  // Rewards tab state
  const [thresholds, setThresholds] = useState(initialThresholds)
  const [freeProducts, setFreeProducts] = useState(initialFreeProducts)
  const [showThresholdModal, setShowThresholdModal] = useState(false)
  const [showFreeProductModal, setShowFreeProductModal] = useState(false)
  const [editingThreshold, setEditingThreshold] = useState<Threshold | null>(null)
  const [thresholdAmount, setThresholdAmount] = useState('')
  const [rewardType, setRewardType] = useState<'discount' | 'freebie'>('discount')
  const [discountPercent, setDiscountPercent] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsRes, bundlesRes, addonsRes] = await Promise.all([
          fetch('/api/admin/products'),
          fetch('/api/admin/bundles'),
          fetch('/api/admin/addons'),
        ])

        if (productsRes.ok) {
          const productsData = await productsRes.json()
          setProducts(productsData)
        }
        if (bundlesRes.ok) {
          const bundlesData = await bundlesRes.json()
          setBundles(bundlesData)
        }
        if (addonsRes.ok) {
          const addonsData = await addonsRes.json()
          setAddons(addonsData)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleDuplicateProduct = async (productId: string) => {
    setIsDuplicating(productId)
    try {
      // Fetch the product to duplicate
      const res = await fetch(`/api/admin/products/${productId}`)
      if (!res.ok) throw new Error('Failed to fetch product')

      const product = await res.json()

      // Create a duplicate with "Copy" suffix
      const duplicateData = {
        name: `${product.name} (Copy)`,
        shortDesc: product.short_description || '',
        longDesc: product.long_description || '',
        category: product.category,
        status: 'draft',
        monthlyPrice: product.monthly_price || '',
        onetimePrice: product.onetime_price || '',
        supportsQuantity: product.supports_quantity || false,
        stripeProductId: '',
        stripeMonthlyPriceId: '',
        stripeOnetimePriceId: '',
        dependencies: product.product_dependencies?.map((d: { requires_product_id: string }) => d.requires_product_id) || [],
        includesContent: product.includes_content || false,
        contentServices: product.content_services || [],
        includesWebsite: product.includes_website || false,
        websiteServices: product.website_services || [],
      }

      const createRes = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData),
      })

      if (!createRes.ok) throw new Error('Failed to create duplicate')

      const newProduct = await createRes.json()
      setProducts(prev => [...prev, newProduct])
    } catch (error) {
      console.error('Failed to duplicate product:', error)
      alert('Failed to duplicate product')
    } finally {
      setIsDuplicating(null)
    }
  }

  const handleDuplicateBundle = async (bundleId: string) => {
    setIsDuplicatingBundle(bundleId)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}`)
      if (!res.ok) throw new Error('Failed to fetch bundle')

      const bundle = await res.json()

      const duplicateData = {
        name: `${bundle.name} (Copy)`,
        description: bundle.description || '',
        monthlyPrice: bundle.monthly_price || '',
        onetimePrice: bundle.onetime_price || '',
        status: 'draft',
        stripeProductId: '',
        stripePriceId: '',
        products: bundle.bundle_products?.map((bp: { product: { id: string } }) => bp.product.id) || [],
      }

      const createRes = await fetch('/api/admin/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData),
      })

      if (!createRes.ok) throw new Error('Failed to create duplicate')

      const newBundle = await createRes.json()
      setBundles(prev => [...prev, newBundle])
    } catch (error) {
      console.error('Failed to duplicate bundle:', error)
      alert('Failed to duplicate bundle')
    } finally {
      setIsDuplicatingBundle(null)
    }
  }

  const handleDuplicateAddon = async (addonId: string) => {
    setIsDuplicatingAddon(addonId)
    try {
      const res = await fetch(`/api/admin/addons/${addonId}`)
      if (!res.ok) throw new Error('Failed to fetch addon')

      const addon = await res.json()

      const duplicateData = {
        name: `${addon.name} (Copy)`,
        description: addon.description || '',
        price: addon.price || '0',
        status: 'draft',
        stripeProductId: '',
        stripePriceId: '',
        products: addon.addon_products?.map((ap: { product: { id: string } }) => ap.product.id) || [],
      }

      const createRes = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData),
      })

      if (!createRes.ok) throw new Error('Failed to create duplicate')

      const newAddon = await createRes.json()
      setAddons(prev => [...prev, newAddon])
    } catch (error) {
      console.error('Failed to duplicate addon:', error)
      alert('Failed to duplicate addon')
    } finally {
      setIsDuplicatingAddon(null)
    }
  }

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(productId)
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete product')

      setProducts(prev => prev.filter(p => p.id !== productId))
    } catch (error) {
      console.error('Failed to delete product:', error)
      alert('Failed to delete product')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDeleteBundle = async (bundleId: string, bundleName: string) => {
    if (!confirm(`Are you sure you want to delete "${bundleName}"? This action cannot be undone.`)) {
      return
    }

    setIsDeletingBundle(bundleId)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete bundle')

      setBundles(prev => prev.filter(b => b.id !== bundleId))
    } catch (error) {
      console.error('Failed to delete bundle:', error)
      alert('Failed to delete bundle')
    } finally {
      setIsDeletingBundle(null)
    }
  }

  const handleDeleteAddon = async (addonId: string, addonName: string) => {
    if (!confirm(`Are you sure you want to delete "${addonName}"? This action cannot be undone.`)) {
      return
    }

    setIsDeletingAddon(addonId)
    try {
      const res = await fetch(`/api/admin/addons/${addonId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete add-on')

      setAddons(prev => prev.filter(a => a.id !== addonId))
    } catch (error) {
      console.error('Failed to delete add-on:', error)
      alert('Failed to delete add-on')
    } finally {
      setIsDeletingAddon(null)
    }
  }

  // Rewards handlers
  const openThresholdModal = (threshold?: Threshold) => {
    if (threshold) {
      setEditingThreshold(threshold)
      setThresholdAmount(threshold.amount.toString())
      setRewardType(threshold.rewardType)
      if (threshold.rewardType === 'discount') {
        setDiscountPercent(threshold.rewardValue.replace('% discount', ''))
      }
    } else {
      setEditingThreshold(null)
      setThresholdAmount('')
      setRewardType('discount')
      setDiscountPercent('')
    }
    setShowThresholdModal(true)
  }

  const saveThreshold = () => {
    const rewardValue = rewardType === 'discount' ? `${discountPercent}% discount` : 'Free $99 product'
    if (editingThreshold) {
      setThresholds(prev => prev.map(t =>
        t.id === editingThreshold.id
          ? { ...t, amount: parseInt(thresholdAmount), rewardType, rewardValue }
          : t
      ))
    } else {
      const newThreshold: Threshold = {
        id: Date.now().toString(),
        amount: parseInt(thresholdAmount),
        rewardType,
        rewardValue,
      }
      setThresholds(prev => [...prev, newThreshold].sort((a, b) => a.amount - b.amount))
    }
    setShowThresholdModal(false)
  }

  const addFreeProduct = () => {
    const product = availableProducts.find(p => p.id === selectedProduct)
    if (product) {
      const newProduct: FreeProduct = {
        id: Date.now().toString(),
        name: product.name,
        value: `${product.price} value`,
      }
      setFreeProducts(prev => [...prev, newProduct])
    }
    setShowFreeProductModal(false)
    setSelectedProduct('')
  }

  const removeFreeProduct = (id: string) => {
    setFreeProducts(prev => prev.filter(p => p.id !== id))
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (categoryFilter !== 'all' && product.category !== categoryFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!product.name.toLowerCase().includes(query) &&
            !(product.short_description?.toLowerCase().includes(query))) {
          return false
        }
      }
      return true
    })
  }, [products, categoryFilter, searchQuery])

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'root': return 'category-root'
      case 'growth': return 'category-growth'
      case 'cultivation': return 'category-cultivation'
      default: return ''
    }
  }

  const formatPrice = (price: string | null, type: 'monthly' | 'onetime') => {
    if (!price || parseFloat(price) === 0) return '-'
    const formatted = parseFloat(price).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    return type === 'monthly' ? `${formatted}/mo` : formatted
  }

  const stats = {
    total: products.length,
    active: products.filter((p) => p.status === 'active').length,
    draft: products.filter((p) => p.status === 'draft').length,
    bundles: bundles.length,
  }

  if (isLoading) {
    return (
      <>
        <AdminHeader
          title="Product Management"
          user={user}
          hasNotifications={hasNotifications}
        />
        <div className="admin-content">
          <div className="page-header">
            <div className="page-header-content">
              <p>Loading products...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Product Management"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Manage products, pricing, and bundles for recommendations</p>
          </div>
          <div className="header-actions">
            <Link href="/admin/products/bundle/new" className="btn btn-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Create Bundle
            </Link>
            <Link href="/admin/products/new" className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Product
            </Link>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="tabs-container" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            <button
              className={`tab ${mainTab === 'products-main' ? 'active' : ''}`}
              onClick={() => setMainTab('products-main')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: mainTab === 'products-main' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '14px',
                borderBottom: mainTab === 'products-main' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.2s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              Products
            </button>
            <button
              className={`tab ${mainTab === 'rewards' ? 'active' : ''}`}
              onClick={() => setMainTab('rewards')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: mainTab === 'rewards' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '14px',
                borderBottom: mainTab === 'rewards' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.2s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="20 12 20 22 4 22 4 12"></polyline>
                <rect x="2" y="7" width="20" height="5"></rect>
                <line x1="12" y1="22" x2="12" y2="7"></line>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
              </svg>
              Rewards
            </button>
          </div>
        </div>

        {/* Products Tab */}
        {mainTab === 'products-main' && (
          <>
        {/* Stats Cards */}
        <div className="stats-grid stats-grid-4" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Products</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#D1FAE5', color: '#059669' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.active}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.draft}</span>
              <span className="stat-label">Draft</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#FCE7F3', color: '#DB2777' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.bundles}</span>
              <span className="stat-label">Bundles</span>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="content-tabs" style={{ marginBottom: '24px' }}>
          <button
            className={`content-tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products
          </button>
          <button
            className={`content-tab ${activeTab === 'bundles' ? 'active' : ''}`}
            onClick={() => setActiveTab('bundles')}
          >
            Bundles
          </button>
          <button
            className={`content-tab ${activeTab === 'addons' ? 'active' : ''}`}
            onClick={() => setActiveTab('addons')}
          >
            Add-Ons
          </button>
        </div>

        {/* Products View */}
        {activeTab === 'products' && (
          <>
            {/* Filters */}
            <div className="filters-bar">
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${categoryFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('all')}
                >
                  All
                </button>
                <button
                  className={`filter-tab ${categoryFilter === 'root' ? 'active' : ''}`}
                  data-category="root"
                  onClick={() => setCategoryFilter('root')}
                >
                  Root
                </button>
                <button
                  className={`filter-tab ${categoryFilter === 'growth' ? 'active' : ''}`}
                  data-category="growth"
                  onClick={() => setCategoryFilter('growth')}
                >
                  Growth
                </button>
                <button
                  className={`filter-tab ${categoryFilter === 'cultivation' ? 'active' : ''}`}
                  data-category="cultivation"
                  onClick={() => setCategoryFilter('cultivation')}
                >
                  Cultivation
                </button>
              </div>
              <div className="filter-group">
                <div className="search-input-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="M21 21l-4.35-4.35"></path>
                  </svg>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Monthly</th>
                    <th>One-time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="product-cell">
                          <span className="product-name">{product.name}</span>
                          <span className="product-desc">{product.short_description || ''}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`category-badge ${getCategoryBadgeClass(product.category)}`}>
                          {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                        </span>
                      </td>
                      <td>{formatPrice(product.monthly_price, 'monthly')}</td>
                      <td>{formatPrice(product.onetime_price, 'onetime')}</td>
                      <td>
                        <span className={`status-badge ${product.status}`}>
                          {(product.status || 'active').charAt(0).toUpperCase() + (product.status || 'active').slice(1)}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <Link href={`/admin/products/${product.id}/edit`} className="btn-icon-sm" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </Link>
                          <button
                            className="btn-icon-sm"
                            title="Duplicate"
                            onClick={() => handleDuplicateProduct(product.id)}
                            disabled={isDuplicating === product.id}
                          >
                            {isDuplicating === product.id ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="animate-spin">
                                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"></circle>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            )}
                          </button>
                          <button
                            className="btn-icon-sm btn-icon-danger"
                            title="Delete"
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            disabled={isDeleting === product.id}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Bundles View */}
        {activeTab === 'bundles' && (
          <div className="bundles-grid">
            {bundles.map((bundle) => (
              <div key={bundle.id} className={`bundle-card ${bundle.status === 'draft' ? 'bundle-draft' : ''}`}>
                <div className="bundle-header">
                  <h3>{bundle.name}</h3>
                  <span className={`status-badge ${bundle.status}`}>
                    {(bundle.status || 'active').charAt(0).toUpperCase() + (bundle.status || 'active').slice(1)}
                  </span>
                </div>
                <div className="bundle-pricing">
                  <span className="bundle-price">{formatPrice(bundle.monthly_price, 'monthly')}</span>
                </div>
                <div className="bundle-products">
                  <div className="bundle-product-count">{bundle.bundle_products.length} Products Included:</div>
                  <ul className="bundle-product-list">
                    {bundle.bundle_products.slice(0, 5).map((bp) => (
                      <li key={bp.product.id}>{bp.product.name}</li>
                    ))}
                    {bundle.bundle_products.length > 5 && (
                      <li>+ {bundle.bundle_products.length - 5} more</li>
                    )}
                  </ul>
                </div>
                <div className="bundle-actions" style={{ display: 'flex', gap: '8px' }}>
                  <Link href={`/admin/products/bundle/${bundle.id}/edit`} className="btn btn-sm btn-secondary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                  </Link>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleDuplicateBundle(bundle.id)}
                    disabled={isDuplicatingBundle === bundle.id}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    {isDuplicatingBundle === bundle.id ? 'Duplicating...' : 'Duplicate'}
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteBundle(bundle.id, bundle.name)}
                    disabled={isDeletingBundle === bundle.id}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    {isDeletingBundle === bundle.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add-Ons View */}
        {activeTab === 'addons' && (
          <div className="bundles-grid">
            {addons.map((addon) => (
              <div key={addon.id} className={`bundle-card addon-card ${addon.status === 'draft' ? 'bundle-draft' : ''}`}>
                <div className="bundle-header">
                  <h3>{addon.name}</h3>
                  <span className={`status-badge ${addon.status}`}>
                    {(addon.status || 'active').charAt(0).toUpperCase() + (addon.status || 'active').slice(1)}
                  </span>
                </div>
                <div className="bundle-pricing">
                  <span className="bundle-price">{formatPrice(addon.price, 'monthly')}</span>
                </div>
                <div className="bundle-products">
                  <p className="addon-desc">{addon.description || ''}</p>
                </div>
                <div className="bundle-actions" style={{ display: 'flex', gap: '8px' }}>
                  <Link href={`/admin/products/addon/${addon.id}/edit`} className="btn btn-sm btn-secondary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                  </Link>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleDuplicateAddon(addon.id)}
                    disabled={isDuplicatingAddon === addon.id}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    {isDuplicatingAddon === addon.id ? 'Duplicating...' : 'Duplicate'}
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteAddon(addon.id, addon.name)}
                    disabled={isDeletingAddon === addon.id}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    {isDeletingAddon === addon.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}

        {/* Rewards Tab */}
        {mainTab === 'rewards' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
              <button className="btn btn-primary" onClick={() => openThresholdModal()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Threshold
              </button>
            </div>

            {/* Rewards Layout */}
            <div className="rewards-layout">
              {/* Left Column: Threshold Levels */}
              <div className="rewards-main">
                <div className="section-card">
                  <div className="section-header">
                    <h2>Spending Thresholds</h2>
                    <p>Rewards unlock when monthly spend reaches these levels</p>
                  </div>
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Monthly Spend</th>
                          <th>Reward</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {thresholds.map((threshold) => (
                          <tr key={threshold.id}>
                            <td>
                              <span className="threshold-amount">${threshold.amount.toLocaleString()}</span>
                              <span className="threshold-label">/month</span>
                            </td>
                            <td>
                              <span className={`reward-badge ${threshold.rewardType}`}>
                                {threshold.rewardValue}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-icon-sm"
                                title="Edit"
                                onClick={() => openThresholdModal(threshold)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Always Free Products */}
              <div className="rewards-sidebar">
                <div className="section-card">
                  <div className="section-header">
                    <h2>Always Free Products</h2>
                    <p>Products included free with any purchase</p>
                  </div>
                  <div className="free-products-list">
                    {freeProducts.map((product) => (
                      <div key={product.id} className="free-product-item">
                        <div className="product-info">
                          <span className="product-name">{product.name}</span>
                          <span className="product-value">{product.value}</span>
                        </div>
                        <button
                          className="btn-icon-sm"
                          title="Remove"
                          onClick={() => removeFreeProduct(product.id)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ))}
                    {freeProducts.length === 0 && (
                      <p className="text-muted" style={{ padding: '12px', textAlign: 'center' }}>
                        No free products configured
                      </p>
                    )}
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', marginTop: '12px' }}
                    onClick={() => setShowFreeProductModal(true)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Product
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Threshold Modal */}
      {showThresholdModal && (
        <div className="modal-overlay active" onClick={() => setShowThresholdModal(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingThreshold ? 'Edit' : 'Add'} Threshold</h2>
              <button className="modal-close" onClick={() => setShowThresholdModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Monthly Spend Threshold <span className="required">*</span></label>
                <div className="input-with-addon">
                  <span className="input-addon">$</span>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="1000"
                    value={thresholdAmount}
                    onChange={(e) => setThresholdAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Reward Type <span className="required">*</span></label>
                <select
                  className="form-control"
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value as 'discount' | 'freebie')}
                >
                  <option value="discount">Percentage Discount</option>
                  <option value="freebie">Free $99 Product</option>
                </select>
              </div>
              {rewardType === 'discount' && (
                <div className="form-group">
                  <label>Discount Percentage</label>
                  <div className="input-with-addon">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="5"
                      min="1"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                    />
                    <span className="input-addon-right">%</span>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowThresholdModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveThreshold}>Save Threshold</button>
            </div>
          </div>
        </div>
      )}

      {/* Always Free Modal */}
      {showFreeProductModal && (
        <div className="modal-overlay active" onClick={() => setShowFreeProductModal(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Always Free Product</h2>
              <button className="modal-close" onClick={() => setShowFreeProductModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Select Product</label>
                <select
                  className="form-control"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">Choose a product...</option>
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.price})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowFreeProductModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addFreeProduct} disabled={!selectedProduct}>Add Product</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

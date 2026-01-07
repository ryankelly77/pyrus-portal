'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'

type ProductCategory = 'root' | 'growth' | 'cultivation'
type ProductStatus = 'active' | 'draft' | 'inactive'
type ViewTab = 'products' | 'bundles' | 'addons'

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
  const [activeTab, setActiveTab] = useState<ViewTab>('products')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [addons, setAddons] = useState<AddOn[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
          user={{ name: 'Ryan Kelly', initials: 'RK' }}
          hasNotifications={true}
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
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
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
                          <button className="btn-icon-sm" title="Duplicate">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
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
                <div className="bundle-actions">
                  <Link href={`/admin/products/bundle/${bundle.id}/edit`} className="btn btn-sm btn-secondary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                  </Link>
                  <button className="btn btn-sm btn-outline">Duplicate</button>
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
                <div className="bundle-actions">
                  <Link href={`/admin/products/addon/${addon.id}/edit`} className="btn btn-sm btn-secondary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                  </Link>
                  <button className="btn btn-sm btn-outline">Duplicate</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

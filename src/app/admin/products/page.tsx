'use client'

import { useState, useMemo } from 'react'
import { AdminHeader } from '@/components/layout'

type ProductCategory = 'root' | 'growth' | 'cultivation'
type ProductStatus = 'active' | 'draft' | 'inactive'
type ViewTab = 'products' | 'bundles' | 'addons'

interface Product {
  id: string
  name: string
  description: string
  category: ProductCategory
  monthlyPrice: string
  onetimePrice: string
  status: ProductStatus
}

interface Bundle {
  id: string
  name: string
  price: string
  savings: string
  productCount: number
  products: string[]
  status: ProductStatus
}

interface AddOn {
  id: string
  name: string
  price: string
  description: string
  status: ProductStatus
}

interface DraggableProduct {
  id: string
  name: string
  price: string
}

const products: Product[] = [
  { id: '1', name: 'Pro Dashboard', description: 'Comprehensive analytics dashboard', category: 'root', monthlyPrice: '$99/mo', onetimePrice: '$1,188', status: 'active' },
  { id: '2', name: 'Analytics Tracking', description: 'GA4 & conversion tracking setup', category: 'root', monthlyPrice: '-', onetimePrice: '$99', status: 'active' },
  { id: '3', name: 'SEO Content Package', description: 'Monthly SEO-optimized content', category: 'growth', monthlyPrice: '$299/mo', onetimePrice: '$3,588', status: 'active' },
  { id: '4', name: 'Google Ads Management', description: 'Full-service PPC campaign management', category: 'growth', monthlyPrice: '$499/mo', onetimePrice: '$5,988', status: 'active' },
  { id: '5', name: 'Social Media Management', description: 'Complete social media strategy & posting', category: 'cultivation', monthlyPrice: '$399/mo', onetimePrice: '$4,788', status: 'active' },
  { id: '6', name: 'Email Marketing Automation', description: 'Automated email sequences & campaigns', category: 'cultivation', monthlyPrice: '$249/mo', onetimePrice: '$2,988', status: 'draft' },
]

const bundles: Bundle[] = [
  { id: '1', name: 'Starter Package', price: '$199/mo', savings: 'Save $98/mo', productCount: 4, products: ['Pro Dashboard', 'Analytics Tracking', 'SEO Starter', 'Monthly Report'], status: 'active' },
  { id: '2', name: 'Growth Package', price: '$599/mo', savings: 'Save $297/mo', productCount: 8, products: ['Pro Dashboard', 'Analytics Tracking', 'SEO Content Package', 'Google Ads Management', '+ 4 more'], status: 'active' },
  { id: '3', name: 'Enterprise Package', price: '$1,299/mo', savings: 'Save $599/mo', productCount: 15, products: ['All Growth Package items', 'Social Media Management', 'Email Marketing', 'Reputation Management', '+ 7 more'], status: 'active' },
  { id: '4', name: 'Custom Package', price: '$899/mo', savings: 'Save $401/mo', productCount: 10, products: ['Customized selection', 'Based on client needs'], status: 'draft' },
]

const addons: AddOn[] = [
  { id: '1', name: 'Monthly Report', price: '$99/mo', description: 'Comprehensive monthly performance report with insights and recommendations.', status: 'active' },
  { id: '2', name: 'GBP Posting', price: '$99/mo', description: 'Regular Google Business Profile posts to keep your listing active and engaging.', status: 'active' },
  { id: '3', name: 'Review Management', price: '$99/mo', description: 'Monitor and respond to customer reviews across platforms.', status: 'active' },
  { id: '4', name: 'WordPress Care Plan', price: '$49/mo', description: 'Secure, updated hosting and maintenance for WordPress sites.', status: 'active' },
  { id: '5', name: 'AI Visibility Monitoring', price: '$149/mo', description: 'Track your AI citation performance and visibility in AI assistants.', status: 'active' },
  { id: '6', name: 'Call Tracking', price: '$79/mo', description: 'Track and record inbound calls with detailed analytics.', status: 'draft' },
]

const availableProducts: DraggableProduct[] = [
  { id: 'pro-dashboard', name: 'Pro Dashboard', price: '$99/mo' },
  { id: 'analytics-tracking', name: 'Analytics Tracking', price: '$99' },
  { id: 'seo-content', name: 'SEO Content Package', price: '$299/mo' },
  { id: 'google-ads', name: 'Google Ads Management', price: '$499/mo' },
  { id: 'social-media', name: 'Social Media Management', price: '$399/mo' },
]

export default function AdminProductsPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('products')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false)
  const [showBundleModal, setShowBundleModal] = useState(false)
  const [productModalTitle, setProductModalTitle] = useState('Add Product')
  const [bundleModalTitle, setBundleModalTitle] = useState('Create Bundle')

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    shortDesc: '',
    longDesc: '',
    category: '',
    status: 'active',
    monthlyPrice: '',
    onetimePrice: '',
    supportsQuantity: false,
    stripeProductId: '',
    stripeMonthlyPriceId: '',
    stripeOnetimePriceId: '',
    dependencies: [] as string[],
  })

  // Bundle form state
  const [bundleForm, setBundleForm] = useState({
    name: '',
    description: '',
    monthlyPrice: '',
    onetimePrice: '',
    status: 'active',
    stripeProductId: '',
    stripePriceId: '',
  })
  const [includedProducts, setIncludedProducts] = useState<DraggableProduct[]>([])
  const [dragOver, setDragOver] = useState(false)

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (categoryFilter !== 'all' && product.category !== categoryFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!product.name.toLowerCase().includes(query) && !product.description.toLowerCase().includes(query)) {
          return false
        }
      }
      return true
    })
  }, [categoryFilter, searchQuery])

  const getCategoryBadgeClass = (category: ProductCategory) => {
    switch (category) {
      case 'root': return 'category-root'
      case 'growth': return 'category-growth'
      case 'cultivation': return 'category-cultivation'
    }
  }

  const stats = {
    total: products.length,
    active: products.filter((p) => p.status === 'active').length,
    draft: products.filter((p) => p.status === 'draft').length,
    bundles: bundles.length,
  }

  // Modal handlers
  const openProductModal = (isEdit = false) => {
    setProductModalTitle(isEdit ? 'Edit Product' : 'Add Product')
    if (!isEdit) {
      setProductForm({
        name: '',
        shortDesc: '',
        longDesc: '',
        category: '',
        status: 'active',
        monthlyPrice: '',
        onetimePrice: '',
        supportsQuantity: false,
        stripeProductId: '',
        stripeMonthlyPriceId: '',
        stripeOnetimePriceId: '',
        dependencies: [],
      })
    }
    setShowProductModal(true)
  }

  const openBundleModal = (isEdit = false) => {
    setBundleModalTitle(isEdit ? 'Edit Bundle' : 'Create Bundle')
    if (!isEdit) {
      setBundleForm({
        name: '',
        description: '',
        monthlyPrice: '',
        onetimePrice: '',
        status: 'active',
        stripeProductId: '',
        stripePriceId: '',
      })
      setIncludedProducts([])
    }
    setShowBundleModal(true)
  }

  const closeModal = () => {
    setShowProductModal(false)
    setShowBundleModal(false)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, product: DraggableProduct) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(product))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const data = e.dataTransfer.getData('text/plain')
    const product: DraggableProduct = JSON.parse(data)

    if (!includedProducts.find(p => p.id === product.id)) {
      setIncludedProducts([...includedProducts, product])
    }
  }

  const removeFromBundle = (productId: string) => {
    setIncludedProducts(includedProducts.filter(p => p.id !== productId))
  }

  // Calculate bundle summary
  const calculateBundleSummary = () => {
    const total = includedProducts.reduce((sum, product) => {
      const price = parseInt(product.price.replace(/[^0-9]/g, '')) || 0
      return sum + price
    }, 0)

    const bundlePrice = parseInt(bundleForm.monthlyPrice) || 0
    const savings = total - bundlePrice

    return {
      productsTotal: total,
      bundlePrice,
      savings: savings > 0 ? savings : 0,
    }
  }

  const summary = calculateBundleSummary()

  const handleSaveProduct = () => {
    console.log('Saving product:', productForm)
    closeModal()
  }

  const handleSaveBundle = () => {
    console.log('Saving bundle:', bundleForm, includedProducts)
    closeModal()
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
            <button className="btn btn-secondary" onClick={() => openBundleModal()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Create Bundle
            </button>
            <button className="btn btn-primary" onClick={() => openProductModal()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Product
            </button>
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
                          <span className="product-desc">{product.description}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`category-badge ${getCategoryBadgeClass(product.category)}`}>
                          {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                        </span>
                      </td>
                      <td>{product.monthlyPrice}</td>
                      <td>{product.onetimePrice}</td>
                      <td>
                        <span className={`status-badge ${product.status}`}>
                          {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon-sm" title="Edit" onClick={() => openProductModal(true)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
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
                    {bundle.status.charAt(0).toUpperCase() + bundle.status.slice(1)}
                  </span>
                </div>
                <div className="bundle-pricing">
                  <span className="bundle-price">{bundle.price}</span>
                  <span className="bundle-savings">{bundle.savings}</span>
                </div>
                <div className="bundle-products">
                  <div className="bundle-product-count">{bundle.productCount} Products Included:</div>
                  <ul className="bundle-product-list">
                    {bundle.products.map((product, index) => (
                      <li key={index}>{product}</li>
                    ))}
                  </ul>
                </div>
                <div className="bundle-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => openBundleModal(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                  </button>
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
                    {addon.status.charAt(0).toUpperCase() + addon.status.slice(1)}
                  </span>
                </div>
                <div className="bundle-pricing">
                  <span className="bundle-price">{addon.price}</span>
                </div>
                <div className="bundle-products">
                  <p className="addon-desc">{addon.description}</p>
                </div>
                <div className="bundle-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => openProductModal(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-outline">Duplicate</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">{productModalTitle}</h2>
              <button className="modal-close" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                {/* Left Column */}
                <div className="form-column">
                  <div className="form-section">
                    <h3 className="form-section-title">Basic Information</h3>
                    <div className="form-group">
                      <label htmlFor="productName">Product Name <span className="required">*</span></label>
                      <input
                        type="text"
                        id="productName"
                        className="form-control"
                        placeholder="e.g., SEO Content Package"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="shortDesc">Short Description</label>
                      <input
                        type="text"
                        id="shortDesc"
                        className="form-control"
                        placeholder="Brief description for cards"
                        value={productForm.shortDesc}
                        onChange={(e) => setProductForm({ ...productForm, shortDesc: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="longDesc">Long Description</label>
                      <textarea
                        id="longDesc"
                        className="form-control"
                        rows={3}
                        placeholder="Detailed description for modal"
                        value={productForm.longDesc}
                        onChange={(e) => setProductForm({ ...productForm, longDesc: e.target.value })}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="category">Category <span className="required">*</span></label>
                        <select
                          id="category"
                          className="form-control"
                          value={productForm.category}
                          onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        >
                          <option value="">Select category...</option>
                          <option value="root">Root</option>
                          <option value="growth">Growth</option>
                          <option value="cultivation">Cultivation</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="status">Status</label>
                        <select
                          id="status"
                          className="form-control"
                          value={productForm.status}
                          onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}
                        >
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3 className="form-section-title">Pricing</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="monthlyPrice">Monthly Price</label>
                        <div className="input-with-addon">
                          <span className="input-addon">$</span>
                          <input
                            type="number"
                            id="monthlyPrice"
                            className="form-control"
                            placeholder="0.00"
                            value={productForm.monthlyPrice}
                            onChange={(e) => setProductForm({ ...productForm, monthlyPrice: e.target.value })}
                          />
                          <span className="input-addon-right">/mo</span>
                        </div>
                        <span className="form-hint">For 12 months term</span>
                      </div>
                      <div className="form-group">
                        <label htmlFor="onetimePrice">One-time Price</label>
                        <div className="input-with-addon">
                          <span className="input-addon">$</span>
                          <input
                            type="number"
                            id="onetimePrice"
                            className="form-control"
                            placeholder="0.00"
                            value={productForm.onetimePrice}
                            onChange={(e) => setProductForm({ ...productForm, onetimePrice: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={productForm.supportsQuantity}
                          onChange={(e) => setProductForm({ ...productForm, supportsQuantity: e.target.checked })}
                        />
                        <span>Supports quantity selector</span>
                      </label>
                      <span className="form-hint">Allow clients to select multiple quantities</span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="form-column">
                  <div className="form-section">
                    <h3 className="form-section-title">Stripe Configuration</h3>
                    <div className="form-group">
                      <label htmlFor="stripeProductId">Stripe Product ID</label>
                      <input
                        type="text"
                        id="stripeProductId"
                        className="form-control"
                        placeholder="prod_xxxxxxxxxxxxx"
                        value={productForm.stripeProductId}
                        onChange={(e) => setProductForm({ ...productForm, stripeProductId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="stripeMonthlyPriceId">Stripe Monthly Price ID</label>
                      <input
                        type="text"
                        id="stripeMonthlyPriceId"
                        className="form-control"
                        placeholder="price_xxxxxxxxxxxxx"
                        value={productForm.stripeMonthlyPriceId}
                        onChange={(e) => setProductForm({ ...productForm, stripeMonthlyPriceId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="stripeOnetimePriceId">Stripe One-time Price ID</label>
                      <input
                        type="text"
                        id="stripeOnetimePriceId"
                        className="form-control"
                        placeholder="price_xxxxxxxxxxxxx"
                        value={productForm.stripeOnetimePriceId}
                        onChange={(e) => setProductForm({ ...productForm, stripeOnetimePriceId: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <h3 className="form-section-title">Dependencies</h3>
                    <div className="form-group">
                      <label htmlFor="dependencies">Required Products</label>
                      <select
                        id="dependencies"
                        className="form-control"
                        multiple
                        size={5}
                        value={productForm.dependencies}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value)
                          setProductForm({ ...productForm, dependencies: selected })
                        }}
                      >
                        <option value="pro-dashboard">Pro Dashboard</option>
                        <option value="analytics-tracking">Analytics Tracking</option>
                        <option value="seo-content">SEO Content Package</option>
                        <option value="google-ads">Google Ads Management</option>
                        <option value="social-media">Social Media Management</option>
                      </select>
                      <span className="form-hint">Hold Ctrl/Cmd to select multiple products</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveProduct}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Bundle Modal */}
      {showBundleModal && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">{bundleModalTitle}</h2>
              <button className="modal-close" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="bundle-builder">
                {/* Left: Bundle Details */}
                <div className="bundle-details">
                  <div className="form-section">
                    <h3 className="form-section-title">Bundle Information</h3>
                    <div className="form-group">
                      <label htmlFor="bundleName">Bundle Name <span className="required">*</span></label>
                      <input
                        type="text"
                        id="bundleName"
                        className="form-control"
                        placeholder="e.g., Growth Package"
                        value={bundleForm.name}
                        onChange={(e) => setBundleForm({ ...bundleForm, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="bundleDesc">Description</label>
                      <textarea
                        id="bundleDesc"
                        className="form-control"
                        rows={2}
                        placeholder="Brief bundle description"
                        value={bundleForm.description}
                        onChange={(e) => setBundleForm({ ...bundleForm, description: e.target.value })}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="bundleMonthlyPrice">Monthly Price</label>
                        <div className="input-with-addon">
                          <span className="input-addon">$</span>
                          <input
                            type="number"
                            id="bundleMonthlyPrice"
                            className="form-control"
                            placeholder="0.00"
                            value={bundleForm.monthlyPrice}
                            onChange={(e) => setBundleForm({ ...bundleForm, monthlyPrice: e.target.value })}
                          />
                          <span className="input-addon-right">/mo</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="bundleOnetimePrice">One-time Price</label>
                        <div className="input-with-addon">
                          <span className="input-addon">$</span>
                          <input
                            type="number"
                            id="bundleOnetimePrice"
                            className="form-control"
                            placeholder="0.00"
                            value={bundleForm.onetimePrice}
                            onChange={(e) => setBundleForm({ ...bundleForm, onetimePrice: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="bundleStatus">Status</label>
                      <select
                        id="bundleStatus"
                        className="form-control"
                        value={bundleForm.status}
                        onChange={(e) => setBundleForm({ ...bundleForm, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3 className="form-section-title">Stripe Configuration</h3>
                    <div className="form-group">
                      <label htmlFor="bundleStripeProductId">Stripe Product ID</label>
                      <input
                        type="text"
                        id="bundleStripeProductId"
                        className="form-control"
                        placeholder="prod_xxxxxxxxxxxxx"
                        value={bundleForm.stripeProductId}
                        onChange={(e) => setBundleForm({ ...bundleForm, stripeProductId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="bundleStripePriceId">Stripe Price ID</label>
                      <input
                        type="text"
                        id="bundleStripePriceId"
                        className="form-control"
                        placeholder="price_xxxxxxxxxxxxx"
                        value={bundleForm.stripePriceId}
                        onChange={(e) => setBundleForm({ ...bundleForm, stripePriceId: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Product Selector */}
                <div className="bundle-product-selector">
                  <div className="form-section">
                    <h3 className="form-section-title">Included Products</h3>
                    <p className="form-hint" style={{ marginBottom: '16px' }}>Drag products to add them to this bundle</p>

                    <div className="product-selector-container">
                      <div className="available-products">
                        <h4>Available Products</h4>
                        <div className="product-list">
                          {availableProducts
                            .filter(p => !includedProducts.find(ip => ip.id === p.id))
                            .map((product) => (
                              <div
                                key={product.id}
                                className="draggable-product"
                                draggable
                                onDragStart={(e) => handleDragStart(e, product)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                  <line x1="3" y1="12" x2="21" y2="12"></line>
                                  <line x1="3" y1="6" x2="21" y2="6"></line>
                                  <line x1="3" y1="18" x2="21" y2="18"></line>
                                </svg>
                                <span>{product.name}</span>
                                <span className="product-price">{product.price}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                      <div className="included-products">
                        <h4>In This Bundle</h4>
                        <div
                          className={`product-list drop-zone ${dragOver ? 'drag-over' : ''}`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          {includedProducts.length === 0 ? (
                            <div className="drop-placeholder">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                              </svg>
                              <span>Drop products here</span>
                            </div>
                          ) : (
                            includedProducts.map((product) => (
                              <div key={product.id} className="draggable-product">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                  <line x1="3" y1="12" x2="21" y2="12"></line>
                                  <line x1="3" y1="6" x2="21" y2="6"></line>
                                  <line x1="3" y1="18" x2="21" y2="18"></line>
                                </svg>
                                <span>{product.name}</span>
                                <span className="product-price">{product.price}</span>
                                <button
                                  className="remove-product"
                                  onClick={() => removeFromBundle(product.id)}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bundle-summary">
                      <div className="summary-row">
                        <span>Products Total:</span>
                        <span>${summary.productsTotal}/mo</span>
                      </div>
                      <div className="summary-row">
                        <span>Bundle Price:</span>
                        <span>${summary.bundlePrice}/mo</span>
                      </div>
                      <div className="summary-row savings">
                        <span>Customer Savings:</span>
                        <span>${summary.savings}/mo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveBundle}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Bundle
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

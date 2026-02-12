'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

interface Product {
  id: string
  name: string
  monthly_price: string | null
  onetime_price: string | null
  category: string
}

interface DraggableProduct {
  id: string
  name: string
  price: string
}

export default function EditBundlePage() {
  const { user, profile, hasNotifications } = useUserProfile()
  const router = useRouter()
  const params = useParams()
  const bundleId = params.id as string

  // Only super admins can edit pricing and Stripe fields
  const isSuperAdmin = profile?.role === 'super_admin'

  const [bundleForm, setBundleForm] = useState({
    name: '',
    description: '',
    monthlyPrice: '',
    onetimePrice: '',
    status: 'active',
    stripeProductId: '',
    stripePriceId: '',
  })

  const [availableProducts, setAvailableProducts] = useState<DraggableProduct[]>([])
  const [includedProducts, setIncludedProducts] = useState<DraggableProduct[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [bundleRes, productsRes] = await Promise.all([
          fetch(`/api/admin/bundles/${bundleId}`),
          fetch('/api/admin/products'),
        ])

        if (!bundleRes.ok) {
          setError('Bundle not found')
          setIsLoading(false)
          return
        }

        const bundle = await bundleRes.json()
        const products: Product[] = await productsRes.json()

        // Set form data
        setBundleForm({
          name: bundle.name,
          description: bundle.description || '',
          monthlyPrice: bundle.monthly_price ? String(bundle.monthly_price) : '',
          onetimePrice: bundle.onetime_price ? String(bundle.onetime_price) : '',
          status: bundle.status || 'active',
          stripeProductId: bundle.stripe_product_id || '',
          stripePriceId: bundle.stripe_price_id || '',
        })

        // Format products for drag and drop
        const formatPrice = (product: Product) => {
          if (product.monthly_price && parseFloat(product.monthly_price) > 0) {
            return `$${parseFloat(product.monthly_price).toLocaleString()}/mo`
          }
          if (product.onetime_price && parseFloat(product.onetime_price) > 0) {
            return `$${parseFloat(product.onetime_price).toLocaleString()}`
          }
          return '-'
        }

        const allProducts: DraggableProduct[] = products.map(p => ({
          id: p.id,
          name: p.name,
          price: formatPrice(p),
        }))

        // Get included product IDs from bundle
        const includedIds = bundle.bundle_products.map((bp: { product: { id: string } }) => bp.product.id)

        // Split into included and available
        const included = allProducts.filter(p => includedIds.includes(p.id))
        const available = allProducts.filter(p => !includedIds.includes(p.id))

        // Sort included products by bundle order
        const sortedIncluded = includedIds.map((id: string) => included.find(p => p.id === id)).filter(Boolean) as DraggableProduct[]

        setIncludedProducts(sortedIncluded)
        setAvailableProducts(available)
      } catch (err) {
        console.error('Failed to fetch data:', err)
        setError('Failed to load bundle')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [bundleId])

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
    try {
      const product: DraggableProduct = JSON.parse(data)
      if (product && product.id && !includedProducts.find(p => p.id === product.id)) {
        setIncludedProducts([...includedProducts, product])
        setAvailableProducts(availableProducts.filter(p => p.id !== product.id))
      }
    } catch {
      // Ignore invalid drag data (e.g., text selections)
    }
  }

  const removeFromBundle = (productId: string) => {
    const product = includedProducts.find(p => p.id === productId)
    if (product) {
      setIncludedProducts(includedProducts.filter(p => p.id !== productId))
      setAvailableProducts([...availableProducts, product])
    }
  }

  const addToBundle = (product: DraggableProduct) => {
    if (!includedProducts.find(p => p.id === product.id)) {
      setIncludedProducts([...includedProducts, product])
      setAvailableProducts(availableProducts.filter(p => p.id !== product.id))
    }
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

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bundleForm,
          products: includedProducts.map(p => p.id),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update bundle')
      }

      router.push('/admin/products?tab=bundles')
    } catch (err) {
      console.error('Failed to save bundle:', err)
      setError('Failed to save bundle')
      setIsSaving(false)
    }
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
          <div className="content-page-header">
            <p>Loading...</p>
          </div>
        </div>
      </>
    )
  }

  if (error && !bundleForm.name) {
    return (
      <>
        <AdminHeader
          title="Product Management"
          user={user}
          hasNotifications={hasNotifications}
        />
        <div className="admin-content">
          <div className="content-page-header">
            <Link href="/admin/products?tab=bundles" className="back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Back to Products
            </Link>
            <p style={{ color: '#dc2626', marginTop: '16px' }}>{error}</p>
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
        {/* Back Link and Title */}
        <div className="content-page-header">
          <Link href="/admin/products?tab=bundles" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back to Products
          </Link>
          <h1 className="content-page-title">Edit Bundle</h1>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Form Content */}
        <div className="content-form">
          <div className="form-grid">
            {/* Main Content */}
            <div className="form-main">
              <div className="form-card">
                <h3 className="form-card-title">Bundle Information</h3>
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
                    rows={3}
                    placeholder="Brief bundle description"
                    value={bundleForm.description}
                    onChange={(e) => setBundleForm({ ...bundleForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-card" style={!isSuperAdmin ? { opacity: 0.7 } : undefined}>
                <h3 className="form-card-title">
                  Pricing
                  {!isSuperAdmin && <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '8px' }}>(Super Admin only)</span>}
                </h3>
                <div className="form-row-2">
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
                        disabled={!isSuperAdmin}
                        style={!isSuperAdmin ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : undefined}
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
                        disabled={!isSuperAdmin}
                        style={!isSuperAdmin ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-card">
                <h3 className="form-card-title">Included Products</h3>
                <p className="form-hint" style={{ marginBottom: '16px' }}>Drag products from Available or click to add them to this bundle</p>

                <div className="product-selector-container">
                  <div className="available-products">
                    <h4>Available Products ({availableProducts.length})</h4>
                    <div className="product-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {availableProducts.map((product) => (
                        <div
                          key={product.id}
                          className="draggable-product"
                          draggable
                          onDragStart={(e) => handleDragStart(e, product)}
                          onClick={() => addToBundle(product)}
                          style={{ cursor: 'pointer' }}
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
                      {availableProducts.length === 0 && (
                        <div style={{ padding: '16px', color: '#6b7280', textAlign: 'center' }}>
                          All products are in the bundle
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="included-products">
                    <h4>In This Bundle ({includedProducts.length})</h4>
                    <div
                      className={`product-list drop-zone ${dragOver ? 'drag-over' : ''}`}
                      style={{ maxHeight: '300px', overflowY: 'auto' }}
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

                <div className="bundle-summary" style={{ marginTop: '16px' }}>
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

              <div className="form-card" style={!isSuperAdmin ? { opacity: 0.7 } : undefined}>
                <h3 className="form-card-title">
                  Stripe Configuration
                  {!isSuperAdmin && <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '8px' }}>(Super Admin only)</span>}
                </h3>
                <div className="form-group">
                  <label htmlFor="bundleStripeProductId">Stripe Product ID</label>
                  <input
                    type="text"
                    id="bundleStripeProductId"
                    className="form-control"
                    placeholder="prod_xxxxxxxxxxxxx"
                    value={bundleForm.stripeProductId}
                    onChange={(e) => setBundleForm({ ...bundleForm, stripeProductId: e.target.value })}
                    disabled={!isSuperAdmin}
                    style={!isSuperAdmin ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : undefined}
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
                    disabled={!isSuperAdmin}
                    style={!isSuperAdmin ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : undefined}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="form-sidebar">
              <div className="form-card">
                <h3 className="form-card-title">Settings</h3>
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

              <div className="form-actions-sidebar">
                <button
                  className="btn btn-primary btn-block"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  {isSaving ? 'Saving...' : 'Update Bundle'}
                </button>
                <Link href="/admin/products?tab=bundles" className="btn btn-secondary btn-block">
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

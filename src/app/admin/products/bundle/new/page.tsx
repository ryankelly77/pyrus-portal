'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

export default function NewBundlePage() {
  const { user, hasNotifications } = useUserProfile()
  const router = useRouter()

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
    async function fetchProducts() {
      try {
        const res = await fetch('/api/admin/products')
        if (!res.ok) throw new Error('Failed to fetch products')

        const products: Product[] = await res.json()

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

        const formattedProducts: DraggableProduct[] = products.map(p => ({
          id: p.id,
          name: p.name,
          price: formatPrice(p),
        }))

        setAvailableProducts(formattedProducts)
      } catch (err) {
        console.error('Failed to fetch products:', err)
        setError('Failed to load products')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

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
      setAvailableProducts(availableProducts.filter(p => p.id !== product.id))
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
    if (!bundleForm.name.trim()) {
      setError('Bundle name is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bundleForm.name,
          description: bundleForm.description,
          monthlyPrice: bundleForm.monthlyPrice,
          onetimePrice: bundleForm.onetimePrice,
          status: bundleForm.status,
          stripeProductId: bundleForm.stripeProductId,
          stripePriceId: bundleForm.stripePriceId,
          products: includedProducts.map(p => p.id),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to create bundle')
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
          <h1 className="content-page-title">Create New Bundle</h1>
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

              <div className="form-card">
                <h3 className="form-card-title">Pricing</h3>
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
              </div>

              <div className="form-card">
                <h3 className="form-card-title">Included Products</h3>
                <p className="form-hint" style={{ marginBottom: '16px' }}>Click or drag products to add them to this bundle</p>

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
                          All products are included
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

              <div className="form-card">
                <h3 className="form-card-title">Stripe Configuration</h3>
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
                  {isSaving ? 'Saving...' : 'Save Bundle'}
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

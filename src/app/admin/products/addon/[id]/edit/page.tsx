'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { AdminHeader } from '@/components/layout'

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

export default function EditAddonPage() {
  const router = useRouter()
  const params = useParams()
  const addonId = params.id as string

  const [addonForm, setAddonForm] = useState({
    name: '',
    description: '',
    price: '',
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
        const [addonRes, productsRes] = await Promise.all([
          fetch(`/api/admin/addons/${addonId}`),
          fetch('/api/admin/products'),
        ])

        if (!addonRes.ok) {
          setError('Add-on not found')
          setIsLoading(false)
          return
        }

        const addon = await addonRes.json()
        const products: Product[] = await productsRes.json()

        // Set form data
        setAddonForm({
          name: addon.name,
          description: addon.description || '',
          price: addon.price ? String(addon.price) : '',
          status: addon.status || 'active',
          stripeProductId: addon.stripe_product_id || '',
          stripePriceId: addon.stripe_price_id || '',
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

        // Get included product IDs from addon
        const includedIds = addon.addon_products?.map((ap: { product: { id: string } }) => ap.product.id) || []

        // Split into included and available
        const included = allProducts.filter(p => includedIds.includes(p.id))
        const available = allProducts.filter(p => !includedIds.includes(p.id))

        setIncludedProducts(included)
        setAvailableProducts(available)
      } catch (err) {
        console.error('Failed to fetch data:', err)
        setError('Failed to load add-on')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [addonId])

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

  const removeFromAddon = (productId: string) => {
    const product = includedProducts.find(p => p.id === productId)
    if (product) {
      setIncludedProducts(includedProducts.filter(p => p.id !== productId))
      setAvailableProducts([...availableProducts, product])
    }
  }

  const addToAddon = (product: DraggableProduct) => {
    if (!includedProducts.find(p => p.id === product.id)) {
      setIncludedProducts([...includedProducts, product])
      setAvailableProducts(availableProducts.filter(p => p.id !== product.id))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/addons/${addonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addonForm,
          products: includedProducts.map(p => p.id),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update add-on')
      }

      router.push('/admin/products')
    } catch (err) {
      console.error('Failed to save add-on:', err)
      setError('Failed to save add-on')
      setIsSaving(false)
    }
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
          <div className="content-page-header">
            <p>Loading...</p>
          </div>
        </div>
      </>
    )
  }

  if (error && !addonForm.name) {
    return (
      <>
        <AdminHeader
          title="Product Management"
          user={{ name: 'Ryan Kelly', initials: 'RK' }}
          hasNotifications={true}
        />
        <div className="admin-content">
          <div className="content-page-header">
            <Link href="/admin/products" className="back-link">
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
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        {/* Back Link and Title */}
        <div className="content-page-header">
          <Link href="/admin/products" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back to Products
          </Link>
          <h1 className="content-page-title">Edit Add-On</h1>
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
                <h3 className="form-card-title">Add-On Information</h3>
                <div className="form-group">
                  <label htmlFor="addonName">Add-On Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="addonName"
                    className="form-control"
                    placeholder="e.g., Monthly Report"
                    value={addonForm.name}
                    onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="addonDesc">Description</label>
                  <textarea
                    id="addonDesc"
                    className="form-control"
                    rows={4}
                    placeholder="Describe what this add-on includes"
                    value={addonForm.description}
                    onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-card">
                <h3 className="form-card-title">Pricing</h3>
                <div className="form-group">
                  <label htmlFor="addonPrice">Monthly Price</label>
                  <div className="input-with-addon">
                    <span className="input-addon">$</span>
                    <input
                      type="number"
                      id="addonPrice"
                      className="form-control"
                      placeholder="0.00"
                      value={addonForm.price}
                      onChange={(e) => setAddonForm({ ...addonForm, price: e.target.value })}
                    />
                    <span className="input-addon-right">/mo</span>
                  </div>
                </div>
              </div>

              <div className="form-card">
                <h3 className="form-card-title">Included Products</h3>
                <p className="form-hint" style={{ marginBottom: '16px' }}>Select products that are included in this add-on package</p>

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
                          onClick={() => addToAddon(product)}
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
                    <h4>In This Add-On ({includedProducts.length})</h4>
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
                              onClick={() => removeFromAddon(product.id)}
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
              </div>

              <div className="form-card">
                <h3 className="form-card-title">Stripe Configuration</h3>
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="stripeProductId">Product ID</label>
                    <input
                      type="text"
                      id="stripeProductId"
                      className="form-control"
                      placeholder="prod_xxxxxxxxxxxxx"
                      value={addonForm.stripeProductId}
                      onChange={(e) => setAddonForm({ ...addonForm, stripeProductId: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="stripePriceId">Price ID</label>
                    <input
                      type="text"
                      id="stripePriceId"
                      className="form-control"
                      placeholder="price_xxxxxxxxxxxxx"
                      value={addonForm.stripePriceId}
                      onChange={(e) => setAddonForm({ ...addonForm, stripePriceId: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="form-sidebar">
              <div className="form-card">
                <h3 className="form-card-title">Settings</h3>
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    className="form-control"
                    value={addonForm.status}
                    onChange={(e) => setAddonForm({ ...addonForm, status: e.target.value })}
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
                  {isSaving ? 'Saving...' : 'Update Add-On'}
                </button>
                <Link href="/admin/products" className="btn btn-secondary btn-block">
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

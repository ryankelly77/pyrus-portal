'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

interface Service {
  name: string
  quantity: number
  details?: string
}

interface ProductOption {
  id: string
  name: string
}

export default function NewProductPage() {
  const { user, hasNotifications } = useUserProfile()
  const router = useRouter()

  const [productForm, setProductForm] = useState({
    name: '',
    shortDesc: '',
    longDesc: '',
    smartRecWhyText: '',
    category: '',
    status: 'active',
    monthlyPrice: '',
    onetimePrice: '',
    supportsQuantity: false,
    stripeProductId: '',
    stripeMonthlyPriceId: '',
    stripeOnetimePriceId: '',
    dependencies: [] as string[],
    includesContent: false,
    contentServices: [] as Service[],
    includesWebsite: false,
    websiteServices: [] as Service[],
  })

  const [allProducts, setAllProducts] = useState<ProductOption[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/admin/products')
        if (res.ok) {
          const products = await res.json()
          setAllProducts(products.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
        }
      } catch (err) {
        console.error('Failed to fetch products:', err)
      }
    }

    fetchProducts()
  }, [])

  const handleSave = async () => {
    if (!productForm.name || !productForm.category) {
      setError('Please fill in required fields (Name and Category)')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      })

      if (!res.ok) {
        throw new Error('Failed to create product')
      }

      router.push('/admin/products')
    } catch (err) {
      console.error('Failed to save product:', err)
      setError('Failed to save product')
      setIsSaving(false)
    }
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
          <Link href="/admin/products" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back to Products
          </Link>
          <h1 className="content-page-title">Add New Product</h1>
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
                <h3 className="form-card-title">Basic Information</h3>
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
                    rows={4}
                    placeholder="Detailed description for product pages"
                    value={productForm.longDesc}
                    onChange={(e) => setProductForm({ ...productForm, longDesc: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="smartRecWhyText">Smart Recommendation "Why You Need This"</label>
                  <textarea
                    id="smartRecWhyText"
                    className="form-control"
                    rows={3}
                    placeholder="Default text shown to clients explaining why they need this product"
                    value={productForm.smartRecWhyText}
                    onChange={(e) => setProductForm({ ...productForm, smartRecWhyText: e.target.value })}
                  />
                  <span className="form-hint">This text auto-populates when adding this product to a client's smart recommendations</span>
                </div>
              </div>

              <div className="form-card">
                <h3 className="form-card-title">Pricing</h3>
                <div className="form-row-2">
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={productForm.supportsQuantity}
                      onChange={(e) => setProductForm({ ...productForm, supportsQuantity: e.target.checked })}
                      style={{ width: '16px', height: '16px', margin: 0, accentColor: '#2D5A27' }}
                    />
                    <span style={{ fontSize: '14px', color: '#1f2937' }}>Supports quantity selector</span>
                  </label>
                  <span className="form-hint">Allow clients to select multiple quantities</span>
                </div>
              </div>

              <div className="form-card">
                <h3 className="form-card-title">Stripe Configuration</h3>
                <div className="form-row-3">
                  <div className="form-group">
                    <label htmlFor="stripeProductId">Product ID</label>
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
                    <label htmlFor="stripeMonthlyPriceId">Monthly Price ID</label>
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
                    <label htmlFor="stripeOnetimePriceId">One-time Price ID</label>
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
              </div>

              <div className="form-card">
                <h3 className="form-card-title">Page Activation</h3>
                <p className="form-hint" style={{ marginBottom: '1rem' }}>
                  Select which client portal pages this product activates when purchased.
                </p>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={productForm.includesContent}
                      onChange={(e) => setProductForm({ ...productForm, includesContent: e.target.checked })}
                      style={{ width: '16px', height: '16px', margin: 0, accentColor: '#2D5A27' }}
                    />
                    <span style={{ fontSize: '14px', color: '#1f2937' }}>This plan activates the Content page</span>
                  </label>
                </div>

                {productForm.includesContent && (
                  <div style={{ marginLeft: '24px', marginTop: '12px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Content Services</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {productForm.contentServices.map((service, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Service name"
                            value={service.name}
                            onChange={(e) => {
                              const updated = [...productForm.contentServices]
                              updated[index] = { ...updated[index], name: e.target.value }
                              setProductForm({ ...productForm, contentServices: updated })
                            }}
                            style={{ flex: 2 }}
                          />
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Qty"
                            min="1"
                            value={service.quantity}
                            onChange={(e) => {
                              const updated = [...productForm.contentServices]
                              updated[index] = { ...updated[index], quantity: parseInt(e.target.value) || 1 }
                              setProductForm({ ...productForm, contentServices: updated })
                            }}
                            style={{ width: '80px' }}
                          />
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Details (optional)"
                            value={service.details || ''}
                            onChange={(e) => {
                              const updated = [...productForm.contentServices]
                              updated[index] = { ...updated[index], details: e.target.value }
                              setProductForm({ ...productForm, contentServices: updated })
                            }}
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = productForm.contentServices.filter((_, i) => i !== index)
                              setProductForm({ ...productForm, contentServices: updated })
                            }}
                            style={{ padding: '8px', background: '#FEE2E2', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#DC2626' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setProductForm({
                            ...productForm,
                            contentServices: [...productForm.contentServices, { name: '', quantity: 1, details: '' }]
                          })
                        }}
                        style={{ alignSelf: 'flex-start', padding: '6px 12px', background: '#F3F4F6', border: '1px dashed #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', color: '#4B5563' }}
                      >
                        + Add Service
                      </button>
                    </div>
                    <span className="form-hint" style={{ marginTop: '8px', display: 'block' }}>Services are aggregated across products when displayed to clients</span>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={productForm.includesWebsite}
                      onChange={(e) => setProductForm({ ...productForm, includesWebsite: e.target.checked })}
                      style={{ width: '16px', height: '16px', margin: 0, accentColor: '#2D5A27' }}
                    />
                    <span style={{ fontSize: '14px', color: '#1f2937' }}>This plan activates the Website page</span>
                  </label>
                </div>

                {productForm.includesWebsite && (
                  <div style={{ marginLeft: '24px', marginTop: '12px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Website Services</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {productForm.websiteServices.map((service, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Service name"
                            value={service.name}
                            onChange={(e) => {
                              const updated = [...productForm.websiteServices]
                              updated[index] = { ...updated[index], name: e.target.value }
                              setProductForm({ ...productForm, websiteServices: updated })
                            }}
                            style={{ flex: 2 }}
                          />
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Qty"
                            min="1"
                            value={service.quantity}
                            onChange={(e) => {
                              const updated = [...productForm.websiteServices]
                              updated[index] = { ...updated[index], quantity: parseInt(e.target.value) || 1 }
                              setProductForm({ ...productForm, websiteServices: updated })
                            }}
                            style={{ width: '80px' }}
                          />
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Details (optional)"
                            value={service.details || ''}
                            onChange={(e) => {
                              const updated = [...productForm.websiteServices]
                              updated[index] = { ...updated[index], details: e.target.value }
                              setProductForm({ ...productForm, websiteServices: updated })
                            }}
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = productForm.websiteServices.filter((_, i) => i !== index)
                              setProductForm({ ...productForm, websiteServices: updated })
                            }}
                            style={{ padding: '8px', background: '#FEE2E2', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#DC2626' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setProductForm({
                            ...productForm,
                            websiteServices: [...productForm.websiteServices, { name: '', quantity: 1, details: '' }]
                          })
                        }}
                        style={{ alignSelf: 'flex-start', padding: '6px 12px', background: '#F3F4F6', border: '1px dashed #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', color: '#4B5563' }}
                      >
                        + Add Service
                      </button>
                    </div>
                    <span className="form-hint" style={{ marginTop: '8px', display: 'block' }}>Services are aggregated across products when displayed to clients</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="form-sidebar">
              <div className="form-card">
                <h3 className="form-card-title">Settings</h3>
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

              <div className="form-card">
                <h3 className="form-card-title">Dependencies</h3>
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
                    {allProducts.map(product => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                  <span className="form-hint">Hold Ctrl/Cmd to select multiple</span>
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
                  {isSaving ? 'Saving...' : 'Save Product'}
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

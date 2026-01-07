'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { AdminHeader } from '@/components/layout'

interface Product {
  id: string
  name: string
  short_description: string | null
  long_description: string | null
  category: string
  status: string | null
  monthly_price: string | null
  onetime_price: string | null
  supports_quantity: boolean | null
  stripe_product_id: string | null
  stripe_monthly_price_id: string | null
  stripe_onetime_price_id: string | null
  sort_order: number | null
  product_dependencies: {
    requires_product_id: string
    requires: {
      id: string
      name: string
    }
  }[]
}

interface ProductOption {
  id: string
  name: string
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

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
    sortOrder: 0,
  })

  const [allProducts, setAllProducts] = useState<ProductOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [productRes, productsRes] = await Promise.all([
          fetch(`/api/admin/products/${productId}`),
          fetch('/api/admin/products'),
        ])

        if (!productRes.ok) {
          setError('Product not found')
          setIsLoading(false)
          return
        }

        const product: Product = await productRes.json()
        const products: Product[] = await productsRes.json()

        // Set all products for dependencies dropdown (excluding current product)
        setAllProducts(products.filter(p => p.id !== productId).map(p => ({ id: p.id, name: p.name })))

        // Set form data
        setProductForm({
          name: product.name,
          shortDesc: product.short_description || '',
          longDesc: product.long_description || '',
          category: product.category,
          status: product.status || 'active',
          monthlyPrice: product.monthly_price ? String(product.monthly_price) : '',
          onetimePrice: product.onetime_price ? String(product.onetime_price) : '',
          supportsQuantity: product.supports_quantity || false,
          stripeProductId: product.stripe_product_id || '',
          stripeMonthlyPriceId: product.stripe_monthly_price_id || '',
          stripeOnetimePriceId: product.stripe_onetime_price_id || '',
          dependencies: product.product_dependencies.map(d => d.requires_product_id),
          sortOrder: product.sort_order || 0,
        })
      } catch (err) {
        console.error('Failed to fetch product:', err)
        setError('Failed to load product')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [productId])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      })

      if (!res.ok) {
        throw new Error('Failed to update product')
      }

      router.push('/admin/products')
    } catch (err) {
      console.error('Failed to save product:', err)
      setError('Failed to save product')
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

  if (error && !productForm.name) {
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
          <h1 className="content-page-title">Edit Product</h1>
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
                <div className="form-group">
                  <label htmlFor="sortOrder">Sort Order</label>
                  <input
                    type="number"
                    id="sortOrder"
                    className="form-control"
                    value={productForm.sortOrder}
                    onChange={(e) => setProductForm({ ...productForm, sortOrder: parseInt(e.target.value) || 0 })}
                  />
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
                  {isSaving ? 'Saving...' : 'Update Product'}
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

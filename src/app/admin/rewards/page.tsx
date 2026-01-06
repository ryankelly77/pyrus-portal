'use client'

import { useState } from 'react'
import { AdminHeader } from '@/components/layout'

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

export default function AdminRewardsPage() {
  const [thresholds, setThresholds] = useState(initialThresholds)
  const [freeProducts, setFreeProducts] = useState(initialFreeProducts)
  const [showThresholdModal, setShowThresholdModal] = useState(false)
  const [showFreeProductModal, setShowFreeProductModal] = useState(false)
  const [editingThreshold, setEditingThreshold] = useState<Threshold | null>(null)

  // Form state for threshold modal
  const [thresholdAmount, setThresholdAmount] = useState('')
  const [rewardType, setRewardType] = useState<'discount' | 'freebie'>('discount')
  const [discountPercent, setDiscountPercent] = useState('')

  // Form state for free product modal
  const [selectedProduct, setSelectedProduct] = useState('')

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

  return (
    <>
      <AdminHeader
        title="Reward Management"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Configure Growth Rewards thresholds and free products</p>
          </div>
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

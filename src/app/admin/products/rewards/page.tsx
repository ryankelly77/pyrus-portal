'use client'

import { useState } from 'react'

interface SpendingThreshold {
  id: string
  monthlySpend: number
  rewardType: 'discount' | 'freebie'
  discountPercent?: number
}

interface FreeProduct {
  id: string
  name: string
  value: number
}

// Static demo data - would come from API in production
const demoThresholds: SpendingThreshold[] = [
  { id: '1', monthlySpend: 1000, rewardType: 'discount', discountPercent: 5 },
  { id: '2', monthlySpend: 1500, rewardType: 'freebie' },
  { id: '3', monthlySpend: 2000, rewardType: 'discount', discountPercent: 10 },
]

const demoFreeProducts: FreeProduct[] = [
  { id: '1', name: 'Analytics Tracking', value: 99 },
]

export default function RewardsPage() {
  const [thresholds, setThresholds] = useState<SpendingThreshold[]>(demoThresholds)
  const [freeProducts, setFreeProducts] = useState<FreeProduct[]>(demoFreeProducts)
  const [showThresholdModal, setShowThresholdModal] = useState(false)
  const [showFreeProductModal, setShowFreeProductModal] = useState(false)
  const [editingThreshold, setEditingThreshold] = useState<SpendingThreshold | null>(null)

  // Form state
  const [thresholdAmount, setThresholdAmount] = useState('')
  const [rewardType, setRewardType] = useState<'discount' | 'freebie' | ''>('')
  const [discountPercent, setDiscountPercent] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const openThresholdModal = (threshold?: SpendingThreshold) => {
    if (threshold) {
      setEditingThreshold(threshold)
      setThresholdAmount(threshold.monthlySpend.toString())
      setRewardType(threshold.rewardType)
      setDiscountPercent(threshold.discountPercent?.toString() || '')
    } else {
      setEditingThreshold(null)
      setThresholdAmount('')
      setRewardType('')
      setDiscountPercent('')
    }
    setShowThresholdModal(true)
  }

  const saveThreshold = () => {
    const newThreshold: SpendingThreshold = {
      id: editingThreshold?.id || Date.now().toString(),
      monthlySpend: parseFloat(thresholdAmount),
      rewardType: rewardType as 'discount' | 'freebie',
      discountPercent: rewardType === 'discount' ? parseFloat(discountPercent) : undefined,
    }

    if (editingThreshold) {
      setThresholds(prev => prev.map(t => t.id === editingThreshold.id ? newThreshold : t))
    } else {
      setThresholds(prev => [...prev, newThreshold].sort((a, b) => a.monthlySpend - b.monthlySpend))
    }

    setShowThresholdModal(false)
    setThresholdAmount('')
    setRewardType('')
    setDiscountPercent('')
    setEditingThreshold(null)
  }

  const deleteThreshold = (id: string) => {
    if (confirm('Are you sure you want to delete this threshold?')) {
      setThresholds(prev => prev.filter(t => t.id !== id))
    }
  }

  const addFreeProduct = () => {
    if (!selectedProduct) return

    const productMap: Record<string, { name: string; value: number }> = {
      'analytics': { name: 'Analytics Tracking', value: 99 },
      'monthly-report': { name: 'Monthly Report', value: 99 },
      'gbp-posting': { name: 'GBP Posting', value: 99 },
      'review-mgmt': { name: 'Review Management', value: 99 },
    }

    const product = productMap[selectedProduct]
    if (product && !freeProducts.find(p => p.name === product.name)) {
      setFreeProducts(prev => [...prev, { id: Date.now().toString(), ...product }])
    }

    setShowFreeProductModal(false)
    setSelectedProduct('')
  }

  const removeFreeProduct = (id: string) => {
    setFreeProducts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-content">
          <p>Configure Growth Rewards thresholds and free products</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => openThresholdModal()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Threshold
          </button>
        </div>
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
            <div className="thresholds-table">
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
                        <span className="threshold-amount">
                          {formatCurrency(threshold.monthlySpend)}
                        </span>
                        <span className="threshold-label">/month</span>
                      </td>
                      <td>
                        <span className={`reward-badge ${threshold.rewardType === 'discount' ? 'discount' : 'freebie'}`}>
                          {threshold.rewardType === 'discount'
                            ? `${threshold.discountPercent}% discount`
                            : 'Free $99 product'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
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
                          <button
                            className="btn-icon-sm btn-icon-danger"
                            title="Delete"
                            onClick={() => deleteThreshold(threshold.id)}
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
                  {thresholds.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No spending thresholds configured. Add your first threshold to get started.
                      </td>
                    </tr>
                  )}
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
                    <span className="product-value">{formatCurrency(product.value)} value</span>
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
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No always-free products configured
                </div>
              )}
            </div>
            <button
              className="btn btn-secondary btn-sm btn-block"
              style={{ marginTop: '12px' }}
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

      {/* Threshold Modal */}
      {showThresholdModal && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setShowThresholdModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">{editingThreshold ? 'Edit Threshold' : 'Add Threshold'}</h2>
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
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRight: 'none',
                    borderRadius: '8px 0 0 8px',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                  }}>$</span>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="1000"
                    value={thresholdAmount}
                    onChange={(e) => setThresholdAmount(e.target.value)}
                    style={{ borderRadius: '0 8px 8px 0', flex: 1 }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Reward Type <span className="required">*</span></label>
                <select
                  className="form-control"
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value as 'discount' | 'freebie' | '')}
                >
                  <option value="">Select reward...</option>
                  <option value="discount">Percentage Discount</option>
                  <option value="freebie">Free $99 Product</option>
                </select>
              </div>
              {rewardType === 'discount' && (
                <div className="form-group">
                  <label>Discount Percentage</label>
                  <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="5"
                      min="1"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      style={{ borderRadius: '8px 0 0 8px', flex: 1 }}
                    />
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderLeft: 'none',
                      borderRadius: '0 8px 8px 0',
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                    }}>%</span>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowThresholdModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={saveThreshold}
                disabled={!thresholdAmount || !rewardType || (rewardType === 'discount' && !discountPercent)}
              >
                Save Threshold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Always Free Product Modal */}
      {showFreeProductModal && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setShowFreeProductModal(false)}>
          <div className="modal modal-sm">
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
                  <option value="analytics">Analytics Tracking ($99)</option>
                  <option value="monthly-report">Monthly Report ($99)</option>
                  <option value="gbp-posting">GBP Posting ($99)</option>
                  <option value="review-mgmt">Review Management ($99)</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowFreeProductModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={addFreeProduct}
                disabled={!selectedProduct}
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

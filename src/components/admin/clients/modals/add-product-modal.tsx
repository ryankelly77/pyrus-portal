'use client'

import { useState } from 'react'
import { type AvailableProduct } from '@/types'

// ============================================================================
// TYPES
// ============================================================================

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  availableProducts: AvailableProduct[]
  onAdd: (productId: string, notes: string) => Promise<void>
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AddProductModal({
  isOpen,
  onClose,
  availableProducts,
  onAdd,
}: AddProductModalProps) {
  const [selectedProductId, setSelectedProductId] = useState('')
  const [notes, setNotes] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleClose = () => {
    setSelectedProductId('')
    setNotes('')
    onClose()
  }

  const handleAdd = async () => {
    if (!selectedProductId) return
    setIsAdding(true)
    try {
      await onAdd(selectedProductId, notes)
      setSelectedProductId('')
      setNotes('')
    } finally {
      setIsAdding(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay active" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Add Product to Client</h2>
          <button className="modal-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: '#6B7280', marginBottom: '1rem' }}>
            Manually assign a product to this client. This is for clients who haven&apos;t gone through the standard purchase flow.
          </p>
          <div className="form-group">
            <label htmlFor="product-select">Select Product</label>
            <select
              id="product-select"
              className="form-input"
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
            >
              <option value="">Choose a product...</option>
              {availableProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.category})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="product-notes">Notes (optional)</label>
            <textarea
              id="product-notes"
              className="form-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g., Transferred from legacy system, Comp'd for beta testing"
              rows={2}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={!selectedProductId || isAdding}
          >
            {isAdding ? 'Adding...' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

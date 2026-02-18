'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  category: string
}

interface ChecklistTemplate {
  id: string
  product_id: string
  title: string
  description: string | null
  action_type: string | null
  action_url: string | null
  action_label: string | null
  sort_order: number
  is_active: boolean
  product: Product
}

export default function ChecklistSettingsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch products
        const productsRes = await fetch('/api/admin/products')
        if (productsRes.ok) {
          const data = await productsRes.json()
          setProducts(data.products || [])
        }

        // Fetch checklist templates
        const checklistRes = await fetch('/api/admin/onboarding/checklist-templates')
        if (checklistRes.ok) {
          const data = await checklistRes.json()
          setChecklistTemplates(data)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredTemplates = selectedProductId
    ? checklistTemplates.filter(t => t.product_id === selectedProductId)
    : checklistTemplates

  // Group templates by product
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const productName = template.product?.name || 'Unknown'
    if (!acc[productName]) {
      acc[productName] = []
    }
    acc[productName].push(template)
    return acc
  }, {} as Record<string, ChecklistTemplate[]>)

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading checklist templates...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      <div className="settings-card">
        <div className="settings-card-header">
          <div>
            <h2>Onboarding Checklist Items</h2>
            <p>Configure checklist items that appear when a client purchases a product</p>
          </div>
          <button className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Item
          </button>
        </div>
        <div className="settings-card-body">
          {/* Filter */}
          <div style={{ marginBottom: '1rem' }}>
            <select
              className="form-input"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              style={{ maxWidth: '300px' }}
            >
              <option value="">All Products</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>

          {/* Checklist Groups */}
          {Object.keys(groupedTemplates).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              No checklist items found
            </div>
          ) : (
            <div className="checklist-groups">
              {Object.entries(groupedTemplates).map(([productName, templates]) => (
                <div key={productName} className="checklist-group">
                  <h3 className="group-title">{productName}</h3>
                  <div className="checklist-items-list">
                    {templates.map(template => (
                      <div key={template.id} className="checklist-item-row">
                        <div className="checklist-item-info">
                          <div className="checklist-item-title">
                            {template.title}
                            {!template.is_active && (
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '2px 6px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)'
                              }}>
                                Inactive
                              </span>
                            )}
                          </div>
                          {template.description && (
                            <div className="checklist-item-desc">{template.description}</div>
                          )}
                          {template.action_type && (
                            <div className="checklist-item-action">
                              Action: {template.action_type} {template.action_label && `- ${template.action_label}`}
                            </div>
                          )}
                        </div>
                        <div className="checklist-item-actions">
                          <button className="btn btn-ghost btn-sm">Edit</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .settings-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
        }
        .settings-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .settings-card-header h2 {
          margin: 0 0 0.25rem;
          font-size: 1rem;
          font-weight: 600;
        }
        .settings-card-header p {
          margin: 0;
          font-size: 0.813rem;
          color: var(--text-secondary);
        }
        .settings-card-body {
          padding: 1.5rem;
        }
        .form-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        .checklist-groups {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .checklist-group {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
        }
        .group-title {
          background: var(--bg-tertiary);
          padding: 0.75rem 1rem;
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
        }
        .checklist-items-list {
          display: flex;
          flex-direction: column;
        }
        .checklist-item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          gap: 1rem;
        }
        .checklist-item-row:last-child {
          border-bottom: none;
        }
        .checklist-item-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }
        .checklist-item-title {
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .checklist-item-desc {
          font-size: 0.813rem;
          color: var(--text-secondary);
        }
        .checklist-item-action {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }
        .btn-ghost {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.375rem 0.75rem;
          font-size: 0.813rem;
        }
        .btn-ghost:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  )
}

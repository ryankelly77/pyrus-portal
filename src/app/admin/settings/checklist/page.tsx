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

interface FormData {
  productId: string
  title: string
  description: string
  actionType: string
  actionUrl: string
  actionLabel: string
  sortOrder: number
  isActive: boolean
}

const emptyForm: FormData = {
  productId: '',
  title: '',
  description: '',
  actionType: '',
  actionUrl: '',
  actionLabel: '',
  sortOrder: 0,
  isActive: true,
}

export default function ChecklistSettingsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  const fetchTemplates = async () => {
    try {
      const checklistRes = await fetch('/api/admin/onboarding/checklist-templates')
      if (checklistRes.ok) {
        const data = await checklistRes.json()
        setChecklistTemplates(data)
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch products
        const productsRes = await fetch('/api/admin/products')
        if (productsRes.ok) {
          const data = await productsRes.json()
          setProducts(Array.isArray(data) ? data : data.products || [])
        }

        // Fetch checklist templates
        await fetchTemplates()
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const openAddModal = () => {
    setEditingId(null)
    setFormData({ ...emptyForm, productId: selectedProductId || '' })
    setShowModal(true)
  }

  const openEditModal = (template: ChecklistTemplate) => {
    setEditingId(template.id)
    setFormData({
      productId: template.product_id,
      title: template.title,
      description: template.description || '',
      actionType: template.action_type || '',
      actionUrl: template.action_url || '',
      actionLabel: template.action_label || '',
      sortOrder: template.sort_order,
      isActive: template.is_active,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData(emptyForm)
  }

  const handleSave = async () => {
    if (!formData.productId || !formData.title.trim()) {
      alert('Product and title are required')
      return
    }

    setSaving(true)
    try {
      const url = editingId
        ? `/api/admin/onboarding/checklist-templates/${editingId}`
        : '/api/admin/onboarding/checklist-templates'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to save')

      await fetchTemplates()
      closeModal()
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Failed to save checklist item')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingId) return
    if (!confirm('Are you sure you want to delete this checklist item?')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/onboarding/checklist-templates/${editingId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete')

      await fetchTemplates()
      closeModal()
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Failed to delete checklist item')
    } finally {
      setDeleting(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, templateId: string) => {
    setDraggedItem(templateId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, templateId: string) => {
    e.preventDefault()
    if (templateId !== draggedItem) {
      setDragOverItem(templateId)
    }
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = async (e: React.DragEvent, targetId: string, productTemplates: ChecklistTemplate[]) => {
    e.preventDefault()
    setDragOverItem(null)

    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null)
      return
    }

    // Find the indices
    const draggedIndex = productTemplates.findIndex(t => t.id === draggedItem)
    const targetIndex = productTemplates.findIndex(t => t.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null)
      return
    }

    // Reorder the array
    const reordered = [...productTemplates]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, removed)

    // Update sort orders via API
    try {
      await Promise.all(
        reordered.map((template, index) =>
          fetch(`/api/admin/onboarding/checklist-templates/${template.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sortOrder: index + 1 }),
          })
        )
      )
      await fetchTemplates()
    } catch (error) {
      console.error('Failed to reorder:', error)
      alert('Failed to reorder items')
    }

    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

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
          <button className="btn btn-primary" onClick={openAddModal}>
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
                      <div
                        key={template.id}
                        className="checklist-item-row"
                        draggable
                        onDragStart={(e) => handleDragStart(e, template.id)}
                        onDragOver={(e) => handleDragOver(e, template.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, template.id, templates)}
                        onDragEnd={handleDragEnd}
                        style={{
                          opacity: draggedItem === template.id ? 0.5 : 1,
                          borderTop: dragOverItem === template.id ? '2px solid #4F46E5' : undefined,
                        }}
                      >
                        {/* Drag Handle */}
                        <div
                          style={{
                            cursor: 'grab',
                            padding: '0 8px',
                            color: 'var(--text-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="5" cy="3" r="1.5" />
                            <circle cx="11" cy="3" r="1.5" />
                            <circle cx="5" cy="8" r="1.5" />
                            <circle cx="11" cy="8" r="1.5" />
                            <circle cx="5" cy="13" r="1.5" />
                            <circle cx="11" cy="13" r="1.5" />
                          </svg>
                        </div>
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
                          <button
                            type="button"
                            onClick={() => openEditModal(template)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: '6px 12px',
                              fontSize: '13px',
                              borderRadius: '6px',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--bg-tertiary)'
                              e.currentTarget.style.color = 'var(--text-primary)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.color = 'var(--text-secondary)'
                            }}
                          >
                            Edit
                          </button>
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

      {/* Edit/Add Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
            }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                {editingId ? 'Edit Checklist Item' : 'Add Checklist Item'}
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Product *</label>
                <select
                  className="form-input"
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Complete onboarding survey"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Description</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description for this checklist item"
                  style={{ resize: 'vertical', minHeight: '60px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Action Type</label>
                <select
                  className="form-input"
                  value={formData.actionType}
                  onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                >
                  <option value="">None</option>
                  <option value="link">Link</option>
                  <option value="modal">Modal</option>
                  <option value="navigate">Navigate</option>
                </select>
              </div>
              {formData.actionType && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Action URL</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.actionUrl}
                      onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                      placeholder="e.g., /getting-started or https://..."
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Action Label</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.actionLabel}
                      onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
                      placeholder="e.g., Start Survey"
                    />
                  </div>
                </>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="isActive" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Active</label>
              </div>
            </div>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
            }}>
              {editingId && (
                <button
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  style={{
                    background: '#dc2626',
                    border: 'none',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    cursor: deleting || saving ? 'not-allowed' : 'pointer',
                    opacity: deleting || saving ? 0.5 : 1,
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button
                onClick={closeModal}
                disabled={saving || deleting}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  cursor: saving || deleting ? 'not-allowed' : 'pointer',
                  opacity: saving || deleting ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || deleting}
                style={{
                  background: '#4F46E5',
                  border: 'none',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: saving || deleting ? 'not-allowed' : 'pointer',
                  opacity: saving || deleting ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: var(--bg-secondary);
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .modal-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }
        .modal-close {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 4px;
          display: flex;
        }
        .modal-close:hover {
          color: var(--text-primary);
        }
        .modal-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .modal-footer {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .form-label {
          font-size: 0.813rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .checkbox-label input {
          width: 16px;
          height: 16px;
        }
        .btn-secondary {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .btn-secondary:hover {
          background: var(--bg-primary);
        }
        .btn-danger {
          background: #dc2626;
          border: none;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .btn-danger:hover {
          background: #b91c1c;
        }
        .btn-danger:disabled,
        .btn-secondary:disabled,
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        textarea.form-input {
          resize: vertical;
          min-height: 60px;
        }
      `}</style>
    </div>
  )
}

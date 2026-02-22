'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  category: string
}

interface QuestionTemplate {
  id: string
  product_id: string
  question_text: string
  question_type: string
  options: string[] | null
  placeholder: string | null
  help_text: string | null
  video_url: string | null
  image_url: string | null
  is_required: boolean
  section: string | null
  sort_order: number
  is_active: boolean
  product: Product
}

interface FormData {
  productId: string
  questionText: string
  questionType: string
  options: string
  placeholder: string
  helpText: string
  videoUrl: string
  imageUrl: string
  isRequired: boolean
  section: string
  isActive: boolean
}

const emptyForm: FormData = {
  productId: '',
  questionText: '',
  questionType: 'text',
  options: '',
  placeholder: '',
  helpText: '',
  videoUrl: '',
  imageUrl: '',
  isRequired: false,
  section: '',
  isActive: true,
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Text (single line)' },
  { value: 'textarea', label: 'Textarea (multi-line)' },
  { value: 'select', label: 'Dropdown Select' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
]

export default function QuestionsSettingsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [questionTemplates, setQuestionTemplates] = useState<QuestionTemplate[]>([])
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
      const questionsRes = await fetch('/api/admin/onboarding/question-templates')
      if (questionsRes.ok) {
        const data = await questionsRes.json()
        setQuestionTemplates(data)
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

        // Fetch question templates
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

  const openEditModal = (template: QuestionTemplate) => {
    setEditingId(template.id)
    setFormData({
      productId: template.product_id,
      questionText: template.question_text,
      questionType: template.question_type,
      options: template.options?.join(', ') || '',
      placeholder: template.placeholder || '',
      helpText: template.help_text || '',
      videoUrl: template.video_url || '',
      imageUrl: template.image_url || '',
      isRequired: template.is_required,
      section: template.section || '',
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
    if (!formData.productId || !formData.questionText.trim()) {
      alert('Product and question text are required')
      return
    }

    setSaving(true)
    try {
      const url = editingId
        ? `/api/admin/onboarding/question-templates/${editingId}`
        : '/api/admin/onboarding/question-templates'
      const method = editingId ? 'PATCH' : 'POST'

      // Parse options from comma-separated string
      const options = formData.options
        ? formData.options.split(',').map(o => o.trim()).filter(Boolean)
        : null

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          options,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      await fetchTemplates()
      closeModal()
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Failed to save question')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingId) return
    if (!confirm('Are you sure you want to delete this question?')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/onboarding/question-templates/${editingId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete')

      await fetchTemplates()
      closeModal()
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Failed to delete question')
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

  const handleDrop = async (e: React.DragEvent, targetId: string, productTemplates: QuestionTemplate[]) => {
    e.preventDefault()
    setDragOverItem(null)

    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null)
      return
    }

    const draggedIndex = productTemplates.findIndex(t => t.id === draggedItem)
    const targetIndex = productTemplates.findIndex(t => t.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null)
      return
    }

    const reordered = [...productTemplates]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, removed)

    try {
      await Promise.all(
        reordered.map((template, index) =>
          fetch(`/api/admin/onboarding/question-templates/${template.id}`, {
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
    ? questionTemplates.filter(t => t.product_id === selectedProductId)
    : questionTemplates

  // Group templates by product
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const productName = template.product?.name || 'Unknown'
    if (!acc[productName]) {
      acc[productName] = []
    }
    acc[productName].push(template)
    return acc
  }, {} as Record<string, QuestionTemplate[]>)

  // Sort each group by sort_order
  Object.values(groupedTemplates).forEach(templates => {
    templates.sort((a, b) => a.sort_order - b.sort_order)
  })

  const needsOptions = ['select', 'multiselect', 'radio', 'checkbox'].includes(formData.questionType)

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading question templates...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      <div className="settings-card">
        <div className="settings-card-header">
          <div>
            <h2>Onboarding Questions</h2>
            <p>Configure questions that clients answer after purchasing a product</p>
          </div>
          <button className="btn btn-primary" onClick={openAddModal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Question
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

          {/* Question Groups */}
          {Object.keys(groupedTemplates).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              No questions found
            </div>
          ) : (
            <div className="question-groups">
              {Object.entries(groupedTemplates).map(([productName, templates]) => (
                <div key={productName} className="question-group">
                  <h3 className="group-title">{productName}</h3>
                  <div className="question-items-list">
                    {templates.map(template => (
                      <div
                        key={template.id}
                        className="question-item-row"
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
                        <div className="question-item-info">
                          <div className="question-item-title">
                            {template.question_text}
                            {template.is_required && (
                              <span className="required-badge">Required</span>
                            )}
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
                          <div className="question-item-meta">
                            Type: {template.question_type}
                            {template.section && ` • Section: ${template.section}`}
                          </div>
                          {template.help_text && (
                            <div className="question-item-help">{template.help_text}</div>
                          )}
                        </div>
                        <div className="question-item-actions">
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
              maxWidth: '560px',
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
                {editingId ? 'Edit Question' : 'Add Question'}
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
                <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Question Text *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  placeholder="e.g., What is your website URL?"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Question Type</label>
                  <select
                    className="form-input"
                    value={formData.questionType}
                    onChange={(e) => setFormData({ ...formData, questionType: e.target.value })}
                  >
                    {QUESTION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Section</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="e.g., Website Details"
                  />
                </div>
              </div>
              {needsOptions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Options (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.options}
                    onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                    placeholder="e.g., Yes, No, Maybe"
                  />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Placeholder</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.placeholder}
                  onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                  placeholder="e.g., Enter your website URL"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Help Text</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={formData.helpText}
                  onChange={(e) => setFormData({ ...formData, helpText: e.target.value })}
                  placeholder="Additional guidance for the user"
                  style={{ resize: 'vertical', minHeight: '60px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Video URL</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Image URL</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="isRequired"
                    checked={formData.isRequired}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="isRequired" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Required</label>
                </div>
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
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Question'}
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
        .question-groups {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .question-group {
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
        .question-items-list {
          display: flex;
          flex-direction: column;
        }
        .question-item-row {
          display: flex;
          align-items: flex-start;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          gap: 0.5rem;
        }
        .question-item-row:last-child {
          border-bottom: none;
        }
        .question-item-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }
        .question-item-title {
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .question-item-meta {
          font-size: 0.813rem;
          color: var(--text-secondary);
        }
        .question-item-help {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }
        .required-badge {
          background: var(--warning-bg);
          color: var(--warning-text);
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

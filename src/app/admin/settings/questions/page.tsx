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
  is_required: boolean
  section: string | null
  sort_order: number
  is_active: boolean
  product: Product
}

export default function QuestionsSettingsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [questionTemplates, setQuestionTemplates] = useState<QuestionTemplate[]>([])
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

        // Fetch question templates
        const questionsRes = await fetch('/api/admin/onboarding/question-templates')
        if (questionsRes.ok) {
          const data = await questionsRes.json()
          setQuestionTemplates(data)
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
          <button className="btn btn-primary">
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
                      <div key={template.id} className="question-item-row">
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
          justify-content: space-between;
          align-items: flex-start;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          gap: 1rem;
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

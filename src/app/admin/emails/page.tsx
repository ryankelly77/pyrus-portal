'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type RecipientType = 'user' | 'client' | 'admin' | 'prospect' | 'any'

interface EmailTemplate {
  id: string
  slug: string
  name: string
  description: string | null
  triggerEvent: string
  triggerDescription: string | null
  recipientType: RecipientType
  isActive: boolean
  isSystem: boolean
  sortOrder: number
  updatedAt: string | null
}

interface EmailCategory {
  id: string
  slug: string
  name: string
  description: string | null
  sort_order: number
  templates: EmailTemplate[]
}

interface EmailTemplatesData {
  categories: EmailCategory[]
  uncategorized: EmailTemplate[]
}

export default function EmailTemplatesPage() {
  const router = useRouter()
  const [data, setData] = useState<EmailTemplatesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [recipientFilter, setRecipientFilter] = useState<RecipientType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null)

  // Drag-and-drop state for template reordering
  const [draggedTemplate, setDraggedTemplate] = useState<{id: string, categoryId: string | null} | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<{categoryId: string | null, index: number} | null>(null)

  // Fetch templates on mount
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/admin/email-templates')
        if (!res.ok) {
          throw new Error('Failed to fetch templates')
        }
        const templatesData = await res.json()
        setData(templatesData)
      } catch (err) {
        console.error('Failed to fetch email templates:', err)
        setError('Failed to load email templates')
      } finally {
        setIsLoading(false)
      }
    }
    fetchTemplates()
  }, [])

  // Drag handlers for template reordering
  const handleTemplateDragStart = (e: React.DragEvent, template: EmailTemplate, categoryId: string | null) => {
    setDraggedTemplate({ id: template.id, categoryId })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', template.id)
  }

  const handleTemplateDragOver = (e: React.DragEvent, categoryId: string | null, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedTemplate && draggedTemplate.categoryId === categoryId) {
      setDragOverIndex({ categoryId, index })
    }
  }

  const handleTemplateDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleTemplateDrop = async (e: React.DragEvent, categoryId: string | null, toIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedTemplate || draggedTemplate.categoryId !== categoryId || !data) {
      setDraggedTemplate(null)
      setDragOverIndex(null)
      return
    }

    const templates = categoryId
      ? data.categories.find(c => c.id === categoryId)?.templates || []
      : data.uncategorized

    const fromIndex = templates.findIndex(t => t.id === draggedTemplate.id)
    if (fromIndex === -1 || fromIndex === toIndex) {
      setDraggedTemplate(null)
      setDragOverIndex(null)
      return
    }

    // Reorder templates
    const reorderedTemplates = [...templates]
    const [movedTemplate] = reorderedTemplates.splice(fromIndex, 1)
    reorderedTemplates.splice(toIndex, 0, movedTemplate)

    // Update local state immediately
    setData(prev => {
      if (!prev) return prev
      if (categoryId) {
        return {
          ...prev,
          categories: prev.categories.map(cat =>
            cat.id === categoryId ? { ...cat, templates: reorderedTemplates } : cat
          ),
        }
      } else {
        return { ...prev, uncategorized: reorderedTemplates }
      }
    })

    setDraggedTemplate(null)
    setDragOverIndex(null)

    // Persist to server
    try {
      const res = await fetch('/api/admin/email-templates/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          templateIds: reorderedTemplates.map(t => t.id),
        }),
      })
      if (!res.ok) {
        console.error('Failed to save order')
      }
    } catch (err) {
      console.error('Failed to reorder templates:', err)
    }
  }

  const handleTemplateDragEnd = () => {
    setDraggedTemplate(null)
    setDragOverIndex(null)
  }

  // Filter templates
  const filteredData = useMemo(() => {
    if (!data) return null

    const filterTemplates = (templates: EmailTemplate[]) => {
      return templates.filter((t) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          const matchesSearch =
            t.name.toLowerCase().includes(query) ||
            t.slug.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query) ||
            t.triggerEvent.toLowerCase().includes(query)
          if (!matchesSearch) return false
        }

        // Recipient filter
        if (recipientFilter !== 'all' && t.recipientType !== recipientFilter) {
          return false
        }

        // Status filter
        if (statusFilter === 'active' && !t.isActive) return false
        if (statusFilter === 'inactive' && t.isActive) return false

        return true
      })
    }

    return {
      categories: data.categories
        .map((cat) => ({
          ...cat,
          templates: filterTemplates(cat.templates),
        }))
        .filter((cat) => cat.templates.length > 0),
      uncategorized: filterTemplates(data.uncategorized),
    }
  }, [data, searchQuery, recipientFilter, statusFilter])

  // Toggle template active status
  const handleToggleStatus = async (slug: string, currentStatus: boolean) => {
    setTogglingSlug(slug)
    try {
      const res = await fetch(`/api/admin/email-templates/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (!res.ok) {
        throw new Error('Failed to update template')
      }

      // Update local state
      setData((prev) => {
        if (!prev) return prev

        const updateTemplates = (templates: EmailTemplate[]) =>
          templates.map((t) =>
            t.slug === slug ? { ...t, isActive: !currentStatus } : t
          )

        return {
          categories: prev.categories.map((cat) => ({
            ...cat,
            templates: updateTemplates(cat.templates),
          })),
          uncategorized: updateTemplates(prev.uncategorized),
        }
      })
    } catch (err) {
      console.error('Failed to toggle template status:', err)
      alert('Failed to update template status')
    } finally {
      setTogglingSlug(null)
    }
  }

  // Get recipient badge styling
  const getRecipientBadge = (recipientType: RecipientType) => {
    const styles: Record<RecipientType, { bg: string; color: string; label: string }> = {
      user: { bg: '#DBEAFE', color: '#1E40AF', label: 'User' },
      client: { bg: '#D1FAE5', color: '#065F46', label: 'Client' },
      admin: { bg: '#FEE2E2', color: '#991B1B', label: 'Admin' },
      prospect: { bg: '#FEF3C7', color: '#92400E', label: 'Prospect' },
      any: { bg: '#E5E7EB', color: '#374151', label: 'Any' },
    }
    return styles[recipientType] || styles.any
  }

  // Count total templates
  const totalTemplates = data
    ? data.categories.reduce((sum, cat) => sum + cat.templates.length, 0) +
      data.uncategorized.length
    : 0

  const filteredTotal = filteredData
    ? filteredData.categories.reduce((sum, cat) => sum + cat.templates.length, 0) +
      filteredData.uncategorized.length
    : 0

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading email templates...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--error-color)' }}>
        {error}
      </div>
    )
  }

  return (
    <>
      {/* Filters */}
      <div className="clients-toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active
          </button>
          <button
            className={`filter-btn ${statusFilter === 'inactive' ? 'active' : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            Inactive
          </button>
        </div>
        <select
          className="sort-select"
          value={recipientFilter}
          onChange={(e) => setRecipientFilter(e.target.value as RecipientType | 'all')}
        >
          <option value="all">All Recipients</option>
          <option value="user">User</option>
          <option value="client">Client</option>
          <option value="admin">Admin</option>
          <option value="prospect">Prospect</option>
          <option value="any">Any</option>
        </select>
        <button
          className="btn btn-primary"
          onClick={() => router.push('/admin/emails/new')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Template
        </button>
      </div>

      {/* Templates by Category */}
      {filteredData && filteredData.categories.length === 0 && filteredData.uncategorized.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No templates found matching your filters
        </div>
      ) : (
        <>
          {filteredData?.categories.map((category) => (
            <div key={category.id} className="admin-users-section" style={{ marginBottom: '32px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                {category.name} ({category.templates.length})
              </h3>
              {category.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', marginTop: '-8px' }}>
                  {category.description}
                </p>
              )}
              <div className="users-table-container">
                <table className="users-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '32px' }}></th>
                      <th style={{ width: '24%' }}>Template</th>
                      <th style={{ width: '29%' }}>Trigger</th>
                      <th style={{ width: '11%' }}>Recipient</th>
                      <th style={{ width: '13%' }}>Status</th>
                      <th style={{ width: '18%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.templates.map((template, index) => {
                      const badge = getRecipientBadge(template.recipientType)
                      const isDragging = draggedTemplate?.id === template.id
                      const isDragOver = dragOverIndex?.categoryId === category.id && dragOverIndex?.index === index
                      return (
                        <tr
                          key={template.id}
                          draggable
                          onDragStart={(e) => handleTemplateDragStart(e, template, category.id)}
                          onDragOver={(e) => handleTemplateDragOver(e, category.id, index)}
                          onDragLeave={handleTemplateDragLeave}
                          onDrop={(e) => handleTemplateDrop(e, category.id, index)}
                          onDragEnd={handleTemplateDragEnd}
                          style={{
                            opacity: isDragging ? 0.5 : 1,
                            background: isDragOver ? 'var(--pyrus-sage-light, #E8F5E9)' : undefined,
                            boxShadow: isDragOver ? 'inset 0 2px 0 var(--pyrus-sage, #2E7D32)' : undefined,
                          }}
                        >
                          <td style={{ cursor: 'grab', padding: '8px', width: '32px' }}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ color: 'var(--text-secondary)' }}>
                              <circle cx="9" cy="5" r="1.5"></circle>
                              <circle cx="9" cy="12" r="1.5"></circle>
                              <circle cx="9" cy="19" r="1.5"></circle>
                              <circle cx="15" cy="5" r="1.5"></circle>
                              <circle cx="15" cy="12" r="1.5"></circle>
                              <circle cx="15" cy="19" r="1.5"></circle>
                            </svg>
                          </td>
                          <td>
                            <div>
                              <div style={{ fontWeight: 500, marginBottom: '2px' }}>{template.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {template.slug}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px' }}>
                              {template.triggerDescription || template.triggerEvent}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                                backgroundColor: badge.bg,
                                color: badge.color,
                              }}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td>
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: togglingSlug === template.slug ? 'wait' : 'pointer',
                              }}
                            >
                              <div
                                style={{
                                  position: 'relative',
                                  width: '40px',
                                  height: '22px',
                                  borderRadius: '11px',
                                  backgroundColor: template.isActive ? 'var(--pyrus-brown)' : '#D1D5DB',
                                  transition: 'background-color 0.2s',
                                  opacity: togglingSlug === template.slug ? 0.5 : 1,
                                }}
                                onClick={() => {
                                  if (togglingSlug !== template.slug) {
                                    handleToggleStatus(template.slug, template.isActive)
                                  }
                                }}
                              >
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '2px',
                                    left: template.isActive ? '20px' : '2px',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    backgroundColor: 'white',
                                    transition: 'left 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '13px', color: template.isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                {template.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </label>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => window.location.href = `/admin/emails/${template.slug}`}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => router.push(`/admin/emails/new?clone=${template.slug}`)}
                                style={{ color: 'var(--text-secondary)' }}
                                title="Clone this template"
                              >
                                Clone
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Uncategorized Templates */}
          {filteredData && filteredData.uncategorized.length > 0 && (
            <div className="admin-users-section" style={{ marginBottom: '32px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Other Templates ({filteredData.uncategorized.length})
              </h3>
              <div className="users-table-container">
                <table className="users-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '32px' }}></th>
                      <th style={{ width: '24%' }}>Template</th>
                      <th style={{ width: '29%' }}>Trigger</th>
                      <th style={{ width: '11%' }}>Recipient</th>
                      <th style={{ width: '13%' }}>Status</th>
                      <th style={{ width: '18%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.uncategorized.map((template, index) => {
                      const badge = getRecipientBadge(template.recipientType)
                      const isDragging = draggedTemplate?.id === template.id
                      const isDragOver = dragOverIndex?.categoryId === null && dragOverIndex?.index === index
                      return (
                        <tr
                          key={template.id}
                          draggable
                          onDragStart={(e) => handleTemplateDragStart(e, template, null)}
                          onDragOver={(e) => handleTemplateDragOver(e, null, index)}
                          onDragLeave={handleTemplateDragLeave}
                          onDrop={(e) => handleTemplateDrop(e, null, index)}
                          onDragEnd={handleTemplateDragEnd}
                          style={{
                            opacity: isDragging ? 0.5 : 1,
                            background: isDragOver ? 'var(--pyrus-sage-light, #E8F5E9)' : undefined,
                            boxShadow: isDragOver ? 'inset 0 2px 0 var(--pyrus-sage, #2E7D32)' : undefined,
                          }}
                        >
                          <td style={{ cursor: 'grab', padding: '8px', width: '32px' }}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ color: 'var(--text-secondary)' }}>
                              <circle cx="9" cy="5" r="1.5"></circle>
                              <circle cx="9" cy="12" r="1.5"></circle>
                              <circle cx="9" cy="19" r="1.5"></circle>
                              <circle cx="15" cy="5" r="1.5"></circle>
                              <circle cx="15" cy="12" r="1.5"></circle>
                              <circle cx="15" cy="19" r="1.5"></circle>
                            </svg>
                          </td>
                          <td>
                            <div>
                              <div style={{ fontWeight: 500, marginBottom: '2px' }}>{template.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {template.slug}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px' }}>
                              {template.triggerDescription || template.triggerEvent}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                                backgroundColor: badge.bg,
                                color: badge.color,
                              }}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td>
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: togglingSlug === template.slug ? 'wait' : 'pointer',
                              }}
                            >
                              <div
                                style={{
                                  position: 'relative',
                                  width: '40px',
                                  height: '22px',
                                  borderRadius: '11px',
                                  backgroundColor: template.isActive ? 'var(--pyrus-brown)' : '#D1D5DB',
                                  transition: 'background-color 0.2s',
                                  opacity: togglingSlug === template.slug ? 0.5 : 1,
                                }}
                                onClick={() => {
                                  if (togglingSlug !== template.slug) {
                                    handleToggleStatus(template.slug, template.isActive)
                                  }
                                }}
                              >
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '2px',
                                    left: template.isActive ? '20px' : '2px',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    backgroundColor: 'white',
                                    transition: 'left 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '13px', color: template.isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                {template.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </label>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => window.location.href = `/admin/emails/${template.slug}`}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => router.push(`/admin/emails/new?clone=${template.slug}`)}
                                style={{ color: 'var(--text-secondary)' }}
                                title="Clone this template"
                              >
                                Clone
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Pagination Info */}
      <div className="table-pagination">
        <span className="pagination-info">
          Showing {filteredTotal} of {totalTemplates} template{totalTemplates !== 1 ? 's' : ''}
        </span>
      </div>
    </>
  )
}

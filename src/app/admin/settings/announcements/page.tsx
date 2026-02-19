'use client'

import { useState, useEffect, useRef } from 'react'

interface Announcement {
  id: string
  title: string
  message: string
  announcement_type: string
  display_pages: string[]
  display_frequency: string
  persistence_type: string
  show_duration_days: number | null
  allow_permanent_dismiss: boolean
  target_audience: string
  target_all_clients: boolean
  target_client_ids: string[]
  target_admin_roles: string[]
  start_date: string | null
  end_date: string | null
  has_detail_page: boolean
  detail_html: string | null
  cta_button_text: string | null
  cta_button_url: string | null
  status: string
  priority: number
  created_at: string
  total_views?: number
  unique_viewers?: number
  dismissal_count?: number
}

interface Client {
  id: string
  name: string
}

const ANNOUNCEMENT_TYPES = [
  { value: 'general', label: 'General', color: '#3B82F6' },
  { value: 'billing', label: 'Billing Changes', color: '#F59E0B' },
  { value: 'platform_update', label: 'Platform Update', color: '#8B5CF6' },
  { value: 'offer', label: 'Special Offer', color: '#22C55E' },
  { value: 'maintenance', label: 'Maintenance', color: '#EF4444' },
]

const DISPLAY_PAGES = [
  { value: 'all', label: 'All Pages', group: 'general' },
  // Client pages
  { value: 'client_dashboard', label: 'Client: Dashboard', group: 'client' },
  { value: 'client_results', label: 'Client: Results', group: 'client' },
  { value: 'client_content', label: 'Client: Content', group: 'client' },
  { value: 'client_website', label: 'Client: Website', group: 'client' },
  { value: 'client_communication', label: 'Client: Communication', group: 'client' },
  { value: 'client_recommendations', label: 'Client: Recommendations', group: 'client' },
  { value: 'client_billing', label: 'Client: Billing', group: 'client' },
  { value: 'client_getting_started', label: 'Client: Getting Started', group: 'client' },
  { value: 'client_settings', label: 'Client: Settings', group: 'client' },
  // Admin pages
  { value: 'admin_dashboard', label: 'Admin: Dashboard', group: 'admin' },
  { value: 'admin_recommendations', label: 'Admin: Recommendations', group: 'admin' },
  { value: 'admin_clients', label: 'Admin: Clients', group: 'admin' },
  { value: 'admin_users', label: 'Admin: Users', group: 'admin' },
  { value: 'admin_content', label: 'Admin: Content', group: 'admin' },
  { value: 'admin_websites', label: 'Admin: Websites', group: 'admin' },
  { value: 'admin_notifications', label: 'Admin: Notifications', group: 'admin' },
  { value: 'admin_products', label: 'Admin: Products', group: 'admin' },
  { value: 'admin_rewards', label: 'Admin: Rewards', group: 'admin' },
  { value: 'admin_revenue', label: 'Admin: Revenue / MRR', group: 'admin' },
  { value: 'admin_pipeline', label: 'Admin: Sales Pipeline', group: 'admin' },
  { value: 'admin_performance', label: 'Admin: Client Performance', group: 'admin' },
  { value: 'admin_emails', label: 'Admin: Email Templates', group: 'admin' },
  { value: 'admin_settings', label: 'Admin: Settings', group: 'admin' },
  { value: 'admin_alerts', label: 'Admin: System Alerts', group: 'admin' },
  { value: 'admin_automations', label: 'Admin: Automations', group: 'admin' },
]

const DISPLAY_FREQUENCIES = [
  { value: 'once_per_session', label: 'Once per session' },
  { value: 'every_page_load', label: 'Every page load' },
  { value: 'once_per_day', label: 'Once per day' },
]

const PERSISTENCE_TYPES = [
  { value: 'dismissable', label: 'Dismissable', description: 'User can close and never see again' },
  { value: 'show_for_duration', label: 'Show for X days', description: 'Shows until duration expires' },
  { value: 'required_action', label: 'Required Action', description: 'Cannot be dismissed (requires end date)' },
]

const TARGET_AUDIENCES = [
  { value: 'clients', label: 'Clients Only' },
  { value: 'admin', label: 'Admin Only' },
  { value: 'both', label: 'Both Clients & Admin' },
]

const ADMIN_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'production_team', label: 'Production Team' },
  { value: 'sales', label: 'Sales' },
]

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formTab, setFormTab] = useState<'basic' | 'html' | 'preview'>('basic')

  const [form, setForm] = useState({
    title: '',
    message: '',
    announcement_type: 'general',
    display_pages: ['all'] as string[],
    display_frequency: 'once_per_session',
    persistence_type: 'dismissable',
    show_duration_days: 7,
    allow_permanent_dismiss: true,
    target_audience: 'clients',
    target_all_clients: true,
    target_client_ids: [] as string[],
    target_admin_roles: [] as string[],
    start_date: '',
    end_date: '',
    has_detail_page: false,
    detail_html: '',
    cta_button_text: '',
    cta_button_url: '',
    status: 'draft',
    priority: 0,
  })

  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchAnnouncements()
    fetchClients()
  }, [])

  async function fetchAnnouncements() {
    try {
      const res = await fetch('/api/admin/announcements')
      if (res.ok) {
        const data = await res.json()
        setAnnouncements(data.announcements || [])
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchClients() {
    try {
      const res = await fetch('/api/admin/clients?limit=1000')
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  function resetForm() {
    setForm({
      title: '',
      message: '',
      announcement_type: 'general',
      display_pages: ['all'],
      display_frequency: 'once_per_session',
      persistence_type: 'dismissable',
      show_duration_days: 7,
      allow_permanent_dismiss: true,
      target_audience: 'clients',
      target_all_clients: true,
      target_client_ids: [],
      target_admin_roles: [],
      start_date: '',
      end_date: '',
      has_detail_page: false,
      detail_html: '',
      cta_button_text: '',
      cta_button_url: '',
      status: 'draft',
      priority: 0,
    })
    setEditingId(null)
    setFormTab('basic')
  }

  function editAnnouncement(announcement: Announcement) {
    setForm({
      title: announcement.title,
      message: announcement.message,
      announcement_type: announcement.announcement_type,
      display_pages: announcement.display_pages || ['all'],
      display_frequency: announcement.display_frequency,
      persistence_type: announcement.persistence_type,
      show_duration_days: announcement.show_duration_days || 7,
      allow_permanent_dismiss: announcement.allow_permanent_dismiss,
      target_audience: announcement.target_audience || 'clients',
      target_all_clients: announcement.target_all_clients,
      target_client_ids: announcement.target_client_ids || [],
      target_admin_roles: announcement.target_admin_roles || [],
      start_date: announcement.start_date ? announcement.start_date.split('T')[0] : '',
      end_date: announcement.end_date ? announcement.end_date.split('T')[0] : '',
      has_detail_page: announcement.has_detail_page,
      detail_html: announcement.detail_html || '',
      cta_button_text: announcement.cta_button_text || '',
      cta_button_url: announcement.cta_button_url || '',
      status: announcement.status,
      priority: announcement.priority,
    })
    setEditingId(announcement.id)
    setShowForm(true)
    setFormTab(announcement.has_detail_page ? 'html' : 'basic')
  }

  async function saveAnnouncement() {
    if (!form.title.trim() || !form.message.trim()) {
      alert('Title and message are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        show_duration_days: form.persistence_type === 'show_for_duration' ? form.show_duration_days : null,
        detail_html: form.has_detail_page ? form.detail_html : null,
        cta_button_text: form.cta_button_text || null,
        cta_button_url: form.cta_button_url || null,
      }

      const res = editingId
        ? await fetch(`/api/admin/announcements/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (res.ok) {
        fetchAnnouncements()
        setShowForm(false)
        resetForm()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save announcement')
      }
    } catch (error) {
      console.error('Error saving announcement:', error)
      alert('Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAnnouncement(id: string, permanent: boolean = false) {
    const action = permanent ? 'permanently delete' : 'archive'
    if (!confirm(`Are you sure you want to ${action} this announcement?`)) return

    try {
      const res = await fetch(`/api/admin/announcements/${id}?permanent=${permanent}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchAnnouncements()
      }
    } catch (error) {
      console.error('Error deleting announcement:', error)
    }
  }

  async function toggleStatus(announcement: Announcement) {
    const newStatus = announcement.status === 'active' ? 'draft' : 'active'
    try {
      const res = await fetch(`/api/admin/announcements/${announcement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchAnnouncements()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  function toggleDisplayPage(page: string) {
    setForm(prev => {
      let newPages: string[]
      if (page === 'all') {
        // Toggle "All Pages" on/off
        if (prev.display_pages.includes('all')) {
          newPages = [] // Uncheck all - user will select specific pages
        } else {
          newPages = ['all'] // Check all
        }
      } else {
        // Clicking individual page - remove 'all' if present
        const filtered = prev.display_pages.filter(p => p !== 'all')
        if (filtered.includes(page)) {
          newPages = filtered.filter(p => p !== page)
        } else {
          newPages = [...filtered, page]
        }
      }
      // If nothing selected, default back to 'all'
      if (newPages.length === 0) newPages = ['all']
      return { ...prev, display_pages: newPages }
    })
  }

  function toggleTargetClient(clientId: string) {
    setForm(prev => {
      const newIds = prev.target_client_ids.includes(clientId)
        ? prev.target_client_ids.filter(id => id !== clientId)
        : [...prev.target_client_ids, clientId]
      return { ...prev, target_client_ids: newIds }
    })
  }

  function toggleAdminRole(role: string) {
    setForm(prev => {
      const newRoles = prev.target_admin_roles.includes(role)
        ? prev.target_admin_roles.filter(r => r !== role)
        : [...prev.target_admin_roles, role]
      return { ...prev, target_admin_roles: newRoles }
    })
  }

  const filteredAnnouncements = statusFilter === 'all'
    ? announcements
    : announcements.filter(a => a.status === statusFilter)

  const getTypeColor = (type: string) => {
    return ANNOUNCEMENT_TYPES.find(t => t.value === type)?.color || '#6B7280'
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      draft: { bg: '#F3F4F6', text: '#6B7280' },
      active: { bg: '#DCFCE7', text: '#16A34A' },
      expired: { bg: '#FEE2E2', text: '#DC2626' },
      archived: { bg: '#E5E7EB', text: '#4B5563' },
    }
    return styles[status] || styles.draft
  }

  return (
    <>
      {/* Toolbar */}
      <div className="announcements-toolbar">
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Announcement
        </button>
      </div>

      {/* Filters */}
        <div className="clients-toolbar">
          <div className="filter-buttons">
            {['all', 'active', 'draft', 'archived'].map(status => (
              <button
                key={status}
                className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="loading-state">Loading announcements...</div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
              <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>
            </svg>
            <h3>No announcements yet</h3>
            <p>Create your first announcement to display to clients</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Create Announcement
            </button>
          </div>
        ) : (
          <div className="announcements-list">
            {filteredAnnouncements.map(announcement => {
              const statusStyle = getStatusBadge(announcement.status)
              return (
                <div key={announcement.id} className="announcement-card">
                  <div className="card-header">
                    <div className="card-title-row">
                      <span
                        className="type-indicator"
                        style={{ backgroundColor: getTypeColor(announcement.announcement_type) }}
                      />
                      <h3>{announcement.title}</h3>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                      >
                        {announcement.status}
                      </span>
                    </div>
                    <div className="card-actions">
                      <button
                        className={`toggle-btn ${announcement.status === 'active' ? 'active' : ''}`}
                        onClick={() => toggleStatus(announcement)}
                        title={announcement.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {announcement.status === 'active' ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                            <line x1="12" y1="2" x2="12" y2="12"></line>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        )}
                      </button>
                      <button className="edit-btn" onClick={() => editAnnouncement(announcement)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button className="delete-btn" onClick={() => deleteAnnouncement(announcement.id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="card-message">{announcement.message}</p>
                  <div className="card-meta">
                    <span className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      {announcement.start_date
                        ? new Date(announcement.start_date).toLocaleDateString()
                        : 'No start date'}
                      {announcement.end_date && ` - ${new Date(announcement.end_date).toLocaleDateString()}`}
                    </span>
                    <span className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      {announcement.total_views || 0} views
                    </span>
                    <span className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      {announcement.target_audience === 'admin' ? (
                        announcement.target_admin_roles?.length
                          ? `${announcement.target_admin_roles.length} admin roles`
                          : 'All admins'
                      ) : announcement.target_audience === 'both' ? (
                        'Clients & Admins'
                      ) : (
                        announcement.target_all_clients ? 'All clients' : `${announcement.target_client_ids?.length || 0} clients`
                      )}
                    </span>
                    {announcement.has_detail_page && (
                      <span className="meta-item has-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        Has detail page
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay active" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Announcement' : 'Create Announcement'}</h2>
              <button className="modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-tabs">
                <button
                  className={`form-tab ${formTab === 'basic' ? 'active' : ''}`}
                  onClick={() => setFormTab('basic')}
                >
                  Basic Info
                </button>
                <button
                  className={`form-tab ${formTab === 'html' ? 'active' : ''}`}
                  onClick={() => {
                    setFormTab('html')
                    setForm(prev => ({ ...prev, has_detail_page: true }))
                  }}
                >
                  Detail Page (HTML)
                </button>
                <button
                  className={`form-tab ${formTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setFormTab('preview')}
                >
                  Preview
                </button>
              </div>

              {formTab === 'basic' ? (
                <div className="form-grid">
                  {/* Title */}
                  <div className="form-group full-width">
                    <label>Title *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="Announcement title"
                    />
                  </div>

                  {/* Message */}
                  <div className="form-group full-width">
                    <label>Message *</label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      placeholder="The main message shown in the popup"
                      rows={4}
                    />
                  </div>

                  {/* Type */}
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={form.announcement_type}
                      onChange={e => setForm({ ...form, announcement_type: e.target.value })}
                    >
                      {ANNOUNCEMENT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="form-group">
                    <label>Priority</label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                      min={0}
                      max={100}
                    />
                    <span className="help-text">Higher number = shows first</span>
                  </div>

                  {/* Display Pages */}
                  <div className="form-group full-width">
                    <label>Display on Pages & Tabs</label>

                    {/* All Pages Option */}
                    <div className="pages-section">
                      {DISPLAY_PAGES.filter(p => p.group === 'general').map(page => (
                        <label key={page.value} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={form.display_pages.includes(page.value)}
                            onChange={() => toggleDisplayPage(page.value)}
                          />
                          {page.label}
                        </label>
                      ))}
                    </div>

                    {/* Client Pages */}
                    <div className="pages-group">
                      <h4 className="pages-group-title">Client Portal</h4>
                      <div className="checkbox-group">
                        {DISPLAY_PAGES.filter(p => p.group === 'client').map(page => (
                          <label key={page.value} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={form.display_pages.includes('all') || form.display_pages.includes(page.value)}
                              onChange={() => toggleDisplayPage(page.value)}
                            />
                            {page.label.replace('Client: ', '')}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Admin Pages */}
                    <div className="pages-group">
                      <h4 className="pages-group-title">Admin Panel</h4>
                      <div className="checkbox-group">
                        {DISPLAY_PAGES.filter(p => p.group === 'admin').map(page => (
                          <label key={page.value} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={form.display_pages.includes('all') || form.display_pages.includes(page.value)}
                              onChange={() => toggleDisplayPage(page.value)}
                            />
                            {page.label.replace('Admin: ', '')}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Display Frequency */}
                  <div className="form-group">
                    <label>Display Frequency</label>
                    <select
                      value={form.display_frequency}
                      onChange={e => setForm({ ...form, display_frequency: e.target.value })}
                    >
                      {DISPLAY_FREQUENCIES.map(freq => (
                        <option key={freq.value} value={freq.value}>{freq.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Persistence Type */}
                  <div className="form-group">
                    <label>Persistence</label>
                    <select
                      value={form.persistence_type}
                      onChange={e => setForm({ ...form, persistence_type: e.target.value })}
                    >
                      {PERSISTENCE_TYPES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <span className="help-text">
                      {PERSISTENCE_TYPES.find(p => p.value === form.persistence_type)?.description}
                    </span>
                  </div>

                  {/* Show Duration (if show_for_duration) */}
                  {form.persistence_type === 'show_for_duration' && (
                    <div className="form-group">
                      <label>Duration (days)</label>
                      <input
                        type="number"
                        value={form.show_duration_days}
                        onChange={e => setForm({ ...form, show_duration_days: parseInt(e.target.value) || 7 })}
                        min={1}
                        max={365}
                      />
                    </div>
                  )}

                  {/* Allow Permanent Dismiss */}
                  {form.persistence_type !== 'required_action' && (
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={form.allow_permanent_dismiss}
                          onChange={e => setForm({ ...form, allow_permanent_dismiss: e.target.checked })}
                        />
                        Allow permanent dismiss
                      </label>
                    </div>
                  )}

                  {/* Target Audience */}
                  <div className="form-group full-width">
                    <label>Target Audience</label>
                    <div className="radio-group">
                      {TARGET_AUDIENCES.map(audience => (
                        <label key={audience.value} className="radio-label">
                          <input
                            type="radio"
                            checked={form.target_audience === audience.value}
                            onChange={() => setForm({ ...form, target_audience: audience.value })}
                          />
                          {audience.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Client Targeting - show when audience includes clients */}
                  {(form.target_audience === 'clients' || form.target_audience === 'both') && (
                    <>
                      <div className="form-group full-width">
                        <label>Client Targeting</label>
                        <div className="radio-group">
                          <label className="radio-label">
                            <input
                              type="radio"
                              checked={form.target_all_clients}
                              onChange={() => setForm({ ...form, target_all_clients: true, target_client_ids: [] })}
                            />
                            All clients
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              checked={!form.target_all_clients}
                              onChange={() => setForm({ ...form, target_all_clients: false })}
                            />
                            Specific clients
                          </label>
                        </div>
                      </div>

                      {/* Client Selection */}
                      {!form.target_all_clients && (
                        <div className="form-group full-width">
                          <label>Select Clients</label>
                          <div className="client-selector">
                            {clients.map(client => (
                              <label key={client.id} className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={form.target_client_ids.includes(client.id)}
                                  onChange={() => toggleTargetClient(client.id)}
                                />
                                {client.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Admin Role Targeting - show when audience includes admin */}
                  {(form.target_audience === 'admin' || form.target_audience === 'both') && (
                    <div className="form-group full-width">
                      <label>Admin Roles</label>
                      <p className="help-text" style={{ marginBottom: '8px' }}>
                        Select which admin roles will see this announcement. Leave empty for all admin roles.
                      </p>
                      <div className="checkbox-group">
                        {ADMIN_ROLES.map(role => (
                          <label key={role.value} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={form.target_admin_roles.includes(role.value)}
                              onChange={() => toggleAdminRole(role.value)}
                            />
                            {role.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Schedule */}
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm({ ...form, start_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                    />
                  </div>

                  {/* CTA Button (optional) */}
                  <div className="form-group">
                    <label>CTA Button Text (optional)</label>
                    <input
                      type="text"
                      value={form.cta_button_text}
                      onChange={e => setForm({ ...form, cta_button_text: e.target.value })}
                      placeholder="e.g., Learn More"
                    />
                  </div>

                  <div className="form-group">
                    <label>CTA Button URL</label>
                    <input
                      type="url"
                      value={form.cta_button_url}
                      onChange={e => setForm({ ...form, cta_button_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  {/* Status */}
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                    </select>
                  </div>
                </div>
              ) : formTab === 'html' ? (
                <div className="html-editor">
                  <div className="editor-header">
                    <label>Detail Page HTML</label>
                    <p className="help-text">
                      Paste or write HTML content for the &quot;Read More&quot; detail page.
                      Supports headings, paragraphs, lists, links, and images.
                    </p>
                  </div>
                  <div className="editor-toolbar">
                    <button type="button" onClick={() => {
                      const ta = htmlTextareaRef.current
                      if (ta) {
                        const start = ta.selectionStart
                        const end = ta.selectionEnd
                        const text = ta.value
                        const selected = text.substring(start, end)
                        const newText = text.substring(0, start) + `<strong>${selected}</strong>` + text.substring(end)
                        setForm({ ...form, detail_html: newText })
                      }
                    }}>
                      <strong>B</strong>
                    </button>
                    <button type="button" onClick={() => {
                      const ta = htmlTextareaRef.current
                      if (ta) {
                        const start = ta.selectionStart
                        const end = ta.selectionEnd
                        const text = ta.value
                        const selected = text.substring(start, end)
                        const newText = text.substring(0, start) + `<em>${selected}</em>` + text.substring(end)
                        setForm({ ...form, detail_html: newText })
                      }
                    }}>
                      <em>I</em>
                    </button>
                    <button type="button" onClick={() => {
                      const ta = htmlTextareaRef.current
                      if (ta) {
                        const start = ta.selectionStart
                        const text = ta.value
                        const newText = text.substring(0, start) + `<h2>Heading</h2>\n` + text.substring(start)
                        setForm({ ...form, detail_html: newText })
                      }
                    }}>
                      H2
                    </button>
                    <button type="button" onClick={() => {
                      const ta = htmlTextareaRef.current
                      if (ta) {
                        const start = ta.selectionStart
                        const text = ta.value
                        const newText = text.substring(0, start) + `<p>Paragraph text here</p>\n` + text.substring(start)
                        setForm({ ...form, detail_html: newText })
                      }
                    }}>
                      P
                    </button>
                    <button type="button" onClick={() => {
                      const ta = htmlTextareaRef.current
                      if (ta) {
                        const start = ta.selectionStart
                        const text = ta.value
                        const newText = text.substring(0, start) + `<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>\n` + text.substring(start)
                        setForm({ ...form, detail_html: newText })
                      }
                    }}>
                      List
                    </button>
                    <button type="button" onClick={() => {
                      const url = prompt('Enter URL:')
                      const ta = htmlTextareaRef.current
                      if (ta && url) {
                        const start = ta.selectionStart
                        const end = ta.selectionEnd
                        const text = ta.value
                        const selected = text.substring(start, end) || 'Link text'
                        const newText = text.substring(0, start) + `<a href="${url}">${selected}</a>` + text.substring(end)
                        setForm({ ...form, detail_html: newText })
                      }
                    }}>
                      Link
                    </button>
                    <button type="button" onClick={() => {
                      const url = prompt('Enter image URL:')
                      const ta = htmlTextareaRef.current
                      if (ta && url) {
                        const start = ta.selectionStart
                        const text = ta.value
                        const newText = text.substring(0, start) + `<img src="${url}" alt="Image" />\n` + text.substring(start)
                        setForm({ ...form, detail_html: newText })
                      }
                    }}>
                      Img
                    </button>
                  </div>
                  <textarea
                    ref={htmlTextareaRef}
                    value={form.detail_html}
                    onChange={e => setForm({ ...form, detail_html: e.target.value })}
                    placeholder="<h2>Welcome to our update!</h2>\n<p>Here's what's new...</p>"
                    rows={20}
                    className="html-textarea"
                  />
                  <div className="preview-section">
                    <h4>Preview</h4>
                    <div
                      className="html-preview"
                      dangerouslySetInnerHTML={{ __html: form.detail_html }}
                    />
                  </div>
                </div>
              ) : formTab === 'preview' ? (
                <div className="announcement-preview">
                  <p className="preview-note">This is how the announcement will appear to clients:</p>
                  <div
                    className="preview-popup"
                    style={{
                      backgroundColor: form.announcement_type === 'general' ? '#EFF6FF' :
                        form.announcement_type === 'billing' ? '#FEF3C7' :
                        form.announcement_type === 'platform_update' ? '#F3E8FF' :
                        form.announcement_type === 'offer' ? '#DCFCE7' :
                        form.announcement_type === 'maintenance' ? '#FEE2E2' : '#EFF6FF',
                      borderColor: form.announcement_type === 'general' ? '#3B82F6' :
                        form.announcement_type === 'billing' ? '#F59E0B' :
                        form.announcement_type === 'platform_update' ? '#8B5CF6' :
                        form.announcement_type === 'offer' ? '#22C55E' :
                        form.announcement_type === 'maintenance' ? '#EF4444' : '#3B82F6'
                    }}
                  >
                    <div className="preview-popup-header">
                      <span
                        className="preview-type-badge"
                        style={{
                          backgroundColor: form.announcement_type === 'general' ? '#3B82F6' :
                            form.announcement_type === 'billing' ? '#F59E0B' :
                            form.announcement_type === 'platform_update' ? '#8B5CF6' :
                            form.announcement_type === 'offer' ? '#22C55E' :
                            form.announcement_type === 'maintenance' ? '#EF4444' : '#3B82F6'
                        }}
                      >
                        {ANNOUNCEMENT_TYPES.find(t => t.value === form.announcement_type)?.label || 'General'}
                      </span>
                      <button className="preview-close-btn">✕</button>
                    </div>
                    <h3 className="preview-title">{form.title || 'Announcement Title'}</h3>
                    <p className="preview-message">{form.message || 'Your announcement message will appear here.'}</p>
                    <div className="preview-actions">
                      {form.has_detail_page && (
                        <button className="preview-read-more">Read More</button>
                      )}
                      {form.cta_button_text && (
                        <button className="preview-cta">{form.cta_button_text}</button>
                      )}
                      {form.persistence_type !== 'required_action' && (
                        <button className="preview-dismiss">Dismiss</button>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveAnnouncement} disabled={saving}>
                {saving ? 'Saving...' : (editingId ? 'Update Announcement' : 'Create Announcement')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .announcements-toolbar {
          display: flex;
          justify-content: flex-end;
          padding: 0 0 16px;
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 60px 24px;
          color: #6B7280;
        }

        .empty-state svg {
          color: #D1D5DB;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0 0 8px;
          color: #374151;
        }

        .empty-state p {
          margin: 0 0 20px;
        }

        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .announcement-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .card-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .type-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .card-title-row h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .card-actions {
          display: flex;
          gap: 8px;
        }

        .card-actions button {
          width: 32px;
          height: 32px;
          border: 1px solid #E5E7EB;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6B7280;
          transition: all 0.15s;
        }

        .card-actions button:hover {
          border-color: #3B82F6;
          color: #3B82F6;
        }

        .toggle-btn.active {
          background: #FEE2E2;
          border-color: #EF4444;
          color: #EF4444;
        }

        .delete-btn:hover {
          border-color: #EF4444 !important;
          color: #EF4444 !important;
        }

        .card-message {
          margin: 0 0 16px;
          font-size: 14px;
          color: #4B5563;
          line-height: 1.5;
        }

        .card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #6B7280;
        }

        .meta-item.has-detail {
          color: #8B5CF6;
        }


        .modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .form-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }

        .form-tab {
          padding: 10px 20px;
          border: 1px solid #E5E7EB;
          background: white;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .form-tab:hover {
          border-color: #3B82F6;
        }

        .form-tab.active {
          background: #EFF6FF;
          border-color: #3B82F6;
          color: #3B82F6;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .form-group input[type="text"],
        .form-group input[type="url"],
        .form-group input[type="date"],
        .form-group input[type="number"],
        .form-group select,
        .form-group textarea {
          padding: 10px 12px;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.15s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group textarea {
          resize: vertical;
        }

        .help-text {
          font-size: 12px;
          color: #6B7280;
        }

        .pages-section {
          margin-bottom: 16px;
        }

        .pages-group {
          margin-top: 16px;
          padding: 16px;
          background: #F9FAFB;
          border-radius: 8px;
        }

        .pages-group-title {
          margin: 0 0 12px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .checkbox-group {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px 16px;
        }

        .pages-group .checkbox-group {
          grid-template-columns: repeat(4, 1fr);
        }

        .client-selector {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px 20px;
          max-height: 200px;
          overflow-y: auto;
        }

        .checkbox-label {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          font-size: 14px !important;
          cursor: pointer !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px !important;
          height: 18px !important;
          margin: 0 !important;
          accent-color: #3B82F6 !important;
          cursor: pointer !important;
        }

        .radio-group {
          display: flex !important;
          gap: 32px !important;
        }

        .radio-label {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          font-size: 14px !important;
          cursor: pointer !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .radio-label input[type="radio"] {
          width: 18px !important;
          height: 18px !important;
          margin: 0 !important;
          accent-color: #3B82F6 !important;
          cursor: pointer !important;
        }

        /* HTML Editor */
        .html-editor {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .editor-header p {
          margin: 4px 0 0;
        }

        .editor-toolbar {
          display: flex;
          gap: 8px;
          padding: 8px;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-bottom: none;
          border-radius: 8px 8px 0 0;
        }

        .editor-toolbar button {
          padding: 6px 12px;
          border: 1px solid #D1D5DB;
          background: white;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .editor-toolbar button:hover {
          border-color: #3B82F6;
          background: #EFF6FF;
        }

        .html-textarea {
          width: 100%;
          padding: 16px;
          border: 1px solid #E5E7EB;
          border-radius: 0 0 8px 8px;
          font-family: monospace;
          font-size: 13px;
          line-height: 1.5;
          resize: vertical;
        }

        .html-textarea:focus {
          outline: none;
          border-color: #3B82F6;
        }

        .preview-section {
          margin-top: 20px;
        }

        .preview-section h4 {
          margin: 0 0 12px;
          font-size: 14px;
          color: #374151;
        }

        .html-preview {
          padding: 20px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          background: #FAFAFA;
          min-height: 100px;
          font-size: 14px;
          line-height: 1.6;
        }

        .html-preview :global(h1),
        .html-preview :global(h2),
        .html-preview :global(h3) {
          margin-top: 1em;
          margin-bottom: 0.5em;
          color: #111827;
        }

        .html-preview :global(h1:first-child),
        .html-preview :global(h2:first-child),
        .html-preview :global(h3:first-child) {
          margin-top: 0;
        }

        .html-preview :global(p) {
          margin: 0 0 1em;
        }

        .html-preview :global(a) {
          color: #3B82F6;
        }

        .html-preview :global(img) {
          max-width: 100%;
          border-radius: 8px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #E5E7EB;
        }

        /* Announcement Preview */
        .announcement-preview {
          padding: 20px;
        }

        .preview-note {
          margin: 0 0 20px;
          font-size: 14px;
          color: #6B7280;
        }

        .preview-popup {
          border: 2px solid;
          border-radius: 16px;
          padding: 24px;
          max-width: 500px;
          margin: 0 auto;
        }

        .preview-popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .preview-type-badge {
          color: white;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 12px;
          text-transform: uppercase;
        }

        .preview-close-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: rgba(0,0,0,0.1);
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          color: #6B7280;
        }

        .preview-title {
          margin: 0 0 12px;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .preview-message {
          margin: 0 0 20px;
          font-size: 15px;
          line-height: 1.6;
          color: #374151;
        }

        .preview-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .preview-read-more, .preview-cta {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          background: #3B82F6;
          color: white;
        }

        .preview-dismiss {
          padding: 10px 20px;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          background: white;
          color: #374151;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full-width {
            grid-column: span 1;
          }

          .checkbox-group,
          .pages-group .checkbox-group {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </>
  )
}

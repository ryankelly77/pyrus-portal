'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AdminHeader } from '@/components/layout'

// Helper to generate initials from name (same as Clients page)
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Helper to generate a consistent color from a string (same as Clients page)
function getAvatarColor(str: string): string {
  const colors = ['#885430', '#2563EB', '#7C3AED', '#0B7277', '#DC2626', '#6B7280', '#059669', '#D97706']
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Helper to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// Database client interface
interface DBClient {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  status: string | null
  growth_stage: string | null
  avatar_color: string | null
  notes: string | null
  created_at: string
  // Integration fields
  agency_dashboard_share_key: string | null
  basecamp_id: string | null
  basecamp_project_id: string | null
  landingsite_preview_url: string | null
}

type MainTab = 'getting-started' | 'results' | 'activity' | 'website' | 'content' | 'communication' | 'recommendations'

type RequestStatus = 'completed' | 'in-progress' | 'pending'

interface EditRequest {
  id: number
  title: string
  type: string
  status: RequestStatus
  date: string
}

interface ChecklistItem {
  id: string
  templateId: string
  title: string
  description: string | null
  actionType: string | null
  actionUrl: string | null
  actionLabel: string | null
  isCompleted: boolean
  completedAt: string | null
  notes: string | null
  product: {
    id: string
    name: string
    category: string
  }
}

interface OnboardingResponse {
  id: string
  question: string
  answer: string
  questionType: string
  product: {
    id: string
    name: string
    category: string
  }
}

interface OnboardingSummary {
  [section: string]: OnboardingResponse[]
}

interface ClientData {
  id: string
  name: string
  initials: string
  avatarColor: string
  email: string
  clientSince: string
  status: 'active' | 'paused' | 'onboarding'
  growthStage: 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting'
  servicesCount: number
  hasWebsite: boolean
  hasContent: boolean
  websiteData?: {
    domain: string
    previewUrl: string
    plan: string
    carePlan: string
    status: 'active' | 'development' | 'maintenance'
    launchDate: string
    hosting: {
      provider: string
      uptime: string
      lastUpdated: string
    }
  }
  editRequests?: EditRequest[]
  checklistProgress: {
    completed: number
    total: number
  }
}

const avatarColors = [
  { name: 'Brown', value: '#885430' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Teal', value: '#0B7277' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Pink', value: '#DB2777' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Violet', value: '#9333EA' },
]

// Client database
const clients: Record<string, ClientData> = {
  'tc-clinical': {
    id: 'tc-clinical',
    name: 'TC Clinical Services',
    initials: 'TC',
    avatarColor: '#885430',
    email: 'dlg.mdservices@gmail.com',
    clientSince: 'Sep 2025',
    status: 'active',
    growthStage: 'sprouting',
    servicesCount: 4,
    hasWebsite: true,
    hasContent: true,
    websiteData: {
      domain: 'tc-clinicalservices.com',
      previewUrl: 'https://app.landingsite.ai/website-preview?id=8869fd44-f6ea-4bd7-bc24-92a7a14f17a5',
      plan: 'Seed Site (AI-Built)',
      carePlan: 'Website Care Plan',
      status: 'active',
      launchDate: 'Dec 30, 2025',
      hosting: {
        provider: 'Landingsite.ai',
        uptime: '99.9%',
        lastUpdated: 'Jan 3, 2026',
      },
    },
    editRequests: [
      { id: 1, title: 'Update contact page hours', type: 'Content Update', status: 'completed', date: 'Jan 3, 2026' },
      { id: 2, title: 'Add new wound care service page', type: 'New Feature', status: 'in-progress', date: 'Jan 2, 2026' },
      { id: 3, title: 'Fix mobile menu alignment', type: 'Bug Fix', status: 'completed', date: 'Dec 28, 2025' },
      { id: 4, title: 'Update footer contact info', type: 'Content Update', status: 'completed', date: 'Dec 20, 2025' },
    ],
    checklistProgress: { completed: 5, total: 6 },
  },
  'raptor-vending': {
    id: 'raptor-vending',
    name: 'Raptor Vending',
    initials: 'RV',
    avatarColor: '#2563EB',
    email: 'info@raptorvending.com',
    clientSince: 'Nov 2025',
    status: 'active',
    growthStage: 'seedling',
    servicesCount: 2,
    hasWebsite: false,
    hasContent: false,
    checklistProgress: { completed: 3, total: 6 },
  },
}

type GettingStartedSubtab = 'checklist' | 'onboarding-summary'
type ResultsSubtab = 'overview' | 'pro-dashboard'
type ActivityFilter = 'all' | 'task' | 'update' | 'alert' | 'content'

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string

  // Database client state
  const [dbClient, setDbClient] = useState<DBClient | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<MainTab>('getting-started')
  const [activeSubtab, setActiveSubtab] = useState<GettingStartedSubtab>('checklist')
  const [resultsSubtab, setResultsSubtab] = useState<ResultsSubtab>('overview')
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [isClientView, setIsClientView] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editModalTab, setEditModalTab] = useState<'general' | 'integrations' | 'billing' | 'notifications'>('general')
  const [editFormData, setEditFormData] = useState({
    companyName: '',
    status: 'active' as 'active' | 'paused' | 'onboarding',
    primaryContact: '',
    email: '',
    phone: '',
    website: '',
    growthStage: 'prospect' as 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting',
    internalNotes: '',
    avatarColor: '#885430',
    // Integrations
    agencyDashboardShareKey: '',
    basecampId: '',
    basecampProjectId: '',
    landsitePreviewUrl: '',
    // Billing
    billingEmail: '',
    paymentMethod: '**** **** **** 4242',
    billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'annually',
    // Notifications
    monthlyReports: true,
    resultAlerts: true,
    recommendationUpdates: true,
    weeklyDigest: false,
  })
  const [isSaving, setIsSaving] = useState(false)

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [syncingChecklist, setSyncingChecklist] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  // Onboarding summary state
  const [onboardingSummary, setOnboardingSummary] = useState<OnboardingSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Handle saving client changes
  const handleSaveClient = async () => {
    if (!dbClient) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.companyName,
          contactName: editFormData.primaryContact,
          contactEmail: editFormData.email,
          status: editFormData.status,
          growthStage: editFormData.growthStage,
          notes: editFormData.internalNotes,
          avatarColor: editFormData.avatarColor,
          // Integration fields
          agencyDashboardShareKey: editFormData.agencyDashboardShareKey,
          basecampId: editFormData.basecampId,
          basecampProjectId: editFormData.basecampProjectId,
          landsitePreviewUrl: editFormData.landsitePreviewUrl,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to update client')
      }

      // Refetch client to get updated data
      const updatedClient = await res.json()
      setDbClient(updatedClient)

      setShowEditModal(false)
    } catch (error) {
      console.error('Failed to save client:', error)
      alert('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Fetch client from database
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/admin/clients/${clientId}`)
        if (res.ok) {
          const data: DBClient = await res.json()
          setDbClient(data)
          // Update edit form with fetched data
          setEditFormData(prev => ({
            ...prev,
            companyName: data.name,
            status: (data.status as 'active' | 'paused' | 'onboarding') || 'active',
            primaryContact: data.contact_name || '',
            email: data.contact_email || '',
            growthStage: (data.growth_stage as 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting') || 'prospect',
            internalNotes: data.notes || '',
            avatarColor: data.avatar_color || getAvatarColor(data.name),
            // Integration fields
            agencyDashboardShareKey: data.agency_dashboard_share_key || '',
            basecampId: data.basecamp_id || '',
            basecampProjectId: data.basecamp_project_id || '',
            landsitePreviewUrl: data.landingsite_preview_url || '',
          }))
        }
      } catch (error) {
        console.error('Failed to fetch client:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchClient()
  }, [clientId])

  // Fetch checklist items
  useEffect(() => {
    const fetchChecklist = async () => {
      setChecklistLoading(true)
      try {
        const res = await fetch(`/api/admin/clients/${clientId}/checklist`)
        if (res.ok) {
          const data: ChecklistItem[] = await res.json()
          setChecklistItems(data)
        }
      } catch (error) {
        console.error('Failed to fetch checklist:', error)
      } finally {
        setChecklistLoading(false)
      }
    }
    fetchChecklist()
  }, [clientId])

  // Fetch onboarding summary
  useEffect(() => {
    const fetchOnboardingSummary = async () => {
      setSummaryLoading(true)
      try {
        const res = await fetch(`/api/client/onboarding?clientId=${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setOnboardingSummary(data.onboardingSummary || null)
        }
      } catch (error) {
        console.error('Failed to fetch onboarding summary:', error)
      } finally {
        setSummaryLoading(false)
      }
    }
    fetchOnboardingSummary()
  }, [clientId])

  // Toggle checklist item completion
  const handleChecklistToggle = async (itemId: string, isCompleted: boolean) => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      })
      if (res.ok) {
        const updated: ChecklistItem = await res.json()
        setChecklistItems(items =>
          items.map(item => item.id === itemId ? updated : item)
        )
      }
    } catch (error) {
      console.error('Failed to toggle checklist item:', error)
    }
  }

  // Sync checklist items with onboarding responses
  const handleSyncChecklist = async () => {
    setSyncingChecklist(true)
    setSyncMessage(null)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/checklist/sync`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        // Refresh the checklist
        const refreshRes = await fetch(`/api/admin/clients/${clientId}/checklist`)
        if (refreshRes.ok) {
          setChecklistItems(await refreshRes.json())
        }
        // Show result message
        if (data.synced > 0) {
          setSyncMessage(`${data.synced} item${data.synced > 1 ? 's' : ''} synced`)
        } else {
          setSyncMessage('All synced')
        }
        // Clear message after 3 seconds
        setTimeout(() => setSyncMessage(null), 3000)
      }
    } catch (error) {
      console.error('Failed to sync checklist:', error)
      setSyncMessage('Sync failed')
      setTimeout(() => setSyncMessage(null), 3000)
    } finally {
      setSyncingChecklist(false)
    }
  }

  // Derived client data from database or fallback
  const isActiveClient = dbClient && dbClient.growth_stage && dbClient.growth_stage !== 'prospect'

  // Determine which tabs should be active based on integrations and purchased products
  const hasResultsAccess = !!dbClient?.agency_dashboard_share_key
  const hasActivityAccess = !!dbClient?.basecamp_id
  const hasWebsiteAccess = !!dbClient?.landingsite_preview_url

  // Check purchased products from checklist items
  const purchasedProductNames = Array.from(new Set(checklistItems.map(item => item.product.name.toLowerCase())))
  const websiteProducts = ['bloom site', 'seedling site', 'seed site', 'website care plan', 'wordpress care plan']
  const contentProducts = ['content writing', 'blog writing', 'social media', 'content marketing']

  const hasWebsiteProducts = purchasedProductNames.some(name =>
    websiteProducts.some(wp => name.includes(wp))
  )
  const hasContentProducts = purchasedProductNames.some(name =>
    contentProducts.some(cp => name.includes(cp))
  )

  // Generate website data only when preview URL is available in database
  const realWebsiteData = hasWebsiteAccess && dbClient ? {
    domain: `${dbClient.name.toLowerCase().replace(/\s+/g, '')}.com`,
    previewUrl: dbClient.landingsite_preview_url!,
    plan: 'Seed Site (AI-Built)', // TODO: Get from purchased products
    carePlan: 'Website Care Plan', // TODO: Get from purchased products
    status: 'active' as const,
    launchDate: 'Coming Soon', // TODO: Track actual launch date
    hosting: {
      provider: 'Landingsite.ai',
      uptime: '99.9%',
      lastUpdated: 'Jan 3, 2026',
    },
  } : undefined

  // Generate dummy edit requests for active clients
  const dummyEditRequests = isActiveClient ? [
    { id: 1, title: 'Update contact page hours', type: 'Content Update', status: 'completed' as RequestStatus, date: 'Jan 3, 2026' },
    { id: 2, title: 'Add new service page', type: 'New Feature', status: 'in-progress' as RequestStatus, date: 'Jan 2, 2026' },
    { id: 3, title: 'Fix mobile menu alignment', type: 'Bug Fix', status: 'completed' as RequestStatus, date: 'Dec 28, 2025' },
    { id: 4, title: 'Update footer contact info', type: 'Content Update', status: 'completed' as RequestStatus, date: 'Dec 20, 2025' },
  ] : undefined

  const client: ClientData = dbClient ? {
    id: dbClient.id,
    name: dbClient.name,
    initials: getInitials(dbClient.name),
    avatarColor: dbClient.avatar_color || getAvatarColor(dbClient.name),
    email: dbClient.contact_email || '',
    clientSince: formatDate(dbClient.created_at),
    status: (dbClient.status as 'active' | 'paused' | 'onboarding') || 'active',
    growthStage: (dbClient.growth_stage as 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting') || 'prospect',
    servicesCount: checklistItems.length > 0 ? Array.from(new Set(checklistItems.map(i => i.product.id))).length : 0,
    hasWebsite: hasWebsiteProducts,
    hasContent: hasContentProducts,
    websiteData: realWebsiteData,
    editRequests: dummyEditRequests,
    checklistProgress: isActiveClient ? { completed: 5, total: 6 } : { completed: 0, total: 6 },
  } : clients['tc-clinical'] // Fallback to hardcoded data while loading

  // Activity type and data
  type Activity = {
    id: number
    type: 'content' | 'alert' | 'task' | 'update'
    title: string
    description: string
    time: string
  }

  // Activity data - varies by client (dummy data for now)
  const activitiesByClient: Record<string, Activity[]> = {
    'tc-clinical': [
      { id: 1, type: 'content' as const, title: 'Content approved and published', description: '"January Services Update" blog post is now live on your website', time: 'Today, 3:30 PM' },
      { id: 2, type: 'alert' as const, title: 'Keyword reached Page 1!', description: '"precision wound care San Antonio" moved to position #7', time: 'Today, 2:45 PM' },
      { id: 3, type: 'content' as const, title: 'New content ready for review', description: '"Q1 2026 Marketing Goals" blog post submitted for your approval', time: 'Today, 11:00 AM' },
      { id: 4, type: 'task' as const, title: 'Monthly blog post published', description: '"5 Signs Your Wound Care Needs a Specialist" is now live', time: 'Today, 10:30 AM' },
      { id: 5, type: 'alert' as const, title: 'Traffic milestone: 2,500 visitors!', description: 'Monthly website traffic exceeded 2,500 unique visitors', time: 'Yesterday, 4:30 PM' },
      { id: 6, type: 'update' as const, title: 'Google Ads campaign optimized', description: 'Adjusted bid strategy based on conversion data', time: 'Yesterday, 3:00 PM' },
      { id: 7, type: 'task' as const, title: 'Google Business Profile updated', description: 'Added new photos and updated business hours', time: 'Yesterday, 11:15 AM' },
      { id: 8, type: 'task' as const, title: 'Website launched!', description: 'tc-clinicalservices.com is now live and indexed by Google', time: 'Dec 30, 4:00 PM' },
    ],
    'raptor-vending': [
      { id: 1, type: 'update' as const, title: 'Google Ads campaign launched', description: 'Search campaign now live targeting vending machine keywords', time: 'Today, 2:00 PM' },
      { id: 2, type: 'alert' as const, title: 'First lead received!', description: 'New lead from Google Ads: Office building in Austin', time: 'Today, 11:30 AM' },
      { id: 3, type: 'task' as const, title: 'Google Business Profile claimed', description: 'Business verified and profile optimized', time: 'Yesterday, 4:00 PM' },
      { id: 4, type: 'update' as const, title: 'Ad copy approved', description: 'Client approved Google Ads copy and extensions', time: 'Jan 3, 2026' },
      { id: 5, type: 'task' as const, title: 'Onboarding completed', description: 'Initial setup and strategy call completed', time: 'Jan 2, 2026' },
    ],
  }

  const activities: Activity[] = activitiesByClient[clientId] || activitiesByClient['tc-clinical']

  const filteredActivities = activities.filter(
    (activity: Activity) => activityFilter === 'all' || activity.type === activityFilter
  )

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'completed':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )
      case 'in-progress':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        )
      case 'pending':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        )
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <>
        <AdminHeader
          title="Client Details"
          user={{ name: 'Ryan Kelly', initials: 'RK' }}
          hasNotifications={true}
          breadcrumb={
            <>
              <Link href="/admin/clients">Clients</Link>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span>Loading...</span>
            </>
          }
        />
        <div className="admin-content">
          <div className="loading-state">
            <p>Loading client details...</p>
          </div>
        </div>
      </>
    )
  }

  // Show not found state
  if (!dbClient) {
    return (
      <>
        <AdminHeader
          title="Client Details"
          user={{ name: 'Ryan Kelly', initials: 'RK' }}
          hasNotifications={true}
          breadcrumb={
            <>
              <Link href="/admin/clients">Clients</Link>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span>Not Found</span>
            </>
          }
        />
        <div className="admin-content">
          <div className="no-results">
            <p>Client not found. <Link href="/admin/clients">Return to Clients</Link></p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Client Details"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
        breadcrumb={
          <>
            <Link href="/admin/clients">Clients</Link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span>{client.name}</span>
          </>
        }
        actions={
          <Link href={`/getting-started?viewingAs=${params.id}`} className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            View as Client
          </Link>
        }
      />

      <div className="admin-content">
        {/* Client Header Card */}
        <div className="client-header-card">
          <div className="client-header">
            <div className="client-info">
              <div className="client-avatar" style={{ background: client.avatarColor }}>{client.initials}</div>
              <div className="client-details">
                <h1>
                  {client.name}
                  <span className={`status-badge ${client.status}`}>{client.status.charAt(0).toUpperCase() + client.status.slice(1)}</span>
                </h1>
                <p className="client-meta">{client.email} • Client since {client.clientSince} • <Link href="#current-services" className="services-link">{client.servicesCount} services</Link></p>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                Send Result Alert
              </button>
              <button className="btn btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Resend Invitation
              </button>
              <button className="btn btn-primary" onClick={() => setShowEditModal(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                Edit Client
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button className={`tab-btn ${activeTab === 'getting-started' ? 'active' : ''}`} onClick={() => setActiveTab('getting-started')}>Getting Started</button>
          <button className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>
            Results
            {!hasResultsAccess && isActiveClient && <span className="tab-badge coming-soon">Coming Soon</span>}
            {!isActiveClient && <span className="tab-badge inactive">Inactive</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
            Activity
            {!hasActivityAccess && isActiveClient && <span className="tab-badge coming-soon">Coming Soon</span>}
            {!isActiveClient && <span className="tab-badge inactive">Inactive</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'website' ? 'active' : ''}`} onClick={() => setActiveTab('website')}>
            Website
            {hasWebsiteProducts && !hasWebsiteAccess && <span className="tab-badge coming-soon">Coming Soon</span>}
            {!hasWebsiteProducts && <span className="tab-badge inactive">Inactive</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>
            Content
            {hasContentProducts && !hasActivityAccess && <span className="tab-badge coming-soon">Coming Soon</span>}
            {!hasContentProducts && <span className="tab-badge inactive">Inactive</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'communication' ? 'active' : ''}`} onClick={() => setActiveTab('communication')}>Communication</button>
          <button className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>Recommendations</button>
        </div>

        {/* ==================== GETTING STARTED TAB ==================== */}
        {activeTab === 'getting-started' && (
          <>
            {/* Getting Started Sub-tabs */}
            <div className="getting-started-subtabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className={`getting-started-subtab ${activeSubtab === 'checklist' ? 'active' : ''}`}
                  onClick={() => setActiveSubtab('checklist')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Checklist
                </button>
                <button
                  className={`getting-started-subtab ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`}
                  onClick={() => setActiveSubtab('onboarding-summary')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Onboarding Summary
                </button>
              </div>
              {activeSubtab === 'checklist' && (
                <button
                  onClick={handleSyncChecklist}
                  disabled={syncingChecklist || !!syncMessage}
                  className="getting-started-subtab"
                  title="Re-sync checklist with onboarding responses"
                  style={{ opacity: syncingChecklist ? 0.6 : 1 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  {syncMessage || (syncingChecklist ? 'Syncing...' : 'Sync')}
                </button>
              )}
            </div>

            {/* Checklist Tab Content */}
            <div className={`gs-tab-content ${activeSubtab === 'checklist' ? 'active' : ''}`} id="checklist">
              <div className="onboarding-grid">
                <div className="checklist-card">
                  <div className="checklist-header">
                    <h3>Onboarding Checklist</h3>
                    <p>Complete these steps to get the most from your marketing</p>
                    {checklistItems.length > 0 && (
                      <div className="progress-bar-container">
                        <div className="progress-bar-label">
                          <span>Progress</span>
                          <span>{checklistItems.filter(i => i.isCompleted).length} of {checklistItems.length} completed</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${checklistItems.length > 0
                                ? (checklistItems.filter(i => i.isCompleted).length / checklistItems.length) * 100
                                : 0}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="checklist-items">
                    {checklistLoading ? (
                      <div className="checklist-loading">Loading checklist...</div>
                    ) : checklistItems.length === 0 ? (
                      <div className="checklist-empty">
                        <p>No checklist items yet. Items will appear here after purchase.</p>
                      </div>
                    ) : (
                      checklistItems.map((item) => (
                        <div
                          key={item.id}
                          className={`checklist-item ${item.isCompleted ? 'completed' : ''}`}
                          onClick={() => handleChecklistToggle(item.id, item.isCompleted)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className={`checklist-checkbox ${item.isCompleted ? 'completed' : ''}`}>
                            {item.isCompleted && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                          <div className="checklist-item-content">
                            <div className="checklist-item-title">{item.title}</div>
                            <div className="checklist-item-desc">
                              {item.isCompleted && item.completedAt
                                ? `Completed ${new Date(item.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                : item.description || `From ${item.product.name}`
                              }
                            </div>
                          </div>
                          {item.actionType === 'link' && item.actionUrl && !item.isCompleted && (
                            <div className="checklist-item-action" onClick={(e) => e.stopPropagation()}>
                              <a href={item.actionUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                                {item.actionLabel || 'Open'}
                              </a>
                            </div>
                          )}
                          {item.actionType === 'button' && !item.isCompleted && (
                            <div className="checklist-item-action" onClick={(e) => e.stopPropagation()}>
                              <button className="btn btn-secondary">{item.actionLabel || 'Action'}</button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="sidebar-card">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      Getting Started Video
                    </h4>
                    <div className="video-container">
                      <div className="video-placeholder">
                        <div className="video-play-btn">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </div>
                        <span className="video-duration">2:45</span>
                      </div>
                      <p className="video-caption">Learn how to navigate your portal, track results, and get the most from your marketing partnership.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Onboarding Summary Tab Content */}
            <div className={`gs-tab-content ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`} id="onboarding-summary">
              <div className="onboarding-summary">
                {/* Client Info Section - from database */}
                <div className="summary-section">
                  <h3 className="summary-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Client Info
                  </h3>
                  <div className="summary-grid">
                    <div className="summary-field">
                      <label>Contact Name</label>
                      <span>{dbClient?.contact_name || 'Not provided'}</span>
                    </div>
                    <div className="summary-field">
                      <label>Company</label>
                      <span>{dbClient?.name || 'Not provided'}</span>
                    </div>
                    <div className="summary-field">
                      <label>Email</label>
                      <span>{dbClient?.contact_email || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Onboarding Responses */}
                {summaryLoading ? (
                  <div className="summary-section">
                    <p>Loading onboarding responses...</p>
                  </div>
                ) : onboardingSummary && Object.keys(onboardingSummary).length > 0 ? (
                  Object.entries(onboardingSummary).map(([section, responses]) => (
                    <div key={section} className="summary-section">
                      <h3 className="summary-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        {section}
                      </h3>
                      <div className="summary-content">
                        {responses.map((response) => (
                          <div key={response.id} className="summary-field full-width">
                            <label>{response.question}</label>
                            <span>{response.answer || 'Not answered'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="summary-section">
                    <p style={{ color: '#6B7280', fontStyle: 'italic' }}>No onboarding responses yet. The client will complete the onboarding form after checkout.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ==================== RESULTS TAB ==================== */}
        {activeTab === 'results' && (
          <div className="results-content">
            {hasResultsAccess ? (
              <>
                {/* Results Sub-tabs */}
                <div className="results-subtabs">
                  <button
                    className={`results-subtab ${resultsSubtab === 'overview' ? 'active' : ''}`}
                    onClick={() => setResultsSubtab('overview')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                    Overview
                  </button>
                  <button
                    className={`results-subtab ${resultsSubtab === 'pro-dashboard' ? 'active' : ''}`}
                    onClick={() => setResultsSubtab('pro-dashboard')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                    Pro Dashboard
                    <span className="pro-badge">PRO</span>
                  </button>
                </div>

                {/* Overview Content */}
                {resultsSubtab === 'overview' && (
              <>
                <div className="results-header">
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Performance Overview</h3>
                  <div className="results-period">
                    <label>Time Period:</label>
                    <select defaultValue="Last 30 Days">
                      <option>Last 30 Days</option>
                      <option>Last 90 Days</option>
                      <option>This Year</option>
                      <option>All Time</option>
                    </select>
                  </div>
                </div>

                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-header">
                      <div className="kpi-icon traffic">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                      <div className="kpi-change positive">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                        +32%
                      </div>
                    </div>
                    <div className="kpi-value">2,847</div>
                    <div className="kpi-label">Website Visitors</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header">
                      <div className="kpi-icon keywords">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                      </div>
                      <div className="kpi-change positive">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                        +17
                      </div>
                    </div>
                    <div className="kpi-value">47</div>
                    <div className="kpi-label">Keywords Ranking</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header">
                      <div className="kpi-icon leads">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="8.5" cy="7" r="4"></circle>
                          <line x1="20" y1="8" x2="20" y2="14"></line>
                          <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                      </div>
                      <div className="kpi-change positive">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                        +8
                      </div>
                    </div>
                    <div className="kpi-value">28</div>
                    <div className="kpi-label">New Leads</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header">
                      <div className="kpi-icon calls">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                      </div>
                      <div className="kpi-change positive">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                        +12
                      </div>
                    </div>
                    <div className="kpi-value">34</div>
                    <div className="kpi-label">Phone Calls</div>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Keyword Rankings Progress</h3>
                    <button className="btn btn-secondary" style={{ padding: '8px 14px' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Export Report
                    </button>
                  </div>
                  <div className="keywords-table">
                    <div className="keywords-table-header">
                      <span>Keyword</span>
                      <span>Current</span>
                      <span>Previous</span>
                      <span>Change</span>
                    </div>
                    <div className="keywords-table-row">
                      <span className="keyword-name">precision wound care san antonio</span>
                      <span className="keyword-position">#7</span>
                      <span className="keyword-previous">#24</span>
                      <span className="keyword-change positive">+17</span>
                    </div>
                    <div className="keywords-table-row">
                      <span className="keyword-name">wound care clinic near me</span>
                      <span className="keyword-position">#12</span>
                      <span className="keyword-previous">#18</span>
                      <span className="keyword-change positive">+6</span>
                    </div>
                    <div className="keywords-table-row">
                      <span className="keyword-name">diabetic wound treatment texas</span>
                      <span className="keyword-position">#15</span>
                      <span className="keyword-previous">#22</span>
                      <span className="keyword-change positive">+7</span>
                    </div>
                    <div className="keywords-table-row">
                      <span className="keyword-name">chronic wound specialist</span>
                      <span className="keyword-position">#23</span>
                      <span className="keyword-previous">#31</span>
                      <span className="keyword-change positive">+8</span>
                    </div>
                  </div>
                  <div className="keywords-summary">
                    <span>Showing 4 of 47 tracked keywords</span>
                    <a href="#">View all keywords →</a>
                  </div>
                </div>
              </>
            )}

            {/* Pro Dashboard Content */}
            {resultsSubtab === 'pro-dashboard' && (
              <div className="pro-dashboard-content">
                <div className="pro-dashboard-header">
                  <div className="pro-dashboard-info">
                    <h3>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                      Pro Dashboard
                    </h3>
                    <p>Deep-dive analytics with real-time data from all your marketing channels</p>
                  </div>
                  <a href="https://agencydashboard.io/campaign/detail/MjI5MTgtfC00NDUyMC18LXJPN0xveFpTQmM=" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Open in New Tab
                  </a>
                </div>
                <div className="pro-dashboard-embed">
                  <iframe
                    src={dbClient?.agency_dashboard_share_key
                      ? `https://agencydashboard.io/campaign/detail/${dbClient.agency_dashboard_share_key}`
                      : "https://agencydashboard.io/campaign/detail/MjI5MTgtfC00NDUyMC18LXJPN0xveFpTQmM="}
                    frameBorder="0"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}
            </>
            ) : checklistItems.length > 0 ? (
              /* Service purchased but not yet activated */
              <div className="inactive-service-container">
                <div className="inactive-service-card">
                  <div className="inactive-service-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="48" height="48">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                  </div>
                  <h3>Results Dashboard Coming Soon</h3>
                  <p>We&apos;re setting up your performance dashboard. Once your marketing campaigns are connected, you&apos;ll be able to track website traffic, keyword rankings, leads, and more.</p>
                  <div className="inactive-service-info" style={{ marginTop: '1.5rem' }}>
                    <h4>What you&apos;ll see here:</h4>
                    <ul>
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Website traffic and visitor analytics
                      </li>
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Keyword rankings and SEO performance
                      </li>
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Lead generation metrics
                      </li>
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Google Ads campaign performance
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              /* No service - Upsell */
              <div className="inactive-service-container">
                <div className="inactive-service-card">
                  <div className="inactive-service-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                  </div>
                  <h3>Results Dashboard Not Active</h3>
                  <p>This client does not currently have marketing services. Activate a marketing plan to track their website performance, SEO rankings, and lead generation.</p>

                  <div className="inactive-service-actions">
                    <button className="btn btn-primary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                      </svg>
                      Create Recommendation
                    </button>
                    <button className="btn btn-secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                      </svg>
                      View Marketing Plans
                    </button>
                  </div>
                </div>

                <div className="inactive-service-info">
                  <h4>Marketing Services Include:</h4>
                  <ul>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      SEO optimization and keyword tracking
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Google Ads management
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Website analytics and reporting
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Lead generation tracking
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Monthly performance reports
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== ACTIVITY TAB ==================== */}
        {activeTab === 'activity' && (
          <div className="activity-content">
            {hasActivityAccess ? (
              <>
                <div className="activity-filters">
                  <button className={`filter-chip ${activityFilter === 'all' ? 'active' : ''}`} onClick={() => setActivityFilter('all')}>All Activity</button>
                  <button className={`filter-chip ${activityFilter === 'task' ? 'active' : ''}`} onClick={() => setActivityFilter('task')}>Tasks</button>
                  <button className={`filter-chip ${activityFilter === 'update' ? 'active' : ''}`} onClick={() => setActivityFilter('update')}>Updates</button>
                  <button className={`filter-chip ${activityFilter === 'alert' ? 'active' : ''}`} onClick={() => setActivityFilter('alert')}>Result Alerts</button>
                  <button className={`filter-chip ${activityFilter === 'content' ? 'active' : ''}`} onClick={() => setActivityFilter('content')}>Content</button>
                </div>

                <div className="activity-card">
                  <ul className="activity-list">
                    {filteredActivities.map(activity => (
                      <li key={activity.id} className="activity-item" data-type={activity.type}>
                        <div className={`activity-icon ${activity.type}`}>
                          {activity.type === 'content' && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                          )}
                          {activity.type === 'alert' && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                            </svg>
                          )}
                          {activity.type === 'task' && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="9 11 12 14 22 4"></polyline>
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                            </svg>
                          )}
                          {activity.type === 'update' && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="23 4 23 10 17 10"></polyline>
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
                          )}
                        </div>
                        <div className="activity-details">
                          <div className="activity-title">{activity.title}</div>
                          <div className="activity-desc">{activity.description}</div>
                        </div>
                        <div className="activity-time">{activity.time}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : checklistItems.length > 0 ? (
              /* Service purchased but not yet activated */
              <div className="inactive-service-container">
                <div className="inactive-service-card">
                  <div className="inactive-service-icon" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="48" height="48">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                  </div>
                  <h3>Activity Feed Coming Soon</h3>
                  <p>We&apos;re connecting your project activity feed. Once set up, you&apos;ll see all tasks, updates, and milestones from your marketing projects here.</p>
                  <div className="inactive-service-info" style={{ marginTop: '1.5rem' }}>
                    <h4>What you&apos;ll see here:</h4>
                    <ul>
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Task completions and updates
                      </li>
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Project milestone achievements
                      </li>
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Content approvals and publishing
                      </li>
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Team communication updates
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              /* No service - Upsell */
              <div className="inactive-service-container">
                <div className="inactive-service-card">
                  <div className="inactive-service-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                  </div>
                  <h3>Activity Feed Not Active</h3>
                  <p>This client does not currently have any active projects. Start a marketing service to track project activity, tasks, and team updates.</p>

                  <div className="inactive-service-actions">
                    <button className="btn btn-primary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                      </svg>
                      Create Recommendation
                    </button>
                    <button className="btn btn-secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                      </svg>
                      View Service Plans
                    </button>
                  </div>
                </div>

                <div className="inactive-service-info">
                  <h4>Active Projects Include:</h4>
                  <ul>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Real-time project activity tracking
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Task and milestone updates
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Team communication visibility
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Content approval workflows
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Project timeline overview
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== WEBSITE TAB ==================== */}
        {activeTab === 'website' && (
          <div className="website-tab-content">
            {hasWebsiteProducts && hasWebsiteAccess && client.websiteData ? (
              /* Active Website - has products AND preview URL set */
              <>
                {/* Website Preview and Info Grid */}
                <div className="website-hero-grid">
                  {/* Website Preview */}
                  <div className="website-preview-card">
                    <div className="website-preview-header">
                      <h3>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                          <line x1="8" y1="21" x2="16" y2="21"></line>
                          <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        Website Preview
                      </h3>
                      <a href={`https://${client.websiteData.domain}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Visit Site
                      </a>
                    </div>
                    <div className="website-preview-container">
                      <iframe
                        src={client.websiteData.previewUrl}
                        title="Website Preview"
                        frameBorder="0"
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>

                  {/* Website Info Card */}
                  <div className="website-info-card">
                    <div className="website-info-header">
                      <div className="website-status-badge active">
                        <span className="status-dot"></span>
                        Active
                      </div>
                    </div>

                    <div className="website-domain">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                      </svg>
                      <span>{client.websiteData.domain}</span>
                    </div>

                    <div className="website-info-details">
                      <div className="info-row">
                        <span className="info-label">Website Plan</span>
                        <span className="info-value">{client.websiteData.plan}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Care Plan</span>
                        <span className="info-value">{client.websiteData.carePlan}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Launched</span>
                        <span className="info-value">{client.websiteData.launchDate}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Hosting</span>
                        <span className="info-value">{client.websiteData.hosting.provider}</span>
                      </div>
                    </div>

                    <div className="website-stats-mini">
                      <div className="stat-mini">
                        <div className="stat-mini-value success">{client.websiteData.hosting.uptime}</div>
                        <div className="stat-mini-label">Uptime</div>
                      </div>
                      <div className="stat-mini">
                        <div className="stat-mini-value">{client.websiteData.hosting.lastUpdated}</div>
                        <div className="stat-mini-label">Last Updated</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Edit Requests Section */}
                {client.editRequests && client.editRequests.length > 0 && (
                  <div className="edit-requests-card">
                    <div className="edit-requests-header">
                      <div className="edit-requests-title">
                        <h3>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Website Edit Requests
                        </h3>
                        <p>Client-requested changes to their website</p>
                      </div>
                    </div>

                    {/* Requests List */}
                    <div className="edit-requests-list">
                      {client.editRequests.map((request) => (
                        <div key={request.id} className={`edit-request-item ${request.status}`}>
                          <div className={`request-status-icon ${request.status}`}>
                            {getStatusIcon(request.status)}
                          </div>
                          <div className="request-details">
                            <div className="request-title">{request.title}</div>
                            <div className="request-meta">
                              <span className="request-type">{request.type}</span>
                            </div>
                          </div>
                          <div className="request-info">
                            <span className={`request-status-badge ${request.status}`}>
                              {request.status === 'in-progress' ? 'In Progress' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                            <span className="request-date">{request.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : hasWebsiteProducts && !hasWebsiteAccess ? (
              /* Coming Soon - has website products but no preview URL set yet */
              <div className="inactive-service-container">
                <div className="inactive-service-card coming-soon">
                  <div className="inactive-service-icon" style={{ background: 'linear-gradient(135deg, #0B7277 0%, #14B8A6 100%)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="48" height="48">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  </div>
                  <h3>Website Coming Soon</h3>
                  <p>Your website service is being set up. Once the preview URL is configured, you&apos;ll be able to view and manage your website here.</p>
                  <div className="coming-soon-checklist">
                    <div className="checklist-item completed">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Website service purchased
                    </div>
                    <div className="checklist-item pending">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                      Website being built
                    </div>
                    <div className="checklist-item pending">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                      Preview URL configuration
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Upsell - no website products purchased */
              <div className="upsell-container">
                <div className="upsell-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </div>
                <h2 className="upsell-title">Get Your Professional Website</h2>
                <p className="upsell-description">
                  Establish your online presence with a stunning, professional website tailored to your business. Our websites are designed to convert visitors into customers.
                </p>
                <div className="upsell-features">
                  <div className="upsell-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Custom design that reflects your brand</span>
                  </div>
                  <div className="upsell-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Mobile-responsive on all devices</span>
                  </div>
                  <div className="upsell-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>SEO optimized for better rankings</span>
                  </div>
                  <div className="upsell-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Ongoing care and maintenance included</span>
                  </div>
                </div>
                <div className="upsell-plans">
                  <div className="upsell-plan-card">
                    <div className="plan-card-content">
                      <div className="plan-header">
                        <h3>Seed Site</h3>
                        <p className="plan-type">AI-Built Website</p>
                      </div>
                      <div className="plan-price">
                        <span className="price-amount">$249</span>
                        <span className="price-period">/month</span>
                      </div>
                      <ul className="plan-features-list">
                        <li>AI-generated modern design</li>
                        <li>Up to 5 pages</li>
                        <li>Basic SEO setup</li>
                        <li>SSL &amp; hosting included</li>
                        <li>Mobile responsive</li>
                      </ul>
                    </div>
                    <button className="btn btn-secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add to Plan
                    </button>
                  </div>
                  <div className="upsell-plan-card">
                    <div className="plan-card-content">
                      <div className="plan-header">
                        <h3>Sprout Site</h3>
                        <p className="plan-type">WordPress</p>
                      </div>
                      <div className="plan-price">
                        <span className="price-amount">$300</span>
                        <span className="price-period">/mo × 12</span>
                      </div>
                      <p className="plan-alt-price">or $3,000 one-time</p>
                      <ul className="plan-features-list">
                        <li>Custom WordPress design</li>
                        <li>Up to 5 pages</li>
                        <li>Blog ready</li>
                        <li>Contact forms</li>
                      </ul>
                    </div>
                    <button className="btn btn-secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add to Plan
                    </button>
                  </div>
                  <div className="upsell-plan-card featured">
                    <div className="plan-badge">Most Popular</div>
                    <div className="plan-card-content">
                      <div className="plan-header">
                        <h3>Bloom Site</h3>
                        <p className="plan-type">WordPress</p>
                      </div>
                      <div className="plan-price">
                        <span className="price-amount">$450</span>
                        <span className="price-period">/mo × 12</span>
                      </div>
                      <p className="plan-alt-price">or $4,500 one-time</p>
                      <ul className="plan-features-list">
                        <li>Premium WordPress design</li>
                        <li>Up to 10 pages</li>
                        <li>Advanced SEO optimization</li>
                        <li>Blog &amp; integrations</li>
                        <li>Custom functionality</li>
                      </ul>
                    </div>
                    <button className="btn btn-primary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add to Plan
                    </button>
                  </div>
                  <div className="upsell-plan-card">
                    <div className="plan-card-content">
                      <div className="plan-header">
                        <h3>Harvest Site</h3>
                        <p className="plan-type">WordPress</p>
                      </div>
                      <div className="plan-price">
                        <span className="price-amount">$600</span>
                        <span className="price-period">/mo × 12</span>
                      </div>
                      <p className="plan-alt-price">or $6,000 one-time</p>
                      <ul className="plan-features-list">
                        <li>Enterprise WordPress design</li>
                        <li>Unlimited pages</li>
                        <li>E-commerce ready</li>
                        <li>Advanced integrations</li>
                        <li>Priority support</li>
                      </ul>
                    </div>
                    <button className="btn btn-secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add to Plan
                    </button>
                  </div>
                </div>

                {/* Care Plans */}
                <div className="care-plans-section">
                  <h3 className="care-plans-title">Ongoing Website Care</h3>
                  <p className="care-plans-desc">Keep your website running smoothly with our maintenance plans</p>
                  <div className="care-plans-grid">
                    <div className="care-plan-card">
                      <div className="care-plan-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                      </div>
                      <div className="care-plan-content">
                        <h4>WordPress Care Plan</h4>
                        <p>Hosting, security updates, backups &amp; technical maintenance</p>
                      </div>
                      <div className="care-plan-action">
                        <div className="care-plan-price">$49<span>/mo</span></div>
                        <button className="btn btn-sm btn-secondary">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          Add to Plan
                        </button>
                      </div>
                    </div>
                    <div className="care-plan-card">
                      <div className="care-plan-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                      </div>
                      <div className="care-plan-content">
                        <h4>Website Care Plan</h4>
                        <p>Content updates, design changes &amp; ongoing requests</p>
                      </div>
                      <div className="care-plan-action">
                        <div className="care-plan-price">$149<span>/mo</span></div>
                        <button className="btn btn-sm btn-secondary">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          Add to Plan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== CONTENT TAB ==================== */}
        {activeTab === 'content' && (
          <div className="content-manager-tab">
            {hasContentProducts && hasActivityAccess ? (
              /* Active Content - has content products AND Basecamp configured */
              <>
                {/* Content Stats */}
                <div className="content-stats">
                  <div className="content-stat-card urgent">
                    <div className="stat-label">Urgent Reviews</div>
                    <div className="stat-value">2</div>
                    <div className="stat-desc">Less than 24 hours</div>
                  </div>
                  <div className="content-stat-card">
                    <div className="stat-label">Pending Approval</div>
                    <div className="stat-value">5</div>
                    <div className="stat-desc">Awaiting client review</div>
                  </div>
                  <div className="content-stat-card">
                    <div className="stat-label">Approved</div>
                    <div className="stat-value">2</div>
                    <div className="stat-desc">Ready for publishing</div>
                  </div>
                  <div className="content-stat-card">
                    <div className="stat-label">Published</div>
                    <div className="stat-value">6</div>
                    <div className="stat-desc">Live content</div>
                  </div>
                </div>

                {/* Content List */}
                <div className="content-section">
                  <div className="content-section-header">
                    <h3 className="urgent-title">Urgent Reviews</h3>
                  </div>
                  <div className="content-list">
                    <div className="content-item urgent">
                      <div className="content-item-header">
                        <span className="platform-badge website">Website Content</span>
                        <div className="time-remaining urgent">
                          <span className="time-label">Time remaining</span>
                          <span className="time-value">23 hours</span>
                        </div>
                      </div>
                      <h4 className="content-title">Black Friday Sale Announcement</h4>
                      <div className="content-meta">
                        <span className="content-type">Blog Post</span>
                        <span className="content-date">Added Nov 15</span>
                      </div>
                      <p className="content-preview">Get ready for our biggest sale of the year! This Black Friday, enjoy up to 50% off on all our digital marketing services...</p>
                      <div className="content-actions">
                        <button className="btn btn-primary btn-sm">Review &amp; Edit</button>
                        <button className="btn btn-outline btn-sm">Quick Approve</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="content-section">
                  <div className="content-section-header">
                    <h3>Pending Approval</h3>
                  </div>
                  <div className="content-list">
                    <div className="content-item">
                      <div className="content-item-header">
                        <span className="platform-badge website">Website Content</span>
                        <div className="time-remaining">
                          <span className="time-label">Time remaining</span>
                          <span className="time-value">4 days</span>
                        </div>
                      </div>
                      <h4 className="content-title">2025 Marketing Trends You Need to Know</h4>
                      <div className="content-meta">
                        <span className="content-type">Blog Post</span>
                        <span className="content-date">Added Nov 20</span>
                      </div>
                      <p className="content-preview">Stay ahead of the curve with these 10 marketing trends that will dominate 2025...</p>
                      <div className="content-actions">
                        <button className="btn btn-primary btn-sm">Review &amp; Edit</button>
                        <button className="btn btn-outline btn-sm">Quick Approve</button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : hasContentProducts && !hasActivityAccess ? (
              /* Coming Soon - has content products but no Basecamp configured */
              <div className="inactive-service-container">
                <div className="inactive-service-card coming-soon">
                  <div className="inactive-service-icon" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="48" height="48">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <h3>Content Coming Soon</h3>
                  <p>Your content service is being set up. Once your Basecamp project is connected, you&apos;ll be able to review and approve content here.</p>
                  <div className="coming-soon-checklist">
                    <div className="checklist-item completed">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Content service purchased
                    </div>
                    <div className="checklist-item pending">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                      Basecamp project setup
                    </div>
                    <div className="checklist-item pending">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                      Content calendar creation
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Upsell - no content products purchased */
              <div className="content-upsell-container">
                {/* Hero Section */}
                <div className="content-hero">
                  <div className="content-hero-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                      <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                      <path d="M2 2l7.586 7.586"></path>
                      <circle cx="11" cy="11" r="2"></circle>
                    </svg>
                  </div>
                  <h2 className="content-hero-title">Content is the Engine Behind Your Growth</h2>
                  <p className="content-hero-subtitle">
                    Every successful marketing channel depends on quality content. Without it, your SEO stalls,
                    social media falls flat, and paid ads underperform.
                  </p>
                </div>

                {/* Visual Hub Diagram */}
                <div className="content-hub-section">
                  <div className="content-hub-diagram">
                    {/* Center Hub */}
                    <div className="hub-center">
                      <div className="hub-center-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" width="32" height="32">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                      </div>
                      <span>Content</span>
                    </div>

                    {/* Connecting Lines */}
                    <svg className="hub-connections" viewBox="0 0 400 320">
                      <path d="M 200 150 Q 120 100 60 70" stroke="#8B5CF6" strokeWidth="3" fill="none" strokeDasharray="8 4" className="hub-line" />
                      <path d="M 200 150 Q 280 100 340 70" stroke="#22C55E" strokeWidth="3" fill="none" strokeDasharray="8 4" className="hub-line" />
                      <path d="M 200 150 L 200 295" stroke="#F59E0B" strokeWidth="3" fill="none" strokeDasharray="8 4" className="hub-line" />
                    </svg>

                    {/* Spoke: SEO */}
                    <div className="hub-spoke spoke-seo">
                      <div className="spoke-icon seo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <circle cx="11" cy="11" r="8"></circle>
                          <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                      </div>
                      <div className="spoke-content">
                        <span className="spoke-title">SEO</span>
                        <span className="spoke-desc">Blog posts, landing pages, meta content</span>
                      </div>
                    </div>

                    {/* Spoke: Social Media */}
                    <div className="hub-spoke spoke-social">
                      <div className="spoke-icon social">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                        </svg>
                      </div>
                      <div className="spoke-content">
                        <span className="spoke-title">Social Media</span>
                        <span className="spoke-desc">Posts, images, videos, brand assets</span>
                      </div>
                    </div>

                    {/* Spoke: Paid Ads */}
                    <div className="hub-spoke spoke-ads">
                      <div className="spoke-icon ads">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="3" y1="9" x2="21" y2="9"></line>
                          <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                      </div>
                      <div className="spoke-content">
                        <span className="spoke-title">Paid Advertising</span>
                        <span className="spoke-desc">Ad copy, creative assets, landing pages</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Offerings */}
                <div className="content-offerings-section">
                  <h3 className="offerings-title">Our Content Solutions</h3>
                  <p className="offerings-subtitle">Professional content that powers every marketing channel</p>

                  <div className="content-offerings-grid">
                    {/* Content Writing */}
                    <div className="content-offering-card">
                      <div className="offering-header">
                        <div className="offering-icon writing">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                            <path d="M2 2l7.586 7.586"></path>
                            <circle cx="11" cy="11" r="2"></circle>
                          </svg>
                        </div>
                        <div className="offering-price-tag">
                          <span className="price">$99</span>
                          <span className="per">per article</span>
                        </div>
                      </div>
                      <h4 className="offering-title">Content Writing</h4>
                      <p className="offering-description">
                        SEO and AI-optimized content up to 1,000 words for your blog or website.
                        Each piece is crafted to rank and convert.
                      </p>
                      <div className="offering-powers">
                        <span className="powers-label">Powers:</span>
                        <div className="powers-tags">
                          <span className="power-tag seo">SEO Rankings</span>
                          <span className="power-tag social">Blog Strategy</span>
                        </div>
                      </div>
                      <ul className="offering-features">
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Keyword-optimized for search
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          AI-enhanced for engagement
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Up to 1,000 words
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          One round of revisions
                        </li>
                      </ul>
                      <button className="btn btn-secondary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add to Plan
                      </button>
                    </div>

                    {/* AI Creative Assets */}
                    <div className="content-offering-card featured">
                      <div className="offering-badge">Best Value</div>
                      <div className="offering-header">
                        <div className="offering-icon creative">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                        </div>
                        <div className="offering-price-tag">
                          <span className="price">$299</span>
                          <span className="per">/month</span>
                        </div>
                      </div>
                      <h4 className="offering-title">AI Creative Assets</h4>
                      <p className="offering-description">
                        A monthly package of custom visuals to fuel your social media, ads, and website
                        with scroll-stopping content.
                      </p>
                      <div className="offering-powers">
                        <span className="powers-label">Powers:</span>
                        <div className="powers-tags">
                          <span className="power-tag social">Social Media</span>
                          <span className="power-tag ads">Paid Ads</span>
                        </div>
                      </div>
                      <ul className="offering-features">
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          4 custom AI-generated images
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          1 short-form AI animated video
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          10 curated premium stock images
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          10 curated premium stock videos
                        </li>
                      </ul>
                      <button className="btn btn-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add to Plan
                      </button>
                    </div>

                    {/* Business Branding Foundation */}
                    <div className="content-offering-card">
                      <div className="offering-header">
                        <div className="offering-icon branding">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                          </svg>
                        </div>
                        <div className="offering-price-tag">
                          <span className="price">$99</span>
                          <span className="per">/month</span>
                          <span className="price-alt">or $899 one-time</span>
                        </div>
                      </div>
                      <h4 className="offering-title">Business Branding Foundation</h4>
                      <p className="offering-description">
                        The strategic foundation every business needs. Four essential documents that
                        guide all your marketing efforts.
                      </p>
                      <div className="offering-powers">
                        <span className="powers-label">Powers:</span>
                        <div className="powers-tags">
                          <span className="power-tag seo">SEO</span>
                          <span className="power-tag social">Social</span>
                          <span className="power-tag ads">Ads</span>
                        </div>
                      </div>
                      <ul className="offering-features">
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Strategic Positioning &amp; Brand Framework
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Brand Messaging &amp; Go-To-Market Playbook
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Competitive Comparison Analysis
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Brand Color Guidelines
                        </li>
                      </ul>
                      <button className="btn btn-secondary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add to Plan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== COMMUNICATION TAB ==================== */}
        {activeTab === 'communication' && (
          <div className="communication-content">
            {/* Stats Overview */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Communications</div>
                <div className="stat-value">11</div>
                <div className="stat-detail">Last 30 days</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Emails Sent</div>
                <div className="stat-value">4</div>
                <div className="stat-detail">3 delivered, 1 failed</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Result Alerts</div>
                <div className="stat-value purple">2</div>
                <div className="stat-detail">Both viewed</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Email Open Rate</div>
                <div className="stat-value success">67%</div>
                <div className="stat-detail">2 of 3 delivered</div>
              </div>
            </div>

            {/* Communication Timeline */}
            <div className="timeline-card">
              <div className="timeline-header">
                <div className="timeline-title">
                  <h3>Communication Timeline</h3>
                  <p>All client communications in chronological order</p>
                </div>
              </div>

              <ul className="timeline-list">
                <li className="timeline-item highlight-success" data-type="result">
                  <div className="timeline-date">
                    <span className="date">Jan 2, 2026</span>
                    <span className="time">2:45 PM CST</span>
                  </div>
                  <div className="timeline-content">
                    <div className="comm-icon result-alert">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                    </div>
                    <div className="comm-details">
                      <div className="comm-header">
                        <div className="comm-title">
                          <h4>Result Alert Sent <span className="type-label result">Result Alert</span></h4>
                          <span className="subject">Your keyword is now ranking on Page 1!</span>
                        </div>
                        <div className="comm-status">
                          <span className="status-pill delivered">Delivered</span>
                          <span className="status-pill opened">Viewed</span>
                        </div>
                      </div>
                      <div className="result-highlight">
                        <div className="result-text">
                          <strong>&quot;precision wound care San Antonio&quot; — Now Position #7</strong>
                          <span>Moved from position #24 to #7 (up 17 spots!)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>

                <li className="timeline-item" data-type="email">
                  <div className="timeline-date">
                    <span className="date">Jan 2, 2026</span>
                    <span className="time">8:00 AM CST</span>
                  </div>
                  <div className="timeline-content">
                    <div className="comm-icon email-reminder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </div>
                    <div className="comm-details">
                      <div className="comm-header">
                        <div className="comm-title">
                          <h4>Invitation Reminder <span className="type-label reminder">Reminder</span></h4>
                          <span className="subject">Your Pyrus Digital portal is waiting for you</span>
                        </div>
                        <div className="comm-status">
                          <span className="status-pill delivered">Delivered</span>
                          <span className="status-pill opened">Opened</span>
                          <span className="status-pill clicked">Clicked</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ==================== RECOMMENDATIONS TAB ==================== */}
        {activeTab === 'recommendations' && (
          <div className="recommendations-content">
            {/* Growth Stage Hero Section */}
            {(() => {
              const stageInfo: Record<string, { icon: string; name: string; description: string; index: number }> = {
                prospect: { icon: '🌰', name: 'Prospect', description: 'Not yet a client. Exploring growth opportunities.', index: 0 },
                seedling: { icon: '🌱', name: 'Seedling', description: 'Just getting started! Foundation being established.', index: 1 },
                sprouting: { icon: '🌿', name: 'Sprouting', description: 'Building momentum with early results appearing.', index: 2 },
                blooming: { icon: '🌸', name: 'Blooming', description: 'Thriving with strong results and growth.', index: 3 },
                harvesting: { icon: '🌾', name: 'Harvesting', description: 'Reaping the rewards of sustained growth.', index: 4 },
              }
              const currentStage = client.growthStage || 'prospect'
              const current = stageInfo[currentStage] || stageInfo.prospect
              const stages = ['seedling', 'sprouting', 'blooming', 'harvesting']

              return (
                <div className="growth-stage-hero">
                  <div className="growth-stage-main">
                    <div className="stage-icon-large">{current.icon}</div>
                    <div className="stage-content">
                      <div className="stage-label">Growth Stage</div>
                      <div className="stage-name-large">
                        {current.name}
                      </div>
                      <div className="stage-description-large">
                        {current.description}
                      </div>
                    </div>
                  </div>
                  <div className="growth-progress-section">
                    <div className="progress-track-large">
                      {stages.map((stage, idx) => {
                        const info = stageInfo[stage]
                        const currentIndex = stageInfo[currentStage]?.index || 0
                        const isCompleted = info.index < currentIndex
                        const isCurrent = stage === currentStage
                        return (
                          <div key={stage}>
                            {idx > 0 && <div className={`progress-line ${isCompleted || isCurrent ? 'completed' : ''}`}></div>}
                            <div className={`progress-stage ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                              <div className="stage-icon">{info.icon}</div>
                              <div className="progress-dot"></div>
                              <span>{info.name}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Current Services */}
            <div className="current-services-list">
              <div className="current-services-list-header">
                <h3>Current Services</h3>
                <span>Monthly Investment</span>
              </div>
              <div className="current-service-row">
                <div className="current-service-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <div className="current-service-info">
                  <div className="current-service-name">Seedling SEO Plan</div>
                  <div className="current-service-desc">Foundational on-page SEO &amp; performance tracking</div>
                </div>
                <div className="current-service-price">
                  <strong>$599</strong><br />
                  <span>/month</span>
                </div>
              </div>
              <div className="current-service-row">
                <div className="current-service-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                </div>
                <div className="current-service-info">
                  <div className="current-service-name">Google Ads Management</div>
                  <div className="current-service-desc">Campaign management &amp; optimization</div>
                </div>
                <div className="current-service-price">
                  <strong>$499</strong><br />
                  <span>/month</span>
                </div>
              </div>
              <div className="current-service-row">
                <div className="current-service-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <div className="current-service-info">
                  <div className="current-service-name">Google Business Profile Management</div>
                  <div className="current-service-desc">Local search optimization &amp; posting</div>
                </div>
                <div className="current-service-price">
                  <strong>$199</strong><br />
                  <span>/month</span>
                </div>
              </div>
              <div className="current-service-row">
                <div className="current-service-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </div>
                <div className="current-service-info">
                  <div className="current-service-name">Analytics &amp; Tracking Setup</div>
                  <div className="current-service-desc">Performance monitoring &amp; reporting</div>
                </div>
                <div className="current-service-price">
                  <strong>$99</strong><br />
                  <span>/month</span>
                </div>
              </div>
              <div className="current-services-total">
                <div className="current-services-total-label">
                  Total Monthly Investment
                  <span>4 active services</span>
                </div>
                <div className="current-services-total-value">
                  $1,396<span> per month</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="edit-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal-content edit-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </div>
                <div>
                  <h2>Edit Client</h2>
                  <p className="modal-subtitle">Update client information and settings</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="modal-tabs">
              <button
                className={`modal-tab ${editModalTab === 'general' ? 'active' : ''}`}
                onClick={() => setEditModalTab('general')}
              >
                General
              </button>
              <button
                className={`modal-tab ${editModalTab === 'integrations' ? 'active' : ''}`}
                onClick={() => setEditModalTab('integrations')}
              >
                Integrations
              </button>
              <button
                className={`modal-tab ${editModalTab === 'billing' ? 'active' : ''}`}
                onClick={() => setEditModalTab('billing')}
              >
                Billing
              </button>
              <button
                className={`modal-tab ${editModalTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setEditModalTab('notifications')}
              >
                Notifications
              </button>
            </div>

            <div className="modal-body">
              {editModalTab === 'general' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="companyName">Company Name</label>
                      <input
                        type="text"
                        id="companyName"
                        className="form-control"
                        value={editFormData.companyName}
                        onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="status">Status</label>
                      <select
                        id="status"
                        className="form-control"
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as 'active' | 'paused' | 'onboarding' })}
                      >
                        <option value="active">Active</option>
                        <option value="onboarding">Onboarding</option>
                        <option value="paused">Paused</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="primaryContact">Primary Contact Name</label>
                      <input
                        type="text"
                        id="primaryContact"
                        className="form-control"
                        value={editFormData.primaryContact}
                        onChange={(e) => setEditFormData({ ...editFormData, primaryContact: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        className="form-control"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        className="form-control"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="website">Website</label>
                      <input
                        type="url"
                        id="website"
                        className="form-control"
                        value={editFormData.website}
                        onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Growth Stage</label>
                    <div className="growth-stage-options">
                      {(['seedling', 'sprouting', 'blooming', 'harvesting'] as const).map((stage) => (
                        <button
                          key={stage}
                          type="button"
                          className={`growth-stage-btn ${editFormData.growthStage === stage ? 'active' : ''}`}
                          onClick={() => setEditFormData({ ...editFormData, growthStage: stage })}
                        >
                          {stage.charAt(0).toUpperCase() + stage.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Avatar Color</label>
                    <div className="color-picker-grid">
                      {avatarColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`color-picker-option ${editFormData.avatarColor === color.value ? 'selected' : ''}`}
                          style={{ background: color.value }}
                          onClick={() => setEditFormData({ ...editFormData, avatarColor: color.value })}
                          title={color.name}
                        >
                          {editFormData.avatarColor === color.value && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="internalNotes">Internal Notes</label>
                    <textarea
                      id="internalNotes"
                      className="form-control"
                      rows={4}
                      value={editFormData.internalNotes}
                      onChange={(e) => setEditFormData({ ...editFormData, internalNotes: e.target.value })}
                    />
                  </div>
                </>
              )}

              {editModalTab === 'integrations' && (
                <>
                  <p className="form-section-desc" style={{ marginBottom: '1.5rem', color: '#6B7280' }}>
                    Connect external services to enable features like Results dashboard and Activity feed.
                  </p>

                  <div className="form-group">
                    <label htmlFor="agencyDashboardShareKey">Agency Dashboard Share Key</label>
                    <input
                      type="text"
                      id="agencyDashboardShareKey"
                      className="form-control"
                      placeholder="e.g., MjI5MTgtfC00NDUyMC18LXJPN0xveFpTQmM="
                      value={editFormData.agencyDashboardShareKey}
                      onChange={(e) => setEditFormData({ ...editFormData, agencyDashboardShareKey: e.target.value })}
                    />
                    <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
                      From agencydashboard.io campaign share link. Enables the Results tab.
                    </small>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="basecampId">Basecamp Client ID</label>
                      <input
                        type="text"
                        id="basecampId"
                        className="form-control"
                        placeholder="e.g., 12345678"
                        value={editFormData.basecampId}
                        onChange={(e) => setEditFormData({ ...editFormData, basecampId: e.target.value })}
                      />
                      <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
                        Enables the Activity tab.
                      </small>
                    </div>
                    <div className="form-group">
                      <label htmlFor="basecampProjectId">Basecamp Project ID</label>
                      <input
                        type="text"
                        id="basecampProjectId"
                        className="form-control"
                        placeholder="e.g., 87654321"
                        value={editFormData.basecampProjectId}
                        onChange={(e) => setEditFormData({ ...editFormData, basecampProjectId: e.target.value })}
                      />
                      <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
                        For content service integration.
                      </small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="landsitePreviewUrl">Landingsite Preview URL</label>
                    <input
                      type="url"
                      id="landsitePreviewUrl"
                      className="form-control"
                      placeholder="e.g., https://app.landingsite.ai/website-preview?id=..."
                      value={editFormData.landsitePreviewUrl}
                      onChange={(e) => setEditFormData({ ...editFormData, landsitePreviewUrl: e.target.value })}
                    />
                    <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
                      For Seedling Site (AI-built website) preview in Website tab.
                    </small>
                  </div>
                </>
              )}

              {editModalTab === 'billing' && (
                <>
                  <div className="form-group">
                    <label htmlFor="billingEmail">Billing Contact Email</label>
                    <input
                      type="email"
                      id="billingEmail"
                      className="form-control"
                      value={editFormData.billingEmail}
                      onChange={(e) => setEditFormData({ ...editFormData, billingEmail: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>
                    <div className="payment-method-display">
                      <div className="payment-method-info">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                          <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                        <span>{editFormData.paymentMethod}</span>
                      </div>
                      <button type="button" className="payment-update-btn">Update</button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="billingCycle">Billing Cycle</label>
                    <select
                      id="billingCycle"
                      className="form-control"
                      value={editFormData.billingCycle}
                      onChange={(e) => setEditFormData({ ...editFormData, billingCycle: e.target.value as 'monthly' | 'quarterly' | 'annually' })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>
                </>
              )}

              {editModalTab === 'notifications' && (
                <div className="notification-toggles">
                  <div className="notification-toggle-item">
                    <div className="notification-toggle-info">
                      <div className="notification-toggle-title">Monthly Reports</div>
                      <div className="notification-toggle-desc">Send automated monthly performance reports</div>
                    </div>
                    <div className="edit-toggle-wrap">
                      <input
                        type="checkbox"
                        checked={editFormData.monthlyReports}
                        onChange={(e) => setEditFormData({ ...editFormData, monthlyReports: e.target.checked })}
                      />
                      <span className="edit-toggle-track"></span>
                    </div>
                  </div>

                  <div className="notification-toggle-item">
                    <div className="notification-toggle-info">
                      <div className="notification-toggle-title">Result Alerts</div>
                      <div className="notification-toggle-desc">Notify when significant milestones are achieved</div>
                    </div>
                    <div className="edit-toggle-wrap">
                      <input
                        type="checkbox"
                        checked={editFormData.resultAlerts}
                        onChange={(e) => setEditFormData({ ...editFormData, resultAlerts: e.target.checked })}
                      />
                      <span className="edit-toggle-track"></span>
                    </div>
                  </div>

                  <div className="notification-toggle-item">
                    <div className="notification-toggle-info">
                      <div className="notification-toggle-title">Recommendation Updates</div>
                      <div className="notification-toggle-desc">Notify when new recommendations are available</div>
                    </div>
                    <div className="edit-toggle-wrap">
                      <input
                        type="checkbox"
                        checked={editFormData.recommendationUpdates}
                        onChange={(e) => setEditFormData({ ...editFormData, recommendationUpdates: e.target.checked })}
                      />
                      <span className="edit-toggle-track"></span>
                    </div>
                  </div>

                  <div className="notification-toggle-item">
                    <div className="notification-toggle-info">
                      <div className="notification-toggle-title">Weekly Digest</div>
                      <div className="notification-toggle-desc">Send weekly summary of activity and results</div>
                    </div>
                    <div className="edit-toggle-wrap">
                      <input
                        type="checkbox"
                        checked={editFormData.weeklyDigest}
                        onChange={(e) => setEditFormData({ ...editFormData, weeklyDigest: e.target.checked })}
                      />
                      <span className="edit-toggle-track"></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveClient} disabled={isSaving}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

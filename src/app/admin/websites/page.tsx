'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

type WebsiteStatus = 'active' | 'development' | 'maintenance'
type WebsiteType = 'seed-site' | 'sprout' | 'bloom' | 'harvest'
type CarePlan = 'website-care' | 'wordpress-care' | 'none'

interface Website {
  id: string
  clientId: string
  clientName: string
  domain: string
  type: WebsiteType
  carePlan: CarePlan
  status: WebsiteStatus
  launchDate: string | null
  hosting: string
  pendingRequests: number
  lastUpdated: string
}

// Mock data
const websites: Website[] = [
  {
    id: '1',
    clientId: 'tc-clinical',
    clientName: 'TC Clinical Services',
    domain: 'tc-clinicalservices.com',
    type: 'seed-site',
    carePlan: 'website-care',
    status: 'active',
    launchDate: 'Dec 30, 2025',
    hosting: 'Landingsite.ai',
    pendingRequests: 1,
    lastUpdated: 'Jan 3, 2026',
  },
  {
    id: '2',
    clientId: 'austin-dental',
    clientName: 'Austin Family Dental',
    domain: 'austinfamilydental.com',
    type: 'harvest',
    carePlan: 'wordpress-care',
    status: 'active',
    launchDate: 'Nov 15, 2025',
    hosting: 'WPEngine',
    pendingRequests: 0,
    lastUpdated: 'Jan 2, 2026',
  },
  {
    id: '3',
    clientId: 'sa-plumbing',
    clientName: 'SA Plumbing Pros',
    domain: 'saplumbingpros.com',
    type: 'sprout',
    carePlan: 'wordpress-care',
    status: 'development',
    launchDate: null,
    hosting: 'WPEngine',
    pendingRequests: 3,
    lastUpdated: 'Jan 4, 2026',
  },
  {
    id: '4',
    clientId: 'hill-country',
    clientName: 'Hill Country Realty',
    domain: 'hillcountryrealty.com',
    type: 'bloom',
    carePlan: 'website-care',
    status: 'active',
    launchDate: 'Oct 20, 2025',
    hosting: 'WPEngine',
    pendingRequests: 2,
    lastUpdated: 'Dec 28, 2025',
  },
]

const getTypeLabel = (type: WebsiteType) => {
  switch (type) {
    case 'seed-site': return 'Seed Site'
    case 'sprout': return 'Sprout'
    case 'bloom': return 'Bloom'
    case 'harvest': return 'Harvest'
  }
}

const getCarePlanLabel = (carePlan: CarePlan) => {
  switch (carePlan) {
    case 'website-care': return 'Website Care'
    case 'wordpress-care': return 'WordPress Care'
    case 'none': return 'No Care Plan'
  }
}

export default function WebsitesPage() {
  const { user, hasNotifications } = useUserProfile()
  const [statusFilter, setStatusFilter] = useState<WebsiteStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<WebsiteType | 'all'>('all')

  const filteredWebsites = websites.filter(website => {
    if (statusFilter !== 'all' && website.status !== statusFilter) return false
    if (typeFilter !== 'all' && website.type !== typeFilter) return false
    return true
  })

  const totalPendingRequests = websites.reduce((sum, w) => sum + w.pendingRequests, 0)

  return (
    <>
      <AdminHeader
        title="Websites"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Stats Overview */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#E0E7FF', color: '#4F46E5' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{websites.length}</span>
              <span className="stat-label">Total Websites</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{websites.filter(w => w.status === 'active').length}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{websites.filter(w => w.status === 'development').length}</span>
              <span className="stat-label">In Development</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{totalPendingRequests}</span>
              <span className="stat-label">Pending Requests</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="content-filters">
          <div className="filter-group">
            <label htmlFor="statusFilter">Status</label>
            <select
              id="statusFilter"
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as WebsiteStatus | 'all')}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="development">In Development</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="typeFilter">Type</label>
            <select
              id="typeFilter"
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as WebsiteType | 'all')}
            >
              <option value="all">All Types</option>
              <option value="seed-site">Seed Site</option>
              <option value="sprout">Sprout</option>
              <option value="bloom">Bloom</option>
              <option value="harvest">Harvest</option>
            </select>
          </div>
        </div>

        {/* Websites Table */}
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Website</th>
                <th>Client</th>
                <th>Type</th>
                <th>Care Plan</th>
                <th>Status</th>
                <th>Pending Requests</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredWebsites.map((website) => (
                <tr key={website.id}>
                  <td>
                    <div className="website-domain-cell">
                      <a href={`https://${website.domain}`} target="_blank" rel="noopener noreferrer" className="domain-link">
                        {website.domain}
                      </a>
                      <span className="hosting-badge">{website.hosting}</span>
                    </div>
                  </td>
                  <td>
                    <Link href={`/admin/clients/${website.clientId}`} className="client-link">
                      {website.clientName}
                    </Link>
                  </td>
                  <td>
                    <span className={`type-badge ${website.type}`}>
                      {getTypeLabel(website.type)}
                    </span>
                  </td>
                  <td>{getCarePlanLabel(website.carePlan)}</td>
                  <td>
                    <span className={`status-pill ${website.status}`}>
                      {website.status === 'active' ? 'Active' :
                       website.status === 'development' ? 'Development' : 'Maintenance'}
                    </span>
                  </td>
                  <td>
                    {website.pendingRequests > 0 ? (
                      <span className="pending-requests-badge">
                        {website.pendingRequests}
                      </span>
                    ) : (
                      <span className="no-requests">None</span>
                    )}
                  </td>
                  <td>{website.lastUpdated}</td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/admin/clients/${website.clientId}?tab=website`} className="btn btn-sm btn-secondary">
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

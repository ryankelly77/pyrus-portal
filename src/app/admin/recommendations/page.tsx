'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AdminHeader } from '@/components/layout'

type RecommendationStatus = 'open' | 'approved'

interface User {
  id: string
  name: string
  initials: string
  email: string
  inviteSent: { date: string; time: string }
  opened: { date: string; time: string } | null
  registered: { date: string; time: string } | null
}

interface Recommendation {
  id: string
  client: string
  clientId: string
  initials: string
  avatarColor: string
  clientStatus: 'active' | 'prospect' | 'paused'
  recommendationStatus: RecommendationStatus
  sentDate: { date: string; time: string }
  users: User[]
}

const recommendations: Recommendation[] = [
  {
    id: '1',
    client: 'TC Clinical Services',
    clientId: 'tc-clinical',
    initials: 'TC',
    avatarColor: 'linear-gradient(135deg, #B57841 0%, #C4895A 100%)',
    clientStatus: 'active',
    recommendationStatus: 'approved',
    sentDate: { date: 'Dec 28, 2025', time: '2:34 PM' },
    users: [
      {
        id: 'u1',
        name: 'Jon De La Garza',
        initials: 'JD',
        email: 'dlg.mdservices@gmail.com',
        inviteSent: { date: 'Dec 28, 2025', time: '2:34 PM' },
        opened: { date: 'Dec 29, 2025', time: '10:15 AM' },
        registered: { date: 'Dec 30, 2025', time: '3:22 PM' },
      },
      {
        id: 'u2',
        name: 'Kevin Martinez',
        initials: 'KM',
        email: 'kevin@tc-clinicalservices.com',
        inviteSent: { date: 'Dec 28, 2025', time: '2:34 PM' },
        opened: { date: 'Dec 29, 2025', time: '11:42 AM' },
        registered: { date: 'Dec 30, 2025', time: '9:15 AM' },
      },
    ],
  },
  {
    id: '2',
    client: 'Raptor Vending',
    clientId: 'raptor-vending',
    initials: 'RV',
    avatarColor: '#2563EB',
    clientStatus: 'prospect',
    recommendationStatus: 'open',
    sentDate: { date: 'Dec 20, 2025', time: '11:05 AM' },
    users: [
      {
        id: 'u3',
        name: 'Mike Rodriguez',
        initials: 'MR',
        email: 'mike@raptorvending.com',
        inviteSent: { date: 'Dec 20, 2025', time: '11:05 AM' },
        opened: { date: 'Dec 20, 2025', time: '2:30 PM' },
        registered: null,
      },
      {
        id: 'u4',
        name: 'Sarah Rodriguez',
        initials: 'SR',
        email: 'sarah@raptorvending.com',
        inviteSent: { date: 'Dec 20, 2025', time: '11:05 AM' },
        opened: null,
        registered: null,
      },
    ],
  },
  {
    id: '3',
    client: 'Raptor Services',
    clientId: 'raptor-services',
    initials: 'RS',
    avatarColor: '#7C3AED',
    clientStatus: 'prospect',
    recommendationStatus: 'open',
    sentDate: { date: 'Dec 15, 2025', time: '9:45 AM' },
    users: [
      {
        id: 'u5',
        name: 'James Thompson',
        initials: 'JT',
        email: 'james@raptorservices.com',
        inviteSent: { date: 'Dec 15, 2025', time: '9:45 AM' },
        opened: null,
        registered: null,
      },
    ],
  },
  {
    id: '4',
    client: 'Gohfr',
    clientId: 'gohfr',
    initials: 'GO',
    avatarColor: '#0B7277',
    clientStatus: 'active',
    recommendationStatus: 'approved',
    sentDate: { date: 'Dec 10, 2025', time: '4:20 PM' },
    users: [
      {
        id: 'u6',
        name: 'Alex Brown',
        initials: 'AB',
        email: 'alex@gohfr.com',
        inviteSent: { date: 'Dec 10, 2025', time: '4:20 PM' },
        opened: { date: 'Dec 11, 2025', time: '9:00 AM' },
        registered: { date: 'Dec 12, 2025', time: '11:45 AM' },
      },
    ],
  },
  {
    id: '5',
    client: 'Espronceda Law',
    clientId: 'espronceda-law',
    initials: 'EL',
    avatarColor: '#DC2626',
    clientStatus: 'active',
    recommendationStatus: 'open',
    sentDate: { date: 'Dec 5, 2025', time: '1:15 PM' },
    users: [
      {
        id: 'u7',
        name: 'Jennifer Espronceda',
        initials: 'JE',
        email: 'jennifer@esproncedalaw.com',
        inviteSent: { date: 'Dec 5, 2025', time: '1:15 PM' },
        opened: { date: 'Dec 5, 2025', time: '3:40 PM' },
        registered: { date: 'Dec 6, 2025', time: '10:30 AM' },
      },
    ],
  },
  {
    id: '6',
    client: 'American Fence & Deck',
    clientId: 'american-fence',
    initials: 'AF',
    avatarColor: '#6B7280',
    clientStatus: 'paused',
    recommendationStatus: 'approved',
    sentDate: { date: 'Nov 28, 2025', time: '10:00 AM' },
    users: [
      {
        id: 'u8',
        name: 'Robert Johnson',
        initials: 'RJ',
        email: 'robert@amfencedeck.com',
        inviteSent: { date: 'Nov 28, 2025', time: '10:00 AM' },
        opened: { date: 'Nov 28, 2025', time: '11:22 AM' },
        registered: { date: 'Nov 29, 2025', time: '2:15 PM' },
      },
      {
        id: 'u9',
        name: 'Linda Johnson',
        initials: 'LJ',
        email: 'linda@amfencedeck.com',
        inviteSent: { date: 'Nov 28, 2025', time: '10:00 AM' },
        opened: { date: 'Nov 28, 2025', time: '3:45 PM' },
        registered: { date: 'Nov 30, 2025', time: '9:30 AM' },
      },
    ],
  },
]

const clientStatusBadgeClass: Record<Recommendation['clientStatus'], string> = {
  active: 'active',
  prospect: 'prospect',
  paused: 'paused',
}

export default function RecommendationsPage() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') as 'all' | RecommendationStatus | null

  const [expandedIds, setExpandedIds] = useState<string[]>(['1'])
  const [statusFilter, setStatusFilter] = useState<'all' | RecommendationStatus>(initialStatus || 'all')

  // Update filter when URL changes
  useEffect(() => {
    const urlStatus = searchParams.get('status') as 'all' | RecommendationStatus | null
    if (urlStatus === 'open' || urlStatus === 'approved') {
      setStatusFilter(urlStatus)
    }
  }, [searchParams])

  const filteredRecommendations = statusFilter === 'all'
    ? recommendations
    : recommendations.filter(rec => rec.recommendationStatus === statusFilter)

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleResend = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation()
    console.log('Resend invite to user:', userId)
  }

  return (
    <>
      <AdminHeader
        title="Recommendations"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        <div className="page-header">
          <div className="page-header-content">
            <p>Track recommendation invites sent to clients and their engagement</p>
          </div>
          <Link href="/admin/recommendation-builder/new" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Recommendation
          </Link>
        </div>

        {/* Status Filter */}
        <div className="clients-toolbar">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${statusFilter === 'open' ? 'active' : ''}`}
              onClick={() => setStatusFilter('open')}
            >
              Open
            </button>
            <button
              className={`filter-btn ${statusFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('approved')}
            >
              Approved
            </button>
          </div>
        </div>

        <div className="expandable-list">
          {filteredRecommendations.map((rec) => {
            const isExpanded = expandedIds.includes(rec.id)
            return (
              <div key={rec.id} className={`expandable-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="expandable-header" onClick={() => toggleExpand(rec.id)}>
                  <div className="expand-toggle">
                    <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                  <div className="client-cell">
                    <div className="client-avatar-sm" style={{ background: rec.avatarColor }}>
                      {rec.initials}
                    </div>
                    <div className="client-info-stack">
                      <Link
                        href={`/admin/clients/${rec.clientId}`}
                        className="client-name client-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rec.client}
                      </Link>
                      <span className="client-user-count">
                        {rec.users.length} user{rec.users.length !== 1 ? 's' : ''} invited
                      </span>
                    </div>
                  </div>
                  <div className="header-status">
                    <span className={`status-badge ${rec.recommendationStatus}`}>
                      {rec.recommendationStatus.charAt(0).toUpperCase() + rec.recommendationStatus.slice(1)}
                    </span>
                  </div>
                  <div className="header-meta">
                    <div className="date-cell">
                      <span className="date">{rec.sentDate.date}</span>
                      <span className="time">{rec.sentDate.time}</span>
                    </div>
                  </div>
                  <div className="header-actions">
                    <Link
                      href={`/admin/recommendation-builder/${rec.clientId}`}
                      className="btn btn-sm btn-secondary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit
                    </Link>
                  </div>
                </div>
                <div className="expandable-content">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Invite Sent</th>
                        <th>Opened</th>
                        <th>Registered</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rec.users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar-xs" style={{ background: rec.avatarColor }}>
                                {user.initials}
                              </div>
                              <div className="user-info">
                                <span className="user-name">{user.name}</span>
                                <span className="user-email">{user.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="date-cell">
                              <span className="date">{user.inviteSent.date}</span>
                              <span className="time">{user.inviteSent.time}</span>
                            </div>
                          </td>
                          <td>
                            {user.opened ? (
                              <div className="status-indicator success">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <div className="date-cell">
                                  <span className="date">{user.opened.date}</span>
                                  <span className="time">{user.opened.time}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="status-indicator not-opened">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                                <span>Not opened</span>
                              </div>
                            )}
                          </td>
                          <td>
                            {user.registered ? (
                              <div className="status-indicator success">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <div className="date-cell">
                                  <span className="date">{user.registered.date}</span>
                                  <span className="time">{user.registered.time}</span>
                                </div>
                              </div>
                            ) : user.opened ? (
                              <div className="status-indicator pending">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span>Pending</span>
                              </div>
                            ) : (
                              <div className="status-indicator not-opened">
                                <span>—</span>
                              </div>
                            )}
                          </td>
                          <td>
                            {user.registered ? (
                              <span className="status-pill registered">Registered</span>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline resend-btn"
                                onClick={(e) => handleResend(e, user.id)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                  <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                Resend
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

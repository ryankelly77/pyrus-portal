'use client'

import Link from 'next/link'
import { AdminHeader } from '@/components/layout'

interface Activity {
  id: string
  type: 'content' | 'client' | 'revenue' | 'recommendation'
  title: string
  description: string
  time: string
  icon: 'document' | 'user' | 'dollar' | 'star'
}

interface Transaction {
  id: string
  client: string
  initials: string
  color: string
  amount: number
  type: 'payment' | 'upgrade' | 'downgrade' | 'refund'
  date: string
}

const recentActivity: Activity[] = [
  { id: '1', type: 'content', title: 'Content Submitted for Review', description: 'DLG Medical Services submitted "Holiday Hours Update"', time: '5 min ago', icon: 'document' },
  { id: '2', type: 'client', title: 'New Client Onboarding', description: 'Gohfr completed their onboarding questionnaire', time: '1 hour ago', icon: 'user' },
  { id: '3', type: 'revenue', title: 'Subscription Upgraded', description: 'Raptor Services upgraded to Enterprise Package (+$400/mo)', time: '2 hours ago', icon: 'dollar' },
  { id: '4', type: 'recommendation', title: 'Recommendation Accepted', description: 'Summit Dental approved SEO Content Package recommendation', time: '3 hours ago', icon: 'star' },
  { id: '5', type: 'content', title: 'Content Published', description: '"Fall Lawn Care Tips" published for Green Valley Landscaping', time: '4 hours ago', icon: 'document' },
  { id: '6', type: 'client', title: 'Client Campaign Paused', description: 'American Fence & Deck paused their campaign', time: '5 hours ago', icon: 'user' },
  { id: '7', type: 'content', title: 'Content Approved', description: 'Peak Performance Gym approved "New Year Fitness Goals" post', time: '6 hours ago', icon: 'document' },
  { id: '8', type: 'revenue', title: 'Payment Received', description: 'TC Clinical Services paid invoice #1247 ($1,299.00)', time: '7 hours ago', icon: 'dollar' },
  { id: '9', type: 'recommendation', title: 'Recommendation Sent', description: 'New growth plan sent to Horizon Real Estate', time: '8 hours ago', icon: 'star' },
  { id: '10', type: 'client', title: 'Client Reactivated', description: 'Coastal Insurance reactivated their campaign', time: '9 hours ago', icon: 'user' },
  { id: '11', type: 'content', title: 'Content Revision Requested', description: 'Sunrise Dental requested changes to blog post', time: '10 hours ago', icon: 'document' },
  { id: '12', type: 'revenue', title: 'New Subscription', description: 'Green Thumb Landscaping started Growth Package ($599/mo)', time: '12 hours ago', icon: 'dollar' },
  { id: '13', type: 'client', title: 'Onboarding Started', description: 'New client "Metro Electric" began onboarding', time: '1 day ago', icon: 'user' },
  { id: '14', type: 'content', title: 'Content Scheduled', description: '3 posts scheduled for Raptor Vending next week', time: '1 day ago', icon: 'document' },
  { id: '15', type: 'recommendation', title: 'Recommendation Declined', description: 'Espronceda Law declined Social Media add-on', time: '1 day ago', icon: 'star' },
  { id: '16', type: 'revenue', title: 'Payment Failed', description: 'Payment retry scheduled for Metro Plumbing', time: '1 day ago', icon: 'dollar' },
  { id: '17', type: 'content', title: 'Content Draft Saved', description: 'New blog draft for Peak Performance Gym', time: '2 days ago', icon: 'document' },
  { id: '18', type: 'client', title: 'Contract Renewed', description: 'TC Clinical Services renewed for 12 months', time: '2 days ago', icon: 'user' },
  { id: '19', type: 'recommendation', title: 'Recommendation Created', description: 'New upsell opportunity identified for Raptor Services', time: '2 days ago', icon: 'star' },
  { id: '20', type: 'revenue', title: 'Refund Processed', description: 'Partial refund issued to former client', time: '3 days ago', icon: 'dollar' },
]

const recentTransactions: Transaction[] = [
  { id: '1', client: 'TC Clinical Services', initials: 'TC', color: '#885430', amount: 1299, type: 'payment', date: 'Today' },
  { id: '2', client: 'Raptor Services', initials: 'RS', color: '#7C3AED', amount: 400, type: 'upgrade', date: 'Today' },
  { id: '3', client: 'Green Thumb Landscaping', initials: 'GT', color: '#16A34A', amount: 599, type: 'payment', date: 'Yesterday' },
  { id: '4', client: 'Raptor Vending', initials: 'RV', color: '#2563EB', amount: 899, type: 'payment', date: 'Yesterday' },
  { id: '5', client: 'Gohfr', initials: 'GO', color: '#0B7277', amount: 599, type: 'payment', date: 'Jan 3' },
  { id: '6', client: 'Peak Performance Gym', initials: 'PP', color: '#EA580C', amount: 799, type: 'payment', date: 'Jan 2' },
  { id: '7', client: 'Sunrise Dental', initials: 'SD', color: '#0891B2', amount: 699, type: 'payment', date: 'Jan 2' },
  { id: '8', client: 'Horizon Real Estate', initials: 'HR', color: '#9333EA', amount: -100, type: 'downgrade', date: 'Jan 1' },
]

export default function SuperAdminDashboard() {
  const stats = {
    mrr: 7892,
    mrrChange: 914,
    activeClients: 10,
    pendingContent: 3,
    pendingRecommendations: 5,
  }

  const getActivityIcon = (icon: Activity['icon']) => {
    switch (icon) {
      case 'document':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        )
      case 'user':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        )
      case 'dollar':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        )
      case 'star':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        )
    }
  }

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'content': return { bg: '#DBEAFE', color: '#2563EB' }
      case 'client': return { bg: '#D1FAE5', color: '#059669' }
      case 'revenue': return { bg: '#FEF3C7', color: '#D97706' }
      case 'recommendation': return { bg: '#EDE9FE', color: '#7C3AED' }
    }
  }

  return (
    <>
      <AdminHeader
        title="Dashboard"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        {/* Top Row: Action + Metrics */}
        <div className="sa-dash-metrics-row">
          <a href="/admin/recommendation-builder/new" className="sa-dash-action-card">
            <div className="sa-dash-action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <span className="sa-dash-action-text">New<br />Recommendation</span>
          </a>
          <Link href="/admin/clients" className="sa-dash-metric-card clickable">
            <div className="sa-dash-metric-icon" style={{ background: '#D1FAE5', color: '#059669' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <span className="sa-dash-metric-value">{stats.activeClients}</span>
            <span className="sa-dash-metric-label">Active Clients</span>
          </Link>
          <Link href="/admin/content?status=pending" className="sa-dash-metric-card clickable">
            <div className="sa-dash-metric-icon" style={{ background: '#DBEAFE', color: '#2563EB' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <span className="sa-dash-metric-value">{stats.pendingContent}</span>
            <span className="sa-dash-metric-label">Pending Content</span>
          </Link>
          <Link href="/admin/recommendations?status=open" className="sa-dash-metric-card clickable">
            <div className="sa-dash-metric-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <span className="sa-dash-metric-value">{stats.pendingRecommendations}</span>
            <span className="sa-dash-metric-label">Open Recommendations</span>
          </Link>
          <div className="sa-dash-metric-card">
            <div className="sa-dash-metric-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
            </div>
            <span className="sa-dash-metric-value">+12%</span>
            <span className="sa-dash-metric-label">Avg. Growth</span>
          </div>
        </div>

        {/* Three Column Layout */}
        <div className="sa-dash-grid">
          {/* Recent Activity */}
          <div className="sa-dash-card">
            <div className="sa-dash-card-header">
              <h3>Recent Activity</h3>
              <Link href="/admin/notifications" className="btn btn-sm btn-secondary">View All</Link>
            </div>
            <div className="sa-dash-activity-stream">
              {recentActivity.map((activity) => {
                const colorStyle = getActivityColor(activity.type)
                return (
                  <div key={activity.id} className="sa-dash-activity-item">
                    <div className="sa-dash-activity-icon" style={{ background: colorStyle.bg, color: colorStyle.color }}>
                      {getActivityIcon(activity.icon)}
                    </div>
                    <div className="sa-dash-activity-content">
                      <p className="sa-dash-activity-title">{activity.title}</p>
                      <p className="sa-dash-activity-desc">{activity.description}</p>
                    </div>
                    <span className="sa-dash-activity-time">{activity.time}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* MRR Chart */}
          <div className="sa-dash-card">
            <div className="sa-dash-card-header">
              <div>
                <h3>Monthly Recurring Revenue</h3>
                <div className="sa-dash-mrr-value">
                  <span className="sa-dash-mrr-amount">${stats.mrr.toLocaleString()}</span>
                  <span className="sa-dash-mrr-change positive">+${stats.mrrChange.toLocaleString()}</span>
                </div>
              </div>
              <Link href="/admin/revenue" className="btn btn-sm btn-secondary">Details</Link>
            </div>
            <div className="sa-dash-chart">
              <svg viewBox="0 0 400 220" className="sa-dash-chart-svg">
                {/* Grid lines */}
                <line x1="30" y1="180" x2="380" y2="180" stroke="#E5E7EB" strokeWidth="1" />
                <line x1="30" y1="140" x2="380" y2="140" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4" />
                <line x1="30" y1="100" x2="380" y2="100" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4" />
                <line x1="30" y1="60" x2="380" y2="60" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4" />
                <line x1="30" y1="20" x2="380" y2="20" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4" />

                {/* Area fill */}
                <path
                  d="M30,160 L80,152 L130,140 L180,125 L230,110 L280,90 L330,65 L380,35 L380,180 L30,180 Z"
                  fill="url(#mrrGradient)"
                />

                {/* Line */}
                <polyline
                  points="30,160 80,152 130,140 180,125 230,110 280,90 330,65 380,35"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* End dot */}
                <circle cx="380" cy="35" r="5" fill="#059669" />

                {/* Gradient definition */}
                <defs>
                  <linearGradient id="mrrGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* X-axis Labels */}
                <text x="30" y="198" fill="#9CA3AF" fontSize="11">Jun</text>
                <text x="80" y="198" fill="#9CA3AF" fontSize="11">Jul</text>
                <text x="130" y="198" fill="#9CA3AF" fontSize="11">Aug</text>
                <text x="180" y="198" fill="#9CA3AF" fontSize="11">Sep</text>
                <text x="230" y="198" fill="#9CA3AF" fontSize="11">Oct</text>
                <text x="280" y="198" fill="#9CA3AF" fontSize="11">Nov</text>
                <text x="330" y="198" fill="#9CA3AF" fontSize="11">Dec</text>
                <text x="370" y="198" fill="#9CA3AF" fontSize="11">Jan</text>
              </svg>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="sa-dash-card">
            <div className="sa-dash-card-header">
              <h3>Recent Transactions</h3>
              <Link href="/admin/revenue" className="btn btn-sm btn-secondary">View All</Link>
            </div>
            <div className="sa-dash-transactions-list">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="sa-dash-tx-item">
                  <div className="sa-dash-tx-client">
                    <div className="sa-dash-tx-avatar" style={{ background: tx.color }}>
                      {tx.initials}
                    </div>
                    <div className="sa-dash-tx-info">
                      <span className="sa-dash-tx-name">{tx.client}</span>
                      <span className="sa-dash-tx-date">{tx.date}</span>
                    </div>
                  </div>
                  <div className={`sa-dash-tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

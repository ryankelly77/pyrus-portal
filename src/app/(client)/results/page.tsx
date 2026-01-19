'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'
import { usePageView } from '@/hooks/usePageView'
import { ResultsView } from '@/components/client-views'

const DEMO_CLIENT_ID = '00000000-0000-0000-0000-000000000001'

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading } = useClientData(viewingAs)
  usePageView({ page: '/results', pageName: 'Results' })

  const isDemo = viewingAs === DEMO_CLIENT_ID
  const demoState = searchParams.get('demoState')

  // Check if client is pending (prospect only) or doesn't have results data yet
  const isPending = isDemo
    ? demoState === 'locked'
    : client.status === 'pending'
  const showComingSoon = isDemo
    ? demoState === 'coming-soon'
    : !isPending && !client.access.hasResults

  // Show loading state while client data is being fetched
  if (loading) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Results</h1>
          </div>
        </div>
        <div className="client-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <div className="spinner" style={{ width: 40, height: 40 }}></div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <h1>Results</h1>
        </div>
        <div className="client-top-header-right">
          <Link href="/notifications" className="btn-icon has-notification">
            <span className="notification-badge"></span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </Link>
          <Link href="/settings" className="user-menu-link">
            <div className="user-avatar-small">
              <span>{client.initials}</span>
            </div>
            <span className="user-name">{client.contactName}</span>
          </Link>
        </div>
      </div>

      <div className="client-content">
        {/* Pending client placeholder */}
        {isPending ? (
          <div className="locked-page-placeholder">
            <div className="locked-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h2>Results Available After Purchase</h2>
            <p>Once you select a plan and become an active client, you&apos;ll see your marketing performance metrics, keyword rankings, lead tracking, and more here.</p>
            <Link href={viewingAs ? `/recommendations?viewingAs=${viewingAs}` : '/recommendations'} className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              View Your Proposal
            </Link>
          </div>
        ) : showComingSoon ? (
          <div className="coming-soon-placeholder">
            <div className="coming-soon-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <h2>Results Coming Soon</h2>
            <p>We&apos;re setting up your analytics dashboard. Your marketing performance metrics, keyword rankings, and lead tracking will appear here once your campaigns are active.</p>
            <div className="coming-soon-timeline">
              <div className="timeline-item">
                <div className="timeline-dot active"></div>
                <span>Account setup complete</span>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot pending"></div>
                <span>Campaign configuration in progress</span>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot pending"></div>
                <span>Analytics dashboard connection</span>
              </div>
            </div>
          </div>
        ) : (
          /* Active Results - use shared ResultsView component */
          // TODO: Pre-existing type error - fix in P2
          <ResultsView clientId={client.id} isDemo={isDemo} proDashboardUrl={client.agencyDashboardKey ?? undefined} />
        )}
      </div>
    </>
  )
}

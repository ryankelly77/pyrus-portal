'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type SectionType,
  type SearchVisibilityData,
  type OrganicTrafficData,
  type KeywordRankingsData,
  type KeywordGrowthData,
  type LinkBuildingData,
  type PaidSearchData,
  type PaidSocialData,
  type LocalServiceAdsData,
  type OrganicSocialData,
  type LeadTrackingData,
  type ReviewManagementData,
  type ContentWritingData,
  type AiVisibilityData,
  type EmailSmsData,
  type LocalSeoData,
  type TechnicalAuditData,
  type WorkCompletedData,
  type ComingNextData,
} from '@/lib/reportSections'

// ============================================================================
// TYPES
// ============================================================================

interface Report {
  id: string
  client_id: string
  title: string
  period_label: string
  period_start: string
  period_end: string
  campaign_month: number
  service_types: string[]
  status: string
  published_at: string | null
  manager_name: string | null
  manager_note?: string | null
  client_name?: string
  sections?: Section[]
  isPreview?: boolean
}

interface Section {
  id: string
  section_type: SectionType
  sort_order: number
  data: Record<string, unknown>
  notes: string | null
}

interface ReportsViewProps {
  clientId: string
  previewReportId?: string | null
  showComingSoon?: boolean
  viewingAs?: string | null
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

function calculateChange(current: number, previous: number): { value: number; formatted: string; trend: 'up' | 'down' | 'neutral' } {
  if (previous === 0) return { value: 0, formatted: '0%', trend: 'neutral' }
  const change = ((current - previous) / previous) * 100
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  const formatted = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
  return { value: change, formatted, trend }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isNewReport(publishedAt: string | null): boolean {
  if (!publishedAt) return false
  const published = new Date(publishedAt)
  const now = new Date()
  const diffDays = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 14
}

function getInitials(name: string | null): string {
  if (!name) return 'PM'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ============================================================================
// ICONS
// ============================================================================

const icons = {
  report: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
      <path d="M12 12l8.5-5" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  impressions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  clicks: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  keywords: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  local: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  technical: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  checkCircle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  rocket: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
  empty: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="12" y2="17" />
    </svg>
  ),
}

// ============================================================================
// SPARKLINE COMPONENT (for KPI cards)
// ============================================================================

function KpiSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null

  const width = 120
  const height = 32
  const padding = 2
  const maxVal = Math.max(...data) * 1.1 || 1

  // Calculate points
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding
    const y = height - padding - ((val / maxVal) * (height - padding * 2))
    return { x, y }
  })

  // Build path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${width - padding},${height} L${padding},${height} Z`

  const lastPoint = points[points.length - 1]
  const gradientId = `spk-${color.replace('#', '')}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '32px', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPoint.x} cy={lastPoint.y} r="2.5" fill={color} />
    </svg>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReportsView({ clientId, previewReportId, showComingSoon = false, viewingAs }: ReportsViewProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Coming Soon state - show when client doesn't have access yet
  if (showComingSoon) {
    return (
      <div className="reports-view">
        <div className="coming-soon-placeholder">
          <div className="coming-soon-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
              <path d="M12 12l8.5-5" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h2>Reports Coming Soon</h2>
          <p>Your campaign manager will publish periodic Harvest Reports here once your campaigns are active. These reports provide a comprehensive overview of your marketing performance.</p>
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
              <span>First report after 30-90 days of data</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fetch reports list
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      const url = viewingAs
        ? `/api/client/reports?viewingAs=${viewingAs}`
        : `/api/client/reports?clientId=${clientId}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch reports')
      const data = await res.json()
      setReports(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [clientId, viewingAs])

  // Fetch single report with sections
  const fetchReport = useCallback(async (reportId: string, isPreview = false) => {
    try {
      setLoadingReport(true)
      let url: string
      if (viewingAs) {
        url = `/api/client/reports/${reportId}?viewingAs=${viewingAs}`
      } else if (isPreview) {
        url = `/api/client/reports/${reportId}?preview=true`
      } else {
        url = `/api/client/reports/${reportId}?clientId=${clientId}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch report')
      const data = await res.json()
      setSelectedReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoadingReport(false)
    }
  }, [clientId, viewingAs])

  useEffect(() => {
    // If preview mode, go directly to that report
    if (previewReportId) {
      fetchReport(previewReportId, true)
    } else {
      fetchReports()
    }
  }, [previewReportId, fetchReports, fetchReport])

  const handleSelectReport = (report: Report) => {
    fetchReport(report.id)
  }

  const handleBack = () => {
    setSelectedReport(null)
    // If we were in preview mode, also fetch the list
    if (previewReportId && reports.length === 0) {
      fetchReports()
    }
  }

  // Loading state
  if (loading && !selectedReport) {
    return (
      <div className="reports-view">
        <div className="reports-loading">
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
        <style jsx>{`
          .reports-view { padding: 24px 0; }
          .reports-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 300px;
          }
        `}</style>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="reports-view">
        <div className="reports-error">
          <p>{error}</p>
          <button onClick={() => { setError(null); fetchReports(); }}>Try Again</button>
        </div>
        <style jsx>{`
          .reports-view { padding: 24px 0; }
          .reports-error {
            text-align: center;
            padding: 48px;
            color: var(--text-secondary);
          }
          .reports-error button {
            margin-top: 16px;
            padding: 8px 16px;
            background: var(--client-green);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
          }
        `}</style>
      </div>
    )
  }

  // Report detail view
  if (selectedReport) {
    return (
      <ReportDetail
        report={selectedReport}
        onBack={handleBack}
        loading={loadingReport}
      />
    )
  }

  // Report list view
  return (
    <div className="reports-view">
      <div className="reports-header">
        <h2>Harvest Reports</h2>
        <p>Periodic campaign rollups published by your team.</p>
      </div>

      {reports.length === 0 ? (
        <div className="reports-empty">
          <div className="reports-empty-icon">{icons.empty}</div>
          <h3>No reports yet</h3>
          <p>Your campaign manager will publish periodic reports here.</p>
        </div>
      ) : (
        <div className="reports-list">
          {reports.map((report) => (
            <button
              key={report.id}
              className="report-card"
              onClick={() => handleSelectReport(report)}
            >
              <div className="report-card-icon">
                {icons.report}
              </div>
              <div className="report-card-content">
                <h3>{report.title}</h3>
                <div className="report-card-meta">
                  <span className="period">{report.period_label}</span>
                  <span className="dot">-</span>
                  <span className="date">Published {formatDate(report.published_at!)}</span>
                  {report.service_types.length > 0 && (
                    <>
                      <span className="dot">-</span>
                      <span className="services">{report.service_types.join(', ')}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="report-card-right">
                {isNewReport(report.published_at) ? (
                  <span className="badge badge-new">New</span>
                ) : (
                  <span className="badge badge-published">Published</span>
                )}
                {icons.chevronRight}
              </div>
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .reports-view {
          padding: 24px 0;
        }
        .reports-header {
          margin-bottom: 24px;
        }
        .reports-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px;
        }
        .reports-header p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
        }
        .reports-empty {
          text-align: center;
          padding: 64px 24px;
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
        }
        .reports-empty-icon {
          color: var(--text-muted);
          margin-bottom: 16px;
        }
        .reports-empty h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 8px;
        }
        .reports-empty p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
        }
        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .report-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 17px 22px;
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          width: 100%;
        }
        .report-card:first-child {
          border-color: var(--client-green);
          box-shadow: 0 0 0 1px var(--client-green);
        }
        .report-card:hover {
          border-color: var(--client-green);
          box-shadow: 0 2px 8px rgba(50, 68, 56, 0.08);
        }
        .report-card-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--client-green-wash);
          color: var(--client-green);
          border-radius: 10px;
          flex-shrink: 0;
        }
        .report-card-content {
          flex: 1;
          min-width: 0;
        }
        .report-card-content h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 2px;
        }
        .report-card-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
          flex-wrap: wrap;
        }
        .report-card-meta .dot {
          color: var(--text-muted);
        }
        .report-card-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        .badge-new {
          background: var(--client-green);
          color: white;
        }
        .badge-published {
          background: #DCFCE7;
          color: #166534;
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// REPORT DETAIL COMPONENT
// ============================================================================

interface ReportDetailProps {
  report: Report
  onBack: () => void
  loading: boolean
}

function ReportDetail({ report, onBack, loading }: ReportDetailProps) {
  if (loading) {
    return (
      <div className="report-detail">
        <div className="report-detail-loading">
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
        <style jsx>{`
          .report-detail { padding: 24px 0; }
          .report-detail-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 300px;
          }
        `}</style>
      </div>
    )
  }

  // Get section data by type
  const getSectionData = <T,>(type: SectionType): T | null => {
    const section = report.sections?.find(s => s.section_type === type)
    return section ? (section.data as unknown as T) : null
  }

  const searchVisibility = getSectionData<SearchVisibilityData>('search_visibility')
  const organicTraffic = getSectionData<OrganicTrafficData>('organic_traffic')
  const keywordRankings = getSectionData<KeywordRankingsData>('keyword_rankings')
  const keywordGrowth = getSectionData<KeywordGrowthData>('keyword_growth')
  const linkBuilding = getSectionData<LinkBuildingData>('link_building')
  const paidSearch = getSectionData<PaidSearchData>('paid_search')
  const paidSocial = getSectionData<PaidSocialData>('paid_social')
  const localServiceAds = getSectionData<LocalServiceAdsData>('local_service_ads')
  const organicSocial = getSectionData<OrganicSocialData>('organic_social')
  const leadTracking = getSectionData<LeadTrackingData>('lead_tracking')
  const reviewManagement = getSectionData<ReviewManagementData>('review_management')
  const contentWriting = getSectionData<ContentWritingData>('content_writing')
  const aiVisibility = getSectionData<AiVisibilityData>('ai_visibility')
  const emailSms = getSectionData<EmailSmsData>('email_sms')
  const localSeo = getSectionData<LocalSeoData>('local_seo')
  const technicalAudit = getSectionData<TechnicalAuditData>('technical_audit')
  const workCompleted = getSectionData<WorkCompletedData>('work_completed')
  const comingNext = getSectionData<ComingNextData>('coming_next')

  // Build KPI cards from available data (v4 requires exactly 5 cards)
  const kpiCards: Array<{
    icon: React.ReactNode
    iconClass: string
    label: string
    value: string
    change: { formatted: string; trend: 'up' | 'down' | 'neutral' }
    previousLabel: string
    sparkData?: number[]
    sparkColor?: string
  }> = []

  if (searchVisibility) {
    // Build sparkline data from monthly history
    const impSparkData = searchVisibility.monthlyHistory?.map(m => m.impressions) || []
    const clkSparkData = searchVisibility.monthlyHistory?.map(m => m.clicks) || []

    kpiCards.push({
      icon: icons.impressions,
      iconClass: 'blue',
      label: 'Search Impressions',
      value: formatNumber(searchVisibility.currentImpressions),
      change: calculateChange(searchVisibility.currentImpressions, searchVisibility.previousImpressions),
      previousLabel: `Was ${formatNumber(searchVisibility.previousImpressions)} last period`,
      sparkData: impSparkData,
      sparkColor: '#2563EB'
    })
    kpiCards.push({
      icon: icons.clicks,
      iconClass: 'green',
      label: 'Clicks from Search',
      value: formatNumber(searchVisibility.currentClicks),
      change: calculateChange(searchVisibility.currentClicks, searchVisibility.previousClicks),
      previousLabel: `Was ${formatNumber(searchVisibility.previousClicks)} last period`,
      sparkData: clkSparkData,
      sparkColor: '#166534'
    })
  }

  if (organicTraffic) {
    const userSparkData = organicTraffic.monthlyHistory?.map(m => m.users) || []
    kpiCards.push({
      icon: icons.users,
      iconClass: 'teal',
      label: 'Organic Users',
      value: formatNumber(organicTraffic.currentUsers),
      change: calculateChange(organicTraffic.currentUsers, organicTraffic.previousUsers),
      previousLabel: `Was ${formatNumber(organicTraffic.previousUsers)} last period`,
      sparkData: userSparkData,
      sparkColor: '#0B7277'
    })
  }

  if (keywordGrowth && keywordGrowth.months.length > 0) {
    const latestMonth = keywordGrowth.months[keywordGrowth.months.length - 1]
    const totalKeywords = latestMonth.top3 + latestMonth.pos4to20 + latestMonth.pos21to50 + latestMonth.pos51to100
    const previousMonth = keywordGrowth.months.length > 1 ? keywordGrowth.months[keywordGrowth.months.length - 2] : null
    const previousTotal = previousMonth
      ? previousMonth.top3 + previousMonth.pos4to20 + previousMonth.pos21to50 + previousMonth.pos51to100
      : totalKeywords
    const kwSparkData = keywordGrowth.months.map(m => m.top3 + m.pos4to20 + m.pos21to50 + m.pos51to100)
    kpiCards.push({
      icon: icons.keywords,
      iconClass: 'purple',
      label: 'Keywords Ranking',
      value: formatNumber(totalKeywords),
      change: calculateChange(totalKeywords, previousTotal),
      previousLabel: `Was ${formatNumber(previousTotal)} last month`,
      sparkData: kwSparkData,
      sparkColor: '#7C3AED'
    })
  }

  // 5th KPI card: Leads Generated (from lead_tracking)
  if (leadTracking) {
    const leadSparkData = leadTracking.monthlyLeads?.map(m => m.leads) || []
    kpiCards.push({
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <polyline points="17 11 19 13 23 9"/>
        </svg>
      ),
      iconClass: 'orange',
      label: 'Leads Generated',
      value: formatNumber(leadTracking.currentLeads),
      change: calculateChange(leadTracking.currentLeads, leadTracking.previousLeads),
      previousLabel: `Was ${formatNumber(leadTracking.previousLeads)} last period`,
      sparkData: leadSparkData,
      sparkColor: '#DE393A'
    })
  }

  return (
    <div className="report-detail">
      {/* Preview Banner */}
      {report.isPreview && (
        <div className="preview-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Preview Mode — This report is not yet published to the client.
        </div>
      )}

      {/* Back Button */}
      <button className="back-button" onClick={onBack}>
        {icons.back}
        All Reports
      </button>

      {/* Report Header Card */}
      <div className="report-header-card">
        <div className="report-header-left">
          <h1>{report.title}</h1>
          <p className="period">{report.period_label}</p>
          <div className="tags">
            {report.service_types.map((type, i) => (
              <span key={i} className="tag">{type}</span>
            ))}
            {report.published_at ? (
              <span className="tag">Published {formatDate(report.published_at)}</span>
            ) : (
              <span className="tag">Draft</span>
            )}
            {report.manager_name && <span className="tag">{report.manager_name}</span>}
          </div>
        </div>
        <div className="report-header-right">
          <div className="campaign-month">{report.campaign_month}</div>
          <div className="campaign-label">months active</div>
        </div>
      </div>

      {/* KPI Summary Row — 5 cards with sparklines (v4 spec) */}
      {kpiCards.length > 0 && (
        <div className="kpi-row">
          {kpiCards.slice(0, 5).map((kpi, i) => (
            <div key={i} className="kpi-card">
              <div className="kpi-top">
                <div className={`kpi-icon ${kpi.iconClass}`}>{kpi.icon}</div>
                <span className={`kpi-chg ${kpi.change.trend}`}>
                  {kpi.change.trend === 'up' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                      <polyline points="18 15 12 9 6 15"/>
                    </svg>
                  )}
                  {kpi.change.trend === 'down' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  )}
                  {kpi.change.formatted}
                </span>
              </div>
              <div className="kpi-val">{kpi.value}</div>
              <div className="kpi-lbl">{kpi.label}</div>
              {/* Sparkline SVG */}
              {kpi.sparkData && kpi.sparkData.length >= 2 && (
                <div className="kpi-spark">
                  <KpiSparkline data={kpi.sparkData} color={kpi.sparkColor || '#324438'} />
                </div>
              )}
              <div className="kpi-sub">{kpi.previousLabel}</div>
            </div>
          ))}
        </div>
      )}

      {/* Section Cards */}
      <div className="sections">
        {searchVisibility && (
          <SearchVisibilitySection data={searchVisibility} periodLabel={report.period_label} />
        )}
        {organicTraffic && (
          <OrganicTrafficSection data={organicTraffic} periodLabel={report.period_label} />
        )}
        {keywordRankings && (
          <KeywordRankingsSection data={keywordRankings} />
        )}
        {keywordGrowth && keywordGrowth.months.length > 0 && (
          <KeywordGrowthSection data={keywordGrowth} />
        )}
        {linkBuilding && linkBuilding.monthlyBreakdown.length > 0 && (
          <LinkBuildingSection data={linkBuilding} />
        )}
        {paidSearch && (
          <PaidSearchSection data={paidSearch} periodLabel={report.period_label} />
        )}
        {paidSocial && paidSocial.platforms.length > 0 && (
          <PaidSocialSection data={paidSocial} periodLabel={report.period_label} />
        )}
        {localServiceAds && (
          <LocalServiceAdsSection data={localServiceAds} periodLabel={report.period_label} />
        )}
        {organicSocial && organicSocial.platforms.length > 0 && (
          <OrganicSocialSection data={organicSocial} />
        )}
        {leadTracking && (
          <LeadTrackingSection data={leadTracking} periodLabel={report.period_label} />
        )}
        {reviewManagement && reviewManagement.platforms.length > 0 && (
          <ReviewManagementSection data={reviewManagement} />
        )}
        {contentWriting && contentWriting.articles.length > 0 && (
          <ContentWritingSection data={contentWriting} />
        )}
        {aiVisibility && aiVisibility.platforms.length > 0 && (
          <AiVisibilitySection data={aiVisibility} />
        )}
        {emailSms && emailSms.channels.length > 0 && (
          <EmailSmsSection data={emailSms} />
        )}
        {localSeo && localSeo.monthlyPosts.length > 0 && (
          <LocalSeoSection data={localSeo} />
        )}
        {technicalAudit && technicalAudit.issues.length > 0 && (
          <TechnicalAuditSection data={technicalAudit} />
        )}
        {workCompleted && workCompleted.items.length > 0 && (
          <WorkCompletedSection data={workCompleted} />
        )}
        {comingNext && comingNext.items.length > 0 && (
          <ComingNextSection data={comingNext} />
        )}
        {report.manager_note && (
          <ManagerNote note={report.manager_note} managerName={report.manager_name} />
        )}
        {/* Empty state when no sections have data */}
        {!searchVisibility && !organicTraffic && !keywordRankings && !keywordGrowth &&
         !linkBuilding && !paidSearch && !paidSocial && !localServiceAds &&
         !organicSocial && !leadTracking && !reviewManagement && !contentWriting &&
         !aiVisibility && !emailSms && !localSeo && !technicalAudit &&
         !workCompleted && !comingNext && !report.manager_note && (
          <div className="empty-sections">
            <p>No section data has been added to this report yet.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .report-detail {
          padding: 24px 0;
        }
        .empty-sections {
          padding: 48px;
          text-align: center;
          background: var(--bg-page);
          border: 1px dashed var(--border-light);
          border-radius: 12px;
          color: var(--text-secondary);
        }
        .preview-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #FEF3C7;
          border: 1px solid #F59E0B;
          border-radius: 8px;
          color: #92400E;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 16px;
        }
        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 0;
          background: none;
          border: none;
          color: var(--client-green);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          margin-bottom: 16px;
        }
        .back-button:hover {
          text-decoration: underline;
        }
        .report-header-card {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 26px 28px;
          background: #324438;
          border-radius: 14px;
          margin-bottom: 18px;
          gap: 20px;
        }
        .report-header-left h1 {
          font-size: 21px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.01em;
          margin: 0 0 3px;
        }
        .report-header-left .period {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.55);
          margin: 0 0 14px;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.75);
        }
        .report-header-right {
          text-align: right;
          flex-shrink: 0;
        }
        .campaign-month {
          font-size: 52px;
          font-weight: 700;
          color: white;
          line-height: 1;
          letter-spacing: -0.04em;
        }
        .campaign-label {
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 2px;
        }
        /* KPI Row — 5 cards (v4 spec) */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }
        @media (max-width: 1024px) {
          .kpi-row {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 640px) {
          .kpi-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .kpi-card {
          background: white;
          border: 1px solid var(--border-light, #E8EDE7);
          border-radius: 14px;
          padding: 18px 20px;
        }
        .kpi-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        .kpi-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }
        .kpi-icon svg { width: 18px; height: 18px; }
        .kpi-icon.blue { background: #DBEAFE; color: #2563EB; }
        .kpi-icon.green { background: #DCFCE7; color: #166534; }
        .kpi-icon.teal { background: #E6F4F5; color: #0B7277; }
        .kpi-icon.purple { background: #EDE9FE; color: #7C3AED; }
        .kpi-icon.orange { background: #FBE9E9; color: #DE393A; }
        .kpi-chg {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px 7px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        .kpi-chg.up { background: #DCFCE7; color: #166534; }
        .kpi-chg.down { background: #FEE2E2; color: #991B1B; }
        .kpi-chg.neutral { background: #F3F4F6; color: #6B7280; }
        .kpi-chg svg { width: 10px; height: 10px; }
        .kpi-val {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.1;
          color: var(--text-primary, #1A1F16);
        }
        .kpi-lbl {
          font-size: 12px;
          color: var(--text-muted, #8A928A);
          margin-top: 1px;
        }
        .kpi-spark {
          margin-top: 10px;
          height: 32px;
        }
        .kpi-sub {
          font-size: 11px;
          color: var(--text-muted, #8A928A);
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--border-light, #E8EDE7);
        }
        .sections {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .kpi-previous {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 8px;
        }
        .sections {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

function SearchVisibilitySection({ data, periodLabel }: { data: SearchVisibilityData; periodLabel: string }) {
  const metrics = [
    { label: 'Impressions', current: data.currentImpressions, previous: data.previousImpressions, format: formatNumber },
    { label: 'Clicks', current: data.currentClicks, previous: data.previousClicks, format: formatNumber },
    { label: 'CTR', current: data.currentCTR, previous: data.previousCTR, format: (v: number) => v.toFixed(2) + '%' },
    { label: 'Avg Position', current: data.currentAvgPosition, previous: data.previousAvgPosition, format: (v: number) => v.toFixed(1), inverse: true },
  ]

  // Build SVG paths for the dual-line chart
  const hasHistory = data.monthlyHistory && data.monthlyHistory.length >= 2
  let impressionsPath = ''
  let impressionsArea = ''
  let clicksPath = ''
  let clicksArea = ''
  let campaignStartX: number | null = null
  const chartWidth = 600
  const chartHeight = 160

  if (hasHistory) {
    const months = data.monthlyHistory!
    const maxImpressions = Math.max(...months.map(m => m.impressions)) * 1.1 || 1
    const maxClicks = Math.max(...months.map(m => m.clicks)) * 1.1 || 1

    const impPoints = months.map((m, i) => {
      const x = (i / (months.length - 1)) * chartWidth
      const y = chartHeight - (m.impressions / maxImpressions) * chartHeight
      if (m.isCampaignStart) campaignStartX = x
      return { x, y }
    })

    const clkPoints = months.map((m, i) => {
      const x = (i / (months.length - 1)) * chartWidth
      const y = chartHeight - (m.clicks / maxClicks) * chartHeight
      return { x, y }
    })

    impressionsPath = impPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    impressionsArea = `${impressionsPath} L${chartWidth},${chartHeight} L0,${chartHeight} Z`
    clicksPath = clkPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    clicksArea = `${clicksPath} L${chartWidth},${chartHeight} L0,${chartHeight} Z`
  }

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
          </svg>
          Search Visibility
        </h3>
        <span className="sec-pill">Google Search Console</span>
      </div>
      <div className="sec-body">
        {/* 4-column comparison grid */}
        <div className="cmp-grid">
          {metrics.map((m, i) => {
            const change = calculateChange(m.current, m.previous)
            const displayTrend = m.inverse ? (change.trend === 'up' ? 'down' : change.trend === 'down' ? 'up' : 'neutral') : change.trend
            return (
              <div key={i} className="cmp-tile">
                <div className="cmp-lbl">{m.label}</div>
                <div className="cmp-val">{m.format(m.current)}</div>
                <div className="cmp-prev">Prev period: {m.format(m.previous)}</div>
                <div className={`cmp-chg ${displayTrend}`}>
                  {displayTrend === 'up' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                      <polyline points="18 15 12 9 6 15"/>
                    </svg>
                  )}
                  {displayTrend === 'down' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  )}
                  {change.formatted}
                </div>
              </div>
            )
          })}
        </div>

        {/* Dual-area SVG line chart */}
        {hasHistory && (
          <>
            <div className="chart-outer">
              <div className="chart-y-axis">
                <span>{formatNumber(Math.max(...data.monthlyHistory!.map(m => m.impressions)))}</span>
                <span>{formatNumber(Math.max(...data.monthlyHistory!.map(m => m.impressions)) * 0.5)}</span>
                <span>0</span>
              </div>
              <div className="chart-area">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="sv-imp-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.08"/>
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="sv-clk-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#166534" stopOpacity="0.08"/>
                      <stop offset="100%" stopColor="#166534" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#E8EDE7" strokeWidth="1"/>
                  <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#E8EDE7" strokeWidth="1"/>
                  <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#E8EDE7" strokeWidth="1"/>
                  {/* Impressions line + area */}
                  <path d={impressionsPath} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d={impressionsArea} fill="url(#sv-imp-fill)"/>
                  {/* Clicks line + area (dashed) */}
                  <path d={clicksPath} fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,3"/>
                  <path d={clicksArea} fill="url(#sv-clk-fill)"/>
                  {/* Campaign start line */}
                  {campaignStartX !== null && (
                    <>
                      <line x1={campaignStartX} y1="0" x2={campaignStartX} y2={chartHeight} stroke="#D97706" strokeWidth="1.5" strokeDasharray="4,3"/>
                      <rect x={campaignStartX - 28} y="3" width="56" height="14" rx="3" fill="#FEF3C7"/>
                      <text x={campaignStartX} y="12" textAnchor="middle" fontSize="8" fontWeight="700" fill="#D97706">Campaign Start</text>
                    </>
                  )}
                </svg>
                {/* X-axis labels */}
                <div className="chart-x-labels">
                  {data.monthlyHistory!.map((m, i) => (
                    <span
                      key={i}
                      className={m.isPreCampaign ? 'pre' : m.isCampaignStart ? 'start-month' : i === data.monthlyHistory!.length - 1 ? 'now' : ''}
                    >
                      {m.month}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="chart-legend">
              <div className="legend-item"><div className="legend-line blue"></div>Impressions</div>
              <div className="legend-item"><div className="legend-line green dashed"></div>Clicks</div>
              {campaignStartX !== null && (
                <div className="legend-item"><div className="legend-line amber"></div>Campaign start</div>
              )}
            </div>
          </>
        )}
      </div>
      <style jsx>{`
        .sec {
          background: white;
          border: 1px solid var(--border-light, #E8EDE7);
          border-radius: 14px;
          overflow: hidden;
        }
        .sec-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border-light, #E8EDE7);
        }
        .sec-hdr h3 {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .sec-hdr h3 svg { color: var(--client-green, #324438); }
        .sec-pill {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted, #8A928A);
          background: var(--bg-page, #FEFBF7);
          border: 1px solid var(--border-light, #E8EDE7);
          padding: 3px 9px;
          border-radius: 20px;
        }
        .sec-body { padding: 20px 22px; }
        .cmp-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        .cmp-tile {
          background: var(--bg-page, #FEFBF7);
          border: 1px solid var(--border-light, #E8EDE7);
          border-radius: 10px;
          padding: 14px;
        }
        .cmp-lbl {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted, #8A928A);
          margin-bottom: 8px;
        }
        .cmp-val {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary, #1A1F16);
          letter-spacing: -0.01em;
          line-height: 1;
        }
        .cmp-prev {
          font-size: 11px;
          color: var(--text-muted, #8A928A);
          margin-top: 4px;
        }
        .cmp-chg {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
          font-weight: 600;
          margin-top: 5px;
        }
        .cmp-chg.up { color: #166534; }
        .cmp-chg.down { color: #DC2626; }
        .cmp-chg.neutral { color: #6B7280; }
        .chart-outer { position: relative; margin-bottom: 12px; }
        .chart-y-axis {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 30px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-end;
          padding-right: 6px;
          width: 40px;
        }
        .chart-y-axis span { font-size: 10px; color: var(--text-muted, #8A928A); line-height: 1; }
        .chart-area { padding-left: 44px; }
        .chart-area svg { width: 100%; display: block; overflow: visible; }
        .chart-x-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 5px;
        }
        .chart-x-labels span {
          font-size: 10px;
          color: var(--text-muted, #8A928A);
          flex: 1;
          text-align: center;
        }
        .chart-x-labels span.now { font-weight: 600; color: var(--text-primary, #1A1F16); }
        .chart-x-labels span.pre { opacity: 0.4; }
        .chart-x-labels span.start-month { color: #D97706; font-weight: 600; }
        .chart-legend {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted, #8A928A);
        }
        .legend-line {
          width: 16px;
          height: 2px;
          border-radius: 1px;
        }
        .legend-line.blue { background: #2563EB; }
        .legend-line.green { background: #166534; }
        .legend-line.green.dashed { background: none; border-top: 2px dashed #166534; }
        .legend-line.amber { background: #D97706; }
        @media (max-width: 768px) {
          .cmp-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .cmp-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function OrganicTrafficSection({ data, periodLabel }: { data: OrganicTrafficData; periodLabel: string }) {
  const metrics: Array<{ label: string; current: number; previous: number }> = [
    { label: 'Organic Users', current: data.currentUsers, previous: data.previousUsers },
  ]
  if (data.currentSessions !== undefined && data.previousSessions !== undefined) {
    metrics.push({ label: 'Organic Sessions', current: data.currentSessions, previous: data.previousSessions })
  }

  // Build SVG path for single-line chart
  const hasHistory = data.monthlyHistory && data.monthlyHistory.length >= 2
  let usersPath = ''
  let usersArea = ''
  let campaignStartX: number | null = null
  const chartWidth = 600
  const chartHeight = 140

  if (hasHistory) {
    const months = data.monthlyHistory!
    const maxUsers = Math.max(...months.map(m => m.users)) * 1.1 || 1

    const points = months.map((m, i) => {
      const x = (i / (months.length - 1)) * chartWidth
      const y = chartHeight - (m.users / maxUsers) * chartHeight
      if (m.isCampaignStart) campaignStartX = x
      return { x, y }
    })

    usersPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    usersArea = `${usersPath} L${chartWidth},${chartHeight} L0,${chartHeight} Z`
  }

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          Organic Traffic
        </h3>
        <span className="sec-pill">Google Analytics</span>
      </div>
      <div className="sec-body">
        {/* Comparison tiles */}
        <div className="cmp-grid cols2">
          {metrics.map((m, i) => {
            const change = calculateChange(m.current, m.previous)
            return (
              <div key={i} className="cmp-tile">
                <div className="cmp-lbl">{m.label}</div>
                <div className="cmp-val">{formatNumber(m.current)}</div>
                <div className="cmp-prev">Prev period: {formatNumber(m.previous)}</div>
                <div className={`cmp-chg ${change.trend}`}>
                  {change.trend === 'up' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                      <polyline points="18 15 12 9 6 15"/>
                    </svg>
                  )}
                  {change.trend === 'down' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  )}
                  {change.formatted}
                </div>
              </div>
            )
          })}
        </div>

        {/* Single-area SVG line chart */}
        {hasHistory && (
          <div className="chart-outer">
            <div className="chart-y-axis">
              <span>{formatNumber(Math.max(...data.monthlyHistory!.map(m => m.users)))}</span>
              <span>{formatNumber(Math.max(...data.monthlyHistory!.map(m => m.users)) * 0.5)}</span>
              <span>0</span>
            </div>
            <div className="chart-area">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="ot-usr-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0B7277" stopOpacity="0.12"/>
                    <stop offset="100%" stopColor="#0B7277" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#E8EDE7" strokeWidth="1"/>
                <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#E8EDE7" strokeWidth="1"/>
                <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#E8EDE7" strokeWidth="1"/>
                {/* Users line + area */}
                <path d={usersPath} fill="none" stroke="#0B7277" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d={usersArea} fill="url(#ot-usr-fill)"/>
                {/* Campaign start line */}
                {campaignStartX !== null && (
                  <line x1={campaignStartX} y1="0" x2={campaignStartX} y2={chartHeight} stroke="#D97706" strokeWidth="1.5" strokeDasharray="4,3"/>
                )}
                {/* Endpoint dot */}
                {data.monthlyHistory && data.monthlyHistory.length > 0 && (
                  <circle cx={chartWidth} cy={chartHeight - (data.monthlyHistory[data.monthlyHistory.length - 1].users / (Math.max(...data.monthlyHistory.map(m => m.users)) * 1.1)) * chartHeight} r="4" fill="#0B7277"/>
                )}
              </svg>
              {/* X-axis labels */}
              <div className="chart-x-labels">
                {data.monthlyHistory!.map((m, i) => (
                  <span
                    key={i}
                    className={m.isPreCampaign ? 'pre' : m.isCampaignStart ? 'start-month' : i === data.monthlyHistory!.length - 1 ? 'now' : ''}
                  >
                    {m.month}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .sec {
          background: white;
          border: 1px solid var(--border-light, #E8EDE7);
          border-radius: 14px;
          overflow: hidden;
        }
        .sec-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border-light, #E8EDE7);
        }
        .sec-hdr h3 {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .sec-hdr h3 svg { color: var(--client-green, #324438); }
        .sec-pill {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted, #8A928A);
          background: var(--bg-page, #FEFBF7);
          border: 1px solid var(--border-light, #E8EDE7);
          padding: 3px 9px;
          border-radius: 20px;
        }
        .sec-body { padding: 20px 22px; }
        .cmp-grid {
          display: grid;
          gap: 10px;
          margin-bottom: 20px;
        }
        .cmp-grid.cols2 { grid-template-columns: repeat(2, 1fr); }
        .cmp-tile {
          background: var(--bg-page, #FEFBF7);
          border: 1px solid var(--border-light, #E8EDE7);
          border-radius: 10px;
          padding: 14px;
        }
        .cmp-lbl {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted, #8A928A);
          margin-bottom: 8px;
        }
        .cmp-val {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary, #1A1F16);
          letter-spacing: -0.01em;
          line-height: 1;
        }
        .cmp-prev {
          font-size: 11px;
          color: var(--text-muted, #8A928A);
          margin-top: 4px;
        }
        .cmp-chg {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
          font-weight: 600;
          margin-top: 5px;
        }
        .cmp-chg.up { color: #166534; }
        .cmp-chg.down { color: #DC2626; }
        .cmp-chg.neutral { color: #6B7280; }
        .chart-outer { position: relative; }
        .chart-y-axis {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 30px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-end;
          padding-right: 6px;
          width: 40px;
        }
        .chart-y-axis span { font-size: 10px; color: var(--text-muted, #8A928A); line-height: 1; }
        .chart-area { padding-left: 44px; }
        .chart-area svg { width: 100%; display: block; overflow: visible; }
        .chart-x-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 5px;
        }
        .chart-x-labels span {
          font-size: 10px;
          color: var(--text-muted, #8A928A);
          flex: 1;
          text-align: center;
        }
        .chart-x-labels span.now { font-weight: 600; color: var(--text-primary, #1A1F16); }
        .chart-x-labels span.pre { opacity: 0.4; }
        .chart-x-labels span.start-month { color: #D97706; font-weight: 600; }
        @media (max-width: 480px) {
          .cmp-grid.cols2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function KeywordRankingsSection({ data }: { data: KeywordRankingsData }) {
  // Donut chart calculations (v4 spec: r=45, cx=65, cy=65, stroke-width=18)
  const circumference = 2 * Math.PI * 45 // ≈ 282.74
  const notRanking = data.notRanking ?? Math.max(0, data.totalTracked - data.top100)
  const pos31to100 = Math.max(0, data.top100 - data.top30)
  const pos21to30 = Math.max(0, data.top30 - data.top20)
  const pos11to20 = Math.max(0, data.top20 - data.top10)
  const pos4to10 = Math.max(0, data.top10 - data.top3)

  const segments = [
    { label: 'Top 3', count: data.top3, delta: data.top3Delta, color: '#DE393A' },
    { label: '4–10', count: pos4to10, delta: 0, color: '#324438' },
    { label: '11–20', count: pos11to20, delta: 0, color: '#4A5C50' },
    { label: '21–30', count: pos21to30, delta: 0, color: '#7a9e8a' },
    { label: '31–100', count: pos31to100, delta: 0, color: '#C2D4C8' },
    { label: 'Not ranking', count: notRanking, delta: 0, color: '#E8EDE7' },
  ]

  // Calculate offsets for each donut segment
  let runningOffset = 0
  const segmentData = segments.map(seg => {
    const dashLength = (seg.count / data.totalTracked) * circumference
    const offset = runningOffset
    runningOffset += dashLength
    return { ...seg, dashLength, offset }
  })

  const rankings = [
    { label: 'Top 3', count: data.top3, delta: data.top3Delta },
    { label: 'Top 10', count: data.top10, delta: data.top10Delta },
    { label: 'Top 20', count: data.top20, delta: data.top20Delta },
    { label: 'Top 30', count: data.top30, delta: data.top30Delta },
    { label: 'Top 100', count: data.top100, delta: data.top100Delta },
    { label: 'Improved', count: data.totalImproved, delta: 0, isSpecial: true },
  ]

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Keyword Rankings
        </h3>
        <span className="sec-pill">{data.totalTracked} tracked</span>
      </div>
      <div className="sec-body">
        {/* Donut chart + legend */}
        <div className="donut-wrap">
          <div className="donut-chart">
            <svg viewBox="0 0 130 130">
              {/* Base ring */}
              <circle cx="65" cy="65" r="45" fill="none" stroke="#E8EDE7" strokeWidth="18"/>
              {/* Segments (draw in reverse order so top3 is on top) */}
              {segmentData.slice().reverse().map((seg, i) => (
                <circle
                  key={i}
                  cx="65"
                  cy="65"
                  r="45"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="18"
                  strokeDasharray={`${seg.dashLength.toFixed(1)} ${circumference - seg.dashLength}`}
                  strokeDashoffset={-seg.offset}
                  transform="rotate(-90 65 65)"
                />
              ))}
            </svg>
            <div className="donut-center">
              <div className="donut-center-num">{data.totalTracked}</div>
              <div className="donut-center-lbl">keywords</div>
            </div>
          </div>
          <div className="donut-legend">
            {segmentData.filter(s => s.count > 0).map((seg, i) => (
              <div key={i} className="donut-row">
                <div className="donut-row-l">
                  <div className="donut-swatch" style={{ background: seg.color, border: seg.color === '#E8EDE7' ? '1px solid #D4DCD2' : 'none' }}/>
                  {seg.label}
                </div>
                <div>
                  <span className="donut-row-r" style={{ color: seg.label === 'Not ranking' ? 'var(--text-muted)' : undefined }}>{seg.count}</span>
                  {seg.delta > 0 && <span className="donut-since"> +{seg.delta} ↑</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6-up rank tiles */}
        <div className="rank-grid">
          {rankings.map((r, i) => (
            <div key={i} className="rank-tile">
              <div className="rt-pos">{r.label}</div>
              <div className="rt-val">{r.count}</div>
              <div className="rt-of">{r.isSpecial ? 'keywords' : `of ${data.totalTracked}`}</div>
              {r.delta > 0 && <div className="rt-delta">+{r.delta} since start</div>}
              {r.isSpecial && <div className="rt-delta">↑ since start</div>}
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        .sec {
          background: white;
          border: 1px solid var(--border-light, #E8EDE7);
          border-radius: 14px;
          overflow: hidden;
        }
        .sec-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border-light, #E8EDE7);
        }
        .sec-hdr h3 {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .sec-hdr h3 svg { color: var(--client-green, #324438); }
        .sec-pill {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted, #8A928A);
          background: var(--bg-page, #FEFBF7);
          border: 1px solid var(--border-light, #E8EDE7);
          padding: 3px 9px;
          border-radius: 20px;
        }
        .sec-body { padding: 20px 22px; }
        .donut-wrap {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 16px;
        }
        .donut-chart {
          width: 130px;
          height: 130px;
          flex-shrink: 0;
          position: relative;
        }
        .donut-chart svg { width: 130px; height: 130px; }
        .donut-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
        }
        .donut-center-num { font-size: 22px; font-weight: 700; color: var(--text-primary); line-height: 1; }
        .donut-center-lbl { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
        .donut-legend { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .donut-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
        }
        .donut-row-l {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--text-secondary);
        }
        .donut-swatch { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
        .donut-row-r { font-weight: 600; color: var(--text-primary); font-size: 13px; }
        .donut-since { font-size: 10px; color: #166534; font-weight: 600; }
        .rank-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
        }
        .rank-tile {
          background: var(--bg-page, #FEFBF7);
          border: 1px solid var(--border-light, #E8EDE7);
          border-radius: 10px;
          padding: 13px 10px;
          text-align: center;
        }
        .rt-pos {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          margin-bottom: 5px;
        }
        .rt-val {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
          color: var(--text-primary);
        }
        .rt-of { font-size: 10px; color: var(--text-muted); }
        .rt-delta {
          font-size: 10px;
          font-weight: 600;
          color: #166534;
          margin-top: 5px;
          padding-top: 5px;
          border-top: 1px solid var(--border-light);
        }
        @media (max-width: 768px) {
          .rank-grid { grid-template-columns: repeat(3, 1fr); }
          .donut-wrap { flex-direction: column; }
        }
        @media (max-width: 480px) {
          .rank-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  )
}

function KeywordGrowthSection({ data }: { data: KeywordGrowthData }) {
  const maxTotal = Math.max(...data.months.map(m => m.top3 + m.pos4to20 + m.pos21to50 + m.pos51to100 + m.serpFeatures))
  // v4 colors: red for Top 3, green scale for positions, light gray for SERP
  const colors = {
    top3: '#DE393A',
    pos4to20: '#324438',
    pos21to50: '#4A5C50',
    pos51to100: '#7a9e8a',
    serpFeatures: '#E8EDEA',
  }

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">{icons.keywords}</span>
          Organic Keyword Growth
        </div>
        <span className="section-badge">All positions</span>
      </div>
      <div className="chart-container">
        {data.months.map((month, i) => {
          const total = month.top3 + month.pos4to20 + month.pos21to50 + month.pos51to100 + month.serpFeatures
          const heightPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0
          return (
            <div key={i} className="bar-column">
              {month.isCampaignStart && <div className="campaign-start-line" />}
              <div className="bar-stack" style={{ height: `${heightPct}%` }}>
                {month.serpFeatures > 0 && (
                  <div className="bar-segment serp" style={{ flex: month.serpFeatures }} title={`SERP Features: ${month.serpFeatures}`} />
                )}
                {month.pos51to100 > 0 && (
                  <div className="bar-segment pos51" style={{ flex: month.pos51to100 }} title={`51-100: ${month.pos51to100}`} />
                )}
                {month.pos21to50 > 0 && (
                  <div className="bar-segment pos21" style={{ flex: month.pos21to50 }} title={`21-50: ${month.pos21to50}`} />
                )}
                {month.pos4to20 > 0 && (
                  <div className="bar-segment pos4" style={{ flex: month.pos4to20 }} title={`4-20: ${month.pos4to20}`} />
                )}
                {month.top3 > 0 && (
                  <div className="bar-segment top3" style={{ flex: month.top3 }} title={`Top 3: ${month.top3}`} />
                )}
              </div>
              <div className="bar-label">{month.label}</div>
            </div>
          )
        })}
      </div>
      <div className="chart-legend">
        <span className="legend-item"><span className="legend-color top3" /> Top 3</span>
        <span className="legend-item"><span className="legend-color pos4" /> 4-20</span>
        <span className="legend-item"><span className="legend-color pos21" /> 21-50</span>
        <span className="legend-item"><span className="legend-color pos51" /> 51-100</span>
        <span className="legend-item"><span className="legend-color serp" /> SERP Features</span>
      </div>
      <style jsx>{`
        .section-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 24px;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .section-icon { color: var(--client-green); }
        .section-badge {
          padding: 4px 10px;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .chart-container {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          height: 200px;
          padding: 0 8px;
          margin-bottom: 16px;
        }
        .bar-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          position: relative;
        }
        .campaign-start-line {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 20px;
          width: 2px;
          border-left: 2px dashed #F59E0B;
          z-index: 1;
        }
        .bar-stack {
          width: 100%;
          max-width: 40px;
          display: flex;
          flex-direction: column;
          border-radius: 4px 4px 0 0;
          overflow: hidden;
          margin-top: auto;
        }
        .bar-segment {
          width: 100%;
        }
        .bar-segment.top3 { background: ${colors.top3}; }
        .bar-segment.pos4 { background: ${colors.pos4to20}; }
        .bar-segment.pos21 { background: ${colors.pos21to50}; }
        .bar-segment.pos51 { background: ${colors.pos51to100}; }
        .bar-segment.serp { background: ${colors.serpFeatures}; }
        .bar-label {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 6px;
          white-space: nowrap;
        }
        .chart-legend {
          display: flex;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }
        .legend-color.top3 { background: ${colors.top3}; }
        .legend-color.pos4 { background: ${colors.pos4to20}; }
        .legend-color.pos21 { background: ${colors.pos21to50}; }
        .legend-color.pos51 { background: ${colors.pos51to100}; }
        .legend-color.serp { background: ${colors.serpFeatures}; }
      `}</style>
    </div>
  )
}

function LinkBuildingSection({ data }: { data: LinkBuildingData }) {
  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">{icons.link}</span>
          Link Building
        </div>
        <span className="section-badge">{data.campaignTotal} total campaign-to-date</span>
      </div>
      <div className="context-note">
        Backlinks are links from other websites to yours. They help build domain authority and improve search rankings.
      </div>
      <div className="link-table">
        <div className="link-table-header">
          <span>Month</span>
          <span>Link Types</span>
          <span>Links Built</span>
          <span>Guest Posts</span>
        </div>
        {data.monthlyBreakdown.map((row, i) => (
          <div key={i} className="link-table-row">
            <span className="month">{row.month}</span>
            <span className="types">
              {row.linkTypes.map((type, j) => (
                <span key={j} className="type-pill">{type}</span>
              ))}
            </span>
            <span className="count">{row.total}</span>
            <span className="count">{row.guestPosts}</span>
          </div>
        ))}
        <div className="link-table-footer">
          <span>Total</span>
          <span></span>
          <span className="count">{data.monthlyBreakdown.reduce((sum, r) => sum + r.total, 0)}</span>
          <span className="count">{data.monthlyBreakdown.reduce((sum, r) => sum + r.guestPosts, 0)}</span>
        </div>
      </div>
      <style jsx>{`
        .section-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 24px;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .section-icon { color: var(--client-green); }
        .section-badge {
          padding: 4px 10px;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .context-note {
          padding: 12px 16px;
          background: #F5F7F6;
          border-left: 3px solid var(--client-green);
          border-radius: 0 8px 8px 0;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 20px;
        }
        .link-table {
          border: 1px solid var(--border-light);
          border-radius: 10px;
          overflow: hidden;
        }
        .link-table-header,
        .link-table-row,
        .link-table-footer {
          display: grid;
          grid-template-columns: 1fr 2fr 100px 100px;
          padding: 12px 16px;
          gap: 12px;
          align-items: center;
        }
        .link-table-header {
          background: var(--bg-page);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .link-table-row {
          border-top: 1px solid var(--border-light);
          font-size: 14px;
        }
        .link-table-footer {
          border-top: 1px solid var(--border-light);
          background: var(--bg-page);
          font-weight: 600;
          font-size: 14px;
        }
        .month { color: var(--text-primary); }
        .types {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .type-pill {
          padding: 3px 8px;
          background: var(--client-green-wash);
          color: var(--client-green);
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        .count {
          text-align: center;
          color: var(--text-primary);
        }
        @media (max-width: 640px) {
          .link-table-header,
          .link-table-row,
          .link-table-footer {
            grid-template-columns: 1fr 1fr 60px 60px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  )
}

function PaidSearchSection({ data, periodLabel }: { data: PaidSearchData; periodLabel: string }) {
  const metrics = [
    { label: 'Total Spend', current: data.currentSpend, previous: data.previousSpend, format: (v: number) => '$' + formatNumber(v) },
    { label: 'Conversions', current: data.currentConversions, previous: data.previousConversions, format: formatNumber },
    { label: 'Cost Per Lead', current: data.currentCPL, previous: data.previousCPL, format: (v: number) => '$' + v.toFixed(2), inverse: true },
    { label: 'CTR', current: data.currentCTR, previous: data.previousCTR, format: (v: number) => v.toFixed(2) + '%' },
  ]

  // Build combo chart (spend bars + conversion line)
  const hasMonths = data.months && data.months.length >= 2
  const chartWidth = 500
  const chartHeight = 120
  const maxSpend = hasMonths ? Math.max(...data.months.map(m => m.spend)) * 1.2 : 2000
  const maxConversions = hasMonths ? Math.max(...data.months.map(m => m.conversions)) * 1.2 : 25

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Google Search Ads
        </h3>
        <span className="sec-pill">{periodLabel}</span>
      </div>
      <div className="sec-body">
        {/* Spend KPI callouts (4 tiles) */}
        <div className="spend-row">
          {metrics.map((m, i) => {
            const change = calculateChange(m.current, m.previous)
            const displayTrend = m.inverse ? (change.trend === 'up' ? 'down' : change.trend === 'down' ? 'up' : 'neutral') : change.trend
            return (
              <div key={i} className="spend-kpi">
                <div className="spend-kpi-lbl">{m.label}</div>
                <div className="spend-kpi-val">{m.format(m.current)}</div>
                <div className="spend-kpi-sub">Prev period: {m.format(m.previous)}</div>
                <div className={`spend-kpi-chg ${displayTrend}`}>
                  {displayTrend === 'up' ? '↑' : displayTrend === 'down' ? '↓' : ''} {change.formatted}
                </div>
              </div>
            )
          })}
        </div>

        {/* Combo bar + line chart */}
        {hasMonths && (
          <>
            <div className="chart-outer">
              <div className="chart-y-axis">
                <span>${formatNumber(maxSpend)}</span>
                <span>${formatNumber(maxSpend * 0.5)}</span>
                <span>$0</span>
              </div>
              <div className="chart-area">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                  {/* Grid lines */}
                  <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#E8EDE7" strokeWidth="1"/>
                  <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#E8EDE7" strokeWidth="1"/>
                  <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#E8EDE7" strokeWidth="1"/>

                  {/* Spend bars (amber) */}
                  {data.months.map((m, i) => {
                    const barWidth = 60
                    const gap = (chartWidth - data.months.length * barWidth) / (data.months.length + 1)
                    const x = gap + i * (barWidth + gap)
                    const barHeight = (m.spend / maxSpend) * (chartHeight - 10)
                    const y = chartHeight - barHeight
                    return (
                      <g key={`bar-${i}`}>
                        <rect x={x} y={y} width={barWidth} height={barHeight} rx="3" fill="#FEF3C7" stroke="#D97706" strokeWidth="1"/>
                        <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill="#D97706">
                          ${formatNumber(m.spend)}
                        </text>
                      </g>
                    )
                  })}

                  {/* Conversions line (red) */}
                  {(() => {
                    const barWidth = 60
                    const gap = (chartWidth - data.months.length * barWidth) / (data.months.length + 1)
                    const points = data.months.map((m, i) => {
                      const cx = gap + i * (barWidth + gap) + barWidth / 2
                      const cy = chartHeight - (m.conversions / maxConversions) * (chartHeight - 10)
                      return { cx, cy, val: m.conversions }
                    })
                    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.cx},${p.cy}`).join(' ')
                    return (
                      <>
                        <path d={linePath} fill="none" stroke="#DE393A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        {points.map((p, i) => (
                          <g key={`conv-${i}`}>
                            <circle cx={p.cx} cy={p.cy} r="4" fill="white" stroke="#DE393A" strokeWidth="2"/>
                            <text x={p.cx} y={p.cy - 8} textAnchor="middle" fontSize="9" fontWeight="600" fill="#DE393A">{p.val}</text>
                          </g>
                        ))}
                      </>
                    )
                  })()}
                </svg>
                {/* X-axis labels */}
                <div className="chart-x-labels">
                  {data.months.map((m, i) => (
                    <span key={i} className={i === data.months.length - 1 ? 'now' : ''}>{m.month}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="chart-legend">
              <div className="legend-item"><div className="legend-dot amber"></div>Monthly Spend</div>
              <div className="legend-item"><div className="legend-line red"></div>Conversions</div>
            </div>
          </>
        )}
      </div>
      <style jsx>{`
        .sec {
          background: white;
          border: 1px solid var(--border-light, #E8EDE7);
          border-radius: 14px;
          overflow: hidden;
        }
        .sec-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border-light, #E8EDE7);
        }
        .sec-hdr h3 {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .sec-hdr h3 svg { color: var(--client-green, #324438); }
        .sec-pill {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted, #8A928A);
          background: var(--bg-page, #FEFBF7);
          border: 1px solid var(--border-light, #E8EDE7);
          padding: 3px 9px;
          border-radius: 20px;
        }
        .sec-body { padding: 20px 22px; }
        .spend-row {
          display: flex;
          gap: 10px;
          margin-bottom: 18px;
        }
        .spend-kpi {
          flex: 1;
          background: var(--bg-page, #FEFBF7);
          border: 1px solid var(--border-light, #E8EDE7);
          border-radius: 10px;
          padding: 14px 16px;
        }
        .spend-kpi-lbl {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted, #8A928A);
          margin-bottom: 6px;
        }
        .spend-kpi-val {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .spend-kpi-sub {
          font-size: 11px;
          color: var(--text-muted, #8A928A);
          margin-top: 2px;
        }
        .spend-kpi-chg {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
          font-weight: 600;
          margin-top: 4px;
        }
        .spend-kpi-chg.up { color: #166534; }
        .spend-kpi-chg.down { color: #DC2626; }
        .spend-kpi-chg.neutral { color: #6B7280; }
        .chart-outer { position: relative; margin-bottom: 12px; }
        .chart-y-axis {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 30px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-end;
          padding-right: 6px;
          width: 40px;
        }
        .chart-y-axis span { font-size: 10px; color: var(--text-muted, #8A928A); line-height: 1; }
        .chart-area { padding-left: 44px; }
        .chart-area svg { width: 100%; display: block; overflow: visible; }
        .chart-x-labels {
          display: flex;
          justify-content: space-around;
          margin-top: 5px;
        }
        .chart-x-labels span {
          font-size: 10px;
          color: var(--text-muted, #8A928A);
          text-align: center;
        }
        .chart-x-labels span.now { font-weight: 600; color: var(--text-primary, #1A1F16); }
        .chart-legend {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted, #8A928A);
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }
        .legend-dot.amber { background: #FEF3C7; border: 1px solid #D97706; }
        .legend-line {
          width: 16px;
          height: 2px;
          border-radius: 1px;
        }
        .legend-line.red { background: #DE393A; }
        @media (max-width: 768px) {
          .spend-row { flex-wrap: wrap; }
          .spend-kpi { flex: 1 1 45%; }
        }
      `}</style>
    </div>
  )
}

function PaidSocialSection({ data, periodLabel }: { data: PaidSocialData; periodLabel: string }) {
  // Platform colors
  const platformColors: Record<string, string> = {
    Facebook: '#2563EB',
    Instagram: '#7C3AED',
    TikTok: '#1A1F16',
    LinkedIn: '#0A66C2',
    Pinterest: '#E60023',
    Other: '#7a9e8a',
  }

  // KPI data
  const spendChange = data.currentSpend - data.previousSpend
  const convChange = ((data.currentConversions - data.previousConversions) / (data.previousConversions || 1)) * 100
  const cplChange = data.currentCPL - data.previousCPL
  const impChange = ((data.currentImpressions - data.previousImpressions) / (data.previousImpressions || 1)) * 100

  // Get platforms pill text
  const platformNames = data.platforms.map(p => p.platform).join(' · ')

  // Stacked bar chart data
  const hasMonthly = data.months && data.months.length >= 2
  const chartHeight = 120
  const maxMonthlySpend = hasMonthly
    ? Math.max(...data.months!.map(m => (m.facebook ?? 0) + (m.instagram ?? 0) + (m.tiktok ?? 0) + (m.linkedin ?? 0) + (m.other ?? 0))) * 1.1
    : 1000

  // Horizontal bar max values
  const maxCPL = Math.max(...data.platforms.map(p => p.currentCPL), 1) * 1.1
  const maxConv = Math.max(...data.platforms.map(p => p.currentConversions), 1)

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
          Paid Social Media
        </h3>
        <span className="sec-pill">{platformNames}</span>
      </div>
      <div className="sec-body">
        {/* Spend KPI row */}
        <div className="spend-row">
          <div className="spend-kpi">
            <div className="spend-kpi-lbl">Total Spend</div>
            <div className="spend-kpi-val">${formatNumber(data.currentSpend)}</div>
            <div className="spend-kpi-sub">Prev period: ${formatNumber(data.previousSpend)}</div>
            <div className={`spend-kpi-chg ${spendChange >= 0 ? 'up' : 'down'}`}>
              {spendChange >= 0 ? '↑' : '↓'} {spendChange >= 0 ? '+' : ''}${formatNumber(Math.abs(spendChange))}
            </div>
          </div>
          <div className="spend-kpi">
            <div className="spend-kpi-lbl">Conversions</div>
            <div className="spend-kpi-val">{data.currentConversions}</div>
            <div className="spend-kpi-sub">Prev period: {data.previousConversions}</div>
            <div className={`spend-kpi-chg ${convChange >= 0 ? 'up' : 'down'}`}>
              {convChange >= 0 ? '↑' : '↓'} {convChange >= 0 ? '+' : ''}{convChange.toFixed(1)}%
            </div>
          </div>
          <div className="spend-kpi">
            <div className="spend-kpi-lbl">Cost Per Lead</div>
            <div className="spend-kpi-val">${data.currentCPL.toFixed(2)}</div>
            <div className="spend-kpi-sub">Prev period: ${data.previousCPL.toFixed(2)}</div>
            <div className={`spend-kpi-chg ${cplChange <= 0 ? 'up' : 'down'}`}>
              {cplChange <= 0 ? '↓' : '↑'} {cplChange <= 0 ? '−' : '+'}${Math.abs(cplChange).toFixed(2)} {cplChange <= 0 ? '(better)' : ''}
            </div>
          </div>
          <div className="spend-kpi">
            <div className="spend-kpi-lbl">Impressions</div>
            <div className="spend-kpi-val">{formatNumber(data.currentImpressions)}</div>
            <div className="spend-kpi-sub">Prev period: {formatNumber(data.previousImpressions)}</div>
            <div className={`spend-kpi-chg ${impChange >= 0 ? 'up' : 'down'}`}>
              {impChange >= 0 ? '↑' : '↓'} {impChange >= 0 ? '+' : ''}{impChange.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Grid with charts */}
        <div className="grid2">
          {/* Stacked bar chart */}
          {hasMonthly && (
            <div>
              <div className="chart-title">Monthly ad spend by platform</div>
              <div className="sbar-chart" style={{ height: chartHeight }}>
                {data.months!.map((m, i) => {
                  const fb = m.facebook ?? 0
                  const ig = m.instagram ?? 0
                  const tk = m.tiktok ?? 0
                  const li = m.linkedin ?? 0
                  const ot = m.other ?? 0
                  const total = fb + ig + tk + li + ot
                  const stackHeight = (total / maxMonthlySpend) * chartHeight

                  return (
                    <div key={i} className="sbar-col">
                      <div className="sbar-stack" style={{ height: stackHeight }}>
                        {tk > 0 && <div className="sbar-seg" style={{ height: (tk / total) * stackHeight, background: '#1A1F16' }} title={`TikTok: $${tk}`} />}
                        {ig > 0 && <div className="sbar-seg" style={{ height: (ig / total) * stackHeight, background: '#7C3AED' }} title={`Instagram: $${ig}`} />}
                        {fb > 0 && <div className="sbar-seg" style={{ height: (fb / total) * stackHeight, background: '#2563EB' }} title={`Facebook: $${fb}`} />}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="sbar-x-labels">
                {data.months!.map((m, i) => (
                  <span key={i}>{m.month.substring(0, 3)}</span>
                ))}
              </div>
              <div className="chart-legend">
                <div className="legend-item"><div className="legend-dot" style={{ background: '#2563EB' }} />Facebook</div>
                <div className="legend-item"><div className="legend-dot" style={{ background: '#7C3AED' }} />Instagram</div>
                <div className="legend-item"><div className="legend-dot" style={{ background: '#1A1F16' }} />TikTok</div>
              </div>
            </div>
          )}

          {/* Horizontal bars */}
          <div>
            <div className="chart-title">Cost per lead by platform</div>
            <div className="hbar-list">
              {data.platforms.map((p, i) => {
                const barWidth = (p.currentCPL / maxCPL) * 100
                const color = platformColors[p.platform] || '#7a9e8a'
                return (
                  <div key={i} className="hbar-row">
                    <div className="hbar-lbl">{p.platform}</div>
                    <div className="hbar-track"><div className="hbar-fill" style={{ width: `${barWidth}%`, background: color }} /></div>
                    <div className="hbar-count">${p.currentCPL.toFixed(0)}</div>
                  </div>
                )
              })}
            </div>
            <div className="chart-title" style={{ marginTop: 16 }}>Conversions by platform</div>
            <div className="hbar-list">
              {data.platforms.map((p, i) => {
                const barWidth = (p.currentConversions / maxConv) * 100
                const color = platformColors[p.platform] || '#7a9e8a'
                return (
                  <div key={i} className="hbar-row">
                    <div className="hbar-lbl">{p.platform}</div>
                    <div className="hbar-track"><div className="hbar-fill" style={{ width: `${barWidth}%`, background: color }} /></div>
                    <div className="hbar-count">{p.currentConversions}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .sec {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          overflow: hidden;
        }
        .sec-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border-light);
        }
        .sec-hdr h3 {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .sec-hdr h3 :global(svg) { color: var(--client-green); }
        .sec-pill {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          padding: 3px 9px;
          border-radius: 20px;
        }
        .sec-body { padding: 20px 22px; }

        /* Spend KPI row */
        .spend-row {
          display: flex;
          gap: 10px;
          margin-bottom: 18px;
        }
        .spend-kpi {
          flex: 1;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          padding: 14px 16px;
        }
        .spend-kpi-lbl {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          margin-bottom: 6px;
        }
        .spend-kpi-val {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .spend-kpi-sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .spend-kpi-chg {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
          font-weight: 600;
          margin-top: 4px;
        }
        .spend-kpi-chg.up { color: #166534; }
        .spend-kpi-chg.down { color: #991B1B; }

        /* Grid */
        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        /* Chart title */
        .chart-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 10px;
        }

        /* Stacked bar chart */
        .sbar-chart {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          border-bottom: 1px solid var(--border-light);
          position: relative;
        }
        .sbar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
          position: relative;
        }
        .sbar-stack {
          width: 100%;
          border-radius: 3px 3px 0 0;
          overflow: hidden;
          display: flex;
          flex-direction: column-reverse;
        }
        .sbar-seg { width: 100%; }
        .sbar-x-labels {
          display: flex;
          gap: 6px;
          margin: 5px 0 12px;
        }
        .sbar-x-labels span {
          flex: 1;
          text-align: center;
          font-size: 10px;
          color: var(--text-muted);
        }

        /* Chart legend */
        .chart-legend {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        /* Horizontal bars */
        .hbar-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .hbar-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .hbar-lbl {
          font-size: 12px;
          color: var(--text-secondary);
          width: 140px;
          flex-shrink: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hbar-track {
          flex: 1;
          height: 8px;
          background: var(--border-light);
          border-radius: 4px;
          overflow: hidden;
        }
        .hbar-fill {
          height: 100%;
          border-radius: 4px;
        }
        .hbar-count {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          width: 32px;
          text-align: right;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .spend-row { flex-wrap: wrap; }
          .spend-kpi { flex: 1 1 45%; }
          .grid2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function LocalServiceAdsSection({ data, periodLabel }: { data: LocalServiceAdsData; periodLabel: string }) {
  const metrics = [
    { label: 'Leads', current: data.currentLeads, previous: data.previousLeads, format: formatNumber },
    { label: 'Ad Spend', current: data.currentSpend, previous: data.previousSpend, format: (v: number) => '$' + formatNumber(v) },
    { label: 'Cost Per Lead', current: data.currentCPL, previous: data.previousCPL, format: (v: number) => '$' + v.toFixed(2), inverse: true },
  ]

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
          Local Service Ads
        </div>
        <span className="section-badge">{periodLabel}</span>
      </div>
      <div className="metrics-grid">
        {metrics.map((m, i) => {
          const change = calculateChange(m.current, m.previous)
          const displayTrend = m.inverse ? (change.trend === 'up' ? 'down' : change.trend === 'down' ? 'up' : 'neutral') : change.trend
          return (
            <div key={i} className="metric-tile">
              <div className="metric-label">{m.label}</div>
              <div className="metric-value">{m.format(m.current)}</div>
              <div className="metric-compare">
                vs {m.format(m.previous)}
                <span className={`metric-change ${displayTrend}`}>{change.formatted}</span>
              </div>
            </div>
          )
        })}
        {data.currentRating && (
          <div className="metric-tile rating-tile">
            <div className="metric-label">Google Guarantee Rating</div>
            <div className="metric-value">{data.currentRating.toFixed(1)}</div>
            <div className="reviews-count">{data.totalReviews || 0} reviews</div>
          </div>
        )}
      </div>
      {data.notes && (
        <div className="notes">{data.notes}</div>
      )}
      <style jsx>{`
        .section-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 24px;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .section-icon { color: var(--client-green); }
        .section-badge {
          padding: 4px 10px;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .metric-tile {
          padding: 16px;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 10px;
        }
        .rating-tile {
          background: #FEF3C7;
          border-color: #F59E0B;
        }
        .metric-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .metric-value {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .metric-compare {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .reviews-count {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .metric-change {
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }
        .metric-change.up { background: #DCFCE7; color: #166534; }
        .metric-change.down { background: #FEE2E2; color: #DC2626; }
        .metric-change.neutral { background: #F3F4F6; color: #6B7280; }
        .notes {
          margin-top: 16px;
          padding: 12px 16px;
          background: #F5F7F6;
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-secondary);
        }
        @media (max-width: 640px) {
          .metrics-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function OrganicSocialSection({ data }: { data: OrganicSocialData }) {
  // Platform colors
  const platformStyles: Record<string, { bg: string; color: string; icon: string; chartColor: string; dashed?: boolean }> = {
    Facebook: { bg: '#DBEAFE', color: '#2563EB', icon: 'f', chartColor: '#324438', dashed: true },
    Instagram: { bg: '#EDE9FE', color: '#7C3AED', icon: 'ig', chartColor: '#7C3AED' },
    TikTok: { bg: '#1A1F16', color: '#fff', icon: 'tk', chartColor: '#1A1F16' },
    LinkedIn: { bg: '#DBEAFE', color: '#0A66C2', icon: 'in', chartColor: '#0A66C2' },
    Pinterest: { bg: '#FEE2E2', color: '#E60023', icon: 'p', chartColor: '#E60023' },
    Other: { bg: '#E8EDEA', color: '#324438', icon: '?', chartColor: '#7a9e8a' },
  }

  // Get platforms pill
  const platformNames = data.platforms.map(p => p.platform).join(' · ')

  // Calculate chart data
  const hasFollowerHistory = data.followerHistory && data.followerHistory.length >= 2
  const hasMonthlyPosts = data.monthlyPosts && data.monthlyPosts.length >= 2

  // Calculate max followers for y-axis
  const maxFollowers = hasFollowerHistory
    ? Math.max(...data.followerHistory!.flatMap(m => [m.facebook ?? 0, m.instagram ?? 0, m.linkedin ?? 0, m.tiktok ?? 0])) * 1.1
    : 1000

  // Calculate max posts for bar chart
  const maxPosts = hasMonthlyPosts
    ? Math.max(...data.monthlyPosts!.flatMap(m => [m.facebook ?? 0, m.instagram ?? 0, m.tiktok ?? 0, m.linkedin ?? 0, m.other ?? 0])) * 1.2
    : 10
  const chartBarHeight = 100

  // Build follower line paths
  const chartWidth = 500
  const chartHeight = 110
  let fbPath = '', igPath = '', fbArea = '', igArea = ''

  if (hasFollowerHistory) {
    const months = data.followerHistory!
    const xStep = chartWidth / (months.length - 1 || 1)

    // Facebook line (green, dashed)
    const fbPoints = months.map((m, i) => {
      const y = chartHeight - ((m.facebook ?? 0) / maxFollowers) * chartHeight
      return `${i * xStep},${y}`
    })
    fbPath = `M${fbPoints.join(' L')}`
    fbArea = `${fbPath} L${chartWidth},${chartHeight} L0,${chartHeight} Z`

    // Instagram line (purple, solid)
    const igPoints = months.map((m, i) => {
      const y = chartHeight - ((m.instagram ?? 0) / maxFollowers) * chartHeight
      return `${i * xStep},${y}`
    })
    igPath = `M${igPoints.join(' L')}`
    igArea = `${igPath} L${chartWidth},${chartHeight} L0,${chartHeight} Z`
  }

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
          </svg>
          Organic Social Media
        </h3>
        <span className="sec-pill">{platformNames}</span>
      </div>
      <div className="sec-body">
        <div className="cnote">Organic social builds long-term brand trust. Follower growth and consistent posting signal authority to both audiences and algorithms.</div>

        {/* Platform summary rows */}
        <div className="platform-rows">
          {data.platforms.map((p, i) => {
            const style = platformStyles[p.platform] || platformStyles.Other
            const totalGrowth = p.currentFollowers - p.followersAtStart
            return (
              <div key={i} className="social-plat-row">
                <div className="social-plat-icon" style={{ background: style.bg, color: style.color }}>
                  {style.icon}
                </div>
                <div className="social-plat-name">{p.platform}</div>
                <div className="social-stat">
                  <div className="social-stat-num">{formatNumber(p.currentFollowers)}</div>
                  <div className="social-stat-lbl">followers</div>
                </div>
                {totalGrowth > 0 && (
                  <div className="social-delta up">+{formatNumber(totalGrowth)} since start ↑</div>
                )}
                <div className="social-stat" style={{ textAlign: 'right' }}>
                  <div className="social-stat-num">{p.currentPeriodPosts}</div>
                  <div className="social-stat-lbl">posts this period</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts grid */}
        {(hasFollowerHistory || hasMonthlyPosts) && (
          <div className="grid2">
            {/* Follower growth dual-line chart */}
            {hasFollowerHistory && (
              <div>
                <div className="chart-title">Follower growth since campaign start</div>
                <div className="chart-outer">
                  <div className="chart-y-axis">
                    <span>{formatNumber(Math.round(maxFollowers))}</span>
                    <span>{formatNumber(Math.round(maxFollowers * 0.75))}</span>
                    <span>{formatNumber(Math.round(maxFollowers * 0.5))}</span>
                    <span>{formatNumber(Math.round(maxFollowers * 0.25))}</span>
                    <span>0</span>
                  </div>
                  <div className="chart-area">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="fb-fill-org" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#324438" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#324438" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="ig-fill-org" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                        <line key={i} x1="0" y1={chartHeight * pct} x2={chartWidth} y2={chartHeight * pct} stroke="#E8EDE7" strokeWidth="1" />
                      ))}
                      {/* Instagram area + line (purple) */}
                      <path d={igArea} fill="url(#ig-fill-org)" />
                      <path d={igPath} fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Facebook area + line (green, dashed) */}
                      <path d={fbArea} fill="url(#fb-fill-org)" />
                      <path d={fbPath} fill="none" stroke="#324438" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,3" />
                      {/* Endpoint dots */}
                      {data.followerHistory!.length > 0 && (
                        <>
                          <circle cx={chartWidth} cy={chartHeight - ((data.followerHistory![data.followerHistory!.length - 1].instagram ?? 0) / maxFollowers) * chartHeight} r="4" fill="#7C3AED" />
                          <circle cx={chartWidth} cy={chartHeight - ((data.followerHistory![data.followerHistory!.length - 1].facebook ?? 0) / maxFollowers) * chartHeight} r="4" fill="#324438" />
                        </>
                      )}
                    </svg>
                    <div className="chart-x-labels">
                      {data.followerHistory!.map((m, i) => (
                        <span key={i}>{m.month.substring(0, 3)}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="chart-legend">
                  {data.platforms.filter(p => p.platform === 'Instagram' || p.platform === 'Facebook').map((p, i) => {
                    const style = platformStyles[p.platform] || platformStyles.Other
                    return (
                      <div key={i} className="legend-item">
                        <div className={`legend-line ${style.dashed ? 'dashed' : ''}`} style={{ color: style.chartColor, background: style.dashed ? 'none' : style.chartColor }} />
                        {p.platform}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Monthly posts grouped bar chart */}
            {hasMonthlyPosts && (
              <div>
                <div className="chart-title">Posts per month</div>
                <div className="gbar-chart" style={{ height: chartBarHeight }}>
                  {data.monthlyPosts!.map((m, i) => (
                    <div key={i} className="gbar-col">
                      {data.platforms.map((p, pi) => {
                        // Access monthly posts by platform name
                        const plat = p.platform.toLowerCase() as keyof typeof m
                        const val = (plat !== 'month' ? m[plat] : 0) ?? 0
                        const style = platformStyles[p.platform] || platformStyles.Other
                        const barH = (val / maxPosts) * chartBarHeight
                        return <div key={pi} className="gbar-bar" style={{ height: barH, background: style.chartColor }} title={`${p.platform}: ${val}`} />
                      })}
                    </div>
                  ))}
                </div>
                <div className="chart-x-labels">
                  {data.monthlyPosts!.map((m, i) => (
                    <span key={i}>{m.month.substring(0, 3)}</span>
                  ))}
                </div>
                <div className="chart-legend">
                  {data.platforms.map((p, i) => {
                    const style = platformStyles[p.platform] || platformStyles.Other
                    return (
                      <div key={i} className="legend-item">
                        <div className="legend-dot" style={{ background: style.chartColor }} />
                        {p.platform}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style jsx>{`
        .sec {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          overflow: hidden;
        }
        .sec-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border-light);
        }
        .sec-hdr h3 {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .sec-hdr h3 :global(svg) { color: var(--client-green); }
        .sec-pill {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          padding: 3px 9px;
          border-radius: 20px;
        }
        .sec-body { padding: 20px 22px; }
        .cnote {
          background: #F5F7F6;
          border-left: 3px solid var(--client-green);
          padding: 9px 13px;
          border-radius: 0 6px 6px 0;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.55;
          margin-bottom: 16px;
        }

        /* Platform rows */
        .platform-rows { margin-bottom: 18px; }
        .social-plat-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-light);
        }
        .social-plat-row:last-child { border-bottom: none; }
        .social-plat-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 700;
        }
        .social-plat-name {
          font-size: 13px;
          font-weight: 600;
          width: 90px;
          flex-shrink: 0;
        }
        .social-stat { flex: 1; }
        .social-stat-num {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .social-stat-lbl {
          font-size: 10px;
          color: var(--text-muted);
        }
        .social-delta {
          font-size: 11px;
          font-weight: 600;
        }
        .social-delta.up { color: #166534; }

        /* Grid */
        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        /* Chart styles */
        .chart-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .chart-outer {
          position: relative;
          margin-bottom: 12px;
        }
        .chart-y-axis {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-end;
          padding-right: 6px;
          width: 40px;
        }
        .chart-y-axis span {
          font-size: 10px;
          color: var(--text-muted);
          line-height: 1;
        }
        .chart-area {
          padding-left: 44px;
        }
        .chart-area :global(svg) {
          width: 100%;
          display: block;
          overflow: visible;
        }
        .chart-x-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 5px;
        }
        .chart-x-labels span {
          flex: 1;
          text-align: center;
          font-size: 10px;
          color: var(--text-muted);
        }
        .chart-legend {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .legend-line {
          width: 16px;
          height: 2px;
          border-radius: 1px;
          flex-shrink: 0;
        }
        .legend-line.dashed {
          background: none;
          border-top: 2px dashed currentColor;
        }

        /* Grouped bar chart */
        .gbar-chart {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          border-bottom: 1px solid var(--border-light);
          position: relative;
        }
        .gbar-col {
          flex: 1;
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 100%;
          justify-content: center;
        }
        .gbar-bar {
          flex: 1;
          max-width: 22px;
          border-radius: 3px 3px 0 0;
          min-height: 2px;
        }

        @media (max-width: 768px) {
          .grid2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function LeadTrackingSection({ data, periodLabel }: { data: LeadTrackingData; periodLabel: string }) {
  const leadChange = calculateChange(data.currentLeads, data.previousLeads)
  const hasMonthlyLeads = data.monthlyLeads && data.monthlyLeads.length >= 2
  const maxMonthlyLeads = hasMonthlyLeads ? Math.max(...data.monthlyLeads!.map(m => m.leads)) * 1.2 : 30
  const totalLeads = data.currentLeads

  // Calculate max for horizontal bars
  const typeBreakdown = [
    { label: 'Form Submissions', count: data.currentFormSubmissions ?? 0, color: '#324438' },
    { label: 'Phone Calls', count: data.currentPhoneCalls ?? 0, color: '#4A5C50' },
    { label: 'Web Chat', count: data.currentWebChat ?? 0, color: '#7a9e8a' },
    { label: 'Appointments', count: data.currentAppointments ?? 0, color: '#C2D4C8' },
  ].filter(t => t.count > 0)
  const maxTypeCount = Math.max(...typeBreakdown.map(t => t.count), 1)

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <polyline points="17 11 19 13 23 9"/>
          </svg>
          CRM &amp; Lead Tracking
        </h3>
        <span className="sec-pill">{periodLabel}</span>
      </div>
      <div className="sec-body">
        {/* Big number callout */}
        <div className="lead-callout">
          <div className="lead-num">{totalLeads}</div>
          <div className="lead-info">
            <div className="lead-title">Total Leads Generated</div>
            <div className="lead-meta">
              Prev period: {data.previousLeads} · <span className={`delta ${leadChange.trend}`}>{leadChange.formatted} {leadChange.trend === 'up' ? '↑' : leadChange.trend === 'down' ? '↓' : ''}</span>
            </div>
          </div>
        </div>

        <div className="grid2">
          {/* Horizontal bar breakdown */}
          <div>
            {data.leadSources && data.leadSources.length > 0 && (
              <div className="hbar-section">
                <div className="hbar-title">Leads by source</div>
                <div className="hbar-list">
                  {data.leadSources.map((source, i) => (
                    <div key={i} className="hbar-row">
                      <div className="hbar-lbl">{source.source}</div>
                      <div className="hbar-track">
                        <div className="hbar-fill" style={{ width: `${(source.count / totalLeads) * 100}%`, background: i === 0 ? '#2563EB' : i === 1 ? '#324438' : '#7a9e8a' }}/>
                      </div>
                      <div className="hbar-count">{source.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {typeBreakdown.length > 0 && (
              <div className="hbar-section">
                <div className="hbar-title">Lead type breakdown</div>
                <div className="hbar-list">
                  {typeBreakdown.map((t, i) => (
                    <div key={i} className="hbar-row">
                      <div className="hbar-lbl">{t.label}</div>
                      <div className="hbar-track">
                        <div className="hbar-fill" style={{ width: `${(t.count / maxTypeCount) * 100}%`, background: t.color }}/>
                      </div>
                      <div className="hbar-count">{t.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Monthly leads line chart */}
          {hasMonthlyLeads && (
            <div>
              <div className="hbar-title">Leads per month</div>
              <div className="chart-outer">
                <div className="chart-y-axis small">
                  <span>{Math.round(maxMonthlyLeads)}</span>
                  <span>{Math.round(maxMonthlyLeads / 2)}</span>
                  <span>0</span>
                </div>
                <div className="chart-area">
                  <svg viewBox="0 0 300 100" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="lead-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#DE393A" stopOpacity="0.12"/>
                        <stop offset="100%" stopColor="#DE393A" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="0" x2="300" y2="0" stroke="#E8EDE7" strokeWidth="1"/>
                    <line x1="0" y1="50" x2="300" y2="50" stroke="#E8EDE7" strokeWidth="1"/>
                    <line x1="0" y1="100" x2="300" y2="100" stroke="#E8EDE7" strokeWidth="1"/>
                    {(() => {
                      const points = data.monthlyLeads!.map((m, i) => {
                        const x = (i / (data.monthlyLeads!.length - 1)) * 300
                        const y = 100 - (m.leads / maxMonthlyLeads) * 90
                        return { x, y, val: m.leads }
                      })
                      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
                      const areaPath = `${linePath} L300,100 L0,100 Z`
                      return (
                        <>
                          <path d={linePath} fill="none" stroke="#DE393A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d={areaPath} fill="url(#lead-fill)"/>
                          {points.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#DE393A" strokeWidth="2"/>
                              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="#DE393A">{p.val}</text>
                            </g>
                          ))}
                        </>
                      )
                    })()}
                  </svg>
                  <div className="chart-x-labels">
                    {data.monthlyLeads!.map((m, i) => (
                      <span key={i} className={i === data.monthlyLeads!.length - 1 ? 'now' : ''}>{m.month}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .sec {
          background: white;
          border: 1px solid var(--border-light, #E8EDE7);
          border-radius: 14px;
          overflow: hidden;
        }
        .sec-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border-light, #E8EDE7);
        }
        .sec-hdr h3 {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .sec-hdr h3 svg { color: var(--client-green, #324438); }
        .sec-pill {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted, #8A928A);
          background: var(--bg-page, #FEFBF7);
          border: 1px solid var(--border-light, #E8EDE7);
          padding: 3px 9px;
          border-radius: 20px;
        }
        .sec-body { padding: 20px 22px; }
        .lead-callout {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--client-green-wash, #F5F7F6);
          border-radius: 10px;
          padding: 16px 18px;
          margin-bottom: 18px;
        }
        .lead-num {
          font-size: 48px;
          font-weight: 700;
          color: var(--client-green, #324438);
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .lead-title { font-size: 14px; font-weight: 600; }
        .lead-meta {
          font-size: 12px;
          color: var(--text-muted, #8A928A);
          margin-top: 2px;
        }
        .delta.up { color: #166534; font-weight: 600; }
        .delta.down { color: #DC2626; font-weight: 600; }
        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .hbar-section { margin-bottom: 16px; }
        .hbar-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted, #8A928A);
          margin-bottom: 10px;
        }
        .hbar-list { display: flex; flex-direction: column; gap: 9px; }
        .hbar-row { display: flex; align-items: center; gap: 10px; }
        .hbar-lbl {
          font-size: 12px;
          color: var(--text-secondary);
          width: 120px;
          flex-shrink: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hbar-track {
          flex: 1;
          height: 8px;
          background: var(--border-light, #E8EDE7);
          border-radius: 4px;
          overflow: hidden;
        }
        .hbar-fill { height: 100%; border-radius: 4px; }
        .hbar-count {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          width: 32px;
          text-align: right;
          flex-shrink: 0;
        }
        .chart-outer { position: relative; }
        .chart-y-axis {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-end;
          padding-right: 6px;
          width: 28px;
        }
        .chart-y-axis.small span { font-size: 9px; }
        .chart-y-axis span { font-size: 10px; color: var(--text-muted, #8A928A); line-height: 1; }
        .chart-area { padding-left: 32px; }
        .chart-area svg { width: 100%; display: block; overflow: visible; }
        .chart-x-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 5px;
        }
        .chart-x-labels span {
          font-size: 10px;
          color: var(--text-muted, #8A928A);
          text-align: center;
        }
        .chart-x-labels span.now { font-weight: 600; color: var(--text-primary, #1A1F16); }
        @media (max-width: 768px) {
          .grid2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function ReviewManagementSection({ data }: { data: ReviewManagementData }) {
  // Platform colors for grouped bar chart
  const platformColors: Record<string, string> = {
    Google: '#324438',
    Facebook: '#2563EB',
    Yelp: '#DE393A',
    Other: '#7a9e8a',
  }

  // Prepare monthly data for grouped bar chart
  const hasMonthlyReviews = data.monthlyReviews && data.monthlyReviews.length >= 2
  const chartHeight = 80
  const maxReviews = hasMonthlyReviews
    ? Math.max(...data.monthlyReviews!.flatMap(m => [m.google ?? 0, m.facebook ?? 0, m.yelp ?? 0])) * 1.2
    : 10

  // Get platforms used in pill
  const platformNames = data.platforms.map(p => p.platform).join(' · ')

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Review Management
        </h3>
        <span className="sec-pill">{platformNames}</span>
      </div>
      <div className="sec-body">
        {/* Rating rows */}
        {data.platforms.map((p, i) => {
          const ratingChange = p.currentRating - p.previousRating
          const fullStars = Math.floor(p.currentRating)
          const hasHalfStar = p.currentRating - fullStars >= 0.5
          const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

          return (
            <div key={i} className="review-row">
              <div className="review-plat-name">{p.platform}</div>
              <div className="review-stars">
                {Array(fullStars).fill(0).map((_, si) => (
                  <span key={si} className="star">★</span>
                ))}
                {hasHalfStar && <span className="star">★</span>}
                {Array(emptyStars).fill(0).map((_, si) => (
                  <span key={`e${si}`} className="star empty">★</span>
                ))}
                <span className="review-rating">{p.currentRating.toFixed(1)}</span>
              </div>
              <span className={`review-delta ${ratingChange > 0 ? 'up' : ratingChange === 0 ? 'same' : 'down'}`}>
                {ratingChange > 0 ? `↑ from ${p.previousRating.toFixed(1)}` : ratingChange === 0 ? '→ unchanged' : `↓ from ${p.previousRating.toFixed(1)}`}
              </span>
              <div className="review-counts">
                <div className="review-new">+{p.newThisPeriod} new reviews</div>
                <div className="review-total">{p.currentTotal} total</div>
              </div>
            </div>
          )
        })}

        {/* Grouped bar chart for monthly reviews */}
        {hasMonthlyReviews && (
          <div className="chart-section">
            <div className="chart-title">New reviews per month since campaign start</div>
            <div className="gbar-chart" style={{ height: chartHeight }}>
              {data.monthlyReviews!.map((m, i) => {
                const gHeight = ((m.google ?? 0) / maxReviews) * chartHeight
                const fbHeight = ((m.facebook ?? 0) / maxReviews) * chartHeight
                return (
                  <div key={i} className="gbar-col">
                    <div className="gbar-bar" style={{ height: gHeight, background: '#324438' }} title={`Google: ${m.google ?? 0}`} />
                    <div className="gbar-bar" style={{ height: fbHeight, background: '#2563EB' }} title={`Facebook: ${m.facebook ?? 0}`} />
                  </div>
                )
              })}
            </div>
            <div className="chart-x-labels">
              {data.monthlyReviews!.map((m, i) => (
                <span key={i} className={m.isCampaignStart ? 'start-month' : m.isPreCampaign ? 'pre' : ''}>
                  {m.month.substring(0, 3)}
                </span>
              ))}
            </div>
            <div className="chart-legend">
              {data.platforms.map((p, i) => (
                <div key={i} className="legend-item">
                  <div className="legend-dot" style={{ background: platformColors[p.platform] || '#7a9e8a' }} />
                  {p.platform}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .sec {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          overflow: hidden;
        }
        .sec-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border-light);
        }
        .sec-hdr h3 {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .sec-hdr h3 :global(svg) { color: var(--client-green); }
        .sec-pill {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          padding: 3px 9px;
          border-radius: 20px;
        }
        .sec-body { padding: 20px 22px; }

        /* Review row layout */
        .review-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid var(--border-light);
        }
        .review-row:last-of-type { border-bottom: none; }
        .review-plat-name {
          font-size: 13px;
          font-weight: 600;
          width: 80px;
          flex-shrink: 0;
        }
        .review-stars {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .star {
          color: #D97706;
          font-size: 14px;
        }
        .star.empty {
          color: var(--border-light);
        }
        .review-rating {
          font-size: 18px;
          font-weight: 700;
          margin-left: 6px;
        }
        .review-delta {
          font-size: 11px;
          font-weight: 600;
          margin-left: 8px;
        }
        .review-delta.up { color: #166534; }
        .review-delta.same { color: var(--text-muted); }
        .review-delta.down { color: #991B1B; }
        .review-counts {
          margin-left: auto;
          text-align: right;
          flex-shrink: 0;
        }
        .review-new {
          font-size: 13px;
          font-weight: 700;
        }
        .review-total {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* Grouped bar chart */
        .chart-section { margin-top: 16px; }
        .chart-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .gbar-chart {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          border-bottom: 1px solid var(--border-light);
          position: relative;
        }
        .gbar-col {
          flex: 1;
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 100%;
          justify-content: center;
        }
        .gbar-bar {
          flex: 1;
          max-width: 22px;
          border-radius: 3px 3px 0 0;
          min-height: 2px;
        }
        .chart-x-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 5px;
          margin-bottom: 10px;
        }
        .chart-x-labels span {
          flex: 1;
          text-align: center;
          font-size: 10px;
          color: var(--text-muted);
        }
        .chart-x-labels span.start-month {
          color: #D97706;
          font-weight: 600;
        }
        .chart-x-labels span.pre {
          opacity: 0.4;
        }
        .chart-legend {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}

function ContentWritingSection({ data }: { data: ContentWritingData }) {
  const totalWords = data.articles.reduce((sum, a) => sum + a.wordCount, 0)

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
          Content Writing
        </div>
        <span className="section-badge">{data.articles.length} articles • {formatNumber(totalWords)} words</span>
      </div>
      <div className="articles-list">
        {data.articles.map((article, i) => (
          <div key={i} className="article-row">
            <div className="article-info">
              <h4>{article.title}</h4>
              <div className="article-meta">
                <span>{article.publishedDate}</span>
                <span>•</span>
                <span>{formatNumber(article.wordCount)} words</span>
                {article.targetKeyword && (
                  <>
                    <span>•</span>
                    <span className="keyword-tag">{article.targetKeyword}</span>
                  </>
                )}
              </div>
            </div>
            {article.url && (
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="article-link">
                View
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
        ))}
      </div>
      <style jsx>{`
        .section-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 24px;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .section-icon { color: var(--client-green); }
        .section-badge {
          padding: 4px 10px;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .articles-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .article-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 10px;
        }
        .article-info h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 6px;
        }
        .article-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .keyword-tag {
          padding: 2px 8px;
          background: var(--client-green-wash);
          color: var(--client-green);
          border-radius: 4px;
          font-weight: 500;
        }
        .article-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          color: var(--client-green);
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.15s;
        }
        .article-link:hover {
          border-color: var(--client-green);
        }
      `}</style>
    </div>
  )
}

function AiVisibilitySection({ data }: { data: AiVisibilityData }) {
  const mentionedCount = data.platforms.filter(p => p.mentioned).length

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
              <circle cx="8" cy="14" r="1.5" />
              <circle cx="16" cy="14" r="1.5" />
            </svg>
          </span>
          AI Visibility
        </div>
        <span className="section-badge">{mentionedCount}/{data.platforms.length} platforms</span>
      </div>
      <div className="platforms-grid">
        {data.platforms.map((p, i) => {
          const sentimentColors = {
            positive: { bg: '#DCFCE7', color: '#166534' },
            neutral: { bg: '#F3F4F6', color: '#6B7280' },
            negative: { bg: '#FEE2E2', color: '#DC2626' },
          }
          const colors = p.sentiment ? sentimentColors[p.sentiment] : sentimentColors.neutral
          return (
            <div key={i} className={`platform-card ${p.mentioned ? 'mentioned' : 'not-mentioned'}`}>
              <div className="platform-header">
                <span className="platform-name">{p.platform}</span>
                <span className={`mention-status ${p.mentioned ? 'yes' : 'no'}`}>
                  {p.mentioned ? '✓ Mentioned' : '✗ Not Found'}
                </span>
              </div>
              {p.mentioned && (
                <div className="platform-details">
                  {p.sentiment && (
                    <span className="sentiment-badge" style={{ background: colors.bg, color: colors.color }}>
                      {p.sentiment}
                    </span>
                  )}
                  {p.rankPosition && (
                    <span className="rank-badge">{p.rankPosition}</span>
                  )}
                  {p.visibilityScore !== undefined && (
                    <div className="visibility-score">
                      <div className="score-bar">
                        <div className="score-fill" style={{ width: `${p.visibilityScore}%` }} />
                      </div>
                      <span>{p.visibilityScore}%</span>
                    </div>
                  )}
                </div>
              )}
              {p.notes && <div className="platform-notes">{p.notes}</div>}
            </div>
          )
        })}
      </div>
      {data.notes && (
        <div className="notes">{data.notes}</div>
      )}
      <style jsx>{`
        .section-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 24px;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .section-icon { color: var(--client-green); }
        .section-badge {
          padding: 4px 10px;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .platforms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }
        .platform-card {
          padding: 16px;
          border-radius: 10px;
          border: 1px solid var(--border-light);
        }
        .platform-card.mentioned {
          background: #DCFCE7;
          border-color: #86EFAC;
        }
        .platform-card.not-mentioned {
          background: var(--bg-page);
        }
        .platform-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .platform-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .mention-status {
          font-size: 11px;
          font-weight: 500;
        }
        .mention-status.yes { color: #166534; }
        .mention-status.no { color: #9CA3AF; }
        .platform-details {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .sentiment-badge {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          text-transform: capitalize;
        }
        .rank-badge {
          padding: 3px 8px;
          background: #DBEAFE;
          color: #2563EB;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        .visibility-score {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 100px;
        }
        .score-bar {
          flex: 1;
          height: 6px;
          background: rgba(0,0,0,0.1);
          border-radius: 3px;
          overflow: hidden;
        }
        .score-fill {
          height: 100%;
          background: #166534;
          border-radius: 3px;
        }
        .visibility-score span {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .platform-notes {
          margin-top: 8px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .notes {
          margin-top: 16px;
          padding: 12px 16px;
          background: #F5F7F6;
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}

function EmailSmsSection({ data }: { data: EmailSmsData }) {
  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </span>
          Email & SMS
        </div>
      </div>
      <div className="channels-grid">
        {data.channels.map((channel, i) => (
          <div key={i} className="channel-card">
            <div className="channel-header">
              <span className={`channel-icon ${channel.channel.toLowerCase()}`}>
                {channel.channel === 'Email' ? '✉️' : '📱'}
              </span>
              <span className="channel-name">{channel.channel}</span>
            </div>
            <div className="channel-stats">
              <div className="stat-row">
                <span>Campaigns Sent</span>
                <span className="stat-value">{channel.campaignsSent}</span>
              </div>
              <div className="stat-row">
                <span>Delivered</span>
                <span className="stat-value">{formatNumber(channel.delivered)}</span>
              </div>
              {channel.openRate !== undefined && (
                <div className="stat-row">
                  <span>Open Rate</span>
                  <span className="stat-value">{channel.openRate.toFixed(1)}%</span>
                </div>
              )}
              {channel.clickRate !== undefined && (
                <div className="stat-row">
                  <span>Click Rate</span>
                  <span className="stat-value">{channel.clickRate.toFixed(1)}%</span>
                </div>
              )}
              {channel.leadsGenerated !== undefined && (
                <div className="stat-row highlight">
                  <span>Leads Generated</span>
                  <span className="stat-value">{channel.leadsGenerated}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .section-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 24px;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .section-icon { color: var(--client-green); }
        .channels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .channel-card {
          padding: 20px;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 12px;
        }
        .channel-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .channel-icon {
          font-size: 20px;
        }
        .channel-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .channel-stats {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .stat-row.highlight {
          padding: 8px 10px;
          background: var(--client-green-wash);
          border-radius: 6px;
          margin-top: 4px;
        }
        .stat-value {
          font-weight: 600;
          color: var(--text-primary);
        }
        .stat-row.highlight .stat-value {
          color: var(--client-green);
        }
      `}</style>
    </div>
  )
}

function LocalSeoSection({ data }: { data: LocalSeoData }) {
  return (
    <div className="sec">
      <div className="sec-hdr">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Local SEO &amp; GBP
        </h3>
        <span className="sec-pill">Google Business Profile</span>
      </div>
      <div className="sec-body">
        <div className="gbp-row">
          {data.monthlyPosts.map((post, i) => (
            <div key={i} className="gbp-cell">
              <div className="gbp-mo">{post.month.substring(0, 3)}</div>
              <div className="gbp-n">{post.count}</div>
              <div className="gbp-u">posts</div>
            </div>
          ))}
        </div>
        {data.notes && (
          <p className="gbp-notes">{data.notes}</p>
        )}
      </div>
      <style jsx>{`
        .sec {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          overflow: hidden;
        }
        .sec-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border-light);
        }
        .sec-hdr h3 {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .sec-hdr h3 :global(svg) { color: var(--client-green); }
        .sec-pill {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          padding: 3px 9px;
          border-radius: 20px;
        }
        .sec-body { padding: 20px 22px; }
        .gbp-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 9px;
        }
        .gbp-cell {
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          padding: 12px 10px;
          text-align: center;
        }
        .gbp-mo {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          margin-bottom: 5px;
        }
        .gbp-n {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }
        .gbp-u {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 1px;
        }
        .gbp-notes {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 12px 0 0;
        }
        @media (max-width: 480px) {
          .gbp-row { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  )
}

function TechnicalAuditSection({ data }: { data: TechnicalAuditData }) {
  const statusConfig: Record<string, { dotColor: string; tagBg: string; tagColor: string; label: string }> = {
    resolved: { dotColor: '#166534', tagBg: '#DCFCE7', tagColor: '#166534', label: 'Resolved' },
    submitted: { dotColor: '#2563EB', tagBg: '#DBEAFE', tagColor: '#2563EB', label: 'Submitted' },
    in_progress: { dotColor: '#D97706', tagBg: '#FEF3C7', tagColor: '#D97706', label: 'In Progress' },
    monitoring: { dotColor: '#6B7280', tagBg: '#F3F4F6', tagColor: '#6B7280', label: 'Monitoring' },
  }

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Technical Health
        </h3>
        <span className="sec-pill">Search Console</span>
      </div>
      <div className="sec-body">
        <div className="tech-list">
          {data.issues.map((issue, i) => {
            const config = statusConfig[issue.status] || statusConfig.monitoring
            return (
              <div key={i} className="tech-row">
                <div className="tech-dot-wrap">
                  <div className="tech-dot" style={{ background: config.dotColor }} />
                </div>
                <div className="tech-body">
                  <strong>{issue.title}</strong>
                  <p>{issue.description}</p>
                </div>
                <span className="tech-tag" style={{ background: config.tagBg, color: config.tagColor }}>
                  {config.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <style jsx>{`
        .sec {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          overflow: hidden;
        }
        .sec-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border-light);
        }
        .sec-hdr h3 {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .sec-hdr h3 :global(svg) { color: var(--client-green); }
        .sec-pill {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          padding: 3px 9px;
          border-radius: 20px;
        }
        .sec-body { padding: 20px 22px; }
        .tech-list {
          display: flex;
          flex-direction: column;
        }
        .tech-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-light);
        }
        .tech-row:last-child { border-bottom: none; }
        .tech-dot-wrap { padding-top: 5px; }
        .tech-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }
        .tech-body { flex: 1; }
        .tech-body strong {
          font-size: 13px;
          font-weight: 600;
          display: block;
          margin-bottom: 2px;
        }
        .tech-body p {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
        }
        .tech-tag {
          padding: 3px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}

function WorkCompletedSection({ data }: { data: WorkCompletedData }) {
  // Group by category
  const grouped = data.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item.description)
    return acc
  }, {} as Record<string, string[]>)

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">{icons.checkCircle}</span>
          Work Completed
        </div>
      </div>
      <div className="work-groups">
        {Object.entries(grouped).map(([category, items], i) => (
          <div key={i} className="work-group">
            <h4>{category}</h4>
            <ul>
              {items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <style jsx>{`
        .section-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 24px;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .section-icon { color: var(--client-green); }
        .work-groups {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .work-group h4 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0 0 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .work-group ul {
          margin: 0;
          padding-left: 20px;
        }
        .work-group li {
          font-size: 14px;
          color: var(--text-primary);
          margin-bottom: 6px;
        }
        .work-group li:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  )
}

function ComingNextSection({ data }: { data: ComingNextData }) {
  const iconColors: Record<string, { bg: string; color: string }> = {
    blue: { bg: '#DBEAFE', color: '#2563EB' },
    teal: { bg: '#E6F4F5', color: '#0B7277' },
    green: { bg: '#DCFCE7', color: '#166534' },
    orange: { bg: '#FBE9E9', color: '#DE393A' },
    purple: { bg: '#EDE9FE', color: '#7C3AED' },
    amber: { bg: '#FEF3C7', color: '#D97706' },
  }

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Coming Next
        </h3>
        <span className="sec-pill">Next 90 days</span>
      </div>
      <div className="sec-body">
        <div className="next-grid">
          {data.items.map((item, i) => {
            const colors = iconColors[item.iconColor] || iconColors.blue
            return (
              <div key={i} className="next-card">
                <div className="next-card-top">
                  <div className="next-icon" style={{ background: colors.bg, color: colors.color }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                  </div>
                  <h4>{item.title}</h4>
                </div>
                <p>{item.description}</p>
              </div>
            )
          })}
        </div>
      </div>
      <style jsx>{`
        .sec {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          overflow: hidden;
        }
        .sec-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border-light);
        }
        .sec-hdr h3 {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .sec-hdr h3 :global(svg) { color: var(--client-green); }
        .sec-pill {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          padding: 3px 9px;
          border-radius: 20px;
        }
        .sec-body { padding: 20px 22px; }

        /* Next grid */
        .next-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .next-card {
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          padding: 16px 18px;
        }
        .next-card-top {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 7px;
        }
        .next-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .next-card h4 {
          font-size: 13px;
          font-weight: 600;
          margin: 0;
        }
        .next-card p {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.55;
          margin: 0;
        }

        @media (max-width: 640px) {
          .next-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function ManagerNote({ note, managerName }: { note: string; managerName: string | null }) {
  const firstName = managerName?.split(' ')[0] || 'Team'
  return (
    <div className="mgr-note">
      <div className="mgr-avatar">
        {getInitials(managerName)}
      </div>
      <div className="mgr-body">
        <p>&ldquo;{note}&rdquo;</p>
        <div className="mgr-sig">
          {firstName} <span>· Campaign Manager, Pyrus Digital Media</span>
        </div>
      </div>
      <style jsx>{`
        .mgr-note {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 20px 22px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .mgr-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--client-green);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: white;
          flex-shrink: 0;
        }
        .mgr-body {
          flex: 1;
        }
        .mgr-body p {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.65;
          font-style: italic;
          margin: 0 0 8px;
        }
        .mgr-sig {
          font-size: 12px;
          font-weight: 600;
        }
        .mgr-sig span {
          font-weight: 400;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}

export default ReportsView

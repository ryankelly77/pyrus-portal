'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type SectionType,
  type SearchVisibilityData,
  type OrganicTrafficData,
  type KeywordRankingsData,
  type KeywordGrowthData,
  type LinkBuildingData,
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
// COMPONENT
// ============================================================================

export function ReportsView({ clientId, previewReportId }: ReportsViewProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch reports list
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/client/reports?clientId=${clientId}`)
      if (!res.ok) throw new Error('Failed to fetch reports')
      const data = await res.json()
      setReports(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  // Fetch single report with sections
  const fetchReport = useCallback(async (reportId: string, isPreview = false) => {
    try {
      setLoadingReport(true)
      const url = isPreview
        ? `/api/client/reports/${reportId}?preview=true`
        : `/api/client/reports/${reportId}?clientId=${clientId}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch report')
      const data = await res.json()
      setSelectedReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoadingReport(false)
    }
  }, [clientId])

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
          gap: 12px;
        }
        .report-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          width: 100%;
        }
        .report-card:hover {
          border-color: var(--client-green);
          box-shadow: 0 2px 8px rgba(50, 68, 56, 0.08);
        }
        .report-card-icon {
          width: 44px;
          height: 44px;
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
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px;
        }
        .report-card-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
          flex-wrap: wrap;
        }
        .report-card-meta .dot {
          color: var(--text-muted);
        }
        .report-card-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .badge {
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 6px;
        }
        .badge-new {
          background: var(--success);
          color: white;
          animation: pulse 2s infinite;
        }
        .badge-published {
          background: transparent;
          color: var(--success);
          border: 1px solid var(--success);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
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
  const localSeo = getSectionData<LocalSeoData>('local_seo')
  const technicalAudit = getSectionData<TechnicalAuditData>('technical_audit')
  const workCompleted = getSectionData<WorkCompletedData>('work_completed')
  const comingNext = getSectionData<ComingNextData>('coming_next')

  // Build KPI cards from available data
  const kpiCards: Array<{
    icon: React.ReactNode
    iconClass: string
    label: string
    value: string
    change: { formatted: string; trend: 'up' | 'down' | 'neutral' }
    previousLabel: string
  }> = []

  if (searchVisibility) {
    kpiCards.push({
      icon: icons.impressions,
      iconClass: 'blue',
      label: 'Impressions',
      value: formatNumber(searchVisibility.currentImpressions),
      change: calculateChange(searchVisibility.currentImpressions, searchVisibility.previousImpressions),
      previousLabel: `Was ${formatNumber(searchVisibility.previousImpressions)} last period`
    })
    kpiCards.push({
      icon: icons.clicks,
      iconClass: 'green',
      label: 'Clicks',
      value: formatNumber(searchVisibility.currentClicks),
      change: calculateChange(searchVisibility.currentClicks, searchVisibility.previousClicks),
      previousLabel: `Was ${formatNumber(searchVisibility.previousClicks)} last period`
    })
  }

  if (organicTraffic) {
    kpiCards.push({
      icon: icons.users,
      iconClass: 'teal',
      label: 'Organic Users',
      value: formatNumber(organicTraffic.currentUsers),
      change: calculateChange(organicTraffic.currentUsers, organicTraffic.previousUsers),
      previousLabel: `Was ${formatNumber(organicTraffic.previousUsers)} last period`
    })
  }

  if (keywordGrowth && keywordGrowth.months.length > 0) {
    const latestMonth = keywordGrowth.months[keywordGrowth.months.length - 1]
    const totalKeywords = latestMonth.top3 + latestMonth.pos4to20 + latestMonth.pos21to50 + latestMonth.pos51to100
    const previousMonth = keywordGrowth.months.length > 1 ? keywordGrowth.months[keywordGrowth.months.length - 2] : null
    const previousTotal = previousMonth
      ? previousMonth.top3 + previousMonth.pos4to20 + previousMonth.pos21to50 + previousMonth.pos51to100
      : totalKeywords
    kpiCards.push({
      icon: icons.keywords,
      iconClass: 'purple',
      label: 'Keywords Ranking',
      value: formatNumber(totalKeywords),
      change: calculateChange(totalKeywords, previousTotal),
      previousLabel: `Was ${formatNumber(previousTotal)} last month`
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
            <span className="tag">Published {formatDate(report.published_at!)}</span>
            {report.manager_name && <span className="tag">{report.manager_name}</span>}
          </div>
        </div>
        <div className="report-header-right">
          <div className="campaign-month">{report.campaign_month}</div>
          <div className="campaign-label">months active</div>
        </div>
      </div>

      {/* KPI Summary Row */}
      {kpiCards.length > 0 && (
        <div className="kpi-row">
          {kpiCards.slice(0, 4).map((kpi, i) => (
            <div key={i} className="kpi-card">
              <div className={`kpi-icon ${kpi.iconClass}`}>{kpi.icon}</div>
              <div className={`kpi-change ${kpi.change.trend}`}>{kpi.change.formatted}</div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-previous">{kpi.previousLabel}</div>
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
      </div>

      <style jsx>{`
        .report-detail {
          padding: 24px 0;
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
          padding: 28px 32px;
          background: #324438;
          border-radius: 14px;
          margin-bottom: 24px;
        }
        .report-header-left h1 {
          font-size: 22px;
          font-weight: 600;
          color: white;
          margin: 0 0 4px;
        }
        .report-header-left .period {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 12px;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tag {
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.9);
        }
        .report-header-right {
          text-align: right;
        }
        .campaign-month {
          font-size: 48px;
          font-weight: 700;
          color: white;
          line-height: 1;
        }
        .campaign-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 4px;
        }
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .kpi-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 20px;
          position: relative;
        }
        .kpi-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          margin-bottom: 12px;
        }
        .kpi-icon.blue { background: #DBEAFE; color: #2563EB; }
        .kpi-icon.green { background: #DCFCE7; color: #166534; }
        .kpi-icon.teal { background: #E6F4F5; color: #0B7277; }
        .kpi-icon.purple { background: #EDE9FE; color: #7C3AED; }
        .kpi-change {
          position: absolute;
          top: 20px;
          right: 20px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }
        .kpi-change.up { background: #DCFCE7; color: #166534; }
        .kpi-change.down { background: #FEE2E2; color: #DC2626; }
        .kpi-change.neutral { background: #F3F4F6; color: #6B7280; }
        .kpi-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }
        .kpi-label {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 4px;
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

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">{icons.impressions}</span>
          Search Visibility
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
        .section-icon {
          color: var(--client-green);
        }
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
        .metric-change {
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }
        .metric-change.up { background: #DCFCE7; color: #166534; }
        .metric-change.down { background: #FEE2E2; color: #DC2626; }
        .metric-change.neutral { background: #F3F4F6; color: #6B7280; }
        @media (max-width: 640px) {
          .metrics-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function OrganicTrafficSection({ data, periodLabel }: { data: OrganicTrafficData; periodLabel: string }) {
  const metrics = [
    { label: 'Users', current: data.currentUsers, previous: data.previousUsers },
  ]
  if (data.currentSessions !== undefined && data.previousSessions !== undefined) {
    metrics.push({ label: 'Sessions', current: data.currentSessions, previous: data.previousSessions })
  }

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">{icons.users}</span>
          Organic Traffic
        </div>
        <span className="section-badge">{periodLabel}</span>
      </div>
      <div className="metrics-grid" style={{ gridTemplateColumns: metrics.length === 1 ? '1fr' : 'repeat(2, 1fr)' }}>
        {metrics.map((m, i) => {
          const change = calculateChange(m.current, m.previous)
          return (
            <div key={i} className="metric-tile">
              <div className="metric-label">{m.label}</div>
              <div className="metric-value">{formatNumber(m.current)}</div>
              <div className="metric-compare">
                vs {formatNumber(m.previous)}
                <span className={`metric-change ${change.trend}`}>{change.formatted}</span>
              </div>
            </div>
          )
        })}
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
        .metrics-grid {
          display: grid;
          gap: 16px;
        }
        .metric-tile {
          padding: 16px;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 10px;
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
        .metric-change {
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }
        .metric-change.up { background: #DCFCE7; color: #166534; }
        .metric-change.down { background: #FEE2E2; color: #DC2626; }
        .metric-change.neutral { background: #F3F4F6; color: #6B7280; }
      `}</style>
    </div>
  )
}

function KeywordRankingsSection({ data }: { data: KeywordRankingsData }) {
  const rankings = [
    { label: 'Top 3', count: data.top3, delta: data.top3Delta },
    { label: 'Top 10', count: data.top10, delta: data.top10Delta },
    { label: 'Top 20', count: data.top20, delta: data.top20Delta },
    { label: 'Top 30', count: data.top30, delta: data.top30Delta },
    { label: 'Top 100', count: data.top100, delta: data.top100Delta },
    { label: 'Keywords Up', count: data.totalImproved, delta: 0, isSpecial: true },
  ]

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">{icons.keywords}</span>
          Keyword Rankings
        </div>
        <span className="section-badge">{data.totalTracked} tracked keywords</span>
      </div>
      <div className="context-note">
        Where your {data.totalTracked} tracked keywords currently rank in Google.
      </div>
      <div className="rankings-grid">
        {rankings.map((r, i) => (
          <div key={i} className={`rank-tile ${r.isSpecial ? 'special' : ''}`}>
            <div className="rank-label">{r.label}</div>
            <div className="rank-count">{r.count}</div>
            <div className="rank-of">of {data.totalTracked}</div>
            {r.delta !== 0 && (
              <div className="rank-delta">+{r.delta} since start</div>
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
        .rankings-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .rank-tile {
          padding: 16px;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          text-align: center;
          transition: all 0.15s ease;
        }
        .rank-tile:hover {
          background: var(--client-green-wash);
        }
        .rank-tile.special {
          background: #DCFCE7;
          border-color: #86EFAC;
        }
        .rank-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .rank-count {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .rank-of {
          font-size: 11px;
          color: var(--text-muted);
        }
        .rank-delta {
          font-size: 11px;
          color: #166534;
          margin-top: 6px;
          font-weight: 500;
        }
        @media (max-width: 640px) {
          .rankings-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  )
}

function KeywordGrowthSection({ data }: { data: KeywordGrowthData }) {
  const maxTotal = Math.max(...data.months.map(m => m.top3 + m.pos4to20 + m.pos21to50 + m.pos51to100 + m.serpFeatures))
  const colors = {
    top3: '#166534',
    pos4to20: '#22C55E',
    pos21to50: '#86EFAC',
    pos51to100: '#BBF7D0',
    serpFeatures: '#7C3AED',
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

function LocalSeoSection({ data }: { data: LocalSeoData }) {
  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">{icons.local}</span>
          Local SEO & GBP Posts
        </div>
      </div>
      <div className="posts-grid">
        {data.monthlyPosts.map((post, i) => (
          <div key={i} className="post-tile">
            <div className="post-month">{post.month}</div>
            <div className="post-count">{post.count}</div>
            <div className="post-label">posts</div>
          </div>
        ))}
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
        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 12px;
        }
        .post-tile {
          padding: 16px;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          text-align: center;
        }
        .post-month {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .post-count {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .post-label {
          font-size: 11px;
          color: var(--text-muted);
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

function TechnicalAuditSection({ data }: { data: TechnicalAuditData }) {
  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    resolved: { bg: '#DCFCE7', color: '#166534', label: 'Resolved' },
    submitted: { bg: '#DBEAFE', color: '#2563EB', label: 'Submitted' },
    in_progress: { bg: '#FEF3C7', color: '#92400E', label: 'In Progress' },
    monitoring: { bg: '#F3F4F6', color: '#6B7280', label: 'Monitoring' },
  }

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">{icons.technical}</span>
          Technical Health
        </div>
        <span className="section-badge">Search Console</span>
      </div>
      <div className="issues-list">
        {data.issues.map((issue, i) => {
          const status = statusColors[issue.status] || statusColors.monitoring
          return (
            <div key={i} className="issue-row">
              <div className="issue-dot" style={{ background: status.color }} />
              <div className="issue-content">
                <div className="issue-title">{issue.title}</div>
                <div className="issue-desc">{issue.description}</div>
              </div>
              <span className="issue-status" style={{ background: status.bg, color: status.color }}>
                {status.label}
              </span>
            </div>
          )
        })}
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
        .issues-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .issue-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-page);
          border-radius: 10px;
        }
        .issue-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-top: 5px;
          flex-shrink: 0;
        }
        .issue-content {
          flex: 1;
          min-width: 0;
        }
        .issue-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .issue-desc {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .issue-status {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
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
    orange: { bg: '#FFEDD5', color: '#C2410C' },
    purple: { bg: '#EDE9FE', color: '#7C3AED' },
    amber: { bg: '#FEF3C7', color: '#92400E' },
  }

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">{icons.rocket}</span>
          What We're Working On Next
        </div>
        <span className="section-badge">Next 90 days</span>
      </div>
      <div className="initiatives-grid">
        {data.items.map((item, i) => {
          const colors = iconColors[item.iconColor] || iconColors.blue
          return (
            <div key={i} className="initiative-card">
              <div className="initiative-icon" style={{ background: colors.bg, color: colors.color }}>
                {icons.rocket}
              </div>
              <div className="initiative-content">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            </div>
          )
        })}
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
        .initiatives-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .initiative-card {
          display: flex;
          gap: 14px;
          padding: 16px;
          background: var(--bg-page);
          border: 1px solid var(--border-light);
          border-radius: 10px;
        }
        .initiative-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          flex-shrink: 0;
        }
        .initiative-content {
          flex: 1;
          min-width: 0;
        }
        .initiative-content h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px;
        }
        .initiative-content p {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }
        @media (max-width: 640px) {
          .initiatives-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function ManagerNote({ note, managerName }: { note: string; managerName: string | null }) {
  return (
    <div className="manager-note-card">
      <div className="manager-avatar">
        {getInitials(managerName)}
      </div>
      <div className="note-content">
        <p className="note-text">{note}</p>
        <p className="manager-name">{managerName || 'Your Campaign Manager'}</p>
      </div>
      <style jsx>{`
        .manager-note-card {
          display: flex;
          gap: 16px;
          padding: 24px;
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
        }
        .manager-avatar {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--client-green);
          color: white;
          border-radius: 50%;
          font-size: 16px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .note-content {
          flex: 1;
        }
        .note-text {
          font-size: 15px;
          font-style: italic;
          color: var(--text-primary);
          line-height: 1.6;
          margin: 0 0 12px;
        }
        .manager-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          margin: 0;
        }
      `}</style>
    </div>
  )
}

export default ReportsView

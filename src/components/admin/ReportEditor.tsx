'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  SECTION_TYPES,
  SECTION_LABELS,
  SECTION_NAV_GROUPS,
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
  manager_note: string | null
  client?: {
    id: string
    name: string
  }
  sections: Section[]
}

interface Section {
  id: string
  report_id: string
  section_type: string
  sort_order: number
  data: Record<string, unknown>
  notes: string | null
}

interface ReportEditorProps {
  reportId: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getEmptyData(sectionType: SectionType): Record<string, unknown> {
  switch (sectionType) {
    case 'search_visibility':
      return {
        currentImpressions: 0,
        previousImpressions: 0,
        currentClicks: 0,
        previousClicks: 0,
        currentCTR: 0,
        previousCTR: 0,
        currentAvgPosition: 0,
        previousAvgPosition: 0,
        monthlyHistory: [],
      }
    case 'organic_traffic':
      return {
        currentUsers: 0,
        previousUsers: 0,
        currentSessions: 0,
        previousSessions: 0,
        monthlyHistory: [],
      }
    case 'keyword_rankings':
      return {
        totalTracked: 0,
        top3: 0, top3Delta: 0,
        top10: 0, top10Delta: 0,
        top20: 0, top20Delta: 0,
        top30: 0, top30Delta: 0,
        top100: 0, top100Delta: 0,
        totalImproved: 0,
        notRanking: 0,
      }
    case 'keyword_growth':
      return { months: [] }
    case 'link_building':
      return { campaignTotal: 0, monthlyBreakdown: [], months: [] }
    case 'paid_search':
      return {
        currentSpend: 0, previousSpend: 0,
        currentConversions: 0, previousConversions: 0,
        currentCPL: 0, previousCPL: 0,
        currentCTR: 0, previousCTR: 0,
        currentImpressions: 0, previousImpressions: 0,
        currentClicks: 0, previousClicks: 0,
        months: [],
      }
    case 'paid_social':
      return {
        currentSpend: 0, previousSpend: 0,
        currentConversions: 0, previousConversions: 0,
        currentCPL: 0, previousCPL: 0,
        currentImpressions: 0, previousImpressions: 0,
        platforms: [],
        months: [],
      }
    case 'local_service_ads':
      return {
        currentLeads: 0, previousLeads: 0,
        currentSpend: 0, previousSpend: 0,
        currentCPL: 0, previousCPL: 0,
        currentRating: 0, totalReviews: 0,
        notes: '',
      }
    case 'organic_social':
      return {
        platforms: [],
        monthlyPosts: [],
        followerHistory: [],
      }
    case 'lead_tracking':
      return {
        currentLeads: 0, previousLeads: 0,
        currentFormSubmissions: 0, previousFormSubmissions: 0,
        currentPhoneCalls: 0, previousPhoneCalls: 0,
        currentWebChat: 0, previousWebChat: 0,
        leadSources: [],
        monthlyLeads: [],
      }
    case 'review_management':
      return {
        platforms: [],
        monthlyReviews: [],
      }
    case 'content_writing':
      return { articles: [] }
    case 'ai_visibility':
      return {
        platforms: [],
        queriesTracked: 0,
        queriesMentioned: 0,
        notes: '',
      }
    case 'email_sms':
      return {
        channels: [],
        monthlySends: [],
      }
    case 'local_seo':
      return { monthlyPosts: [], notes: '' }
    case 'technical_audit':
      return { issues: [] }
    case 'work_completed':
      return { items: [] }
    case 'coming_next':
      return { items: [] }
    default:
      return {}
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReportEditor({ reportId }: ReportEditorProps) {
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Section data state - keyed by section type
  const [sectionData, setSectionData] = useState<Record<SectionType, Record<string, unknown>>>(() => {
    const initial: Record<string, Record<string, unknown>> = {}
    SECTION_TYPES.forEach(type => {
      initial[type] = getEmptyData(type)
    })
    return initial as Record<SectionType, Record<string, unknown>>
  })

  // Track which sections have been saved
  const [savedSections, setSavedSections] = useState<Set<SectionType>>(new Set())

  // Track saving state per section
  const [savingSection, setSavingSection] = useState<SectionType | null>(null)
  const [savedFlash, setSavedFlash] = useState<SectionType | null>(null)

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)

  // Section refs for scrolling
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Fetch report data
  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/admin/reports/${reportId}`)
      if (!res.ok) throw new Error('Failed to fetch report')
      const data: Report = await res.json()
      setReport(data)

      // Populate section data from existing sections
      const existingSections = new Set<SectionType>()
      const newSectionData = { ...sectionData }

      data.sections.forEach(section => {
        const type = section.section_type as SectionType
        if (SECTION_TYPES.includes(type)) {
          newSectionData[type] = section.data as Record<string, unknown>
          existingSections.add(type)
        }
      })

      setSectionData(newSectionData)
      setSavedSections(existingSections)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report')
    } finally {
      setIsLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // Save a section
  const saveSection = async (sectionType: SectionType) => {
    if (savingSection) return

    try {
      setSavingSection(sectionType)
      const res = await fetch(`/api/admin/reports/${reportId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionType,
          sortOrder: SECTION_TYPES.indexOf(sectionType),
          data: sectionData[sectionType],
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save section')
      }

      setSavedSections(prev => new Set([...Array.from(prev), sectionType]))
      setSavedFlash(sectionType)
      setTimeout(() => setSavedFlash(null), 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save section')
    } finally {
      setSavingSection(null)
    }
  }

  // Publish report
  const handlePublish = async () => {
    try {
      setIsPublishing(true)
      const res = await fetch(`/api/admin/reports/${reportId}/publish`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to publish report')
      }

      const updatedReport = await res.json()
      setReport(updatedReport)
      setShowPublishConfirm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish report')
    } finally {
      setIsPublishing(false)
    }
  }

  // Scroll to section
  const scrollToSection = (sectionType: SectionType) => {
    const ref = sectionRefs.current[sectionType]
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Update section data helper
  const updateSectionData = <T extends SectionType>(
    sectionType: T,
    updates: Partial<Record<string, unknown>>
  ) => {
    setSectionData(prev => ({
      ...prev,
      [sectionType]: { ...prev[sectionType], ...updates },
    }))
  }

  if (isLoading) {
    return (
      <div className="report-editor-loading">
        <div className="spinner"></div>
        <p>Loading report...</p>
        <style jsx>{`
          .report-editor-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            color: var(--text-secondary);
          }
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--border-light);
            border-top-color: var(--pyrus-brown, #885430);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 12px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="report-editor-error">
        <p>{error || 'Report not found'}</p>
        <Link href="/admin/clients" className="btn btn-secondary">
          Back to Clients
        </Link>
        <style jsx>{`
          .report-editor-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
            color: var(--text-secondary);
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="report-editor">
      {/* Top Bar */}
      <div className="report-editor-topbar">
        <div className="topbar-left">
          <Link href={`/admin/clients/${report.client_id}`} className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back to {report.client?.name || 'Client'}
          </Link>
          <div className="report-info">
            <h1>{report.title}</h1>
            <span className="period-label">{report.period_label}</span>
            <span className={`status-badge ${report.status}`}>
              {report.status === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>
        <div className="topbar-right">
          <a
            href={`/results?reportPreview=${reportId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Preview
          </a>
          <button
            className="btn btn-primary"
            onClick={() => setShowPublishConfirm(true)}
            disabled={report.status === 'published'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {report.status === 'published' ? 'Published' : 'Publish Report'}
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="report-editor-layout">
        {/* Left Navigation */}
        <aside className="section-nav">
          <h3>Sections</h3>
          <nav>
            {SECTION_NAV_GROUPS.map(group => (
              <div key={group.label} className="nav-group">
                <div className="nav-group-label">{group.label}</div>
                {group.sections.map(type => (
                  <button
                    key={type}
                    className="section-nav-item"
                    onClick={() => scrollToSection(type)}
                  >
                    <span className="section-nav-label">{SECTION_LABELS[type]}</span>
                    {savedSections.has(type) && (
                      <svg className="section-nav-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="section-content">
          {/* Search Visibility */}
          <SectionCard
            type="search_visibility"
            label={SECTION_LABELS.search_visibility}
            isSaved={savedSections.has('search_visibility')}
            isSaving={savingSection === 'search_visibility'}
            showSavedFlash={savedFlash === 'search_visibility'}
            onSave={() => saveSection('search_visibility')}
            ref={(el) => { sectionRefs.current.search_visibility = el }}
          >
            <SearchVisibilityForm
              data={sectionData.search_visibility as unknown as SearchVisibilityData}
              onChange={(updates) => updateSectionData('search_visibility', updates)}
            />
          </SectionCard>

          {/* Organic Traffic */}
          <SectionCard
            type="organic_traffic"
            label={SECTION_LABELS.organic_traffic}
            isSaved={savedSections.has('organic_traffic')}
            isSaving={savingSection === 'organic_traffic'}
            showSavedFlash={savedFlash === 'organic_traffic'}
            onSave={() => saveSection('organic_traffic')}
            ref={(el) => { sectionRefs.current.organic_traffic = el }}
          >
            <OrganicTrafficForm
              data={sectionData.organic_traffic as unknown as OrganicTrafficData}
              onChange={(updates) => updateSectionData('organic_traffic', updates)}
            />
          </SectionCard>

          {/* Keyword Rankings */}
          <SectionCard
            type="keyword_rankings"
            label={SECTION_LABELS.keyword_rankings}
            isSaved={savedSections.has('keyword_rankings')}
            isSaving={savingSection === 'keyword_rankings'}
            showSavedFlash={savedFlash === 'keyword_rankings'}
            onSave={() => saveSection('keyword_rankings')}
            ref={(el) => { sectionRefs.current.keyword_rankings = el }}
          >
            <KeywordRankingsForm
              data={sectionData.keyword_rankings as unknown as KeywordRankingsData}
              onChange={(updates) => updateSectionData('keyword_rankings', updates)}
            />
          </SectionCard>

          {/* Keyword Growth */}
          <SectionCard
            type="keyword_growth"
            label={SECTION_LABELS.keyword_growth}
            isSaved={savedSections.has('keyword_growth')}
            isSaving={savingSection === 'keyword_growth'}
            showSavedFlash={savedFlash === 'keyword_growth'}
            onSave={() => saveSection('keyword_growth')}
            ref={(el) => { sectionRefs.current.keyword_growth = el }}
          >
            <KeywordGrowthForm
              data={sectionData.keyword_growth as unknown as KeywordGrowthData}
              onChange={(data) => setSectionData(prev => ({ ...prev, keyword_growth: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>

          {/* Link Building */}
          <SectionCard
            type="link_building"
            label={SECTION_LABELS.link_building}
            isSaved={savedSections.has('link_building')}
            isSaving={savingSection === 'link_building'}
            showSavedFlash={savedFlash === 'link_building'}
            onSave={() => saveSection('link_building')}
            ref={(el) => { sectionRefs.current.link_building = el }}
          >
            <LinkBuildingForm
              data={sectionData.link_building as unknown as LinkBuildingData}
              onChange={(data) => setSectionData(prev => ({ ...prev, link_building: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>

          {/* Paid Search */}
          <SectionCard
            type="paid_search"
            label={SECTION_LABELS.paid_search}
            isSaved={savedSections.has('paid_search')}
            isSaving={savingSection === 'paid_search'}
            showSavedFlash={savedFlash === 'paid_search'}
            onSave={() => saveSection('paid_search')}
            ref={(el) => { sectionRefs.current.paid_search = el }}
          >
            <PaidSearchForm
              data={sectionData.paid_search as unknown as PaidSearchData}
              onChange={(data) => setSectionData(prev => ({ ...prev, paid_search: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>

          {/* Paid Social */}
          <SectionCard
            type="paid_social"
            label={SECTION_LABELS.paid_social}
            isSaved={savedSections.has('paid_social')}
            isSaving={savingSection === 'paid_social'}
            showSavedFlash={savedFlash === 'paid_social'}
            onSave={() => saveSection('paid_social')}
            ref={(el) => { sectionRefs.current.paid_social = el }}
          >
            <PaidSocialForm
              data={sectionData.paid_social as unknown as PaidSocialData}
              onChange={(data) => setSectionData(prev => ({ ...prev, paid_social: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>

          {/* Local Service Ads */}
          <SectionCard
            type="local_service_ads"
            label={SECTION_LABELS.local_service_ads}
            isSaved={savedSections.has('local_service_ads')}
            isSaving={savingSection === 'local_service_ads'}
            showSavedFlash={savedFlash === 'local_service_ads'}
            onSave={() => saveSection('local_service_ads')}
            ref={(el) => { sectionRefs.current.local_service_ads = el }}
          >
            <LocalServiceAdsForm
              data={sectionData.local_service_ads as unknown as LocalServiceAdsData}
              onChange={(updates) => updateSectionData('local_service_ads', updates)}
            />
          </SectionCard>

          {/* Organic Social */}
          <SectionCard
            type="organic_social"
            label={SECTION_LABELS.organic_social}
            isSaved={savedSections.has('organic_social')}
            isSaving={savingSection === 'organic_social'}
            showSavedFlash={savedFlash === 'organic_social'}
            onSave={() => saveSection('organic_social')}
            ref={(el) => { sectionRefs.current.organic_social = el }}
          >
            <OrganicSocialForm
              data={sectionData.organic_social as unknown as OrganicSocialData}
              onChange={(data) => setSectionData(prev => ({ ...prev, organic_social: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>

          {/* Lead Tracking */}
          <SectionCard
            type="lead_tracking"
            label={SECTION_LABELS.lead_tracking}
            isSaved={savedSections.has('lead_tracking')}
            isSaving={savingSection === 'lead_tracking'}
            showSavedFlash={savedFlash === 'lead_tracking'}
            onSave={() => saveSection('lead_tracking')}
            ref={(el) => { sectionRefs.current.lead_tracking = el }}
          >
            <LeadTrackingForm
              data={sectionData.lead_tracking as unknown as LeadTrackingData}
              onChange={(updates) => updateSectionData('lead_tracking', updates)}
            />
          </SectionCard>

          {/* Review Management */}
          <SectionCard
            type="review_management"
            label={SECTION_LABELS.review_management}
            isSaved={savedSections.has('review_management')}
            isSaving={savingSection === 'review_management'}
            showSavedFlash={savedFlash === 'review_management'}
            onSave={() => saveSection('review_management')}
            ref={(el) => { sectionRefs.current.review_management = el }}
          >
            <ReviewManagementForm
              data={sectionData.review_management as unknown as ReviewManagementData}
              onChange={(data) => setSectionData(prev => ({ ...prev, review_management: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>

          {/* Content Writing */}
          <SectionCard
            type="content_writing"
            label={SECTION_LABELS.content_writing}
            isSaved={savedSections.has('content_writing')}
            isSaving={savingSection === 'content_writing'}
            showSavedFlash={savedFlash === 'content_writing'}
            onSave={() => saveSection('content_writing')}
            ref={(el) => { sectionRefs.current.content_writing = el }}
          >
            <ContentWritingForm
              data={sectionData.content_writing as unknown as ContentWritingData}
              onChange={(data) => setSectionData(prev => ({ ...prev, content_writing: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>

          {/* AI Visibility */}
          <SectionCard
            type="ai_visibility"
            label={SECTION_LABELS.ai_visibility}
            isSaved={savedSections.has('ai_visibility')}
            isSaving={savingSection === 'ai_visibility'}
            showSavedFlash={savedFlash === 'ai_visibility'}
            onSave={() => saveSection('ai_visibility')}
            ref={(el) => { sectionRefs.current.ai_visibility = el }}
          >
            <AiVisibilityForm
              data={sectionData.ai_visibility as unknown as AiVisibilityData}
              onChange={(data) => setSectionData(prev => ({ ...prev, ai_visibility: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>

          {/* Email & SMS */}
          <SectionCard
            type="email_sms"
            label={SECTION_LABELS.email_sms}
            isSaved={savedSections.has('email_sms')}
            isSaving={savingSection === 'email_sms'}
            showSavedFlash={savedFlash === 'email_sms'}
            onSave={() => saveSection('email_sms')}
            ref={(el) => { sectionRefs.current.email_sms = el }}
          >
            <EmailSmsForm
              data={sectionData.email_sms as unknown as EmailSmsData}
              onChange={(data) => setSectionData(prev => ({ ...prev, email_sms: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>

          {/* Local SEO */}
          <SectionCard
            type="local_seo"
            label={SECTION_LABELS.local_seo}
            isSaved={savedSections.has('local_seo')}
            isSaving={savingSection === 'local_seo'}
            showSavedFlash={savedFlash === 'local_seo'}
            onSave={() => saveSection('local_seo')}
            ref={(el) => { sectionRefs.current.local_seo = el }}
          >
            <LocalSeoForm
              data={sectionData.local_seo as unknown as LocalSeoData}
              onChange={(data) => setSectionData(prev => ({ ...prev, local_seo: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>

          {/* Technical Audit */}
          <SectionCard
            type="technical_audit"
            label={SECTION_LABELS.technical_audit}
            isSaved={savedSections.has('technical_audit')}
            isSaving={savingSection === 'technical_audit'}
            showSavedFlash={savedFlash === 'technical_audit'}
            onSave={() => saveSection('technical_audit')}
            ref={(el) => { sectionRefs.current.technical_audit = el }}
          >
            <TechnicalAuditForm
              data={sectionData.technical_audit as unknown as TechnicalAuditData}
              onChange={(data) => setSectionData(prev => ({ ...prev, technical_audit: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>

          {/* Work Completed */}
          <SectionCard
            type="work_completed"
            label={SECTION_LABELS.work_completed}
            isSaved={savedSections.has('work_completed')}
            isSaving={savingSection === 'work_completed'}
            showSavedFlash={savedFlash === 'work_completed'}
            onSave={() => saveSection('work_completed')}
            ref={(el) => { sectionRefs.current.work_completed = el }}
          >
            <WorkCompletedForm
              data={sectionData.work_completed as unknown as WorkCompletedData}
              onChange={(data) => setSectionData(prev => ({ ...prev, work_completed: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>

          {/* Coming Next */}
          <SectionCard
            type="coming_next"
            label={SECTION_LABELS.coming_next}
            isSaved={savedSections.has('coming_next')}
            isSaving={savingSection === 'coming_next'}
            showSavedFlash={savedFlash === 'coming_next'}
            onSave={() => saveSection('coming_next')}
            ref={(el) => { sectionRefs.current.coming_next = el }}
          >
            <ComingNextForm
              data={sectionData.coming_next as unknown as ComingNextData}
              onChange={(data) => setSectionData(prev => ({ ...prev, coming_next: data as unknown as Record<string, unknown> }))}
            />
          </SectionCard>
        </main>
      </div>

      {/* Publish Confirmation Modal */}
      {showPublishConfirm && (
        <div className="modal-overlay active" onClick={() => setShowPublishConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Publish Report</h2>
              <button className="modal-close" onClick={() => setShowPublishConfirm(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p>This will make the report visible to the client. Continue?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPublishConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? 'Publishing...' : 'Publish Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .report-editor {
          min-height: 100vh;
          background: var(--bg-page);
        }

        .report-editor-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: var(--bg-white);
          border-bottom: 1px solid var(--border-light);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .topbar-left {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: var(--text-secondary);
          text-decoration: none;
        }

        .back-link:hover {
          color: var(--pyrus-brown, #885430);
        }

        .report-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .report-info h1 {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .period-label {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.draft {
          background: #F3F4F6;
          color: #6B7280;
        }

        .status-badge.published {
          background: #D1FAE5;
          color: #059669;
        }

        .topbar-right {
          display: flex;
          gap: 12px;
        }

        .report-editor-layout {
          display: flex;
          gap: 24px;
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .section-nav {
          width: 240px;
          flex-shrink: 0;
          position: sticky;
          top: 100px;
          height: fit-content;
          background: var(--bg-white);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 16px;
        }

        .section-nav h3 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 12px 0;
        }

        .section-nav nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .section-nav-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border: none;
          background: none;
          border-radius: 8px;
          font-size: 14px;
          color: var(--text-primary);
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease;
        }

        .section-nav-item:hover {
          background: var(--bg-page);
        }

        .section-nav-check {
          color: #059669;
        }

        .nav-group {
          margin-bottom: 16px;
        }

        .nav-group-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 4px 12px;
          margin-bottom: 4px;
        }

        .section-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// SECTION CARD COMPONENT
// ============================================================================

import { forwardRef } from 'react'

interface SectionCardProps {
  type: SectionType
  label: string
  isSaved: boolean
  isSaving: boolean
  showSavedFlash: boolean
  onSave: () => void
  children: React.ReactNode
}

const SectionCard = forwardRef<HTMLDivElement, SectionCardProps>(
  ({ type, label, isSaved, isSaving, showSavedFlash, onSave, children }, ref) => {
    return (
      <div className="section-card" ref={ref}>
        <div className="section-card-header">
          <h3>{label}</h3>
          <div className="section-card-status">
            {showSavedFlash && (
              <span className="saved-flash">Saved!</span>
            )}
            <span className={`status-indicator ${isSaved ? 'saved' : 'empty'}`}>
              {isSaved ? 'Saved' : 'Empty'}
            </span>
          </div>
        </div>
        <div className="section-card-body">
          {children}
        </div>
        <div className="section-card-footer">
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Section'}
          </button>
        </div>

        <style jsx>{`
          .section-card {
            background: var(--bg-white);
            border: 1px solid var(--border-light);
            border-radius: 14px;
            overflow: hidden;
          }

          .section-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-light);
            background: #FAFBFA;
          }

          .section-card-header h3 {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
          }

          .section-card-status {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .saved-flash {
            font-size: 13px;
            color: #059669;
            font-weight: 500;
            animation: fadeIn 0.2s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .status-indicator {
            font-size: 12px;
            padding: 4px 10px;
            border-radius: 20px;
          }

          .status-indicator.saved {
            background: #D1FAE5;
            color: #059669;
          }

          .status-indicator.empty {
            background: #F3F4F6;
            color: #6B7280;
          }

          .section-card-body {
            padding: 20px;
          }

          .section-card-footer {
            padding: 16px 20px;
            border-top: 1px solid var(--border-light);
            display: flex;
            justify-content: flex-end;
          }
        `}</style>
      </div>
    )
  }
)

SectionCard.displayName = 'SectionCard'

// ============================================================================
// FORM COMPONENTS
// ============================================================================

// Search Visibility Form
function SearchVisibilityForm({
  data,
  onChange,
}: {
  data: SearchVisibilityData
  onChange: (updates: Partial<SearchVisibilityData>) => void
}) {
  return (
    <div className="two-period-form">
      <div className="period-column">
        <h4>This Period</h4>
        <div className="form-group">
          <label>Impressions</label>
          <input
            type="number"
            className="form-input"
            value={data.currentImpressions || ''}
            onChange={e => onChange({ currentImpressions: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="form-group">
          <label>Clicks</label>
          <input
            type="number"
            className="form-input"
            value={data.currentClicks || ''}
            onChange={e => onChange({ currentClicks: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="form-group">
          <label>CTR %</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            value={data.currentCTR || ''}
            onChange={e => onChange({ currentCTR: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="form-group">
          <label>Avg Position</label>
          <input
            type="number"
            step="0.1"
            className="form-input"
            value={data.currentAvgPosition || ''}
            onChange={e => onChange({ currentAvgPosition: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="period-column">
        <h4>Previous Period</h4>
        <div className="form-group">
          <label>Impressions</label>
          <input
            type="number"
            className="form-input"
            value={data.previousImpressions || ''}
            onChange={e => onChange({ previousImpressions: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="form-group">
          <label>Clicks</label>
          <input
            type="number"
            className="form-input"
            value={data.previousClicks || ''}
            onChange={e => onChange({ previousClicks: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="form-group">
          <label>CTR %</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            value={data.previousCTR || ''}
            onChange={e => onChange({ previousCTR: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="form-group">
          <label>Avg Position</label>
          <input
            type="number"
            step="0.1"
            className="form-input"
            value={data.previousAvgPosition || ''}
            onChange={e => onChange({ previousAvgPosition: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      <style jsx>{`
        .two-period-form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .period-column h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 16px 0;
        }
        .form-group {
          margin-bottom: 12px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .form-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}

// Organic Traffic Form
function OrganicTrafficForm({
  data,
  onChange,
}: {
  data: OrganicTrafficData
  onChange: (updates: Partial<OrganicTrafficData>) => void
}) {
  return (
    <div className="two-period-form">
      <div className="period-column">
        <h4>This Period</h4>
        <div className="form-group">
          <label>Organic Users</label>
          <input
            type="number"
            className="form-input"
            value={data.currentUsers || ''}
            onChange={e => onChange({ currentUsers: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="form-group">
          <label>Sessions (optional)</label>
          <input
            type="number"
            className="form-input"
            value={data.currentSessions || ''}
            onChange={e => onChange({ currentSessions: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="period-column">
        <h4>Previous Period</h4>
        <div className="form-group">
          <label>Organic Users</label>
          <input
            type="number"
            className="form-input"
            value={data.previousUsers || ''}
            onChange={e => onChange({ previousUsers: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="form-group">
          <label>Sessions (optional)</label>
          <input
            type="number"
            className="form-input"
            value={data.previousSessions || ''}
            onChange={e => onChange({ previousSessions: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <style jsx>{`
        .two-period-form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .period-column h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 16px 0;
        }
        .form-group {
          margin-bottom: 12px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .form-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}

// Keyword Rankings Form
function KeywordRankingsForm({
  data,
  onChange,
}: {
  data: KeywordRankingsData
  onChange: (updates: Partial<KeywordRankingsData>) => void
}) {
  return (
    <div className="keyword-rankings-form">
      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label>Total Tracked Keywords</label>
        <input
          type="number"
          className="form-input"
          style={{ maxWidth: '160px' }}
          value={data.totalTracked || ''}
          onChange={e => onChange({ totalTracked: parseInt(e.target.value) || 0 })}
        />
      </div>
      <div className="rankings-grid">
        <div className="grid-header">
          <span>Position</span>
          <span>Current Count</span>
          <span>Delta from Start</span>
        </div>
        {[
          { key: 'top3', label: 'Top 3', deltaKey: 'top3Delta' },
          { key: 'top10', label: 'Top 10', deltaKey: 'top10Delta' },
          { key: 'top20', label: 'Top 20', deltaKey: 'top20Delta' },
          { key: 'top30', label: 'Top 30', deltaKey: 'top30Delta' },
          { key: 'top100', label: 'Top 100', deltaKey: 'top100Delta' },
        ].map(row => (
          <div key={row.key} className="grid-row">
            <span className="row-label">{row.label}</span>
            <input
              type="number"
              className="form-input"
              value={(data as any)[row.key] || ''}
              onChange={e => onChange({ [row.key]: parseInt(e.target.value) || 0 })}
            />
            <input
              type="number"
              className="form-input"
              value={(data as any)[row.deltaKey] || ''}
              onChange={e => onChange({ [row.deltaKey]: parseInt(e.target.value) || 0 })}
            />
          </div>
        ))}
      </div>
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label>Total Improved (keywords that improved position)</label>
        <input
          type="number"
          className="form-input"
          style={{ maxWidth: '160px' }}
          value={data.totalImproved || ''}
          onChange={e => onChange({ totalImproved: parseInt(e.target.value) || 0 })}
        />
      </div>
      <style jsx>{`
        .keyword-rankings-form {
        }
        .form-group {
          margin-bottom: 12px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .form-input {
          padding: 8px 12px;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          font-size: 14px;
        }
        .rankings-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .grid-header {
          display: grid;
          grid-template-columns: 100px 1fr 1fr;
          gap: 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-light);
        }
        .grid-row {
          display: grid;
          grid-template-columns: 100px 1fr 1fr;
          gap: 12px;
          align-items: center;
        }
        .row-label {
          font-size: 14px;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  )
}

// Keyword Growth Form
function KeywordGrowthForm({
  data,
  onChange,
}: {
  data: KeywordGrowthData
  onChange: (data: KeywordGrowthData) => void
}) {
  const months = data.months || []

  const addMonth = () => {
    onChange({
      months: [
        ...months,
        { label: '', isCampaignStart: false, top3: 0, pos4to20: 0, pos21to50: 0, pos51to100: 0, serpFeatures: 0 },
      ],
    })
  }

  const updateMonth = (index: number, updates: Partial<KeywordGrowthData['months'][0]>) => {
    const newMonths = [...months]
    newMonths[index] = { ...newMonths[index], ...updates }
    // If setting isCampaignStart to true, unset it on all others
    if (updates.isCampaignStart) {
      newMonths.forEach((m, i) => {
        if (i !== index) m.isCampaignStart = false
      })
    }
    onChange({ months: newMonths })
  }

  const removeMonth = (index: number) => {
    onChange({ months: months.filter((_, i) => i !== index) })
  }

  const moveMonth = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= months.length) return
    const newMonths = [...months]
    ;[newMonths[index], newMonths[newIndex]] = [newMonths[newIndex], newMonths[index]]
    onChange({ months: newMonths })
  }

  return (
    <div className="dynamic-list-form">
      {months.length === 0 && (
        <p className="empty-message">No monthly data yet. Click "Add Month" to begin.</p>
      )}
      {months.map((month, index) => (
        <div key={index} className="list-row">
          <div className="row-controls">
            <button
              type="button"
              className="btn-icon-sm"
              onClick={() => moveMonth(index, 'up')}
              disabled={index === 0}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn-icon-sm"
              onClick={() => moveMonth(index, 'down')}
              disabled={index === months.length - 1}
            >
              ↓
            </button>
          </div>
          <div className="row-fields">
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Jun 25"
              value={month.label}
              onChange={e => updateMonth(index, { label: e.target.value })}
              style={{ width: '100px' }}
            />
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={month.isCampaignStart}
                onChange={e => updateMonth(index, { isCampaignStart: e.target.checked })}
              />
              Start
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="Top 3"
              value={month.top3 || ''}
              onChange={e => updateMonth(index, { top3: parseInt(e.target.value) || 0 })}
              style={{ width: '70px' }}
            />
            <input
              type="number"
              className="form-input"
              placeholder="4-20"
              value={month.pos4to20 || ''}
              onChange={e => updateMonth(index, { pos4to20: parseInt(e.target.value) || 0 })}
              style={{ width: '70px' }}
            />
            <input
              type="number"
              className="form-input"
              placeholder="21-50"
              value={month.pos21to50 || ''}
              onChange={e => updateMonth(index, { pos21to50: parseInt(e.target.value) || 0 })}
              style={{ width: '70px' }}
            />
            <input
              type="number"
              className="form-input"
              placeholder="51-100"
              value={month.pos51to100 || ''}
              onChange={e => updateMonth(index, { pos51to100: parseInt(e.target.value) || 0 })}
              style={{ width: '70px' }}
            />
            <input
              type="number"
              className="form-input"
              placeholder="SERP"
              value={month.serpFeatures || ''}
              onChange={e => updateMonth(index, { serpFeatures: parseInt(e.target.value) || 0 })}
              style={{ width: '70px' }}
            />
          </div>
          <button type="button" className="btn-remove" onClick={() => removeMonth(index)}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addMonth}>
        + Add Month
      </button>
      <style jsx>{`
        .dynamic-list-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .empty-message {
          color: var(--text-muted);
          font-size: 14px;
          margin: 0 0 12px 0;
        }
        .list-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: var(--bg-page);
          border-radius: 8px;
        }
        .row-controls {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .btn-icon-sm {
          width: 24px;
          height: 20px;
          padding: 0;
          border: 1px solid var(--border-light);
          background: var(--bg-white);
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        .btn-icon-sm:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .row-fields {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          flex-wrap: wrap;
        }
        .form-input {
          padding: 6px 10px;
          border: 1px solid var(--border-light);
          border-radius: 6px;
          font-size: 13px;
        }
        .checkbox-inline {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-secondary);
          white-space: nowrap;
        }
        .btn-remove {
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: none;
          color: #DC2626;
          font-size: 18px;
          cursor: pointer;
          border-radius: 4px;
        }
        .btn-remove:hover {
          background: #FEE2E2;
        }
        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
          margin-top: 8px;
        }
      `}</style>
    </div>
  )
}

// Link Building Form
function LinkBuildingForm({
  data,
  onChange,
}: {
  data: LinkBuildingData
  onChange: (data: LinkBuildingData) => void
}) {
  const breakdown = data.monthlyBreakdown || []

  // Auto-calculate campaign total
  const campaignTotal = breakdown.reduce((sum, m) => sum + (m.total || 0), 0)

  const addMonth = () => {
    onChange({
      ...data,
      monthlyBreakdown: [
        ...breakdown,
        { month: '', total: 0, guestPosts: 0, linkTypes: [] },
      ],
    })
  }

  const updateMonth = (index: number, updates: Partial<LinkBuildingData['monthlyBreakdown'][0]>) => {
    const newBreakdown = [...breakdown]
    newBreakdown[index] = { ...newBreakdown[index], ...updates }
    const newTotal = newBreakdown.reduce((sum, m) => sum + (m.total || 0), 0)
    onChange({ ...data, monthlyBreakdown: newBreakdown, campaignTotal: newTotal })
  }

  const removeMonth = (index: number) => {
    const newBreakdown = breakdown.filter((_, i) => i !== index)
    const newTotal = newBreakdown.reduce((sum, m) => sum + (m.total || 0), 0)
    onChange({ ...data, monthlyBreakdown: newBreakdown, campaignTotal: newTotal })
  }

  return (
    <div className="link-building-form">
      <div className="campaign-total">
        <label>Campaign Total:</label>
        <span className="total-value">{campaignTotal}</span>
      </div>
      <div className="monthly-breakdown">
        <h4>Monthly Breakdown</h4>
        {breakdown.length === 0 && (
          <p className="empty-message">No months added yet.</p>
        )}
        {breakdown.map((month, index) => (
          <div key={index} className="breakdown-row">
            <input
              type="text"
              className="form-input"
              placeholder="e.g., November 2025"
              value={month.month}
              onChange={e => updateMonth(index, { month: e.target.value })}
              style={{ width: '150px' }}
            />
            <input
              type="number"
              className="form-input"
              placeholder="Links"
              value={month.total || ''}
              onChange={e => updateMonth(index, { total: parseInt(e.target.value) || 0 })}
              style={{ width: '80px' }}
            />
            <input
              type="number"
              className="form-input"
              placeholder="Guest Posts"
              value={month.guestPosts || ''}
              onChange={e => updateMonth(index, { guestPosts: parseInt(e.target.value) || 0 })}
              style={{ width: '100px' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Link types (comma-separated)"
              value={(month.linkTypes || []).join(', ')}
              onChange={e => updateMonth(index, { linkTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              style={{ flex: 1, minWidth: '150px' }}
            />
            <button type="button" className="btn-remove" onClick={() => removeMonth(index)}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={addMonth}>
          + Add Month
        </button>
      </div>
      <style jsx>{`
        .link-building-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .campaign-total {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        .campaign-total label {
          color: var(--text-secondary);
        }
        .total-value {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .monthly-breakdown h4 {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 12px 0;
        }
        .empty-message {
          color: var(--text-muted);
          font-size: 14px;
          margin: 0 0 12px 0;
        }
        .breakdown-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .form-input {
          padding: 6px 10px;
          border: 1px solid var(--border-light);
          border-radius: 6px;
          font-size: 13px;
        }
        .btn-remove {
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: none;
          color: #DC2626;
          font-size: 18px;
          cursor: pointer;
        }
        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }
      `}</style>
    </div>
  )
}

// Local SEO Form
function LocalSeoForm({
  data,
  onChange,
}: {
  data: LocalSeoData
  onChange: (data: LocalSeoData) => void
}) {
  const posts = data.monthlyPosts || []

  const addMonth = () => {
    onChange({
      ...data,
      monthlyPosts: [...posts, { month: '', count: 0 }],
    })
  }

  const updateMonth = (index: number, updates: Partial<LocalSeoData['monthlyPosts'][0]>) => {
    const newPosts = [...posts]
    newPosts[index] = { ...newPosts[index], ...updates }
    onChange({ ...data, monthlyPosts: newPosts })
  }

  const removeMonth = (index: number) => {
    onChange({ ...data, monthlyPosts: posts.filter((_, i) => i !== index) })
  }

  return (
    <div className="local-seo-form">
      <div className="form-group">
        <label>Notes (optional)</label>
        <textarea
          className="form-input"
          rows={2}
          value={data.notes || ''}
          onChange={e => onChange({ ...data, notes: e.target.value })}
          placeholder="Any notes about local SEO activities..."
        />
      </div>
      <div className="monthly-posts">
        <h4>Monthly GBP Posts</h4>
        {posts.length === 0 && (
          <p className="empty-message">No months added yet.</p>
        )}
        {posts.map((post, index) => (
          <div key={index} className="post-row">
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Nov"
              value={post.month}
              onChange={e => updateMonth(index, { month: e.target.value })}
              style={{ width: '100px' }}
            />
            <input
              type="number"
              className="form-input"
              placeholder="Count"
              value={post.count || ''}
              onChange={e => updateMonth(index, { count: parseInt(e.target.value) || 0 })}
              style={{ width: '80px' }}
            />
            <button type="button" className="btn-remove" onClick={() => removeMonth(index)}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={addMonth}>
          + Add Month
        </button>
      </div>
      <style jsx>{`
        .local-seo-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-group label {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .form-input {
          padding: 8px 12px;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
        }
        .monthly-posts h4 {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 12px 0;
        }
        .empty-message {
          color: var(--text-muted);
          font-size: 14px;
          margin: 0 0 12px 0;
        }
        .post-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .btn-remove {
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: none;
          color: #DC2626;
          font-size: 18px;
          cursor: pointer;
        }
        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }
      `}</style>
    </div>
  )
}

// Technical Audit Form
function TechnicalAuditForm({
  data,
  onChange,
}: {
  data: TechnicalAuditData
  onChange: (data: TechnicalAuditData) => void
}) {
  const issues = data.issues || []

  const addIssue = () => {
    onChange({
      issues: [...issues, { title: '', description: '', status: 'submitted' as const }],
    })
  }

  const updateIssue = (index: number, updates: Partial<TechnicalAuditData['issues'][0]>) => {
    const newIssues = [...issues]
    newIssues[index] = { ...newIssues[index], ...updates }
    onChange({ issues: newIssues })
  }

  const removeIssue = (index: number) => {
    onChange({ issues: issues.filter((_, i) => i !== index) })
  }

  return (
    <div className="technical-audit-form">
      {issues.length === 0 && (
        <p className="empty-message">No issues tracked yet.</p>
      )}
      {issues.map((issue, index) => (
        <div key={index} className="issue-row">
          <div className="issue-fields">
            <input
              type="text"
              className="form-input"
              placeholder="Issue title"
              value={issue.title}
              onChange={e => updateIssue(index, { title: e.target.value })}
              style={{ flex: 1 }}
            />
            <select
              className="form-input"
              value={issue.status}
              onChange={e => updateIssue(index, { status: e.target.value as any })}
              style={{ width: '130px' }}
            >
              <option value="resolved">Resolved</option>
              <option value="submitted">Submitted</option>
              <option value="in_progress">In Progress</option>
              <option value="monitoring">Monitoring</option>
            </select>
            <button type="button" className="btn-remove" onClick={() => removeIssue(index)}>
              ×
            </button>
          </div>
          <textarea
            className="form-input"
            placeholder="Description..."
            rows={2}
            value={issue.description}
            onChange={e => updateIssue(index, { description: e.target.value })}
          />
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addIssue}>
        + Add Issue
      </button>
      <style jsx>{`
        .technical-audit-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .empty-message {
          color: var(--text-muted);
          font-size: 14px;
          margin: 0;
        }
        .issue-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: var(--bg-page);
          border-radius: 8px;
        }
        .issue-fields {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .form-input {
          padding: 8px 12px;
          border: 1px solid var(--border-light);
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
        }
        .btn-remove {
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: none;
          color: #DC2626;
          font-size: 18px;
          cursor: pointer;
        }
        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }
      `}</style>
    </div>
  )
}

// Work Completed Form
function WorkCompletedForm({
  data,
  onChange,
}: {
  data: WorkCompletedData
  onChange: (data: WorkCompletedData) => void
}) {
  const items = data.items || []

  const addItem = () => {
    onChange({
      items: [...items, { category: '', description: '' }],
    })
  }

  const updateItem = (index: number, updates: Partial<WorkCompletedData['items'][0]>) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    onChange({ items: newItems })
  }

  const removeItem = (index: number) => {
    onChange({ items: items.filter((_, i) => i !== index) })
  }

  return (
    <div className="work-completed-form">
      {items.length === 0 && (
        <p className="empty-message">No work items added yet.</p>
      )}
      {items.map((item, index) => (
        <div key={index} className="item-row">
          <input
            type="text"
            className="form-input"
            placeholder="Category (e.g., Link Building)"
            value={item.category}
            onChange={e => updateItem(index, { category: e.target.value })}
            style={{ width: '180px' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Description"
            value={item.description}
            onChange={e => updateItem(index, { description: e.target.value })}
            style={{ flex: 1 }}
          />
          <button type="button" className="btn-remove" onClick={() => removeItem(index)}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
        + Add Item
      </button>
      <style jsx>{`
        .work-completed-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .empty-message {
          color: var(--text-muted);
          font-size: 14px;
          margin: 0 0 12px 0;
        }
        .item-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .form-input {
          padding: 8px 12px;
          border: 1px solid var(--border-light);
          border-radius: 6px;
          font-size: 13px;
        }
        .btn-remove {
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: none;
          color: #DC2626;
          font-size: 18px;
          cursor: pointer;
        }
        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }
      `}</style>
    </div>
  )
}

// Coming Next Form
function ComingNextForm({
  data,
  onChange,
}: {
  data: ComingNextData
  onChange: (data: ComingNextData) => void
}) {
  const items = data.items || []
  const colorOptions = ['blue', 'teal', 'green', 'orange', 'purple', 'amber'] as const

  const addItem = () => {
    if (items.length >= 6) {
      alert('Maximum 6 items allowed')
      return
    }
    onChange({
      items: [...items, { title: '', description: '', iconColor: 'blue' }],
    })
  }

  const updateItem = (index: number, updates: Partial<ComingNextData['items'][0]>) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    onChange({ items: newItems })
  }

  const removeItem = (index: number) => {
    onChange({ items: items.filter((_, i) => i !== index) })
  }

  return (
    <div className="coming-next-form">
      {items.length === 0 && (
        <p className="empty-message">No upcoming items added yet.</p>
      )}
      {items.map((item, index) => (
        <div key={index} className="item-card">
          <div className="item-header">
            <input
              type="text"
              className="form-input"
              placeholder="Title"
              value={item.title}
              onChange={e => updateItem(index, { title: e.target.value })}
              style={{ flex: 1 }}
            />
            <select
              className="form-input"
              value={item.iconColor}
              onChange={e => updateItem(index, { iconColor: e.target.value as any })}
              style={{ width: '100px' }}
            >
              {colorOptions.map(color => (
                <option key={color} value={color}>
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </option>
              ))}
            </select>
            <button type="button" className="btn-remove" onClick={() => removeItem(index)}>
              ×
            </button>
          </div>
          <textarea
            className="form-input"
            placeholder="Description..."
            rows={2}
            value={item.description}
            onChange={e => updateItem(index, { description: e.target.value })}
          />
        </div>
      ))}
      {items.length < 6 && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
          + Add Item
        </button>
      )}
      <style jsx>{`
        .coming-next-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .empty-message {
          color: var(--text-muted);
          font-size: 14px;
          margin: 0;
        }
        .item-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: var(--bg-page);
          border-radius: 8px;
        }
        .item-header {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .form-input {
          padding: 8px 12px;
          border: 1px solid var(--border-light);
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
        }
        .btn-remove {
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: none;
          color: #DC2626;
          font-size: 18px;
          cursor: pointer;
        }
        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }
      `}</style>
    </div>
  )
}

// Paid Search Form
function PaidSearchForm({
  data,
  onChange,
}: {
  data: PaidSearchData
  onChange: (data: PaidSearchData) => void
}) {
  const months = data.months || []

  const addMonth = () => {
    onChange({
      ...data,
      months: [...months, { month: '', spend: 0, conversions: 0 }],
    })
  }

  const updateMonth = (index: number, updates: Partial<PaidSearchData['months'][0]>) => {
    const newMonths = [...months]
    newMonths[index] = { ...newMonths[index], ...updates }
    onChange({ ...data, months: newMonths })
  }

  const removeMonth = (index: number) => {
    onChange({ ...data, months: months.filter((_, i) => i !== index) })
  }

  return (
    <div className="paid-search-form">
      <div className="two-period-form">
        <div className="period-column">
          <h4>This Period</h4>
          <div className="form-group">
            <label>Ad Spend ($)</label>
            <input type="number" className="form-input" value={data.currentSpend || ''} onChange={e => onChange({ ...data, currentSpend: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Conversions</label>
            <input type="number" className="form-input" value={data.currentConversions || ''} onChange={e => onChange({ ...data, currentConversions: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>CPL ($)</label>
            <input type="number" step="0.01" className="form-input" value={data.currentCPL || ''} onChange={e => onChange({ ...data, currentCPL: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>CTR (%)</label>
            <input type="number" step="0.01" className="form-input" value={data.currentCTR || ''} onChange={e => onChange({ ...data, currentCTR: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="period-column">
          <h4>Previous Period</h4>
          <div className="form-group">
            <label>Ad Spend ($)</label>
            <input type="number" className="form-input" value={data.previousSpend || ''} onChange={e => onChange({ ...data, previousSpend: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Conversions</label>
            <input type="number" className="form-input" value={data.previousConversions || ''} onChange={e => onChange({ ...data, previousConversions: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>CPL ($)</label>
            <input type="number" step="0.01" className="form-input" value={data.previousCPL || ''} onChange={e => onChange({ ...data, previousCPL: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>CTR (%)</label>
            <input type="number" step="0.01" className="form-input" value={data.previousCTR || ''} onChange={e => onChange({ ...data, previousCTR: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
      </div>
      <div className="monthly-breakdown" style={{ marginTop: '20px' }}>
        <h4>Monthly Spend/Conversions (for chart)</h4>
        {months.length === 0 && <p className="empty-message">No monthly data yet.</p>}
        {months.map((month, index) => (
          <div key={index} className="breakdown-row">
            <input type="text" className="form-input" placeholder="e.g., Nov 25" value={month.month} onChange={e => updateMonth(index, { month: e.target.value })} style={{ width: '100px' }} />
            <input type="number" className="form-input" placeholder="Spend" value={month.spend || ''} onChange={e => updateMonth(index, { spend: parseFloat(e.target.value) || 0 })} style={{ width: '100px' }} />
            <input type="number" className="form-input" placeholder="Conversions" value={month.conversions || ''} onChange={e => updateMonth(index, { conversions: parseInt(e.target.value) || 0 })} style={{ width: '100px' }} />
            <button type="button" className="btn-remove" onClick={() => removeMonth(index)}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={addMonth}>+ Add Month</button>
      </div>
      <style jsx>{`
        .paid-search-form { }
        .two-period-form { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .period-column h4 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px 0; }
        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
        .form-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 8px; font-size: 14px; }
        .monthly-breakdown h4 { font-size: 14px; font-weight: 600; margin: 0 0 12px 0; }
        .empty-message { color: var(--text-muted); font-size: 14px; margin: 0 0 12px 0; }
        .breakdown-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .btn-remove { width: 24px; height: 24px; padding: 0; border: none; background: none; color: #DC2626; font-size: 18px; cursor: pointer; }
        .btn-sm { padding: 6px 12px; font-size: 13px; }
      `}</style>
    </div>
  )
}

// Paid Social Form
function PaidSocialForm({
  data,
  onChange,
}: {
  data: PaidSocialData
  onChange: (data: PaidSocialData) => void
}) {
  const platforms = data.platforms || []
  const platformOptions = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'Pinterest', 'Other'] as const

  const addPlatform = () => {
    onChange({
      ...data,
      platforms: [...platforms, {
        platform: 'Facebook',
        currentSpend: 0, previousSpend: 0,
        currentConversions: 0, previousConversions: 0,
        currentCPL: 0, previousCPL: 0,
      }],
    })
  }

  const updatePlatform = (index: number, updates: Partial<PaidSocialData['platforms'][0]>) => {
    const newPlatforms = [...platforms]
    newPlatforms[index] = { ...newPlatforms[index], ...updates }
    onChange({ ...data, platforms: newPlatforms })
  }

  const removePlatform = (index: number) => {
    onChange({ ...data, platforms: platforms.filter((_, i) => i !== index) })
  }

  return (
    <div className="paid-social-form">
      <div className="two-period-form">
        <div className="period-column">
          <h4>This Period (All Platforms)</h4>
          <div className="form-group">
            <label>Total Spend ($)</label>
            <input type="number" className="form-input" value={data.currentSpend || ''} onChange={e => onChange({ ...data, currentSpend: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Total Conversions</label>
            <input type="number" className="form-input" value={data.currentConversions || ''} onChange={e => onChange({ ...data, currentConversions: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>CPL ($)</label>
            <input type="number" step="0.01" className="form-input" value={data.currentCPL || ''} onChange={e => onChange({ ...data, currentCPL: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Impressions</label>
            <input type="number" className="form-input" value={data.currentImpressions || ''} onChange={e => onChange({ ...data, currentImpressions: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="period-column">
          <h4>Previous Period</h4>
          <div className="form-group">
            <label>Total Spend ($)</label>
            <input type="number" className="form-input" value={data.previousSpend || ''} onChange={e => onChange({ ...data, previousSpend: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Total Conversions</label>
            <input type="number" className="form-input" value={data.previousConversions || ''} onChange={e => onChange({ ...data, previousConversions: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>CPL ($)</label>
            <input type="number" step="0.01" className="form-input" value={data.previousCPL || ''} onChange={e => onChange({ ...data, previousCPL: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Impressions</label>
            <input type="number" className="form-input" value={data.previousImpressions || ''} onChange={e => onChange({ ...data, previousImpressions: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      </div>
      <div className="platform-breakdown" style={{ marginTop: '20px' }}>
        <h4>Platform Breakdown</h4>
        {platforms.length === 0 && <p className="empty-message">No platforms added yet.</p>}
        {platforms.map((platform, index) => (
          <div key={index} className="platform-row">
            <select className="form-input" value={platform.platform} onChange={e => updatePlatform(index, { platform: e.target.value as typeof platformOptions[number] })} style={{ width: '120px' }}>
              {platformOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="number" className="form-input" placeholder="Spend" value={platform.currentSpend || ''} onChange={e => updatePlatform(index, { currentSpend: parseFloat(e.target.value) || 0 })} style={{ width: '80px' }} />
            <input type="number" className="form-input" placeholder="Conv" value={platform.currentConversions || ''} onChange={e => updatePlatform(index, { currentConversions: parseInt(e.target.value) || 0 })} style={{ width: '80px' }} />
            <button type="button" className="btn-remove" onClick={() => removePlatform(index)}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={addPlatform}>+ Add Platform</button>
      </div>
      <style jsx>{`
        .paid-social-form { }
        .two-period-form { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .period-column h4 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px 0; }
        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
        .form-input { padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 8px; font-size: 14px; }
        .platform-breakdown h4 { font-size: 14px; font-weight: 600; margin: 0 0 12px 0; }
        .empty-message { color: var(--text-muted); font-size: 14px; margin: 0 0 12px 0; }
        .platform-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .btn-remove { width: 24px; height: 24px; padding: 0; border: none; background: none; color: #DC2626; font-size: 18px; cursor: pointer; }
        .btn-sm { padding: 6px 12px; font-size: 13px; }
      `}</style>
    </div>
  )
}

// Local Service Ads Form
function LocalServiceAdsForm({
  data,
  onChange,
}: {
  data: LocalServiceAdsData
  onChange: (updates: Partial<LocalServiceAdsData>) => void
}) {
  return (
    <div className="lsa-form">
      <div className="two-period-form">
        <div className="period-column">
          <h4>This Period</h4>
          <div className="form-group">
            <label>Leads</label>
            <input type="number" className="form-input" value={data.currentLeads || ''} onChange={e => onChange({ currentLeads: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Ad Spend ($)</label>
            <input type="number" className="form-input" value={data.currentSpend || ''} onChange={e => onChange({ currentSpend: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>CPL ($)</label>
            <input type="number" step="0.01" className="form-input" value={data.currentCPL || ''} onChange={e => onChange({ currentCPL: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="period-column">
          <h4>Previous Period</h4>
          <div className="form-group">
            <label>Leads</label>
            <input type="number" className="form-input" value={data.previousLeads || ''} onChange={e => onChange({ previousLeads: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Ad Spend ($)</label>
            <input type="number" className="form-input" value={data.previousSpend || ''} onChange={e => onChange({ previousSpend: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>CPL ($)</label>
            <input type="number" step="0.01" className="form-input" value={data.previousCPL || ''} onChange={e => onChange({ previousCPL: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
      </div>
      <div className="extra-fields" style={{ marginTop: '20px' }}>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Google Guaranteed Rating</label>
            <input type="number" step="0.1" className="form-input" value={data.currentRating || ''} onChange={e => onChange({ currentRating: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Total Reviews</label>
            <input type="number" className="form-input" value={data.totalReviews || ''} onChange={e => onChange({ totalReviews: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea className="form-input" rows={2} value={data.notes || ''} onChange={e => onChange({ notes: e.target.value })} placeholder="Any notes about LSA performance..." />
        </div>
      </div>
      <style jsx>{`
        .lsa-form { }
        .two-period-form { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .period-column h4 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px 0; }
        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
        .form-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 8px; font-size: 14px; font-family: inherit; }
        .form-row { display: flex; gap: 16px; }
      `}</style>
    </div>
  )
}

// Organic Social Form
function OrganicSocialForm({
  data,
  onChange,
}: {
  data: OrganicSocialData
  onChange: (data: OrganicSocialData) => void
}) {
  const platforms = data.platforms || []
  const platformOptions = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'Pinterest', 'Other'] as const

  const addPlatform = () => {
    onChange({
      ...data,
      platforms: [...platforms, {
        platform: 'Facebook',
        currentFollowers: 0, previousFollowers: 0, followersAtStart: 0,
        currentPeriodPosts: 0,
      }],
    })
  }

  const updatePlatform = (index: number, updates: Partial<OrganicSocialData['platforms'][0]>) => {
    const newPlatforms = [...platforms]
    newPlatforms[index] = { ...newPlatforms[index], ...updates }
    onChange({ ...data, platforms: newPlatforms })
  }

  const removePlatform = (index: number) => {
    onChange({ ...data, platforms: platforms.filter((_, i) => i !== index) })
  }

  return (
    <div className="organic-social-form">
      <h4>Platform Performance</h4>
      {platforms.length === 0 && <p className="empty-message">No platforms added yet.</p>}
      {platforms.map((platform, index) => (
        <div key={index} className="platform-card">
          <div className="platform-header">
            <select className="form-input" value={platform.platform} onChange={e => updatePlatform(index, { platform: e.target.value as typeof platformOptions[number] })} style={{ width: '130px' }}>
              {platformOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button type="button" className="btn-remove" onClick={() => removePlatform(index)}>×</button>
          </div>
          <div className="platform-fields">
            <div className="form-group">
              <label>Current Followers</label>
              <input type="number" className="form-input" value={platform.currentFollowers || ''} onChange={e => updatePlatform(index, { currentFollowers: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Previous Followers</label>
              <input type="number" className="form-input" value={platform.previousFollowers || ''} onChange={e => updatePlatform(index, { previousFollowers: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>At Campaign Start</label>
              <input type="number" className="form-input" value={platform.followersAtStart || ''} onChange={e => updatePlatform(index, { followersAtStart: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Posts This Period</label>
              <input type="number" className="form-input" value={platform.currentPeriodPosts || ''} onChange={e => updatePlatform(index, { currentPeriodPosts: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addPlatform}>+ Add Platform</button>
      <style jsx>{`
        .organic-social-form { }
        .organic-social-form h4 { font-size: 14px; font-weight: 600; margin: 0 0 12px 0; }
        .empty-message { color: var(--text-muted); font-size: 14px; margin: 0 0 12px 0; }
        .platform-card { background: var(--bg-page); padding: 12px; border-radius: 8px; margin-bottom: 12px; }
        .platform-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .platform-fields { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .form-group { }
        .form-group label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
        .form-input { width: 100%; padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; }
        .btn-remove { width: 24px; height: 24px; padding: 0; border: none; background: none; color: #DC2626; font-size: 18px; cursor: pointer; }
        .btn-sm { padding: 6px 12px; font-size: 13px; }
      `}</style>
    </div>
  )
}

// Lead Tracking Form
function LeadTrackingForm({
  data,
  onChange,
}: {
  data: LeadTrackingData
  onChange: (updates: Partial<LeadTrackingData>) => void
}) {
  return (
    <div className="lead-tracking-form">
      <div className="two-period-form">
        <div className="period-column">
          <h4>This Period</h4>
          <div className="form-group">
            <label>Total Leads</label>
            <input type="number" className="form-input" value={data.currentLeads || ''} onChange={e => onChange({ currentLeads: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Form Submissions</label>
            <input type="number" className="form-input" value={data.currentFormSubmissions || ''} onChange={e => onChange({ currentFormSubmissions: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Phone Calls</label>
            <input type="number" className="form-input" value={data.currentPhoneCalls || ''} onChange={e => onChange({ currentPhoneCalls: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Web Chat</label>
            <input type="number" className="form-input" value={data.currentWebChat || ''} onChange={e => onChange({ currentWebChat: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="period-column">
          <h4>Previous Period</h4>
          <div className="form-group">
            <label>Total Leads</label>
            <input type="number" className="form-input" value={data.previousLeads || ''} onChange={e => onChange({ previousLeads: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Form Submissions</label>
            <input type="number" className="form-input" value={data.previousFormSubmissions || ''} onChange={e => onChange({ previousFormSubmissions: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Phone Calls</label>
            <input type="number" className="form-input" value={data.previousPhoneCalls || ''} onChange={e => onChange({ previousPhoneCalls: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Web Chat</label>
            <input type="number" className="form-input" value={data.previousWebChat || ''} onChange={e => onChange({ previousWebChat: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      </div>
      <style jsx>{`
        .lead-tracking-form { }
        .two-period-form { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .period-column h4 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px 0; }
        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
        .form-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 8px; font-size: 14px; }
      `}</style>
    </div>
  )
}

// Review Management Form
function ReviewManagementForm({
  data,
  onChange,
}: {
  data: ReviewManagementData
  onChange: (data: ReviewManagementData) => void
}) {
  const platforms = data.platforms || []
  const platformOptions = ['Google', 'Facebook', 'Yelp', 'Other'] as const

  const addPlatform = () => {
    onChange({
      ...data,
      platforms: [...platforms, {
        platform: 'Google',
        currentRating: 0, previousRating: 0,
        currentTotal: 0, previousTotal: 0,
        newThisPeriod: 0,
      }],
    })
  }

  const updatePlatform = (index: number, updates: Partial<ReviewManagementData['platforms'][0]>) => {
    const newPlatforms = [...platforms]
    newPlatforms[index] = { ...newPlatforms[index], ...updates }
    onChange({ ...data, platforms: newPlatforms })
  }

  const removePlatform = (index: number) => {
    onChange({ ...data, platforms: platforms.filter((_, i) => i !== index) })
  }

  return (
    <div className="review-management-form">
      <h4>Platform Reviews</h4>
      {platforms.length === 0 && <p className="empty-message">No platforms added yet.</p>}
      {platforms.map((platform, index) => (
        <div key={index} className="platform-card">
          <div className="platform-header">
            <select className="form-input" value={platform.platform} onChange={e => updatePlatform(index, { platform: e.target.value as typeof platformOptions[number] })} style={{ width: '120px' }}>
              {platformOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button type="button" className="btn-remove" onClick={() => removePlatform(index)}>×</button>
          </div>
          <div className="platform-fields">
            <div className="form-group">
              <label>Current Rating</label>
              <input type="number" step="0.1" className="form-input" value={platform.currentRating || ''} onChange={e => updatePlatform(index, { currentRating: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Previous Rating</label>
              <input type="number" step="0.1" className="form-input" value={platform.previousRating || ''} onChange={e => updatePlatform(index, { previousRating: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Current Total</label>
              <input type="number" className="form-input" value={platform.currentTotal || ''} onChange={e => updatePlatform(index, { currentTotal: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>New This Period</label>
              <input type="number" className="form-input" value={platform.newThisPeriod || ''} onChange={e => updatePlatform(index, { newThisPeriod: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addPlatform}>+ Add Platform</button>
      <style jsx>{`
        .review-management-form { }
        .review-management-form h4 { font-size: 14px; font-weight: 600; margin: 0 0 12px 0; }
        .empty-message { color: var(--text-muted); font-size: 14px; margin: 0 0 12px 0; }
        .platform-card { background: var(--bg-page); padding: 12px; border-radius: 8px; margin-bottom: 12px; }
        .platform-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .platform-fields { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .form-group { }
        .form-group label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
        .form-input { width: 100%; padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; }
        .btn-remove { width: 24px; height: 24px; padding: 0; border: none; background: none; color: #DC2626; font-size: 18px; cursor: pointer; }
        .btn-sm { padding: 6px 12px; font-size: 13px; }
      `}</style>
    </div>
  )
}

// Content Writing Form
function ContentWritingForm({
  data,
  onChange,
}: {
  data: ContentWritingData
  onChange: (data: ContentWritingData) => void
}) {
  const articles = data.articles || []

  const addArticle = () => {
    onChange({
      articles: [...articles, { title: '', wordCount: 0, publishedDate: '', url: '', targetKeyword: '' }],
    })
  }

  const updateArticle = (index: number, updates: Partial<ContentWritingData['articles'][0]>) => {
    const newArticles = [...articles]
    newArticles[index] = { ...newArticles[index], ...updates }
    onChange({ articles: newArticles })
  }

  const removeArticle = (index: number) => {
    onChange({ articles: articles.filter((_, i) => i !== index) })
  }

  return (
    <div className="content-writing-form">
      <h4>Published Articles</h4>
      {articles.length === 0 && <p className="empty-message">No articles added yet.</p>}
      {articles.map((article, index) => (
        <div key={index} className="article-card">
          <div className="article-header">
            <input type="text" className="form-input" placeholder="Article title" value={article.title} onChange={e => updateArticle(index, { title: e.target.value })} style={{ flex: 1 }} />
            <button type="button" className="btn-remove" onClick={() => removeArticle(index)}>×</button>
          </div>
          <div className="article-fields">
            <input type="number" className="form-input" placeholder="Word count" value={article.wordCount || ''} onChange={e => updateArticle(index, { wordCount: parseInt(e.target.value) || 0 })} style={{ width: '100px' }} />
            <input type="text" className="form-input" placeholder="Published date (e.g., Nov 2025)" value={article.publishedDate || ''} onChange={e => updateArticle(index, { publishedDate: e.target.value })} style={{ width: '150px' }} />
            <input type="text" className="form-input" placeholder="Target keyword" value={article.targetKeyword || ''} onChange={e => updateArticle(index, { targetKeyword: e.target.value })} style={{ flex: 1 }} />
          </div>
          <input type="text" className="form-input" placeholder="URL (optional)" value={article.url || ''} onChange={e => updateArticle(index, { url: e.target.value })} />
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addArticle}>+ Add Article</button>
      <style jsx>{`
        .content-writing-form { }
        .content-writing-form h4 { font-size: 14px; font-weight: 600; margin: 0 0 12px 0; }
        .empty-message { color: var(--text-muted); font-size: 14px; margin: 0 0 12px 0; }
        .article-card { background: var(--bg-page); padding: 12px; border-radius: 8px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
        .article-header { display: flex; gap: 8px; align-items: center; }
        .article-fields { display: flex; gap: 8px; flex-wrap: wrap; }
        .form-input { padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; }
        .btn-remove { width: 24px; height: 24px; padding: 0; border: none; background: none; color: #DC2626; font-size: 18px; cursor: pointer; }
        .btn-sm { padding: 6px 12px; font-size: 13px; }
      `}</style>
    </div>
  )
}

// AI Visibility Form
function AiVisibilityForm({
  data,
  onChange,
}: {
  data: AiVisibilityData
  onChange: (data: AiVisibilityData) => void
}) {
  const platforms = data.platforms || []
  const platformOptions = ['ChatGPT', 'Google Gemini', 'Perplexity', 'Claude', 'Bing Copilot', 'Other'] as const
  const sentimentOptions = ['positive', 'neutral', 'negative'] as const

  const addPlatform = () => {
    onChange({
      ...data,
      platforms: [...platforms, { platform: 'ChatGPT', mentioned: false }],
    })
  }

  const updatePlatform = (index: number, updates: Partial<AiVisibilityData['platforms'][0]>) => {
    const newPlatforms = [...platforms]
    newPlatforms[index] = { ...newPlatforms[index], ...updates }
    onChange({ ...data, platforms: newPlatforms })
  }

  const removePlatform = (index: number) => {
    onChange({ ...data, platforms: platforms.filter((_, i) => i !== index) })
  }

  return (
    <div className="ai-visibility-form">
      <div className="summary-row">
        <div className="form-group">
          <label>Queries Tracked</label>
          <input type="number" className="form-input" value={data.queriesTracked || ''} onChange={e => onChange({ ...data, queriesTracked: parseInt(e.target.value) || 0 })} style={{ width: '100px' }} />
        </div>
        <div className="form-group">
          <label>Queries Mentioned</label>
          <input type="number" className="form-input" value={data.queriesMentioned || ''} onChange={e => onChange({ ...data, queriesMentioned: parseInt(e.target.value) || 0 })} style={{ width: '100px' }} />
        </div>
      </div>
      <h4>Platform Results</h4>
      {platforms.length === 0 && <p className="empty-message">No platforms added yet.</p>}
      {platforms.map((platform, index) => (
        <div key={index} className="platform-card">
          <div className="platform-header">
            <select className="form-input" value={platform.platform} onChange={e => updatePlatform(index, { platform: e.target.value as typeof platformOptions[number] })} style={{ width: '140px' }}>
              {platformOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <label className="checkbox-inline">
              <input type="checkbox" checked={platform.mentioned} onChange={e => updatePlatform(index, { mentioned: e.target.checked })} />
              Mentioned
            </label>
            <button type="button" className="btn-remove" onClick={() => removePlatform(index)}>×</button>
          </div>
          <div className="platform-fields">
            <div className="form-group">
              <label>Sentiment</label>
              <select className="form-input" value={platform.sentiment || ''} onChange={e => updatePlatform(index, { sentiment: (e.target.value || undefined) as typeof sentimentOptions[number] | undefined })}>
                <option value="">Select...</option>
                {sentimentOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Visibility Score (0-100)</label>
              <input type="number" className="form-input" value={platform.visibilityScore || ''} onChange={e => updatePlatform(index, { visibilityScore: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Rank Position</label>
              <input type="text" className="form-input" placeholder="e.g., #2 of 5" value={platform.rankPosition || ''} onChange={e => updatePlatform(index, { rankPosition: e.target.value })} />
            </div>
          </div>
          <input type="text" className="form-input" placeholder="Notes (optional)" value={platform.notes || ''} onChange={e => updatePlatform(index, { notes: e.target.value })} />
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addPlatform}>+ Add Platform</button>
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label>General Notes</label>
        <textarea className="form-input" rows={2} value={data.notes || ''} onChange={e => onChange({ ...data, notes: e.target.value })} placeholder="Overall AI visibility notes..." />
      </div>
      <style jsx>{`
        .ai-visibility-form { }
        .summary-row { display: flex; gap: 16px; margin-bottom: 16px; }
        .ai-visibility-form h4 { font-size: 14px; font-weight: 600; margin: 0 0 12px 0; }
        .empty-message { color: var(--text-muted); font-size: 14px; margin: 0 0 12px 0; }
        .platform-card { background: var(--bg-page); padding: 12px; border-radius: 8px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
        .platform-header { display: flex; gap: 12px; align-items: center; }
        .checkbox-inline { display: flex; align-items: center; gap: 4px; font-size: 13px; }
        .platform-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .form-group { }
        .form-group label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
        .form-input { width: 100%; padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; font-family: inherit; }
        .btn-remove { width: 24px; height: 24px; padding: 0; border: none; background: none; color: #DC2626; font-size: 18px; cursor: pointer; margin-left: auto; }
        .btn-sm { padding: 6px 12px; font-size: 13px; }
      `}</style>
    </div>
  )
}

// Email & SMS Form
function EmailSmsForm({
  data,
  onChange,
}: {
  data: EmailSmsData
  onChange: (data: EmailSmsData) => void
}) {
  const channels = data.channels || []
  const channelOptions = ['Email', 'SMS'] as const

  const addChannel = () => {
    if (channels.length >= 2) {
      alert('Maximum 2 channels (Email and SMS)')
      return
    }
    const existingChannels = channels.map(c => c.channel)
    const availableChannel = channelOptions.find(c => !existingChannels.includes(c)) || 'Email'
    onChange({
      ...data,
      channels: [...channels, { channel: availableChannel, campaignsSent: 0, delivered: 0 }],
    })
  }

  const updateChannel = (index: number, updates: Partial<EmailSmsData['channels'][0]>) => {
    const newChannels = [...channels]
    newChannels[index] = { ...newChannels[index], ...updates }
    onChange({ ...data, channels: newChannels })
  }

  const removeChannel = (index: number) => {
    onChange({ ...data, channels: channels.filter((_, i) => i !== index) })
  }

  return (
    <div className="email-sms-form">
      <h4>Channel Performance</h4>
      {channels.length === 0 && <p className="empty-message">No channels added yet.</p>}
      {channels.map((channel, index) => (
        <div key={index} className="channel-card">
          <div className="channel-header">
            <select className="form-input" value={channel.channel} onChange={e => updateChannel(index, { channel: e.target.value as typeof channelOptions[number] })} style={{ width: '100px' }}>
              {channelOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" className="btn-remove" onClick={() => removeChannel(index)}>×</button>
          </div>
          <div className="channel-fields">
            <div className="form-group">
              <label>Campaigns Sent</label>
              <input type="number" className="form-input" value={channel.campaignsSent || ''} onChange={e => updateChannel(index, { campaignsSent: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Delivered</label>
              <input type="number" className="form-input" value={channel.delivered || ''} onChange={e => updateChannel(index, { delivered: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Open Rate (%)</label>
              <input type="number" step="0.1" className="form-input" value={channel.openRate || ''} onChange={e => updateChannel(index, { openRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Click Rate (%)</label>
              <input type="number" step="0.1" className="form-input" value={channel.clickRate || ''} onChange={e => updateChannel(index, { clickRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Leads Generated</label>
              <input type="number" className="form-input" value={channel.leadsGenerated || ''} onChange={e => updateChannel(index, { leadsGenerated: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        </div>
      ))}
      {channels.length < 2 && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={addChannel}>+ Add Channel</button>
      )}
      <style jsx>{`
        .email-sms-form { }
        .email-sms-form h4 { font-size: 14px; font-weight: 600; margin: 0 0 12px 0; }
        .empty-message { color: var(--text-muted); font-size: 14px; margin: 0 0 12px 0; }
        .channel-card { background: var(--bg-page); padding: 12px; border-radius: 8px; margin-bottom: 12px; }
        .channel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .channel-fields { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        .form-group { }
        .form-group label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
        .form-input { width: 100%; padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; }
        .btn-remove { width: 24px; height: 24px; padding: 0; border: none; background: none; color: #DC2626; font-size: 18px; cursor: pointer; }
        .btn-sm { padding: 6px 12px; font-size: 13px; }
      `}</style>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
  SummaryCards,
  GrowthStageCards,
  ClientFilters,
  ClientList,
  ClientDetailModal,
  ScoringExplainerModal,
  ALERT_TEMPLATES,
} from '@/components/admin/performance'
import type { PerformanceData, ClientDetailData } from '@/components/admin/performance'
import { PerformanceDashboardResponseSchema } from '@/lib/validation/performanceSchemas'

export default function PerformanceDashboardPage() {
  const { user } = useUserProfile()
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('score_desc')
  const [criticalOnly, setCriticalOnly] = useState(false)

  // Client detail modal
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientDetail, setClientDetail] = useState<ClientDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Alert composer
  const [alertType, setAlertType] = useState<string>('performance_focus')
  const [alertMessage, setAlertMessage] = useState(ALERT_TEMPLATES.performance_focus)
  const [publishingAlert, setPublishingAlert] = useState(false)
  const [focusAlert, setFocusAlert] = useState(false)

  // Scoring explainer modal
  const [showExplainer, setShowExplainer] = useState(false)

  // Avg score history for sparkline
  const [avgScoreHistory, setAvgScoreHistory] = useState<number[]>([])

  // Fetch avg score history
  useEffect(() => {
    fetch('/api/admin/performance/avg-history')
      .then(res => res.json())
      .then(data => {
        if (data.history) {
          setAvgScoreHistory(data.history)
        }
      })
      .catch(err => console.error('Failed to fetch avg score history:', err))
  }, [])

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (stageFilter !== 'all') params.set('stage', stageFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (planFilter !== 'all') params.set('plan', planFilter)
      if (sortBy) params.set('sort', sortBy)
      if (criticalOnly) params.set('critical_only', 'true')

      const res = await fetch(`/api/admin/performance?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch performance data')
      const result = await res.json()

      // Validate response shape matches expected schema
      const validation = PerformanceDashboardResponseSchema.safeParse(result)
      if (!validation.success) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Performance API response validation failed:', validation.error.issues)
        }
        throw new Error('Invalid API response format')
      }

      setData(validation.data as PerformanceData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [stageFilter, statusFilter, planFilter, sortBy, criticalOnly])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch client detail
  const fetchClientDetail = async (clientId: string) => {
    try {
      setDetailLoading(true)
      const res = await fetch(`/api/admin/performance/${clientId}`)
      if (!res.ok) throw new Error('Failed to fetch client detail')
      const result = await res.json()
      setClientDetail(result)
    } catch (err) {
      console.error('Failed to fetch client detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const openClientDetail = (clientId: string, shouldFocusAlert = false) => {
    setSelectedClientId(clientId)
    fetchClientDetail(clientId)
    setFocusAlert(shouldFocusAlert)
    // Reset alert composer
    setAlertType('performance_focus')
    setAlertMessage(ALERT_TEMPLATES.performance_focus)
  }

  const closeClientDetail = () => {
    setSelectedClientId(null)
    setClientDetail(null)
    setFocusAlert(false)
  }

  // Publish alert
  const publishAlert = async () => {
    if (!selectedClientId || !alertMessage.trim()) return

    try {
      setPublishingAlert(true)
      const res = await fetch('/api/admin/performance/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClientId,
          message: alertMessage,
          alert_type: alertType,
          publish: true,
        }),
      })

      if (!res.ok) throw new Error('Failed to publish alert')

      // Refresh client detail
      await fetchClientDetail(selectedClientId)
      alert('Alert published successfully!')
    } catch (err) {
      alert('Failed to publish alert')
    } finally {
      setPublishingAlert(false)
    }
  }

  if (loading && !data) {
    return (
      <>
        <AdminHeader title="Performance" user={user} hasNotifications={true} />
        <div className="admin-content">
          <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }}></div>
            Loading performance data...
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <AdminHeader title="Performance" user={user} hasNotifications={true} />
        <div className="admin-content">
          <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626' }}>
            Error: {error}
            <br />
            <button onClick={fetchData} style={{ marginTop: '16px', padding: '8px 16px' }}>
              Retry
            </button>
          </div>
        </div>
      </>
    )
  }

  const summary = data?.summary || {
    total_clients: 0,
    average_score: 0,
    by_status: { critical: 0, at_risk: 0, needs_attention: 0, healthy: 0, thriving: 0 },
    by_stage: {
      seedling: { count: 0, avg_score: 0 },
      sprouting: { count: 0, avg_score: 0 },
      blooming: { count: 0, avg_score: 0 },
      harvesting: { count: 0, avg_score: 0 },
    },
  }
  const clients = data?.clients || []

  return (
    <>
      <AdminHeader title="Performance Dashboard" user={user} hasNotifications={true} />

      <div className="admin-content">
        <SummaryCards summary={summary} avgScoreHistory={avgScoreHistory} />

        <GrowthStageCards summary={summary} />

        <ClientFilters
          stageFilter={stageFilter}
          statusFilter={statusFilter}
          planFilter={planFilter}
          sortBy={sortBy}
          criticalOnly={criticalOnly}
          onStageChange={setStageFilter}
          onStatusChange={setStatusFilter}
          onPlanChange={setPlanFilter}
          onSortChange={setSortBy}
          onCriticalOnlyChange={setCriticalOnly}
          onShowExplainer={() => setShowExplainer(true)}
        />

        <ClientList clients={clients} onViewClient={openClientDetail} />
      </div>

      {selectedClientId && (
        <ClientDetailModal
          clientDetail={clientDetail}
          loading={detailLoading}
          alertType={alertType}
          alertMessage={alertMessage}
          publishingAlert={publishingAlert}
          focusAlert={focusAlert}
          onClose={closeClientDetail}
          onAlertTypeChange={setAlertType}
          onAlertMessageChange={setAlertMessage}
          onPublishAlert={publishAlert}
        />
      )}

      {showExplainer && (
        <ScoringExplainerModal onClose={() => setShowExplainer(false)} />
      )}
    </>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
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

export default function ClientPerformancePage() {
  const [perfData, setPerfData] = useState<PerformanceData | null>(null)
  const [perfLoading, setPerfLoading] = useState(true)
  const [perfError, setPerfError] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [perfStatusFilter, setPerfStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [perfSortBy, setPerfSortBy] = useState<string>('score_desc')
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientDetail, setClientDetail] = useState<ClientDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [alertType, setAlertType] = useState<string>('performance_focus')
  const [alertMessage, setAlertMessage] = useState(ALERT_TEMPLATES.performance_focus)
  const [publishingAlert, setPublishingAlert] = useState(false)
  const [focusAlert, setFocusAlert] = useState(false)
  const [showExplainer, setShowExplainer] = useState(false)
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
  const fetchPerfData = useCallback(async () => {
    try {
      setPerfLoading(true)
      const params = new URLSearchParams()
      if (stageFilter !== 'all') params.set('stage', stageFilter)
      if (perfStatusFilter !== 'all') params.set('status', perfStatusFilter)
      if (planFilter !== 'all') params.set('plan', planFilter)
      if (perfSortBy) params.set('sort', perfSortBy)
      if (criticalOnly) params.set('critical_only', 'true')

      const res = await fetch(`/api/admin/performance?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch performance data')
      const result = await res.json()

      const validation = PerformanceDashboardResponseSchema.safeParse(result)
      if (!validation.success) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Performance API response validation failed:', validation.error.issues)
        }
        throw new Error('Invalid API response format')
      }

      setPerfData(validation.data as PerformanceData)
      setPerfError(null)
    } catch (err) {
      setPerfError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setPerfLoading(false)
    }
  }, [stageFilter, perfStatusFilter, planFilter, perfSortBy, criticalOnly])

  useEffect(() => {
    fetchPerfData()
  }, [fetchPerfData])

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

      await fetchClientDetail(selectedClientId)
      alert('Alert published successfully!')
    } catch (err) {
      alert('Failed to publish alert')
    } finally {
      setPublishingAlert(false)
    }
  }

  const perfSummary = perfData?.summary || {
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
  const perfClients = perfData?.clients || []

  if (perfLoading && !perfData) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
        <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }}></div>
        Loading performance data...
      </div>
    )
  }

  if (perfError) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626' }}>
        Error: {perfError}
        <br />
        <button onClick={fetchPerfData} style={{ marginTop: '16px', padding: '8px 16px' }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
      <SummaryCards summary={perfSummary} avgScoreHistory={avgScoreHistory} />

      <GrowthStageCards summary={perfSummary} />

      <ClientFilters
        stageFilter={stageFilter}
        statusFilter={perfStatusFilter}
        planFilter={planFilter}
        sortBy={perfSortBy}
        criticalOnly={criticalOnly}
        onStageChange={setStageFilter}
        onStatusChange={setPerfStatusFilter}
        onPlanChange={setPlanFilter}
        onSortChange={setPerfSortBy}
        onCriticalOnlyChange={setCriticalOnly}
        onShowExplainer={() => setShowExplainer(true)}
      />

      <ClientList clients={perfClients} onViewClient={openClientDetail} />

      {/* Performance Modals */}
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

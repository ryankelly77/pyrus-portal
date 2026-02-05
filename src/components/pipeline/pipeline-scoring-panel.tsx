'use client'

import { useState, useEffect, useCallback } from 'react'
import { CallScoreForm } from './call-score-form'
import { CommunicationLogForm } from './communication-log-form'
import { CommunicationTimeline } from './communication-timeline'
import { PredictedTierSelector } from './predicted-tier-selector'
import { SnoozeDealForm } from './snooze-deal-form'

interface CallScoreInputs {
  budgetClarity: 'clear' | 'vague' | 'none' | 'no_budget'
  competition: 'none' | 'some' | 'many'
  engagement: 'high' | 'medium' | 'low'
  planFit: 'strong' | 'medium' | 'weak' | 'poor'
}

interface InviteTracking {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  sentAt: string | null
  emailOpenedAt: string | null
  accountCreatedAt: string | null
  viewedAt: string | null
  status: string | null
}

interface SnoozeData {
  snoozed_until: string
  reason: string | null
}

interface PipelineScoringPanelProps {
  recommendationId: string
  currentScore?: number | null
  status?: string
  snoozedUntil?: string | null
  snoozeReason?: string | null
}

function getScoreColor(score: number | null): string {
  if (score === null) return '#6B7280'
  if (score >= 70) return '#059669'
  if (score >= 40) return '#D97706'
  return '#DC2626'
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function PipelineScoringPanel({
  recommendationId,
  currentScore,
  status,
  snoozedUntil,
  snoozeReason,
}: PipelineScoringPanelProps) {
  const [activeTab, setActiveTab] = useState<'score' | 'communications' | 'invites'>('score')
  const [callScores, setCallScores] = useState<CallScoreInputs | null>(null)
  const [invites, setInvites] = useState<InviteTracking[]>([])
  const [showCommForm, setShowCommForm] = useState(false)
  const [commRefresh, setCommRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [snoozeData, setSnoozeData] = useState<SnoozeData | null>(
    snoozedUntil ? { snoozed_until: snoozedUntil, reason: snoozeReason ?? null } : null
  )
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [callScoreRes, trackingRes] = await Promise.all([
        fetch(`/api/admin/recommendations/${recommendationId}/call-scores`),
        fetch(`/api/admin/recommendations/${recommendationId}/tracking`),
      ])

      if (callScoreRes.ok) {
        const data = await callScoreRes.json()
        if (data.callScores) {
          setCallScores({
            budgetClarity: data.callScores.budgetClarity,
            competition: data.callScores.competition,
            engagement: data.callScores.engagement,
            planFit: data.callScores.planFit,
          })
        }
      }

      if (trackingRes.ok) {
        const data = await trackingRes.json()
        setInvites(data.invites || [])
      }
    } catch (error) {
      console.error('Failed to fetch pipeline data:', error)
    } finally {
      setLoading(false)
    }
  }, [recommendationId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleScoreSaved = () => {
    fetchData()
  }

  const handleCommSaved = () => {
    setShowCommForm(false)
    setCommRefresh((n) => n + 1)
  }

  const handleSnoozeUpdate = async () => {
    // Refetch recommendation data to get updated snooze status
    try {
      const res = await fetch(`/api/admin/recommendations/${recommendationId}/call-scores`)
      if (res.ok) {
        const data = await res.json()
        if (data.snoozed_until) {
          setSnoozeData({
            snoozed_until: data.snoozed_until,
            reason: data.snooze_reason ?? null,
          })
        } else {
          setSnoozeData(null)
        }
      }
    } catch (error) {
      console.error('Failed to refresh snooze data:', error)
    }
    setRefreshKey((n) => n + 1)
    fetchData()
  }

  const isDraft = status === 'draft'
  const isPipeline = status === 'sent' || status === 'declined'
  const isTerminal = status === 'accepted' || status === 'closed_lost'
  const canSnooze = isPipeline && !isTerminal

  return (
    <div className="pipeline-panel">
      {/* Score Header */}
      <div className="panel-header">
        <div className="score-display">
          <div
            className="score-circle"
            style={{ borderColor: getScoreColor(currentScore ?? null) }}
          >
            <span className="score-number" style={{ color: getScoreColor(currentScore ?? null) }}>
              {currentScore ?? '—'}
            </span>
          </div>
          <div className="score-meta">
            <span className="score-title">Confidence Score</span>
            <span className="score-status">
              {isTerminal
                ? status === 'accepted'
                  ? 'Won'
                  : 'Lost'
                : isDraft
                  ? 'Draft'
                  : 'In Pipeline'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        <button
          className={`tab ${activeTab === 'score' ? 'active' : ''}`}
          onClick={() => setActiveTab('score')}
        >
          Score Inputs
        </button>
        <button
          className={`tab ${activeTab === 'communications' ? 'active' : ''}`}
          onClick={() => setActiveTab('communications')}
        >
          Communications
        </button>
        <button
          className={`tab ${activeTab === 'invites' ? 'active' : ''}`}
          onClick={() => setActiveTab('invites')}
        >
          Invites
        </button>
      </div>

      {/* Tab Content */}
      <div className="panel-content">
        {activeTab === 'score' && (
          <div className="tab-content">
            {canSnooze && (
              <>
                <SnoozeDealForm
                  recommendationId={recommendationId}
                  currentSnooze={snoozeData}
                  onUpdate={handleSnoozeUpdate}
                />
                <div className="section-spacer" />
              </>
            )}

            <PredictedTierSelector
              recommendationId={recommendationId}
              onSaved={handleScoreSaved}
            />

            <div className="section-spacer" />

            <CallScoreForm
              recommendationId={recommendationId}
              existingScore={callScores}
              onSaved={handleScoreSaved}
            />
          </div>
        )}

        {activeTab === 'communications' && (
          <div className="tab-content">
            <div className="comm-header">
              <h4>Communication History</h4>
              <button
                className="btn-add-comm"
                onClick={() => setShowCommForm(!showCommForm)}
              >
                {showCommForm ? 'Cancel' : '+ Log Communication'}
              </button>
            </div>

            {showCommForm && (
              <CommunicationLogForm
                recommendationId={recommendationId}
                onSaved={handleCommSaved}
                onCancel={() => setShowCommForm(false)}
              />
            )}

            <div className={showCommForm ? 'timeline-with-form' : ''}>
              <CommunicationTimeline
                recommendationId={recommendationId}
                refreshTrigger={commRefresh}
              />
            </div>
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="tab-content">
            {loading ? (
              <div className="loading-state">Loading invites...</div>
            ) : invites.length === 0 ? (
              <div className="empty-state">No invites sent yet</div>
            ) : (
              <div className="invites-list">
                {invites.map((invite) => (
                  <div key={invite.id} className="invite-card">
                    <div className="invite-header">
                      <span className="invite-name">
                        {invite.firstName} {invite.lastName}
                      </span>
                      <span className="invite-email">{invite.email}</span>
                    </div>

                    <div className="invite-milestones">
                      <div className={`milestone ${invite.sentAt ? 'completed' : ''}`}>
                        <span className="milestone-icon">📨</span>
                        <span className="milestone-label">Sent</span>
                        <span className="milestone-time">
                          {formatRelativeTime(invite.sentAt)}
                        </span>
                      </div>

                      <div className={`milestone ${invite.emailOpenedAt ? 'completed' : ''}`}>
                        <span className="milestone-icon">👁️</span>
                        <span className="milestone-label">Opened</span>
                        <span className="milestone-time">
                          {formatRelativeTime(invite.emailOpenedAt)}
                        </span>
                      </div>

                      <div className={`milestone ${invite.viewedAt ? 'completed' : ''}`}>
                        <span className="milestone-icon">📄</span>
                        <span className="milestone-label">Viewed</span>
                        <span className="milestone-time">
                          {formatRelativeTime(invite.viewedAt)}
                        </span>
                      </div>

                      <div className={`milestone ${invite.accountCreatedAt ? 'completed' : ''}`}>
                        <span className="milestone-icon">✅</span>
                        <span className="milestone-label">Signed Up</span>
                        <span className="milestone-time">
                          {formatRelativeTime(invite.accountCreatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .pipeline-panel {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          overflow: hidden;
        }

        .panel-header {
          padding: 20px;
          border-bottom: 1px solid #E5E7EB;
          background: #F9FAFB;
        }

        .score-display {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .score-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 4px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }

        .score-number {
          font-size: 24px;
          font-weight: 700;
        }

        .score-meta {
          display: flex;
          flex-direction: column;
        }

        .score-title {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .score-status {
          font-size: 12px;
          color: #6B7280;
          margin-top: 2px;
        }

        .panel-tabs {
          display: flex;
          border-bottom: 1px solid #E5E7EB;
        }

        .tab {
          flex: 1;
          padding: 12px 16px;
          background: none;
          border: none;
          font-size: 13px;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.15s ease;
          border-bottom: 2px solid transparent;
        }

        .tab:hover {
          color: #374151;
          background: #F9FAFB;
        }

        .tab.active {
          color: #059669;
          border-bottom-color: #059669;
        }

        .panel-content {
          padding: 16px;
        }

        .tab-content {
          display: flex;
          flex-direction: column;
        }

        .section-spacer {
          height: 16px;
        }

        .comm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .comm-header h4 {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .btn-add-comm {
          padding: 6px 12px;
          background: #F3F4F6;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-add-comm:hover {
          background: #E5E7EB;
        }

        .timeline-with-form {
          margin-top: 16px;
        }

        .loading-state,
        .empty-state {
          padding: 32px 20px;
          text-align: center;
          color: #9CA3AF;
          font-size: 13px;
        }

        .invites-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .invite-card {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 12px;
        }

        .invite-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .invite-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .invite-email {
          font-size: 12px;
          color: #6B7280;
        }

        .invite-milestones {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        @media (max-width: 500px) {
          .invite-milestones {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .milestone {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px;
          background: white;
          border-radius: 6px;
          opacity: 0.4;
        }

        .milestone.completed {
          opacity: 1;
        }

        .milestone-icon {
          font-size: 16px;
          margin-bottom: 4px;
        }

        .milestone-label {
          font-size: 10px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .milestone-time {
          font-size: 11px;
          color: #9CA3AF;
          margin-top: 2px;
        }
      `}</style>
    </div>
  )
}

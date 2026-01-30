import { useEffect, useRef } from 'react'
import type { ClientDetailData } from './types'
import { getScoreColor, getStatusLabel, getStageIcon, getStageLabel } from './utils'
import { AlertComposer } from './AlertComposer'

interface ClientDetailModalProps {
  clientDetail: ClientDetailData | null
  loading: boolean
  alertType: string
  alertMessage: string
  publishingAlert: boolean
  focusAlert?: boolean
  onClose: () => void
  onAlertTypeChange: (type: string) => void
  onAlertMessageChange: (message: string) => void
  onPublishAlert: () => void
}

export function ClientDetailModal({
  clientDetail,
  loading,
  alertType,
  alertMessage,
  publishingAlert,
  focusAlert,
  onClose,
  onAlertTypeChange,
  onAlertMessageChange,
  onPublishAlert,
}: ClientDetailModalProps) {
  const alertSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (focusAlert && !loading && clientDetail && alertSectionRef.current) {
      alertSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focusAlert, loading, clientDetail])
  return (
    <>
      <div className="perf-modal-overlay" onClick={onClose}>
        <div className="perf-modal" onClick={(e) => e.stopPropagation()}>
          <button className="perf-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {loading ? (
            <div className="perf-modal-loading">
              <div className="spinner"></div>
              Loading...
            </div>
          ) : clientDetail ? (
            <>
              <div className="perf-modal-header">
                <h2>{clientDetail.client.name}</h2>
              </div>

              <div className="perf-modal-body">
                {/* Score Display */}
                <div className="perf-detail-score-section">
                  <div
                    className="perf-detail-score"
                    style={{ background: getScoreColor(clientDetail.client.score) }}
                  >
                    {clientDetail.client.score}
                  </div>
                  <div className="perf-detail-score-info">
                    <div className="perf-detail-status" style={{ color: getScoreColor(clientDetail.client.score) }}>
                      {getStatusLabel(clientDetail.client.status)}
                    </div>
                    <div className="perf-detail-stage">
                      {getStageIcon(clientDetail.client.growth_stage)} {getStageLabel(clientDetail.client.growth_stage)} ({clientDetail.client.tenure_months} months)
                    </div>
                    <div className="perf-detail-plan">
                      Plan: {clientDetail.client.plan_type.replace('_', ' ')} | MRR: ${clientDetail.client.mrr.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="perf-detail-section">
                  <h3>Metric Breakdown</h3>
                  <div className="perf-metrics-grid">
                    {Object.entries(clientDetail.metrics).map(([key, metric]) => (
                      <div key={key} className="perf-metric-row">
                        <div className="perf-metric-label">{key.replace('_', ' ')}</div>
                        <div className="perf-metric-bar-container">
                          <div
                            className="perf-metric-bar"
                            style={{
                              width: `${metric.score}%`,
                              background: getScoreColor(metric.score),
                            }}
                          />
                        </div>
                        <div className="perf-metric-score">{metric.score}</div>
                        <div className={`perf-metric-delta ${metric.delta >= 0 ? 'positive' : 'negative'}`}>
                          {metric.delta >= 0 ? '+' : ''}{metric.delta.toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="perf-velocity-info">
                    Velocity: {clientDetail.velocity.velocity.toFixed(2)}/mo
                    (expected: {clientDetail.velocity.expected.toFixed(1)})
                    → {clientDetail.velocity.modifier.toFixed(2)}x modifier
                  </div>
                </div>

                {/* Red Flags */}
                {clientDetail.red_flags.length > 0 && (
                  <div className="perf-detail-section perf-red-flags">
                    <h3>Red Flags</h3>
                    <ul>
                      {clientDetail.red_flags.map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alert Composer */}
                <div ref={alertSectionRef}>
                  <AlertComposer
                    alertType={alertType}
                    alertMessage={alertMessage}
                    publishing={publishingAlert}
                    onTypeChange={onAlertTypeChange}
                    onMessageChange={onAlertMessageChange}
                    onPublish={onPublishAlert}
                  />
                </div>

                {/* Alert History */}
                {clientDetail.alerts_history.length > 0 && (
                  <div className="perf-detail-section">
                    <h3>Alert History</h3>
                    <div className="perf-alert-history">
                      {clientDetail.alerts_history.map((alert) => (
                        <div key={alert.id} className="perf-alert-history-item">
                          <div className="perf-alert-date">
                            {new Date(alert.sent_at).toLocaleDateString()}
                          </div>
                          <div className="perf-alert-type">{alert.type.replace('_', ' ')}</div>
                          <div className="perf-alert-preview">
                            {alert.message.substring(0, 60)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="perf-modal-loading">
              No data available
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .perf-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .perf-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .perf-modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border: none;
          background: #F3F4F6;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .perf-modal-close svg {
          width: 18px;
          height: 18px;
          color: #6B7280;
        }

        .perf-modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #E5E7EB;
        }

        .perf-modal-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .perf-modal-body {
          padding: 24px;
        }

        .perf-modal-loading {
          padding: 60px;
          text-align: center;
          color: #6B7280;
        }

        .spinner {
          width: 32px;
          height: 32px;
          margin: 0 auto 16px;
          border: 3px solid #E5E7EB;
          border-top-color: #059669;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Score Section */
        .perf-detail-score-section {
          display: flex;
          gap: 20px;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #E5E7EB;
        }

        .perf-detail-score {
          width: 80px;
          height: 80px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 32px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .perf-detail-status {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .perf-detail-stage {
          font-size: 14px;
          color: #374151;
          margin-bottom: 2px;
        }

        .perf-detail-plan {
          font-size: 13px;
          color: #6B7280;
        }

        /* Sections */
        .perf-detail-section {
          margin-bottom: 24px;
        }

        .perf-detail-section h3 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Metrics Grid */
        .perf-metrics-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .perf-metric-row {
          display: grid;
          grid-template-columns: 100px 1fr 40px 60px;
          gap: 12px;
          align-items: center;
        }

        .perf-metric-label {
          font-size: 13px;
          color: #374151;
          text-transform: capitalize;
        }

        .perf-metric-bar-container {
          height: 8px;
          background: #E5E7EB;
          border-radius: 4px;
          overflow: hidden;
        }

        .perf-metric-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .perf-metric-score {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          text-align: center;
        }

        .perf-metric-delta {
          font-size: 12px;
          text-align: right;
        }

        .perf-metric-delta.positive {
          color: #16a34a;
        }

        .perf-metric-delta.negative {
          color: #dc2626;
        }

        .perf-velocity-info {
          font-size: 12px;
          color: #6B7280;
          margin-top: 12px;
          padding: 10px;
          background: #F9FAFB;
          border-radius: 6px;
        }

        /* Red Flags */
        .perf-red-flags {
          background: #FEF2F2;
          padding: 16px;
          border-radius: 10px;
        }

        .perf-red-flags h3 {
          color: #dc2626;
        }

        .perf-red-flags ul {
          margin: 0;
          padding-left: 20px;
        }

        .perf-red-flags li {
          font-size: 13px;
          color: #991B1B;
          margin-bottom: 4px;
        }

        /* Alert History */
        .perf-alert-history {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .perf-alert-history-item {
          display: grid;
          grid-template-columns: 80px 100px 1fr;
          gap: 12px;
          padding: 10px;
          background: #F9FAFB;
          border-radius: 6px;
          font-size: 13px;
        }

        .perf-alert-date {
          color: #6B7280;
        }

        .perf-alert-type {
          color: #374151;
          font-weight: 500;
          text-transform: capitalize;
        }

        .perf-alert-preview {
          color: #6B7280;
        }
      `}</style>
    </>
  )
}

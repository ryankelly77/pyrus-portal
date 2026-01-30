import type { ClientData } from './types'
import { getScoreColor, getStatusLabel, getStageIcon, getStageLabel, getTrendArrow, formatTimeAgo } from './utils'

interface ClientListProps {
  clients: ClientData[]
  onViewClient: (clientId: string) => void
}

export function ClientList({ clients, onViewClient }: ClientListProps) {
  if (clients.length === 0) {
    return (
      <>
        <div className="perf-client-list">
          <div className="perf-empty">No clients match your filters</div>
        </div>
        <style jsx>{`
          .perf-client-list {
            background: white;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            overflow: hidden;
          }
          .perf-empty {
            padding: 60px;
            text-align: center;
            color: #6B7280;
          }
        `}</style>
      </>
    )
  }

  return (
    <>
      <div className="perf-client-list">
        <div className="perf-client-header">
          <div className="perf-header-score">Score</div>
          <div className="perf-header-client">Client</div>
          <div className="perf-header-stage">Stage</div>
          <div className="perf-header-plan">Plan</div>
          <div className="perf-header-status">Status</div>
          <div className="perf-header-trends">Trends</div>
          <div className="perf-header-alert">Last Alert</div>
          <div className="perf-header-actions">Actions</div>
        </div>
        {clients.map((client) => (
          <div key={client.id} className="perf-client-row">
            <div className="perf-client-score" style={{ background: getScoreColor(client.score) }}>
              {client.score}
            </div>

            <div className="perf-client-info">
              <div className="perf-client-name">{client.name}</div>
              <div className="perf-client-meta">
                {client.tenure_months} months | ${client.mrr.toLocaleString()} MRR
              </div>
            </div>

            <div className="perf-client-stage">
              <span className="perf-stage-badge">
                {getStageIcon(client.growth_stage)} {getStageLabel(client.growth_stage)}
              </span>
            </div>

            <div className="perf-client-plan">
              {client.plan_type.replace('_', ' ')}
            </div>

            <div className="perf-client-status">
              <span
                className="perf-status-badge"
                style={{
                  background: `${getScoreColor(client.score)}20`,
                  color: getScoreColor(client.score),
                }}
              >
                {getStatusLabel(client.status)}
              </span>
            </div>

            <div className="perf-client-trends">
              {client.metrics.keywords && (
                <span className={`perf-trend ${client.metrics.keywords.delta > 0 ? 'up' : client.metrics.keywords.delta < 0 ? 'down' : ''}`}>
                  {getTrendArrow(client.metrics.keywords.delta)} KW
                </span>
              )}
              {client.metrics.visitors && (
                <span className={`perf-trend ${client.metrics.visitors.delta > 0 ? 'up' : client.metrics.visitors.delta < 0 ? 'down' : ''}`}>
                  {getTrendArrow(client.metrics.visitors.delta)} Traffic
                </span>
              )}
              {client.metrics.leads && (
                <span className={`perf-trend ${client.metrics.leads.delta > 0 ? 'up' : client.metrics.leads.delta < 0 ? 'down' : ''}`}>
                  {getTrendArrow(client.metrics.leads.delta)} Leads
                </span>
              )}
            </div>

            <div className="perf-client-alert-date">
              Last alert: {formatTimeAgo(client.last_alert_at)}
            </div>

            <div className="perf-client-actions">
              <button
                className="perf-btn perf-btn-view"
                onClick={() => onViewClient(client.id)}
              >
                View
              </button>
              <button
                className="perf-btn perf-btn-alert"
                onClick={() => onViewClient(client.id)}
              >
                Alert
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .perf-client-list {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          overflow: hidden;
        }

        .perf-client-header {
          display: grid;
          grid-template-columns: 60px 1fr 140px 120px 140px 180px 140px 140px;
          gap: 16px;
          align-items: center;
          padding: 12px 20px;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .perf-client-row {
          display: grid;
          grid-template-columns: 60px 1fr 140px 120px 140px 180px 140px 140px;
          gap: 16px;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #F3F4F6;
          transition: background 0.15s ease;
        }

        .perf-client-row:hover {
          background: #F9FAFB;
        }

        .perf-client-row:last-child {
          border-bottom: none;
        }

        .perf-client-score {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          font-weight: 700;
        }

        .perf-client-info {
          min-width: 0;
        }

        .perf-client-name {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .perf-client-meta {
          font-size: 12px;
          color: #6B7280;
          margin-top: 2px;
        }

        .perf-stage-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #374151;
        }

        .perf-client-plan {
          font-size: 13px;
          color: #6B7280;
          text-transform: capitalize;
        }

        .perf-status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .perf-client-trends {
          display: flex;
          gap: 8px;
          font-size: 12px;
        }

        .perf-trend {
          color: #6B7280;
        }

        .perf-trend.up {
          color: #16a34a;
        }

        .perf-trend.down {
          color: #dc2626;
        }

        .perf-client-alert-date {
          font-size: 12px;
          color: #9CA3AF;
        }

        .perf-client-actions {
          display: flex;
          gap: 8px;
        }

        .perf-btn {
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .perf-btn-view {
          background: #F3F4F6;
          color: #374151;
        }

        .perf-btn-view:hover {
          background: #E5E7EB;
        }

        .perf-btn-alert {
          background: #059669;
          color: white;
        }

        .perf-btn-alert:hover {
          background: #047857;
        }

        @media (max-width: 1400px) {
          .perf-client-header,
          .perf-client-row {
            grid-template-columns: 50px 1fr 120px 100px 120px 100px;
          }

          .perf-client-trends,
          .perf-client-alert-date,
          .perf-header-trends,
          .perf-header-alert {
            display: none;
          }
        }

        @media (max-width: 1000px) {
          .perf-client-header,
          .perf-client-row {
            grid-template-columns: 50px 1fr 100px 100px;
          }

          .perf-client-plan,
          .perf-client-stage,
          .perf-header-plan,
          .perf-header-stage {
            display: none;
          }
        }

        @media (max-width: 600px) {
          .perf-client-header,
          .perf-client-row {
            grid-template-columns: 50px 1fr 100px;
          }

          .perf-client-status,
          .perf-header-status {
            display: none;
          }
        }
      `}</style>
    </>
  )
}

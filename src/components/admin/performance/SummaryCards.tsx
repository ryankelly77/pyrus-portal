import type { Summary } from './types'

interface SummaryCardsProps {
  summary: Summary
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <>
      <div className="perf-summary-grid">
        <div className="perf-summary-card">
          <div className="perf-summary-value">{summary.total_clients}</div>
          <div className="perf-summary-label">Total Clients</div>
        </div>
        <div className="perf-summary-card perf-critical">
          <div className="perf-summary-value">{summary.by_status.critical}</div>
          <div className="perf-summary-label">Critical (0-19)</div>
        </div>
        <div className="perf-summary-card perf-healthy">
          <div className="perf-summary-value">{summary.by_status.healthy}</div>
          <div className="perf-summary-label">Healthy (60-79)</div>
        </div>
        <div className="perf-summary-card perf-thriving">
          <div className="perf-summary-value">{summary.by_status.thriving}</div>
          <div className="perf-summary-label">Thriving (80-100)</div>
        </div>
        <div className="perf-summary-card">
          <div className="perf-summary-value">{summary.average_score.toFixed(1)}</div>
          <div className="perf-summary-label">Avg Score</div>
        </div>
      </div>

      <style jsx>{`
        .perf-summary-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .perf-summary-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }

        .perf-summary-value {
          font-size: 32px;
          font-weight: 700;
          color: #111827;
          line-height: 1;
        }

        .perf-summary-label {
          font-size: 13px;
          color: #6B7280;
          margin-top: 8px;
        }

        .perf-summary-card.perf-critical {
          border-color: #dc2626;
          background: #fef2f2;
        }
        .perf-summary-card.perf-critical .perf-summary-value {
          color: #dc2626;
        }

        .perf-summary-card.perf-healthy {
          border-color: #22c55e;
          background: #f0fdf4;
        }
        .perf-summary-card.perf-healthy .perf-summary-value {
          color: #22c55e;
        }

        .perf-summary-card.perf-thriving {
          border-color: #16a34a;
          background: #dcfce7;
        }
        .perf-summary-card.perf-thriving .perf-summary-value {
          color: #16a34a;
        }

        @media (max-width: 1000px) {
          .perf-summary-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 600px) {
          .perf-summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </>
  )
}

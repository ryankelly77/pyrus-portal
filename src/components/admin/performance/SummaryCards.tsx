import type { Summary } from './types'
import { Sparkline } from './Sparkline'

interface SummaryCardsProps {
  summary: Summary
  avgScoreHistory?: number[]
}

export function SummaryCards({ summary, avgScoreHistory }: SummaryCardsProps) {
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
        <div className="perf-summary-card perf-at-risk">
          <div className="perf-summary-value">{summary.by_status.at_risk}</div>
          <div className="perf-summary-label">At Risk (20-39)</div>
        </div>
        <div className="perf-summary-card perf-needs-attention">
          <div className="perf-summary-value">{summary.by_status.needs_attention}</div>
          <div className="perf-summary-label">Needs Attention (40-59)</div>
        </div>
        <div className="perf-summary-card perf-healthy">
          <div className="perf-summary-value">{summary.by_status.healthy}</div>
          <div className="perf-summary-label">Healthy (60-79)</div>
        </div>
        <div className="perf-summary-card perf-thriving">
          <div className="perf-summary-value">{summary.by_status.thriving}</div>
          <div className="perf-summary-label">Thriving (80+)</div>
        </div>
        <div className="perf-summary-card perf-avg-score">
          <div className="perf-avg-row">
            <div className="perf-summary-value">{summary.average_score.toFixed(0)}</div>
            {avgScoreHistory && avgScoreHistory.length > 1 && (
              <Sparkline data={avgScoreHistory} width={60} height={28} />
            )}
          </div>
          <div className="perf-summary-label">Avg Score</div>
        </div>
      </div>

      <style jsx>{`
        .perf-summary-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .perf-summary-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px 12px;
          text-align: center;
        }

        .perf-summary-value {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          line-height: 1;
        }

        .perf-summary-label {
          font-size: 11px;
          color: #6B7280;
          margin-top: 6px;
        }

        .perf-summary-card.perf-critical {
          border-color: #dc2626;
          background: #fef2f2;
        }
        .perf-summary-card.perf-critical .perf-summary-value {
          color: #dc2626;
        }

        .perf-summary-card.perf-at-risk {
          border-color: #ea580c;
          background: #fff7ed;
        }
        .perf-summary-card.perf-at-risk .perf-summary-value {
          color: #ea580c;
        }

        .perf-summary-card.perf-needs-attention {
          border-color: #eab308;
          background: #fefce8;
        }
        .perf-summary-card.perf-needs-attention .perf-summary-value {
          color: #ca8a04;
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

        .perf-summary-card.perf-avg-score {
          border-color: #059669;
          background: #ecfdf5;
        }
        .perf-summary-card.perf-avg-score .perf-summary-value {
          color: #059669;
        }
        .perf-avg-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        @media (max-width: 1200px) {
          .perf-summary-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 800px) {
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

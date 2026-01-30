import type { Summary, GrowthStage } from './types'
import { getScoreColor, getStageIcon, getStageLabel } from './utils'

interface GrowthStageCardsProps {
  summary: Summary
}

const STAGES: GrowthStage[] = ['seedling', 'sprouting', 'blooming', 'harvesting']

export function GrowthStageCards({ summary }: GrowthStageCardsProps) {
  return (
    <>
      <div className="perf-stage-grid">
        {STAGES.map((stage) => {
          const stageData = summary.by_stage[stage]
          return (
            <div key={stage} className="perf-stage-card">
              <div className="perf-stage-header">
                <span className="perf-stage-icon">{getStageIcon(stage)}</span>
                <span className="perf-stage-name">{getStageLabel(stage)}</span>
              </div>
              <div className="perf-stage-count">{stageData.count} clients</div>
              <div className="perf-stage-score">Avg: {stageData.avg_score.toFixed(0)}</div>
              <div className="perf-stage-bar">
                <div
                  className="perf-stage-bar-fill"
                  style={{
                    width: `${stageData.avg_score}%`,
                    background: getScoreColor(stageData.avg_score),
                  }}
                />
              </div>
              {stageData.issues_count !== undefined && stageData.issues_count > 0 && (
                <div className="perf-stage-issues">{stageData.issues_count} need attention</div>
              )}
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .perf-stage-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .perf-stage-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
        }

        .perf-stage-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .perf-stage-icon {
          font-size: 20px;
        }

        .perf-stage-name {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
        }

        .perf-stage-count {
          font-size: 13px;
          color: #6B7280;
        }

        .perf-stage-score {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-top: 4px;
        }

        .perf-stage-bar {
          height: 6px;
          background: #E5E7EB;
          border-radius: 3px;
          margin-top: 8px;
          overflow: hidden;
        }

        .perf-stage-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .perf-stage-issues {
          font-size: 12px;
          color: #f97316;
          margin-top: 6px;
        }

        @media (max-width: 1000px) {
          .perf-stage-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .perf-stage-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}

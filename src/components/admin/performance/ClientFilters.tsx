interface ClientFiltersProps {
  stageFilter: string
  statusFilter: string
  planFilter: string
  sortBy: string
  criticalOnly: boolean
  onStageChange: (value: string) => void
  onStatusChange: (value: string) => void
  onPlanChange: (value: string) => void
  onSortChange: (value: string) => void
  onCriticalOnlyChange: (value: boolean) => void
  onShowExplainer?: () => void
}

export function ClientFilters({
  stageFilter,
  statusFilter,
  planFilter,
  sortBy,
  criticalOnly,
  onStageChange,
  onStatusChange,
  onPlanChange,
  onSortChange,
  onCriticalOnlyChange,
  onShowExplainer,
}: ClientFiltersProps) {
  return (
    <>
      <div className="perf-filters">
        <select
          className="perf-filter-select"
          value={stageFilter}
          onChange={(e) => onStageChange(e.target.value)}
        >
          <option value="all">All Stages</option>
          <option value="seedling">Seedling</option>
          <option value="sprouting">Sprouting</option>
          <option value="blooming">Blooming</option>
          <option value="harvesting">Harvesting</option>
        </select>

        <select
          className="perf-filter-select"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="critical">Critical</option>
          <option value="at_risk">At Risk</option>
          <option value="needs_attention">Needs Attention</option>
          <option value="healthy">Healthy</option>
          <option value="thriving">Thriving</option>
        </select>

        <select
          className="perf-filter-select"
          value={planFilter}
          onChange={(e) => onPlanChange(e.target.value)}
        >
          <option value="all">All Plans</option>
          <option value="seo">SEO</option>
          <option value="paid_media">Paid Media</option>
          <option value="ai_optimization">AI Optimization</option>
          <option value="full_service">Full Service</option>
        </select>

        <select
          className="perf-filter-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="score_desc">Score (High to Low)</option>
          <option value="score_asc">Score (Low to High)</option>
          <option value="name">Name (A-Z)</option>
          <option value="stage">Stage</option>
          <option value="mrr_desc">MRR (High to Low)</option>
        </select>

        {onShowExplainer && (
          <button
            type="button"
            className="perf-explainer-btn"
            onClick={onShowExplainer}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            How Scoring Works
          </button>
        )}

        <label className="perf-filter-checkbox">
          <input
            type="checkbox"
            checked={criticalOnly}
            onChange={(e) => onCriticalOnlyChange(e.target.checked)}
          />
          <span>Show Critical Only</span>
        </label>
      </div>

      <style jsx>{`
        .perf-filters {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .perf-filter-select {
          padding: 8px 12px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          color: #374151;
          background: white;
          cursor: pointer;
          outline: none;
        }

        .perf-filter-select:focus {
          border-color: #059669;
        }

        .perf-filter-checkbox {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
          margin-left: auto;
        }

        .perf-explainer-btn {
          padding: 8px 12px;
          background: #F3F4F6;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .perf-explainer-btn:hover {
          background: #E5E7EB;
        }

        @media (max-width: 600px) {
          .perf-filters {
            flex-direction: column;
            align-items: stretch;
          }

          .perf-filter-checkbox {
            margin-left: 0;
          }
        }
      `}</style>
    </>
  )
}

interface ScoringExplainerModalProps {
  onClose: () => void
}

export function ScoringExplainerModal({ onClose }: ScoringExplainerModalProps) {
  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div className="modal-header">
            <h2>How Scoring Works</h2>
          </div>

          <div className="modal-body">
            <section className="section">
              <h3>Performance Score (0-100)</h3>
              <p>
                Each client receives a performance score based on their metrics compared to the previous period.
                The score reflects growth momentum and engagement quality.
              </p>
            </section>

            <section className="section">
              <h3>Score Breakdown</h3>
              <div className="score-table">
                <div className="score-row">
                  <span className="score-badge critical">0-19</span>
                  <span className="score-label">Critical</span>
                  <span className="score-desc">Immediate attention required</span>
                </div>
                <div className="score-row">
                  <span className="score-badge at-risk">20-39</span>
                  <span className="score-label">At Risk</span>
                  <span className="score-desc">Declining metrics, needs intervention</span>
                </div>
                <div className="score-row">
                  <span className="score-badge needs-attention">40-59</span>
                  <span className="score-label">Needs Attention</span>
                  <span className="score-desc">Below expectations, monitor closely</span>
                </div>
                <div className="score-row">
                  <span className="score-badge healthy">60-79</span>
                  <span className="score-label">Healthy</span>
                  <span className="score-desc">Meeting expectations, on track</span>
                </div>
                <div className="score-row">
                  <span className="score-badge thriving">80-100</span>
                  <span className="score-label">Thriving</span>
                  <span className="score-desc">Exceeding expectations</span>
                </div>
              </div>
            </section>

            <section className="section">
              <h3>Metric Weights by Plan</h3>
              <p>Different plans weight metrics differently:</p>
              <div className="weights-grid">
                <div className="weight-card">
                  <h4>SEO Only</h4>
                  <ul>
                    <li>Keywords: 35%</li>
                    <li>Visitors: 30%</li>
                    <li>Leads: 20%</li>
                    <li>Alerts: 15%</li>
                  </ul>
                </div>
                <div className="weight-card">
                  <h4>Paid Only</h4>
                  <ul>
                    <li>Conversions: 35%</li>
                    <li>Leads: 30%</li>
                    <li>Visitors: 20%</li>
                    <li>Alerts: 15%</li>
                  </ul>
                </div>
                <div className="weight-card">
                  <h4>AI Only</h4>
                  <ul>
                    <li>AI Visibility: 40%</li>
                    <li>Keywords: 25%</li>
                    <li>Visitors: 20%</li>
                    <li>Alerts: 15%</li>
                  </ul>
                </div>
                <div className="weight-card">
                  <h4>Multi Service</h4>
                  <ul>
                    <li>Keywords: 25%</li>
                    <li>Visitors: 20%</li>
                    <li>Leads: 20%</li>
                    <li>AI Visibility: 20%</li>
                    <li>Alerts: 15%</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="section">
              <h3>Growth Stages</h3>
              <div className="stages-list">
                <div className="stage-item">
                  <span className="stage-icon">🌱</span>
                  <div>
                    <strong>Seedling</strong> (0-3 months)
                    <p>New clients in ramp-up period. Scores adjusted for limited data.</p>
                  </div>
                </div>
                <div className="stage-item">
                  <span className="stage-icon">🌿</span>
                  <div>
                    <strong>Sprouting</strong> (3-6 months)
                    <p>Building momentum. Expect steady improvements.</p>
                  </div>
                </div>
                <div className="stage-item">
                  <span className="stage-icon">🌸</span>
                  <div>
                    <strong>Blooming</strong> (6-12 months)
                    <p>Mature engagement. Full performance expectations apply.</p>
                  </div>
                </div>
                <div className="stage-item">
                  <span className="stage-icon">🌾</span>
                  <div>
                    <strong>Harvesting</strong> (12+ months)
                    <p>Long-term clients. Focus on retention and upsell.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="section">
              <h3>Velocity Modifier</h3>
              <p>
                The velocity modifier adjusts scores based on improvement rate. Clients showing
                consistent improvements get a boost (up to 1.15x), while stagnant accounts
                receive a penalty (down to 0.7x).
              </p>
            </section>

            <section className="section">
              <h3>Trends</h3>
              <p>Trend indicators show period-over-period changes:</p>
              <div className="trends-example">
                <span className="trend up">↑ Up</span>
                <span>Metric improved by more than 5%</span>
              </div>
              <div className="trends-example">
                <span className="trend stable">→ Stable</span>
                <span>Metric changed less than 5%</span>
              </div>
              <div className="trends-example">
                <span className="trend down">↓ Down</span>
                <span>Metric declined by more than 5%</span>
              </div>
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .modal-close {
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

        .modal-close svg {
          width: 18px;
          height: 18px;
          color: #6B7280;
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #E5E7EB;
        }

        .modal-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .modal-body {
          padding: 24px;
        }

        .section {
          margin-bottom: 28px;
        }

        .section:last-child {
          margin-bottom: 0;
        }

        .section h3 {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 12px 0;
        }

        .section p {
          font-size: 14px;
          color: #4B5563;
          margin: 0;
          line-height: 1.5;
        }

        .score-table {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .score-row {
          display: grid;
          grid-template-columns: 60px 120px 1fr;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
        }

        .score-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          text-align: center;
        }

        .score-badge.critical { background: #dc2626; }
        .score-badge.at-risk { background: #f97316; }
        .score-badge.needs-attention { background: #eab308; }
        .score-badge.healthy { background: #22c55e; }
        .score-badge.thriving { background: #16a34a; }

        .score-label {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
        }

        .score-desc {
          font-size: 13px;
          color: #6B7280;
        }

        .weights-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 12px;
        }

        .weight-card {
          background: #F9FAFB;
          padding: 14px;
          border-radius: 8px;
        }

        .weight-card h4 {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 8px 0;
        }

        .weight-card ul {
          margin: 0;
          padding-left: 16px;
          font-size: 12px;
          color: #6B7280;
        }

        .weight-card li {
          margin-bottom: 2px;
        }

        .stages-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .stage-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .stage-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .stage-item strong {
          font-size: 14px;
          color: #111827;
        }

        .stage-item p {
          font-size: 13px;
          color: #6B7280;
          margin: 2px 0 0 0;
        }

        .trends-example {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 0;
          font-size: 13px;
          color: #6B7280;
        }

        .trend {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          font-weight: 500;
          min-width: 70px;
          text-align: center;
        }

        .trend.up {
          background: #DCFCE7;
          color: #16a34a;
        }

        .trend.stable {
          background: #F3F4F6;
          color: #6B7280;
        }

        .trend.down {
          background: #FEE2E2;
          color: #dc2626;
        }

        @media (max-width: 600px) {
          .weights-grid {
            grid-template-columns: 1fr;
          }

          .score-row {
            grid-template-columns: 60px 1fr;
          }

          .score-desc {
            display: none;
          }
        }
      `}</style>
    </>
  )
}

interface ScoringExplainerModalProps {
  onClose: () => void
}

export function ScoringExplainerModal({ onClose }: ScoringExplainerModalProps) {
  return (
    <div
      className="scoring-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        className="scoring-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <button
          className="scoring-modal-close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            border: 'none',
            background: '#F3F4F6',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px', color: '#6B7280' }}>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>How Scoring Works</h2>
        </div>

        <div style={{ padding: '24px' }}>
          <section style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>Performance Score (0-100)</h3>
            <p style={{ fontSize: '14px', color: '#4B5563', margin: 0, lineHeight: 1.5 }}>
              Each client receives a performance score based on their metrics compared to the previous period.
              The score reflects growth momentum and engagement quality.
            </p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>Score Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <ScoreRow range="0-19" label="Critical" desc="Immediate attention required" color="#dc2626" />
              <ScoreRow range="20-39" label="At Risk" desc="Declining metrics, needs intervention" color="#f97316" />
              <ScoreRow range="40-59" label="Needs Attention" desc="Below expectations, monitor closely" color="#eab308" />
              <ScoreRow range="60-79" label="Healthy" desc="Meeting expectations, on track" color="#22c55e" />
              <ScoreRow range="80-100" label="Thriving" desc="Exceeding expectations" color="#16a34a" />
            </div>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>Metric Weights by Plan</h3>
            <p style={{ fontSize: '14px', color: '#4B5563', margin: '0 0 12px 0' }}>Different plans weight metrics differently:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <WeightCard title="SEO Only" items={['Keywords: 35%', 'Visitors: 30%', 'Leads: 20%', 'Alerts: 15%']} />
              <WeightCard title="Paid Only" items={['Conversions: 35%', 'Leads: 30%', 'Visitors: 20%', 'Alerts: 15%']} />
              <WeightCard title="AI Only" items={['AI Visibility: 40%', 'Keywords: 25%', 'Visitors: 20%', 'Alerts: 15%']} />
              <WeightCard title="Multi Service" items={['Keywords: 25%', 'Visitors: 20%', 'Leads: 20%', 'AI Visibility: 20%', 'Alerts: 15%']} />
            </div>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>Growth Stages</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <StageItem icon="🌱" title="Seedling" period="0-3 months" desc="New clients in ramp-up period. Scores adjusted for limited data." />
              <StageItem icon="🌿" title="Sprouting" period="3-6 months" desc="Building momentum. Expect steady improvements." />
              <StageItem icon="🌸" title="Blooming" period="6-12 months" desc="Mature engagement. Full performance expectations apply." />
              <StageItem icon="🌾" title="Harvesting" period="12+ months" desc="Long-term clients. Focus on retention and upsell." />
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>Velocity Modifier</h3>
            <p style={{ fontSize: '14px', color: '#4B5563', margin: 0, lineHeight: 1.5 }}>
              The velocity modifier adjusts scores based on improvement rate. Clients showing
              consistent improvements get a boost (up to 1.15x), while stagnant accounts
              receive a penalty (down to 0.7x).
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

function ScoreRow({ range, label, desc, color }: { range: string; label: string; desc: string; color: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '60px 120px 1fr', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
      <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: 'white', textAlign: 'center', background: color }}>{range}</span>
      <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#6B7280' }}>{desc}</span>
    </div>
  )
}

function WeightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ background: '#F9FAFB', padding: '14px', borderRadius: '8px' }}>
      <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>{title}</h4>
      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#6B7280' }}>
        {items.map((item, i) => <li key={i} style={{ marginBottom: '2px' }}>{item}</li>)}
      </ul>
    </div>
  )
}

function StageItem({ icon, title, period, desc }: { icon: string; title: string; period: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</span>
      <div>
        <strong style={{ fontSize: '14px', color: '#111827' }}>{title}</strong> ({period})
        <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0 0' }}>{desc}</p>
      </div>
    </div>
  )
}

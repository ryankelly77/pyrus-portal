import { ALERT_TEMPLATES } from './utils'

interface AlertComposerProps {
  alertType: string
  alertMessage: string
  publishing: boolean
  onTypeChange: (type: string) => void
  onMessageChange: (message: string) => void
  onPublish: () => void
}

export function AlertComposer({
  alertType,
  alertMessage,
  publishing,
  onTypeChange,
  onMessageChange,
  onPublish,
}: AlertComposerProps) {
  const handleTypeChange = (type: string) => {
    onTypeChange(type)
    onMessageChange(ALERT_TEMPLATES[type as keyof typeof ALERT_TEMPLATES] || '')
  }

  return (
    <>
      <div className="perf-detail-section perf-alert-composer">
        <h3>Publish Client Alert</h3>
        <div className="perf-alert-template-select">
          <label>Template:</label>
          <select value={alertType} onChange={(e) => handleTypeChange(e.target.value)}>
            <option value="performance_focus">Performance Focus</option>
            <option value="milestone">Milestone</option>
            <option value="intervention">Intervention</option>
            <option value="general_update">General Update</option>
          </select>
        </div>
        <textarea
          className="perf-alert-textarea"
          value={alertMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={4}
        />
        <div className="perf-alert-actions">
          <button
            className="perf-btn perf-btn-publish"
            onClick={onPublish}
            disabled={publishing || !alertMessage.trim()}
          >
            {publishing ? 'Publishing...' : 'Publish Alert'}
          </button>
        </div>
      </div>

      <style jsx>{`
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

        .perf-alert-composer {
          background: #F9FAFB;
          padding: 16px;
          border-radius: 10px;
        }

        .perf-alert-template-select {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .perf-alert-template-select label {
          font-size: 13px;
          color: #374151;
        }

        .perf-alert-template-select select {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          font-size: 14px;
          background: white;
        }

        .perf-alert-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          background: white;
        }

        .perf-alert-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          justify-content: flex-end;
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

        .perf-btn-publish {
          background: #059669;
          color: white;
          padding: 10px 20px;
        }

        .perf-btn-publish:hover:not(:disabled) {
          background: #047857;
        }

        .perf-btn-publish:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  )
}

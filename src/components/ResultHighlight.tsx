'use client'

interface KeywordData {
  keyword: string
  newPosition: number | null
  previousPosition: number | null
}

interface ResultHighlightProps {
  alertType?: 'ranking' | 'traffic' | 'leads' | 'milestone' | 'ai' | 'other'
  keyword?: string
  keywords?: KeywordData[]
  milestone?: string
  newPosition?: number
  previousPosition?: number
  body?: string | null
}

export function ResultHighlight({
  alertType = 'other',
  keyword,
  keywords,
  milestone,
  newPosition,
  previousPosition,
  body,
}: ResultHighlightProps) {
  return (
    <div className={`result-highlight result-highlight-${alertType}`} style={{ marginTop: '12px' }}>
      <div className="result-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {alertType === 'ranking' && (
            <>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </>
          )}
          {alertType === 'traffic' && (
            <>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </>
          )}
          {alertType === 'leads' && (
            <>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </>
          )}
          {alertType === 'milestone' && (
            <>
              <circle cx="12" cy="8" r="7"></circle>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
            </>
          )}
          {alertType === 'ai' && (
            <>
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"></path>
              <path d="M20 3v4"></path>
              <path d="M22 5h-4"></path>
              <path d="M4 17v2"></path>
              <path d="M5 18H3"></path>
            </>
          )}
          {(alertType === 'other' || !alertType) && (
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          )}
        </svg>
      </div>
      <div className="result-text">
        {/* Multiple keywords (new format) */}
        {keywords && keywords.length > 0 && (
          <>
            {body && <span style={{ display: 'block', marginBottom: '8px', fontWeight: 'normal' }}>{body}</span>}
            {keywords.map((kw, idx) => (
              <div key={idx} style={{ marginBottom: idx < keywords.length - 1 ? '10px' : 0 }}>
                <strong>&quot;{kw.keyword}&quot; — Now Position #{kw.newPosition || '?'}</strong>
                {kw.previousPosition && kw.newPosition && (
                  <span style={{ display: 'block' }}>
                    Moved from position #{kw.previousPosition} to #{kw.newPosition} (up {kw.previousPosition - kw.newPosition} spots!)
                    {kw.newPosition <= 10 ? ' - First page visibility achieved' : ''}
                  </span>
                )}
              </div>
            ))}
          </>
        )}
        {/* Legacy single keyword */}
        {!keywords && keyword && (
          <>
            {body && <span style={{ display: 'block', marginBottom: '8px', fontWeight: 'normal' }}>{body}</span>}
            <strong>&quot;{keyword}&quot; — Now Position #{newPosition}</strong>
            {previousPosition && newPosition && (
              <span>
                Moved from position #{previousPosition} to #{newPosition} (up {previousPosition - newPosition} spots!)
                {newPosition <= 10 ? ' - First page visibility achieved' : ''}
              </span>
            )}
          </>
        )}
        {/* Milestone */}
        {milestone && (
          <>
            <strong>{milestone}</strong>
            {body && <span style={{ display: 'block', marginTop: '4px', fontWeight: 'normal' }}>{body}</span>}
          </>
        )}
        {/* Body only (no keyword/milestone) */}
        {!keyword && !keywords && !milestone && body && (
          <span style={{ fontWeight: 'normal' }}>{body}</span>
        )}
      </div>
    </div>
  )
}

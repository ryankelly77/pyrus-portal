'use client'

import { useState } from 'react'

// Clean up raw email body text from CRM
export function cleanEmailBody(body: string): string {
  if (!body) return ''

  let cleaned = body

  // Remove "View this email in browser" links with URL
  cleaned = cleaned.replace(/View this email in browser\s*\[https?:\/\/[^\]]+\]/gi, '')

  // Remove image URLs in brackets [https://storage...]
  cleaned = cleaned.replace(/\[https?:\/\/[^\]]*\.(png|jpg|jpeg|gif|webp)[^\]]*\]/gi, '')

  // Convert markdown-style links [text](url) to just text
  cleaned = cleaned.replace(/\[([^\]]+)\]\s*\[https?:\/\/[^\]]+\]/g, '$1')
  cleaned = cleaned.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1')

  // Remove standalone URLs in brackets
  cleaned = cleaned.replace(/\[https?:\/\/[^\]]+\]/g, '')

  // Convert * bullet points to proper bullets
  cleaned = cleaned.replace(/^\s*\*\s+/gm, '• ')

  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // Trim whitespace
  cleaned = cleaned.trim()

  return cleaned
}

// Component to display email body with truncation and expand
export function EmailBodyPreview({ body, source }: { body: string; source?: string }) {
  const [expanded, setExpanded] = useState(false)

  // Clean the body if it's from HighLevel CRM
  const cleanedBody = source === 'highlevel' ? cleanEmailBody(body) : body

  // Truncate at 200 chars if not expanded
  const maxLength = 200
  const needsTruncation = cleanedBody.length > maxLength
  const displayText = expanded || !needsTruncation
    ? cleanedBody
    : cleanedBody.substring(0, maxLength).trim() + '...'

  return (
    <div style={{ marginTop: '8px' }}>
      <p style={{
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        margin: 0,
      }}>
        {displayText}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '4px 0',
            marginTop: '4px',
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

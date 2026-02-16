'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import './rich-text-editor.css'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  googleDocUrl?: string
  onGoogleDocUrlChange?: (url: string) => void
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  minHeight = 400,
  googleDocUrl = '',
  onGoogleDocUrlChange,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInternalChange = useRef(false)
  const [mode, setMode] = useState<'text' | 'gdoc'>(googleDocUrl ? 'gdoc' : 'text')
  const [docUrl, setDocUrl] = useState(googleDocUrl)

  // Extract Google Doc ID from URL
  const getGoogleDocEmbedUrl = (url: string): string | null => {
    const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
    if (match) {
      return `https://docs.google.com/document/d/${match[1]}/preview`
    }
    return null
  }

  const embedUrl = getGoogleDocEmbedUrl(docUrl)

  const handleDocUrlChange = (url: string) => {
    setDocUrl(url)
    onGoogleDocUrlChange?.(url)
  }

  // Sync external value changes to editor (also when switching back to text mode)
  useEffect(() => {
    if (mode === 'text' && !isInternalChange.current) {
      // Use requestAnimationFrame to ensure DOM is ready after mode switch
      requestAnimationFrame(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
          editorRef.current.innerHTML = value
        }
      })
    }
    isInternalChange.current = false
  }, [value, mode])

  // Handle input changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  // Handle paste - preserve formatting from Google Docs
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()

    // Try to get HTML content first (preserves formatting)
    const html = e.clipboardData.getData('text/html')
    const text = e.clipboardData.getData('text/plain')

    try {
      if (html) {
        // Clean up Google Docs HTML
        const cleaned = cleanGoogleDocsHtml(html)
        console.log('Original HTML length:', html.length)
        console.log('Cleaned HTML length:', cleaned.length)
        console.log('Cleaned HTML preview:', cleaned.substring(0, 500))

        if (cleaned && cleaned.trim()) {
          document.execCommand('insertHTML', false, cleaned)
        } else {
          // If cleaning resulted in empty, fall back to text
          console.warn('Cleaned HTML was empty, using plain text')
          if (text) {
            const paragraphs = text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
            document.execCommand('insertHTML', false, paragraphs || text)
          }
        }
      } else if (text) {
        // Fallback to plain text with paragraph breaks
        const paragraphs = text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
        document.execCommand('insertHTML', false, paragraphs || text)
      }
    } catch (err) {
      console.error('Paste error:', err)
      // Fallback: just insert plain text
      if (text) {
        document.execCommand('insertText', false, text)
      }
    }

    handleInput()
  }, [handleInput])

  // Execute formatting command
  const execCommand = useCallback((command: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    handleInput()
  }, [handleInput])

  // Format block (headings, paragraphs)
  const formatBlock = useCallback((tag: string) => {
    editorRef.current?.focus()
    document.execCommand('formatBlock', false, tag)
    handleInput()
  }, [handleInput])

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:')
    if (url) {
      execCommand('createLink', url)
    }
  }, [execCommand])

  return (
    <div className="rich-text-editor">
      {/* Mode Toggle */}
      <div className="editor-mode-toggle">
        <button
          type="button"
          className={`mode-btn ${mode === 'text' ? 'active' : ''}`}
          onClick={() => setMode('text')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Write/Paste Text
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === 'gdoc' ? 'active' : ''}`}
          onClick={() => setMode('gdoc')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Link Google Doc
        </button>
      </div>

      {mode === 'text' ? (
        <>
          <div className="editor-toolbar">
            <button type="button" className="toolbar-btn" title="Bold" onClick={() => execCommand('bold')}>
              <strong>B</strong>
            </button>
            <button type="button" className="toolbar-btn" title="Italic" onClick={() => execCommand('italic')}>
              <em>I</em>
            </button>
            <button type="button" className="toolbar-btn" title="Underline" onClick={() => execCommand('underline')}>
              <u>U</u>
            </button>

            <div className="toolbar-divider" />

            <button type="button" className="toolbar-btn" title="Heading 1" onClick={() => formatBlock('h1')}>
              H1
            </button>
            <button type="button" className="toolbar-btn" title="Heading 2" onClick={() => formatBlock('h2')}>
              H2
            </button>
            <button type="button" className="toolbar-btn" title="Heading 3" onClick={() => formatBlock('h3')}>
              H3
            </button>
            <button type="button" className="toolbar-btn" title="Paragraph" onClick={() => formatBlock('p')}>
              P
            </button>

            <div className="toolbar-divider" />

            <button type="button" className="toolbar-btn" title="Bullet List" onClick={() => execCommand('insertUnorderedList')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button type="button" className="toolbar-btn" title="Numbered List" onClick={() => execCommand('insertOrderedList')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="10" y1="6" x2="21" y2="6" />
                <line x1="10" y1="12" x2="21" y2="12" />
                <line x1="10" y1="18" x2="21" y2="18" />
                <path d="M4 6h1v4" />
                <path d="M4 10h2" />
                <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
              </svg>
            </button>

            <div className="toolbar-divider" />

            <button type="button" className="toolbar-btn" title="Link" onClick={insertLink}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>

            <div className="toolbar-divider" />

            <button type="button" className="toolbar-btn" title="Remove Formatting" onClick={() => execCommand('removeFormat')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M17 10L3 10" />
                <path d="M21 6L3 6" />
                <path d="M21 14L9 14" />
                <path d="M21 18L7 18" />
              </svg>
            </button>
          </div>

          <div
            ref={editorRef}
            className="editor-content"
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            data-placeholder={placeholder}
            style={{ minHeight }}
            suppressContentEditableWarning
          />
        </>
      ) : (
        <div className="gdoc-mode">
          <div className="gdoc-input-row">
            <input
              type="url"
              className="gdoc-url-input"
              placeholder="Paste Google Doc URL here..."
              value={docUrl}
              onChange={(e) => handleDocUrlChange(e.target.value)}
            />
            {docUrl && !embedUrl && (
              <span className="gdoc-error">Invalid Google Doc URL</span>
            )}
          </div>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="gdoc-preview"
              style={{ minHeight }}
              title="Google Doc Preview"
            />
          ) : (
            <div className="gdoc-placeholder" style={{ minHeight }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <p>Paste a Google Doc URL to preview it here</p>
              <span>Example: https://docs.google.com/document/d/abc123.../edit</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Clean up HTML from Google Docs while preserving lists, formatting, and tables
 */
function cleanGoogleDocsHtml(html: string): string {
  try {
    // Create a temporary element to parse the HTML
    const temp = document.createElement('div')
    temp.innerHTML = html

    // Remove Google Docs metadata elements
    temp.querySelectorAll('meta, style, script, link, title, google-sheets-html-origin, colgroup, col')
      .forEach(el => el.remove())

    // Google Docs wraps content in <b id="docs-internal-guid-xxx"> - unwrap but keep content
    temp.querySelectorAll('[id^="docs-internal-guid"]').forEach(el => {
      while (el.firstChild) {
        el.parentNode?.insertBefore(el.firstChild, el)
      }
      el.remove()
    })

    // Process spans BEFORE converting b/i tags - extract formatting from style
    temp.querySelectorAll('span').forEach(span => {
      const style = span.getAttribute('style') || ''
      const isBold = style.includes('font-weight') && (style.includes('700') || style.includes('bold'))
      const isItalic = style.includes('font-style') && style.includes('italic')
      const isUnderline = style.includes('text-decoration') && style.includes('underline')

      // Wrap content with formatting tags
      if (isBold) {
        const strong = document.createElement('strong')
        while (span.firstChild) strong.appendChild(span.firstChild)
        span.appendChild(strong)
      }
      if (isItalic) {
        const em = document.createElement('em')
        const content = span.querySelector('strong') || span
        while (content.firstChild) em.appendChild(content.firstChild)
        content.appendChild(em)
      }
      if (isUnderline) {
        const u = document.createElement('u')
        const content = span.querySelector('em') || span.querySelector('strong') || span
        while (content.firstChild) u.appendChild(content.firstChild)
        content.appendChild(u)
      }
    })

    // Now unwrap all spans (content with formatting is preserved)
    temp.querySelectorAll('span').forEach(span => {
      while (span.firstChild) {
        span.parentNode?.insertBefore(span.firstChild, span)
      }
      span.remove()
    })

    // Convert <b> to <strong> and <i> to <em>
    temp.querySelectorAll('b').forEach(b => {
      const strong = document.createElement('strong')
      strong.innerHTML = b.innerHTML
      b.replaceWith(strong)
    })
    temp.querySelectorAll('i').forEach(i => {
      const em = document.createElement('em')
      em.innerHTML = i.innerHTML
      i.replaceWith(em)
    })

    // Unwrap divs (keep content)
    temp.querySelectorAll('div').forEach(div => {
      while (div.firstChild) {
        div.parentNode?.insertBefore(div.firstChild, div)
      }
      div.remove()
    })

    // Clean attributes from allowed elements
    const allowedTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr']
    temp.querySelectorAll('*').forEach(el => {
      const tagName = el.tagName.toLowerCase()
      if (allowedTags.includes(tagName)) {
        if (tagName === 'a') {
          const href = el.getAttribute('href')
          Array.from(el.attributes).forEach(attr => el.removeAttribute(attr.name))
          if (href) el.setAttribute('href', href)
        } else {
          Array.from(el.attributes).forEach(attr => el.removeAttribute(attr.name))
        }
      }
    })

    // Get cleaned HTML
    let result = temp.innerHTML
      // Replace &nbsp; with regular space
      .replace(/&nbsp;/g, ' ')
      // Remove empty formatting tags
      .replace(/<(strong|em|u)>\s*<\/\1>/gi, '')
      // Remove excessive line breaks within tags
      .replace(/>\s*\n\s*</g, '><')
      // But ensure block elements have single line breaks
      .replace(/<\/(p|h[1-6]|li|tr)>/gi, '</$1>\n')
      .replace(/<(ul|ol|table|thead|tbody)>/gi, '\n<$1>')
      // Collapse multiple spaces (but not newlines)
      .replace(/[ \t]+/g, ' ')
      // Collapse multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return result

  } catch (err) {
    console.error('cleanGoogleDocsHtml error:', err)
    return ''
  }
}

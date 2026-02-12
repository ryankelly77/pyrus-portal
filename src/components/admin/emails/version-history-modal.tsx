'use client'

import { useState, useEffect } from 'react'

interface TemplateVersion {
  id: string
  versionNumber: number
  subjectTemplate: string
  bodyHtml: string
  bodyText: string | null
  changeNote: string | null
  createdAt: string
  changedBy: {
    id: string
    name: string
  } | null
}

interface VersionHistoryModalProps {
  slug: string
  isOpen: boolean
  onClose: () => void
  onRestore: (version: TemplateVersion) => void
}

export function VersionHistoryModal({
  slug,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchVersions()
    }
  }, [isOpen, slug])

  const fetchVersions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/email-templates/${slug}/versions`)
      if (!res.ok) {
        throw new Error('Failed to fetch versions')
      }
      const data = await res.json()
      setVersions(data.versions || [])
    } catch (err) {
      setError('Failed to load version history')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async () => {
    if (!selectedVersion) return

    setIsRestoring(true)

    try {
      const res = await fetch(`/api/admin/email-templates/${slug}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId: selectedVersion.id,
          changeNote: `Restored to version ${selectedVersion.versionNumber}`,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to restore version')
      }

      onRestore(selectedVersion)
      onClose()
    } catch (err) {
      setError('Failed to restore version')
      console.error(err)
    } finally {
      setIsRestoring(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay active"
      onClick={onClose}
      style={{ zIndex: 1000 }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <h2>Version History</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: '16px', padding: '16px' }}>
          {isLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Loading versions...
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error-color)' }}>
              {error}
            </div>
          ) : versions.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              No version history available
            </div>
          ) : (
            <>
              {/* Version list */}
              <div style={{ width: '280px', borderRight: '1px solid var(--border-color)', paddingRight: '16px', overflow: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      onClick={() => setSelectedVersion(version)}
                      style={{
                        padding: '12px',
                        border: '1px solid',
                        borderColor: selectedVersion?.id === version.id ? 'var(--pyrus-brown)' : 'var(--border-color)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: selectedVersion?.id === version.id ? 'rgba(139, 90, 43, 0.05)' : 'white',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                          Version {version.versionNumber}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatDate(version.createdAt)}
                      </div>
                      {version.changedBy && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          by {version.changedBy.name}
                        </div>
                      )}
                      {version.changeNote && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                          {version.changeNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Version preview */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {selectedVersion ? (
                  <div>
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--text-primary)' }}>
                        Subject
                      </h4>
                      <div
                        style={{
                          padding: '12px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {selectedVersion.subjectTemplate}
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--text-primary)' }}>
                        HTML Body
                      </h4>
                      <pre
                        style={{
                          padding: '12px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: '250px',
                          overflow: 'auto',
                          margin: 0,
                        }}
                      >
                        {selectedVersion.bodyHtml}
                      </pre>
                    </div>

                    {selectedVersion.bodyText && (
                      <div>
                        <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--text-primary)' }}>
                          Plain Text Body
                        </h4>
                        <pre
                          style={{
                            padding: '12px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: '150px',
                            overflow: 'auto',
                            margin: 0,
                          }}
                        >
                          {selectedVersion.bodyText}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                    Select a version to preview
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isRestoring}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleRestore}
            disabled={!selectedVersion || isRestoring}
          >
            {isRestoring ? 'Restoring...' : 'Restore This Version'}
          </button>
        </div>
      </div>
    </div>
  )
}

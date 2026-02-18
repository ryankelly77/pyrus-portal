'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface FileItem {
  id: string
  name: string
  type: 'docs' | 'images' | 'video'
  category: string
  url: string
  client_id: string
  client_name: string
  created_at: string
}

interface ClientOption {
  id: string
  name: string
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [clientFilter, setClientFilter] = useState('')

  // Add Files modal state
  const [showFilesModal, setShowFilesModal] = useState(false)
  const [fileClientId, setFileClientId] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileType, setFileType] = useState<'docs' | 'images' | 'video'>('docs')
  const [fileCategory, setFileCategory] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadMode, setUploadMode] = useState<'upload' | 'link'>('upload')
  const [isAddingFile, setIsAddingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileSuccess, setFileSuccess] = useState(false)

  // Fetch files and clients
  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams()
        if (clientFilter) params.set('clientId', clientFilter)

        const [filesRes, clientsRes] = await Promise.all([
          fetch(`/api/admin/files?${params.toString()}`),
          fetch('/api/admin/clients')
        ])

        if (filesRes.ok) {
          const data = await filesRes.json()
          setFiles(data.files || [])
        }

        if (clientsRes.ok) {
          const data = await clientsRes.json()
          const clientsArray = Array.isArray(data) ? data : (data.clients || [])
          setClients(clientsArray.map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name
          })))
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [clientFilter])

  // Handle file delete
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    setDeletingFileId(fileId)
    try {
      const res = await fetch(`/api/admin/files/${fileId}`, { method: 'DELETE' })
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete file')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Failed to delete file')
    } finally {
      setDeletingFileId(null)
    }
  }

  // Handle adding a file
  const handleAddFile = async () => {
    if (!fileClientId || !fileCategory) {
      setFileError('Please select a client and category')
      return
    }

    if (uploadMode === 'upload' && !uploadedFile) {
      setFileError('Please select a file to upload')
      return
    }
    if (uploadMode === 'link' && !fileName) {
      setFileError('Please enter a file name')
      return
    }

    setIsAddingFile(true)
    setFileError(null)

    try {
      let res: Response

      if (uploadMode === 'upload' && uploadedFile) {
        const formData = new FormData()
        formData.append('file', uploadedFile)
        formData.append('clientId', fileClientId)
        formData.append('category', fileCategory)

        res = await fetch('/api/admin/files/upload', {
          method: 'POST',
          body: formData,
        })
      } else {
        res = await fetch('/api/admin/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: fileClientId,
            name: fileName,
            type: fileType,
            category: fileCategory,
            url: fileUrl || null,
          }),
        })
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFileError(data.error || `Failed to add file (${res.status})`)
        return
      }

      const newFile = await res.json()
      // Add the new file to the list
      if (newFile.file) {
        setFiles(prev => [newFile.file, ...prev])
      }

      setFileSuccess(true)
      setTimeout(() => {
        setShowFilesModal(false)
        resetFileModal()
      }, 1500)
    } catch (error) {
      console.error('Error adding file:', error)
      setFileError('Failed to add file')
    } finally {
      setIsAddingFile(false)
    }
  }

  const resetFileModal = () => {
    setFileClientId('')
    setFileName('')
    setFileType('docs')
    setFileCategory('')
    setFileUrl('')
    setUploadedFile(null)
    setUploadMode('upload')
    setFileError(null)
    setFileSuccess(false)
  }

  return (
    <>
      {/* Action Buttons */}
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px', marginTop: '-16px' }}>
        <button
          className="btn"
          style={{ background: '#3B82F6', borderColor: '#3B82F6', color: 'white' }}
          onClick={() => {
            resetFileModal()
            setShowFilesModal(true)
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
          Add Files
        </button>
        <Link href="/admin/content/new" className="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Content
        </Link>
      </div>

      {/* Files Filter */}
      <div className="clients-toolbar" style={{ marginBottom: '20px' }}>
        <select
          className="sort-select"
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          style={{ minWidth: '200px' }}
        >
          <option value="">All Clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {/* Files Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading files...
        </div>
      ) : files.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No files found. Click &quot;Add Files&quot; to upload files for clients.
        </div>
      ) : (
        <div className="content-table-wrapper">
          <table className="content-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Name</th>
                <th style={{ width: '15%' }}>Client</th>
                <th style={{ width: '12%' }}>Type</th>
                <th style={{ width: '18%' }}>Category</th>
                <th style={{ width: '12%' }}>Date</th>
                <th style={{ width: '18%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td style={{ fontWeight: 500 }}>{file.name}</td>
                  <td>{file.client_name}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: file.type === 'docs' ? '#EFF6FF' : file.type === 'images' ? '#F0FDF4' : '#FEF3C7',
                      color: file.type === 'docs' ? '#1D4ED8' : file.type === 'images' ? '#15803D' : '#B45309',
                    }}>
                      {file.type === 'docs' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                      )}
                      {file.type === 'images' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                      )}
                      {file.type === 'video' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                          <polygon points="23 7 16 12 23 17 23 7"></polygon>
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                      )}
                      {file.type}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{file.category}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {new Date(file.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline"
                      >
                        View
                      </a>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={deletingFileId === file.id}
                        style={{ color: 'var(--error-color)', borderColor: 'var(--error-color)' }}
                      >
                        {deletingFileId === file.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Files Modal */}
      {showFilesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" width="20" height="20">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Add Files</h2>
              </div>
              <button
                onClick={() => setShowFilesModal(false)}
                disabled={isAddingFile}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  borderRadius: '6px',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {fileSuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#D1FAE5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="32" height="32">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.125rem', fontWeight: 600, color: '#059669' }}>File Added!</h3>
                  <p style={{ margin: 0, color: '#6B7280' }}>The file has been added to the client.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Client Selector */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                      Client <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <select
                      value={fileClientId}
                      onChange={(e) => setFileClientId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">Select a client...</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                      Category <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <select
                      value={fileCategory}
                      onChange={(e) => setFileCategory(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">Select category...</option>
                      <option value="Branding Foundation">Branding Foundation</option>
                      <option value="AI Creative">AI Creative</option>
                      <option value="Content Writing">Content Writing</option>
                      <option value="SEO">SEO</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Upload/Link Toggle */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                      Add File
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setUploadMode('upload')}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          border: uploadMode === 'upload' ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                          borderRadius: '8px',
                          background: uploadMode === 'upload' ? '#EFF6FF' : 'white',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: uploadMode === 'upload' ? '#1D4ED8' : '#6B7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode('link')}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          border: uploadMode === 'link' ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                          borderRadius: '8px',
                          background: uploadMode === 'link' ? '#EFF6FF' : 'white',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: uploadMode === 'link' ? '#1D4ED8' : '#6B7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        Add Link
                      </button>
                    </div>
                  </div>

                  {/* Upload Mode */}
                  {uploadMode === 'upload' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                        Select File <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <div
                        style={{
                          border: '2px dashed #D1D5DB',
                          borderRadius: '8px',
                          padding: '24px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: uploadedFile ? '#F0FDF4' : '#F9FAFB',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => document.getElementById('filesPageUploadInput')?.click()}
                      >
                        <input
                          id="filesPageUploadInput"
                          type="file"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setUploadedFile(file)
                            }
                          }}
                        />
                        {uploadedFile ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="20" height="20">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span style={{ color: '#059669', fontWeight: 500 }}>{uploadedFile.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setUploadedFile(null)
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#DC2626'
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="32" height="32" style={{ margin: '0 auto 8px' }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="17 8 12 3 7 8"></polyline>
                              <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>
                              Click to select a file or drag and drop
                            </p>
                            <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: '0.75rem' }}>
                              PDF, DOC, Images, Videos up to 50MB
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Link Mode */}
                  {uploadMode === 'link' && (
                    <>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                          File Name <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          placeholder="e.g., Brand Strategy Document.pdf"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                            Type <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <select
                            value={fileType}
                            onChange={(e) => setFileType(e.target.value as 'docs' | 'images' | 'video')}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '8px',
                              fontSize: '0.875rem'
                            }}
                          >
                            <option value="docs">Document</option>
                            <option value="images">Image</option>
                            <option value="video">Video</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                            Drive/File URL
                          </label>
                          <input
                            type="url"
                            value={fileUrl}
                            onChange={(e) => setFileUrl(e.target.value)}
                            placeholder="https://..."
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Error Message */}
                  {fileError && (
                    <div style={{
                      background: '#FEE2E2',
                      border: '1px solid #EF4444',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#DC2626',
                      fontSize: '0.875rem'
                    }}>
                      {fileError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!fileSuccess && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 20px',
                borderTop: '1px solid #E5E7EB',
              }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowFilesModal(false)}
                  disabled={isAddingFile}
                  style={{ padding: '10px 20px' }}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={handleAddFile}
                  disabled={isAddingFile}
                  style={{
                    background: '#3B82F6',
                    borderColor: '#3B82F6',
                    color: 'white',
                    padding: '10px 20px'
                  }}
                >
                  {isAddingFile ? (uploadMode === 'upload' ? 'Uploading...' : 'Adding...') : (uploadMode === 'upload' ? 'Upload File' : 'Add File')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

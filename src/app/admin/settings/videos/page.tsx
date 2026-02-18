'use client'

import { useState, useEffect } from 'react'

interface VideoChapter {
  id: string
  title: string
  description: string
  videoUrl: string
}

const defaultVideoChapters = [
  { id: 'welcome', title: 'Welcome & Overview', description: 'Introduction to your client portal', videoUrl: '' },
  { id: 'dashboard', title: 'Dashboard Tour', description: 'Navigating your main dashboard', videoUrl: '' },
  { id: 'getting-started', title: 'Getting Started', description: 'Completing your onboarding checklist', videoUrl: '' },
  { id: 'results', title: 'Results & Analytics', description: 'Understanding your performance metrics', videoUrl: '' },
  { id: 'website', title: 'Website Services', description: 'Managing your website and edit requests', videoUrl: '' },
  { id: 'content', title: 'Content Services', description: 'Content review and approval workflow', videoUrl: '' },
  { id: 'recommendations', title: 'Recommendations', description: 'Smart recommendations and growth stages', videoUrl: '' },
  { id: 'communication', title: 'Communication', description: 'Viewing your communication history', videoUrl: '' },
  { id: 'support', title: 'Getting Help', description: 'How to contact support', videoUrl: '' },
]

export default function VideosSettingsPage() {
  const [videoChapters, setVideoChapters] = useState<VideoChapter[]>([])
  const [activeChapter, setActiveChapter] = useState<string>('')
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [chapterForm, setChapterForm] = useState({ title: '', description: '', videoUrl: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVideoChapters() {
      try {
        const res = await fetch('/api/admin/onboarding/video-chapters')
        if (res.ok) {
          const data = await res.json()
          if (data.length > 0) {
            const chapters = data.map((c: { id: string; title: string; description: string | null; video_url: string | null }) => ({
              id: c.id,
              title: c.title,
              description: c.description || '',
              videoUrl: c.video_url || ''
            }))
            setVideoChapters(chapters)
            setActiveChapter(chapters[0]?.id || '')
          } else {
            setVideoChapters(defaultVideoChapters)
            setActiveChapter('welcome')
          }
        }
      } catch (error) {
        console.error('Failed to fetch video chapters:', error)
        setVideoChapters(defaultVideoChapters)
        setActiveChapter('welcome')
      } finally {
        setLoading(false)
      }
    }
    fetchVideoChapters()
  }, [])

  const currentChapterVideo = videoChapters.find(c => c.id === activeChapter)?.videoUrl || ''

  const startEditChapter = (chapterId: string) => {
    const chapter = videoChapters.find(c => c.id === chapterId)
    if (chapter) {
      setChapterForm({ title: chapter.title, description: chapter.description, videoUrl: chapter.videoUrl })
      setEditingChapterId(chapterId)
    }
  }

  const saveChapter = async () => {
    if (!editingChapterId) return
    try {
      const res = await fetch('/api/admin/onboarding/video-chapters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingChapterId,
          title: chapterForm.title,
          description: chapterForm.description,
          videoUrl: chapterForm.videoUrl
        })
      })
      if (res.ok) {
        setVideoChapters(chapters => chapters.map(c =>
          c.id === editingChapterId
            ? { ...c, title: chapterForm.title, description: chapterForm.description, videoUrl: chapterForm.videoUrl }
            : c
        ))
        setEditingChapterId(null)
      }
    } catch (error) {
      console.error('Failed to save chapter:', error)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading video chapters...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem' }}>
        {/* Video Player Section */}
        <div style={{ minWidth: 0 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>
                  {videoChapters.find(c => c.id === activeChapter)?.title || 'Onboarding Video'}
                </h2>
                <p style={{ margin: 0, fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                  {videoChapters.find(c => c.id === activeChapter)?.description || 'Select a chapter to view'}
                </p>
              </div>
            </div>
            <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
              {currentChapterVideo ? (
                <iframe
                  src={currentChapterVideo}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  gap: '1rem'
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ opacity: 0.5 }}>
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-primary)' }}>No Video Set</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', maxWidth: '300px', textAlign: 'center' }}>
                    Click &quot;Edit&quot; on a chapter to add a video URL
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chapters List */}
        <div style={{ background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Video Chapters</h3>
          </div>
          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            {videoChapters.map((chapter, index) => (
              <div key={chapter.id}>
                {editingChapterId === chapter.id ? (
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                    <input
                      type="text"
                      value={chapterForm.title}
                      onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                      placeholder="Chapter title"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      value={chapterForm.description}
                      onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                      placeholder="Description"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      value={chapterForm.videoUrl}
                      onChange={(e) => setChapterForm({ ...chapterForm, videoUrl: e.target.value })}
                      placeholder="Video URL (YouTube embed URL)"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={saveChapter}>Save</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingChapterId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveChapter(chapter.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.875rem 1rem',
                      width: '100%',
                      background: activeChapter === chapter.id ? 'rgba(136, 84, 48, 0.08)' : 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--border-color)',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: activeChapter === chapter.id ? 'var(--primary)' : 'var(--bg-tertiary)',
                      color: activeChapter === chapter.id ? 'white' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>{chapter.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {chapter.description}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditChapter(chapter.id)
                      }}
                    >
                      Edit
                    </button>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .btn-ghost {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.375rem 0.75rem;
          font-size: 0.813rem;
          border-radius: 4px;
        }
        .btn-ghost:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  )
}

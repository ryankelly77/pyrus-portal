'use client'

import { useState, useEffect } from 'react'

interface TutorialPage {
  id: string
  title: string
  description: string
  videoUrl: string
}

export default function TutorialsSettingsPage() {
  const [tutorialPages, setTutorialPages] = useState<TutorialPage[]>([])
  const [activeTutorial, setActiveTutorial] = useState<string>('')
  const [editingTutorialId, setEditingTutorialId] = useState<string | null>(null)
  const [tutorialForm, setTutorialForm] = useState({ title: '', description: '', videoUrl: '' })
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    async function fetchTutorials() {
      try {
        const res = await fetch('/api/admin/onboarding/tutorials')
        if (res.ok) {
          const data = await res.json()
          const tutorials = data.map((t: { id: string; title: string; description: string | null; video_url: string | null }) => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            videoUrl: t.video_url || ''
          }))
          setTutorialPages(tutorials)
          if (tutorials.length > 0) {
            setActiveTutorial(tutorials[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch tutorials:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTutorials()
  }, [])

  const currentTutorialVideo = tutorialPages.find(p => p.id === activeTutorial)?.videoUrl || ''

  const startEditTutorial = (tutorialId: string) => {
    const tutorial = tutorialPages.find(t => t.id === tutorialId)
    if (tutorial) {
      setTutorialForm({ title: tutorial.title, description: tutorial.description, videoUrl: tutorial.videoUrl })
      setEditingTutorialId(tutorialId)
      setIsAdding(false)
    }
  }

  const startAddTutorial = () => {
    setTutorialForm({ title: '', description: '', videoUrl: '' })
    setIsAdding(true)
    setEditingTutorialId(null)
  }

  const saveTutorial = async () => {
    try {
      if (isAdding) {
        const res = await fetch('/api/admin/onboarding/tutorials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tutorialForm)
        })
        if (res.ok) {
          const newTutorial = await res.json()
          setTutorialPages(pages => [...pages, {
            id: newTutorial.id,
            title: newTutorial.title,
            description: newTutorial.description || '',
            videoUrl: newTutorial.video_url || ''
          }])
          setIsAdding(false)
        }
      } else if (editingTutorialId) {
        const res = await fetch('/api/admin/onboarding/tutorials', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingTutorialId,
            ...tutorialForm
          })
        })
        if (res.ok) {
          setTutorialPages(pages => pages.map(p =>
            p.id === editingTutorialId
              ? { ...p, ...tutorialForm }
              : p
          ))
          setEditingTutorialId(null)
        }
      }
    } catch (error) {
      console.error('Failed to save tutorial:', error)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading tutorials...
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
                  {tutorialPages.find(p => p.id === activeTutorial)?.title || 'Tutorial Video'}
                </h2>
                <p style={{ margin: 0, fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                  {tutorialPages.find(p => p.id === activeTutorial)?.description || 'Select a page to view'}
                </p>
              </div>
            </div>
            <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
              {currentTutorialVideo ? (
                <iframe
                  src={currentTutorialVideo}
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
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="10 8 16 12 10 16 10 8"></polygon>
                  </svg>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
                    {tutorialPages.length === 0 ? 'No Tutorials Yet' : 'No Video Set'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', maxWidth: '300px', textAlign: 'center' }}>
                    {tutorialPages.length === 0
                      ? 'Add a tutorial to get started'
                      : 'Click "Edit" on a tutorial to add a video URL'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tutorials List */}
        <div style={{ background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Tutorial Pages</h3>
            <button className="btn btn-primary btn-sm" onClick={startAddTutorial}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add
            </button>
          </div>
          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            {isAdding && (
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                <input
                  type="text"
                  value={tutorialForm.title}
                  onChange={(e) => setTutorialForm({ ...tutorialForm, title: e.target.value })}
                  placeholder="Tutorial title"
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  value={tutorialForm.description}
                  onChange={(e) => setTutorialForm({ ...tutorialForm, description: e.target.value })}
                  placeholder="Description"
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  value={tutorialForm.videoUrl}
                  onChange={(e) => setTutorialForm({ ...tutorialForm, videoUrl: e.target.value })}
                  placeholder="Video URL (YouTube embed URL)"
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={saveTutorial}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsAdding(false)}>Cancel</button>
                </div>
              </div>
            )}
            {tutorialPages.map((tutorial, index) => (
              <div key={tutorial.id}>
                {editingTutorialId === tutorial.id ? (
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                    <input
                      type="text"
                      value={tutorialForm.title}
                      onChange={(e) => setTutorialForm({ ...tutorialForm, title: e.target.value })}
                      placeholder="Tutorial title"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      value={tutorialForm.description}
                      onChange={(e) => setTutorialForm({ ...tutorialForm, description: e.target.value })}
                      placeholder="Description"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      value={tutorialForm.videoUrl}
                      onChange={(e) => setTutorialForm({ ...tutorialForm, videoUrl: e.target.value })}
                      placeholder="Video URL (YouTube embed URL)"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={saveTutorial}>Save</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingTutorialId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveTutorial(tutorial.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.875rem 1rem',
                      width: '100%',
                      background: activeTutorial === tutorial.id ? 'rgba(136, 84, 48, 0.08)' : 'none',
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
                      background: activeTutorial === tutorial.id ? 'var(--primary)' : 'var(--bg-tertiary)',
                      color: activeTutorial === tutorial.id ? 'white' : 'var(--text-secondary)',
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
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>{tutorial.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tutorial.description}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditTutorial(tutorial.id)
                      }}
                    >
                      Edit
                    </button>
                  </button>
                )}
              </div>
            ))}
            {tutorialPages.length === 0 && !isAdding && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No tutorials yet. Click &quot;Add&quot; to create one.
              </div>
            )}
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

'use client'

import { useState, useEffect, useRef } from 'react'
import { AdminHeader } from '@/components/layout'

const permissions = [
  'Dashboard',
  'Recommendations',
  'Clients',
  'Users',
  'Content',
  'Websites',
  'Notifications',
  'Products',
  'Rewards',
  'Revenue / MRR',
  'Sales Pipeline',
  'Client Performance',
  'Settings',
  'System Alerts',
]

interface Product {
  id: string
  name: string
  category: string
}

interface ChecklistTemplate {
  id: string
  product_id: string
  title: string
  description: string | null
  action_type: string | null
  action_url: string | null
  action_label: string | null
  sort_order: number
  is_active: boolean
  auto_complete_question_id: string | null
  auto_complete_values: string[] | null
  product: Product
}

interface QuestionTemplate {
  id: string
  product_id: string
  question_text: string
  question_type: string
  options: string[] | null
  placeholder: string | null
  help_text: string | null
  video_url: string | null
  image_url: string | null
  is_required: boolean
  section: string | null
  sort_order: number
  is_active: boolean
  product: Product
}

type Tab = 'profile' | 'checklist' | 'questions' | 'video'

// Video chapters for onboarding videos - each chapter has its own video
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

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  // Profile state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Checklist state
  const [products, setProducts] = useState<Product[]>([])
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedChecklistCategory, setSelectedChecklistCategory] = useState<string>('')
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>(null)
  const [isAddingChecklist, setIsAddingChecklist] = useState(false)
  const [checklistForm, setChecklistForm] = useState({
    productId: '',
    title: '',
    description: '',
    actionType: '',
    actionUrl: '',
    actionLabel: '',
    autoCompleteQuestionId: '',
    autoCompleteValues: '',
  })

  // Questions state
  const [questionTemplates, setQuestionTemplates] = useState<QuestionTemplate[]>([])
  const [selectedQuestionProductId, setSelectedQuestionProductId] = useState<string>('')
  const [selectedQuestionCategory, setSelectedQuestionCategory] = useState<string>('')
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)
  const [questionForm, setQuestionForm] = useState({
    productId: '',
    questionText: '',
    questionType: 'text',
    options: '',
    placeholder: '',
    helpText: '',
    videoUrl: '',
    imageUrl: '',
    isRequired: false,
    section: '',
  })
  const [imageUploading, setImageUploading] = useState(false)

  // Video state
  const [activeChapter, setActiveChapter] = useState<string>('')
  const [videoChapters, setVideoChapters] = useState<Array<{ id: string; title: string; description: string; videoUrl: string }>>([])
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [chapterForm, setChapterForm] = useState({ title: '', description: '', videoUrl: '' })
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null)
  const [chaptersLoading, setChaptersLoading] = useState(false)

  // Get current chapter's video URL
  const currentChapterVideo = videoChapters.find(c => c.id === activeChapter)?.videoUrl || ''

  // Fetch video chapters on mount
  useEffect(() => {
    async function fetchVideoChapters() {
      setChaptersLoading(true)
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
            // Seed default chapters if none exist
            const seedRes = await fetch('/api/admin/onboarding/video-chapters', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chapters: defaultVideoChapters })
            })
            if (seedRes.ok) {
              // Fetch again after seeding
              const res2 = await fetch('/api/admin/onboarding/video-chapters')
              if (res2.ok) {
                const data2 = await res2.json()
                const chapters = data2.map((c: { id: string; title: string; description: string | null; video_url: string | null }) => ({
                  id: c.id,
                  title: c.title,
                  description: c.description || '',
                  videoUrl: c.video_url || ''
                }))
                setVideoChapters(chapters)
                setActiveChapter(chapters[0]?.id || '')
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch video chapters:', error)
        // Fall back to defaults
        setVideoChapters(defaultVideoChapters)
        setActiveChapter('welcome')
      } finally {
        setChaptersLoading(false)
      }
    }
    fetchVideoChapters()
  }, [])

  // Start editing a chapter
  const startEditChapter = (chapterId: string) => {
    const chapter = videoChapters.find(c => c.id === chapterId)
    if (chapter) {
      setChapterForm({ title: chapter.title, description: chapter.description, videoUrl: chapter.videoUrl })
      setEditingChapterId(chapterId)
    }
  }

  // Save chapter changes
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
        setVideoChapters(prev => prev.map(c =>
          c.id === editingChapterId
            ? { ...c, title: chapterForm.title, description: chapterForm.description, videoUrl: chapterForm.videoUrl }
            : c
        ))
        setEditingChapterId(null)
      } else {
        alert('Failed to save chapter')
      }
    } catch (error) {
      console.error('Error saving chapter:', error)
      alert('Failed to save chapter')
    }
  }

  // Cancel editing
  const cancelEditChapter = () => {
    setEditingChapterId(null)
    setChapterForm({ title: '', description: '', videoUrl: '' })
  }

  // Add new chapter
  const addChapter = async () => {
    try {
      const res = await fetch('/api/admin/onboarding/video-chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Chapter',
          description: 'Click edit to customize',
          videoUrl: ''
        })
      })
      if (res.ok) {
        const newChapter = await res.json()
        const chapter = {
          id: newChapter.id,
          title: newChapter.title,
          description: newChapter.description || '',
          videoUrl: newChapter.video_url || ''
        }
        setVideoChapters(prev => [...prev, chapter])
        // Open edit modal for the new chapter
        setChapterForm({ title: chapter.title, description: chapter.description, videoUrl: '' })
        setEditingChapterId(chapter.id)
      }
    } catch (error) {
      console.error('Error adding chapter:', error)
      alert('Failed to add chapter')
    }
  }

  // Delete chapter
  const deleteChapter = async () => {
    if (!editingChapterId) return
    if (videoChapters.length <= 1) {
      alert('You must have at least one chapter')
      return
    }
    try {
      const res = await fetch(`/api/admin/onboarding/video-chapters?id=${editingChapterId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setVideoChapters(prev => prev.filter(c => c.id !== editingChapterId))
        if (activeChapter === editingChapterId) {
          setActiveChapter(videoChapters[0]?.id || '')
        }
        setEditingChapterId(null)
      } else {
        alert('Failed to delete chapter')
      }
    } catch (error) {
      console.error('Error deleting chapter:', error)
      alert('Failed to delete chapter')
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, chapterId: string) => {
    setDraggedChapterId(chapterId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetChapterId: string) => {
    e.preventDefault()
    if (!draggedChapterId || draggedChapterId === targetChapterId) return

    const draggedIndex = videoChapters.findIndex(c => c.id === draggedChapterId)
    const targetIndex = videoChapters.findIndex(c => c.id === targetChapterId)

    const newChapters = [...videoChapters]
    const [draggedChapter] = newChapters.splice(draggedIndex, 1)
    newChapters.splice(targetIndex, 0, draggedChapter)

    setVideoChapters(newChapters)
    setDraggedChapterId(null)

    // Save new order to database
    try {
      await fetch('/api/admin/onboarding/video-chapters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters: newChapters })
      })
    } catch (error) {
      console.error('Error saving chapter order:', error)
    }
  }

  const handleDragEnd = () => {
    setDraggedChapterId(null)
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setQuestionForm(prev => ({ ...prev, imageUrl: data.url }))
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image')
    } finally {
      setImageUploading(false)
      e.target.value = ''
    }
  }

  const removeImage = () => {
    setQuestionForm(prev => ({ ...prev, imageUrl: '' }))
  }

  // Password validation
  const hasMinLength = newPassword.length >= 8
  const hasNumber = /\d/.test(newPassword)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0

  // Handle profile photo upload
  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB')
      return
    }

    setProfilePhotoUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setProfilePhotoUrl(data.url)
        // Save to database
        await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: data.url }),
        })
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to upload photo')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload photo')
    } finally {
      setProfilePhotoUploading(false)
      e.target.value = ''
    }
  }

  const removeProfilePhoto = async () => {
    setProfilePhotoUrl(null)
    // Save to database
    try {
      await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: null }),
      })
    } catch (error) {
      console.error('Failed to remove profile photo:', error)
    }
  }

  // Fetch profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          const nameParts = (data.fullName || '').split(' ')
          setFirstName(nameParts[0] || '')
          setLastName(nameParts.slice(1).join(' ') || '')
          setEmail(data.email || '')
          setProfilePhotoUrl(data.avatarUrl || null)
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setProfileLoading(false)
      }
    }
    fetchProfile()
  }, [])

  // Fetch products on mount
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/admin/products')
        if (res.ok) {
          const data = await res.json()
          setProducts(data)
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
      }
    }
    fetchProducts()
  }, [])

  // Fetch checklist templates
  useEffect(() => {
    async function fetchChecklistTemplates() {
      setChecklistLoading(true)
      try {
        const url = selectedProductId
          ? `/api/admin/onboarding/checklist-templates?productId=${selectedProductId}`
          : '/api/admin/onboarding/checklist-templates'
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setChecklistTemplates(data)
        }
      } catch (error) {
        console.error('Failed to fetch checklist templates:', error)
      } finally {
        setChecklistLoading(false)
      }
    }
    if (activeTab === 'checklist') {
      fetchChecklistTemplates()
    }
  }, [activeTab, selectedProductId])

  // Fetch question templates (needed for both questions tab and checklist auto-complete)
  useEffect(() => {
    async function fetchQuestionTemplates() {
      setQuestionsLoading(true)
      try {
        const url = selectedQuestionProductId
          ? `/api/admin/onboarding/question-templates?productId=${selectedQuestionProductId}`
          : '/api/admin/onboarding/question-templates'
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setQuestionTemplates(data)
        }
      } catch (error) {
        console.error('Failed to fetch question templates:', error)
      } finally {
        setQuestionsLoading(false)
      }
    }
    // Fetch for questions tab OR checklist tab (for auto-complete dropdown)
    if (activeTab === 'questions' || activeTab === 'checklist') {
      fetchQuestionTemplates()
    }
  }, [activeTab, selectedQuestionProductId])

  const handleSaveProfile = () => {
    alert('Profile updated successfully!')
  }

  const handleUpdatePassword = () => {
    if (!currentPassword) {
      alert('Please enter your current password')
      return
    }
    if (!hasMinLength || !hasNumber || !hasSpecial) {
      alert('Password does not meet requirements')
      return
    }
    if (!passwordsMatch) {
      alert('Passwords do not match')
      return
    }
    alert('Password updated successfully!')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleLogoutAllSessions = () => {
    if (confirm('Are you sure you want to log out of all other sessions?')) {
      alert('All other sessions have been logged out')
    }
  }

  // Checklist handlers
  const toggleChecklistEdit = (template: ChecklistTemplate) => {
    if (expandedChecklistId === template.id) {
      setExpandedChecklistId(null)
    } else {
      setExpandedChecklistId(template.id)
      setIsAddingChecklist(false)
      setChecklistForm({
        productId: template.product_id,
        title: template.title,
        description: template.description || '',
        actionType: template.action_type || '',
        actionUrl: template.action_url || '',
        actionLabel: template.action_label || '',
        autoCompleteQuestionId: template.auto_complete_question_id || '',
        autoCompleteValues: template.auto_complete_values?.join(', ') || '',
      })
    }
  }

  const startAddChecklist = () => {
    setIsAddingChecklist(true)
    setExpandedChecklistId(null)
    setChecklistForm({
      productId: selectedProductId || (products[0]?.id || ''),
      title: '',
      description: '',
      actionType: '',
      actionUrl: '',
      actionLabel: '',
      autoCompleteQuestionId: '',
      autoCompleteValues: '',
    })
  }

  const cancelChecklistEdit = () => {
    setExpandedChecklistId(null)
    setIsAddingChecklist(false)
  }

  const handleSaveChecklist = async () => {
    try {
      const url = expandedChecklistId
        ? `/api/admin/onboarding/checklist-templates/${expandedChecklistId}`
        : '/api/admin/onboarding/checklist-templates'
      const method = expandedChecklistId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checklistForm),
      })

      if (res.ok) {
        setExpandedChecklistId(null)
        setIsAddingChecklist(false)
        // Refresh the list
        const refreshUrl = selectedProductId
          ? `/api/admin/onboarding/checklist-templates?productId=${selectedProductId}`
          : '/api/admin/onboarding/checklist-templates'
        const refreshRes = await fetch(refreshUrl)
        if (refreshRes.ok) {
          setChecklistTemplates(await refreshRes.json())
        }
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save checklist item')
      }
    } catch (error) {
      console.error('Failed to save checklist:', error)
      alert('Failed to save checklist item')
    }
  }

  const handleDeleteChecklist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this checklist item?')) return

    try {
      const res = await fetch(`/api/admin/onboarding/checklist-templates/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setChecklistTemplates(checklistTemplates.filter(t => t.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete checklist:', error)
    }
  }

  // Question handlers
  const toggleQuestionEdit = (template: QuestionTemplate) => {
    if (expandedQuestionId === template.id) {
      setExpandedQuestionId(null)
    } else {
      setExpandedQuestionId(template.id)
      setIsAddingQuestion(false)
      setQuestionForm({
        productId: template.product_id,
        questionText: template.question_text,
        questionType: template.question_type,
        options: template.options ? template.options.join('\n') : '',
        placeholder: template.placeholder || '',
        helpText: template.help_text || '',
        videoUrl: template.video_url || '',
        imageUrl: template.image_url || '',
        isRequired: template.is_required,
        section: template.section || '',
      })
    }
  }

  const startAddQuestion = () => {
    setIsAddingQuestion(true)
    setExpandedQuestionId(null)
    setQuestionForm({
      productId: selectedQuestionProductId || (products[0]?.id || ''),
      questionText: '',
      questionType: 'text',
      options: '',
      placeholder: '',
      helpText: '',
      videoUrl: '',
      imageUrl: '',
      isRequired: false,
      section: '',
    })
  }

  const cancelQuestionEdit = () => {
    setExpandedQuestionId(null)
    setIsAddingQuestion(false)
  }

  const handleSaveQuestion = async () => {
    try {
      const url = expandedQuestionId
        ? `/api/admin/onboarding/question-templates/${expandedQuestionId}`
        : '/api/admin/onboarding/question-templates'
      const method = expandedQuestionId ? 'PATCH' : 'POST'

      const payload = {
        ...questionForm,
        options: questionForm.options
          ? questionForm.options.split('\n').map(s => s.trim()).filter(Boolean)
          : null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setExpandedQuestionId(null)
        setIsAddingQuestion(false)
        // Refresh the list
        const refreshUrl = selectedQuestionProductId
          ? `/api/admin/onboarding/question-templates?productId=${selectedQuestionProductId}`
          : '/api/admin/onboarding/question-templates'
        const refreshRes = await fetch(refreshUrl)
        if (refreshRes.ok) {
          setQuestionTemplates(await refreshRes.json())
        }
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save question')
      }
    } catch (error) {
      console.error('Failed to save question:', error)
      alert('Failed to save question')
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      const res = await fetch(`/api/admin/onboarding/question-templates/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setQuestionTemplates(questionTemplates.filter(t => t.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete question:', error)
    }
  }

  // Filter checklists by category if selected
  const filteredChecklists = selectedChecklistCategory
    ? checklistTemplates.filter(t => t.product?.category === selectedChecklistCategory)
    : checklistTemplates

  // Group templates by product
  const groupedChecklists = filteredChecklists.reduce((acc, template) => {
    const productName = template.product?.name || 'Unknown Product'
    if (!acc[productName]) acc[productName] = []
    acc[productName].push(template)
    return acc
  }, {} as Record<string, ChecklistTemplate[]>)

  // Sort grouped checklists by category order (root, growth, cultivation)
  const checklistCategoryOrder = { root: 0, growth: 1, cultivation: 2 }
  const sortedGroupedChecklists = Object.entries(groupedChecklists).sort(([, a], [, b]) => {
    const catA = a[0]?.product?.category || 'root'
    const catB = b[0]?.product?.category || 'root'
    return (checklistCategoryOrder[catA as keyof typeof checklistCategoryOrder] ?? 99) - (checklistCategoryOrder[catB as keyof typeof checklistCategoryOrder] ?? 99)
  }).reduce((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, {} as Record<string, ChecklistTemplate[]>)

  // Filter questions by category if selected
  const filteredQuestions = selectedQuestionCategory
    ? questionTemplates.filter(t => t.product?.category === selectedQuestionCategory)
    : questionTemplates

  // Group questions by product
  const groupedQuestions = filteredQuestions.reduce((acc, template) => {
    const productName = template.product?.name || 'Unknown Product'
    if (!acc[productName]) acc[productName] = []
    acc[productName].push(template)
    return acc
  }, {} as Record<string, QuestionTemplate[]>)

  // Sort grouped questions by category order (root, growth, cultivation)
  const categoryOrder = { root: 0, growth: 1, cultivation: 2 }
  const sortedGroupedQuestions = Object.entries(groupedQuestions).sort(([, a], [, b]) => {
    const catA = a[0]?.product?.category || 'root'
    const catB = b[0]?.product?.category || 'root'
    return (categoryOrder[catA as keyof typeof categoryOrder] ?? 99) - (categoryOrder[catB as keyof typeof categoryOrder] ?? 99)
  }).reduce((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, {} as Record<string, QuestionTemplate[]>)

  return (
    <>
      <AdminHeader
        title="Settings"
        user={{
          name: `${firstName} ${lastName}`.trim() || 'User',
          initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U',
          avatarUrl: profilePhotoUrl,
        }}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Manage your admin profile and onboarding settings</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container" style={{ marginBottom: '1.5rem' }}>
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              className={`tab ${activeTab === 'checklist' ? 'active' : ''}`}
              onClick={() => setActiveTab('checklist')}
            >
              Onboarding Checklist
            </button>
            <button
              className={`tab ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
            >
              Onboarding Questions
            </button>
            <button
              className={`tab ${activeTab === 'video' ? 'active' : ''}`}
              onClick={() => setActiveTab('video')}
            >
              Onboarding Video
            </button>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="settings-layout">
            {/* Role & Access Section */}
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Role & Access</h2>
                <p>Your admin role and permissions</p>
              </div>
              <div className="settings-card-body">
                <div className="role-display">
                  <div className="role-badge-large super-admin">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    <div className="role-info">
                      <span className="role-title">Super Admin</span>
                      <span className="role-desc">Full access to all features and settings</span>
                    </div>
                  </div>
                  <div className="role-permissions">
                    <h4>Your Permissions</h4>
                    <div className="permissions-grid">
                      {permissions.map((permission) => (
                        <div key={permission} className="permission-item granted">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>{permission}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Section */}
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Profile Information</h2>
                <p>Update your personal information and profile photo</p>
              </div>
              <div className="settings-card-body">
                {/* Profile Photo */}
                <div className="profile-photo-section">
                  <div className="profile-photo-current">
                    <div className="profile-photo-large" style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 600, color: '#6B7280' }}>
                      {profilePhotoUrl ? (
                        <img src={profilePhotoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span>{firstName.charAt(0)}{lastName.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <div className="profile-photo-actions">
                    <h4>Profile Photo</h4>
                    <p>JPG, PNG or GIF. Max size 2MB.</p>
                    <div className="photo-buttons">
                      <input
                        type="file"
                        ref={profilePhotoInputRef}
                        onChange={handleProfilePhotoUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => profilePhotoInputRef.current?.click()}
                        disabled={profilePhotoUploading}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        {profilePhotoUploading ? 'Uploading...' : 'Upload Photo'}
                      </button>
                      {profilePhotoUrl && (
                        <button className="btn btn-outline btn-sm" onClick={removeProfilePhoto}>Remove</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      className="form-input"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      className="form-input"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                  <span className="form-hint">This email is used for login and notifications</span>
                </div>

                {/* Save Button */}
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={handleSaveProfile}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Password & Security</h2>
                <p>Update your password to keep your account secure</p>
              </div>
              <div className="settings-card-body">
                {/* Current Password */}
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      id="currentPassword"
                      className="form-input"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        {showCurrentPassword ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      id="newPassword"
                      className="form-input"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        {showNewPassword ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                  <span className="form-hint">Minimum 8 characters with at least one number and one special character</span>
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      className="form-input"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        {showConfirmPassword ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="password-requirements">
                  <p className="requirements-title">Password must contain:</p>
                  <ul className="requirements-list">
                    <li className={`requirement ${hasMinLength ? 'met' : ''}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        {hasMinLength ? (
                          <polyline points="20 6 9 17 4 12"></polyline>
                        ) : (
                          <circle cx="12" cy="12" r="10"></circle>
                        )}
                      </svg>
                      At least 8 characters
                    </li>
                    <li className={`requirement ${hasNumber ? 'met' : ''}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        {hasNumber ? (
                          <polyline points="20 6 9 17 4 12"></polyline>
                        ) : (
                          <circle cx="12" cy="12" r="10"></circle>
                        )}
                      </svg>
                      At least one number
                    </li>
                    <li className={`requirement ${hasSpecial ? 'met' : ''}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        {hasSpecial ? (
                          <polyline points="20 6 9 17 4 12"></polyline>
                        ) : (
                          <circle cx="12" cy="12" r="10"></circle>
                        )}
                      </svg>
                      At least one special character
                    </li>
                    <li className={`requirement ${passwordsMatch ? 'met' : ''}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        {passwordsMatch ? (
                          <polyline points="20 6 9 17 4 12"></polyline>
                        ) : (
                          <circle cx="12" cy="12" r="10"></circle>
                        )}
                      </svg>
                      Passwords match
                    </li>
                  </ul>
                </div>

                {/* Update Password Button */}
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={handleUpdatePassword}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Update Password
                  </button>
                </div>
              </div>
            </div>

            {/* Session Info */}
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Session Information</h2>
                <p>Your current login session details</p>
              </div>
              <div className="settings-card-body">
                <div className="session-grid">
                  <div className="session-item">
                    <div className="session-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                    </div>
                    <div className="session-details">
                      <span className="session-label">Current Device</span>
                      <span className="session-value">MacBook Pro - Chrome</span>
                    </div>
                  </div>
                  <div className="session-item">
                    <div className="session-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div className="session-details">
                      <span className="session-label">Last Login</span>
                      <span className="session-value">Jan 3, 2026 at 9:15 AM</span>
                    </div>
                  </div>
                  <div className="session-item">
                    <div className="session-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    </div>
                    <div className="session-details">
                      <span className="session-label">Location</span>
                      <span className="session-value">San Antonio, TX</span>
                    </div>
                  </div>
                </div>
                <div className="session-actions">
                  <button className="btn btn-outline btn-danger-outline" onClick={handleLogoutAllSessions}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Log Out All Other Sessions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Checklist Tab */}
        {activeTab === 'checklist' && (
          <div className="settings-layout" style={{ maxWidth: '900px' }}>
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2>Onboarding Checklist Items</h2>
                  <p>Configure checklist items that appear when a client purchases a product</p>
                </div>
                <button className="btn btn-primary" onClick={startAddChecklist}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Item
                </button>
              </div>
              <div className="settings-card-body">
                {/* Filters */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group" style={{ maxWidth: '200px', margin: 0 }}>
                    <label>Filter by Category</label>
                    <select
                      className="form-input"
                      value={selectedChecklistCategory}
                      onChange={(e) => setSelectedChecklistCategory(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      <option value="root">Root</option>
                      <option value="growth">Growth</option>
                      <option value="cultivation">Cultivation</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ maxWidth: '250px', margin: 0 }}>
                    <label>Filter by Product</label>
                    <select
                      className="form-input"
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                    >
                      <option value="">All Products</option>
                      {products
                        .filter(p => !selectedChecklistCategory || p.category === selectedChecklistCategory)
                        .map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Add New Item Form */}
                {isAddingChecklist && (
                  <div style={{ border: '2px solid #D4A72C', borderRadius: '8px', marginBottom: '1.5rem', background: '#FFFBF0' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB' }}>
                      <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Add New Checklist Item</h4>
                    </div>
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, marginBottom: '0.5rem' }}>Product *</label>
                          <select
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                            value={checklistForm.productId}
                            onChange={(e) => setChecklistForm({ ...checklistForm, productId: e.target.value })}
                          >
                            <option value="">Select a product</option>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, marginBottom: '0.5rem' }}>Title *</label>
                          <input
                            type="text"
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                            value={checklistForm.title}
                            onChange={(e) => setChecklistForm({ ...checklistForm, title: e.target.value })}
                            placeholder="e.g., Set up Google Search Console"
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, marginBottom: '0.5rem' }}>Description</label>
                        <input
                          type="text"
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                          value={checklistForm.description}
                          onChange={(e) => setChecklistForm({ ...checklistForm, description: e.target.value })}
                          placeholder="Optional description"
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, marginBottom: '0.5rem' }}>Action Type</label>
                          <select
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                            value={checklistForm.actionType}
                            onChange={(e) => setChecklistForm({ ...checklistForm, actionType: e.target.value })}
                          >
                            <option value="">None</option>
                            <option value="link">Link</option>
                            <option value="button">Button</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, marginBottom: '0.5rem' }}>Action Label</label>
                          <input
                            type="text"
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                            value={checklistForm.actionLabel}
                            onChange={(e) => setChecklistForm({ ...checklistForm, actionLabel: e.target.value })}
                            placeholder="e.g., Open GSC"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, marginBottom: '0.5rem' }}>Action URL</label>
                          <input
                            type="url"
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                            value={checklistForm.actionUrl}
                            onChange={(e) => setChecklistForm({ ...checklistForm, actionUrl: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                      {/* Auto-complete Section */}
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                        <p style={{ fontSize: '0.813rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Auto-Complete Settings</p>
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.5rem' }}>Link this item to a question. If the client answers with matching values, this item will be auto-checked.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, marginBottom: '0.5rem' }}>Link to Question</label>
                            <select
                              style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                              value={checklistForm.autoCompleteQuestionId}
                              onChange={(e) => setChecklistForm({ ...checklistForm, autoCompleteQuestionId: e.target.value })}
                            >
                              <option value="">None (manual completion)</option>
                              {questionTemplates
                                .filter(q => q.product_id === checklistForm.productId)
                                .map((q) => (
                                  <option key={q.id} value={q.id}>{q.question_text.substring(0, 60)}{q.question_text.length > 60 ? '...' : ''}</option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, marginBottom: '0.5rem' }}>Auto-Check Values</label>
                            <input
                              type="text"
                              style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                              value={checklistForm.autoCompleteValues}
                              onChange={(e) => setChecklistForm({ ...checklistForm, autoCompleteValues: e.target.value })}
                              placeholder="e.g., Yes, yes, Y"
                              disabled={!checklistForm.autoCompleteQuestionId}
                            />
                            <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Comma-separated values that trigger auto-check</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB' }}
                          onClick={cancelChecklistEdit}
                        >
                          Cancel
                        </button>
                        <button
                          style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', background: '#D4A72C', color: 'white', border: 'none' }}
                          onClick={handleSaveChecklist}
                        >
                          Add Item
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {checklistLoading ? (
                  <div className="loading-state">Loading checklist items...</div>
                ) : checklistTemplates.length === 0 && !isAddingChecklist ? (
                  <div className="empty-state">
                    <p>No checklist items configured yet.</p>
                    <button className="btn btn-secondary" onClick={startAddChecklist}>
                      Add Your First Item
                    </button>
                  </div>
                ) : filteredChecklists.length === 0 && !isAddingChecklist ? (
                  <div className="empty-state">
                    <p>No checklist items match the selected filters.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {Object.entries(sortedGroupedChecklists).map(([productName, templates]) => {
                      const category = templates[0]?.product?.category || 'root'
                      const categoryColors: Record<string, { bg: string; text: string }> = {
                        root: { bg: '#FFF2D9', text: '#D4A72C' },
                        growth: { bg: '#E6F2D9', text: '#7A9C3A' },
                        cultivation: { bg: '#FFE8D4', text: '#E07830' },
                      }
                      const colors = categoryColors[category] || categoryColors.root
                      return (
                      <div key={productName} style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: '#F9FAFB', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB' }}>
                          <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{productName}</h4>
                          <span style={{ background: colors.bg, color: colors.text, padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500, textTransform: 'capitalize' }}>{category}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {templates.map((template) => (
                            <div key={template.id}>
                              {/* Item Row */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', background: expandedChecklistId === template.id ? '#FFFBF0' : 'white' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
                                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{template.title}</span>
                                  {template.description && expandedChecklistId !== template.id && (
                                    <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{template.description}</span>
                                  )}
                                  {template.action_type && expandedChecklistId !== template.id && (
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                      Action: {template.action_type}{template.action_label && ` - "${template.action_label}"`}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    style={{ padding: '0.4rem 0.75rem', background: expandedChecklistId === template.id ? '#D4A72C' : '#F3F4F6', border: '1px solid ' + (expandedChecklistId === template.id ? '#D4A72C' : '#D1D5DB'), borderRadius: '6px', cursor: 'pointer', color: expandedChecklistId === template.id ? 'white' : '#374151', fontSize: '0.75rem', fontWeight: 500 }}
                                    onClick={() => toggleChecklistEdit(template)}
                                  >
                                    {expandedChecklistId === template.id ? 'Close' : 'Edit'}
                                  </button>
                                  <button
                                    style={{ padding: '0.4rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={() => handleDeleteChecklist(template.id)}
                                    title="Delete"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              {/* Accordion Edit Form */}
                              {expandedChecklistId === template.id && (
                                <div style={{ padding: '1rem', background: '#FFFBF0', borderBottom: '1px solid #E5E7EB' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Product</label>
                                        <select
                                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem', background: 'white' }}
                                          value={checklistForm.productId}
                                          onChange={(e) => setChecklistForm({ ...checklistForm, productId: e.target.value })}
                                        >
                                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                      </div>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Title</label>
                                        <input
                                          type="text"
                                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                                          value={checklistForm.title}
                                          onChange={(e) => setChecklistForm({ ...checklistForm, title: e.target.value })}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Description</label>
                                      <input
                                        type="text"
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                                        value={checklistForm.description}
                                        onChange={(e) => setChecklistForm({ ...checklistForm, description: e.target.value })}
                                      />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Action Type</label>
                                        <select
                                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem', background: 'white' }}
                                          value={checklistForm.actionType}
                                          onChange={(e) => setChecklistForm({ ...checklistForm, actionType: e.target.value })}
                                        >
                                          <option value="">None</option>
                                          <option value="link">Link</option>
                                          <option value="button">Button</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Action Label</label>
                                        <input
                                          type="text"
                                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                                          value={checklistForm.actionLabel}
                                          onChange={(e) => setChecklistForm({ ...checklistForm, actionLabel: e.target.value })}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Action URL</label>
                                        <input
                                          type="url"
                                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                                          value={checklistForm.actionUrl}
                                          onChange={(e) => setChecklistForm({ ...checklistForm, actionUrl: e.target.value })}
                                        />
                                      </div>
                                    </div>
                                    {/* Auto-complete Section */}
                                    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Auto-Complete Settings</p>
                                      <p style={{ fontSize: '0.7rem', color: '#6B7280', marginBottom: '0.5rem' }}>Link this item to a question. If the client answers with matching values, this item will be auto-checked.</p>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Link to Question</label>
                                          <select
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem', background: 'white' }}
                                            value={checklistForm.autoCompleteQuestionId}
                                            onChange={(e) => setChecklistForm({ ...checklistForm, autoCompleteQuestionId: e.target.value })}
                                          >
                                            <option value="">None (manual completion)</option>
                                            {questionTemplates
                                              .filter(q => q.product_id === checklistForm.productId)
                                              .map((q) => (
                                                <option key={q.id} value={q.id}>{q.question_text.substring(0, 60)}{q.question_text.length > 60 ? '...' : ''}</option>
                                              ))}
                                          </select>
                                        </div>
                                        <div>
                                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Auto-Check Values</label>
                                          <input
                                            type="text"
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                                            value={checklistForm.autoCompleteValues}
                                            onChange={(e) => setChecklistForm({ ...checklistForm, autoCompleteValues: e.target.value })}
                                            placeholder="e.g., Yes, yes, Y"
                                            disabled={!checklistForm.autoCompleteQuestionId}
                                          />
                                          <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>Comma-separated values that trigger auto-check</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                                      <button
                                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.813rem', fontWeight: 500, cursor: 'pointer', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB' }}
                                        onClick={cancelChecklistEdit}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.813rem', fontWeight: 500, cursor: 'pointer', background: '#D4A72C', color: 'white', border: 'none' }}
                                        onClick={handleSaveChecklist}
                                      >
                                        Save Changes
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Questions Tab */}
        {activeTab === 'questions' && (
          <div className="settings-layout" style={{ maxWidth: '900px' }}>
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2>Onboarding Questions</h2>
                  <p>Configure questions that clients answer after purchasing a product</p>
                </div>
                <button className="btn btn-primary" onClick={startAddQuestion}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Question
                </button>
              </div>
              <div className="settings-card-body">
                {/* Filters */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group" style={{ maxWidth: '200px', margin: 0 }}>
                    <label>Filter by Category</label>
                    <select
                      className="form-input"
                      value={selectedQuestionCategory}
                      onChange={(e) => setSelectedQuestionCategory(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      <option value="root">Root</option>
                      <option value="growth">Growth</option>
                      <option value="cultivation">Cultivation</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ maxWidth: '250px', margin: 0 }}>
                    <label>Filter by Product</label>
                    <select
                      className="form-input"
                      value={selectedQuestionProductId}
                      onChange={(e) => setSelectedQuestionProductId(e.target.value)}
                    >
                      <option value="">All Products</option>
                      {products
                        .filter(p => !selectedQuestionCategory || p.category === selectedQuestionCategory)
                        .map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Add New Question Form */}
                {isAddingQuestion && (
                  <div style={{ border: '2px solid #D4A72C', borderRadius: '8px', marginBottom: '1.5rem', background: '#FFFBF0' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB' }}>
                      <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Add New Question</h4>
                    </div>
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Product *</label>
                          <select
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem', background: 'white' }}
                            value={questionForm.productId}
                            onChange={(e) => setQuestionForm({ ...questionForm, productId: e.target.value })}
                          >
                            <option value="">Select a product</option>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Question Type *</label>
                          <select
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem', background: 'white' }}
                            value={questionForm.questionType}
                            onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value })}
                          >
                            <option value="text">Text</option>
                            <option value="textarea">Text Area</option>
                            <option value="select">Select</option>
                            <option value="multiselect">Multi-Select</option>
                            <option value="radio">Radio</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="url">URL</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Question Text *</label>
                        <input
                          type="text"
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                          value={questionForm.questionText}
                          onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                          placeholder="e.g., What is your website URL?"
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Section</label>
                          <input
                            type="text"
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                            value={questionForm.section}
                            onChange={(e) => setQuestionForm({ ...questionForm, section: e.target.value })}
                            placeholder="e.g., Business Info"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Placeholder</label>
                          <input
                            type="text"
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                            value={questionForm.placeholder}
                            onChange={(e) => setQuestionForm({ ...questionForm, placeholder: e.target.value })}
                            placeholder="Placeholder text"
                          />
                        </div>
                      </div>
                      {['select', 'multiselect', 'radio'].includes(questionForm.questionType) && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Options (one per line)</label>
                          <textarea
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical' }}
                            value={questionForm.options}
                            onChange={(e) => setQuestionForm({ ...questionForm, options: e.target.value })}
                            rows={3}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                          />
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Help Video URL (optional)</label>
                          <input
                            type="url"
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                            value={questionForm.videoUrl}
                            onChange={(e) => setQuestionForm({ ...questionForm, videoUrl: e.target.value })}
                            placeholder="https://www.loom.com/embed/..."
                          />
                          <span style={{ fontSize: '0.625rem', color: '#9CA3AF', marginTop: '0.25rem', display: 'block' }}>Loom, YouTube, or Vimeo embed URL</span>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Help Image (optional)</label>
                          {questionForm.imageUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <img src={questionForm.imageUrl} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
                              <button
                                type="button"
                                onClick={removeImage}
                                style={{ padding: '0.25rem 0.5rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '4px', color: '#EF4444', fontSize: '0.75rem', cursor: 'pointer' }}
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: '6px', cursor: imageUploading ? 'wait' : 'pointer', color: '#6B7280', fontSize: '0.813rem' }}>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={imageUploading}
                                style={{ display: 'none' }}
                              />
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                              </svg>
                              {imageUploading ? 'Uploading...' : 'Upload image'}
                            </label>
                          )}
                          <span style={{ fontSize: '0.625rem', color: '#9CA3AF', marginTop: '0.25rem', display: 'block' }}>JPEG, PNG, GIF, or WebP (max 5MB)</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          id="newQuestionRequired"
                          checked={questionForm.isRequired}
                          onChange={(e) => setQuestionForm({ ...questionForm, isRequired: e.target.checked })}
                        />
                        <label htmlFor="newQuestionRequired" style={{ fontSize: '0.875rem', color: '#374151' }}>Required question</label>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <button
                          style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.813rem', fontWeight: 500, cursor: 'pointer', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB' }}
                          onClick={cancelQuestionEdit}
                        >
                          Cancel
                        </button>
                        <button
                          style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.813rem', fontWeight: 500, cursor: 'pointer', background: '#D4A72C', color: 'white', border: 'none' }}
                          onClick={handleSaveQuestion}
                        >
                          Add Question
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {questionsLoading ? (
                  <div className="loading-state">Loading questions...</div>
                ) : questionTemplates.length === 0 && !isAddingQuestion ? (
                  <div className="empty-state">
                    <p>No onboarding questions configured yet.</p>
                    <button className="btn btn-secondary" onClick={startAddQuestion}>
                      Add Your First Question
                    </button>
                  </div>
                ) : filteredQuestions.length === 0 && !isAddingQuestion ? (
                  <div className="empty-state">
                    <p>No questions match the selected filters.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {Object.entries(sortedGroupedQuestions).map(([productName, templates]) => {
                      const category = templates[0]?.product?.category || 'root'
                      const categoryColors: Record<string, { bg: string; text: string }> = {
                        root: { bg: '#FFF2D9', text: '#D4A72C' },
                        growth: { bg: '#E6F2D9', text: '#7A9C3A' },
                        cultivation: { bg: '#FFE8D4', text: '#E07830' },
                      }
                      const colors = categoryColors[category] || categoryColors.root
                      return (
                      <div key={productName} style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: '#F9FAFB', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB' }}>
                          <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{productName}</h4>
                          <span style={{ background: colors.bg, color: colors.text, padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500, textTransform: 'capitalize' }}>{category}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {templates.map((template) => (
                            <div key={template.id}>
                              {/* Item Row */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', background: expandedQuestionId === template.id ? '#FFFBF0' : 'white' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
                                  <span style={{ fontWeight: 500, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {template.question_text}
                                    {template.is_required && <span style={{ background: '#FEF3C7', color: '#D97706', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 500 }}>Required</span>}
                                  </span>
                                  {expandedQuestionId !== template.id && (
                                    <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                      Type: {template.question_type}{template.section && ` | Section: ${template.section}`}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    style={{ padding: '0.4rem 0.75rem', background: expandedQuestionId === template.id ? '#D4A72C' : '#F3F4F6', border: '1px solid ' + (expandedQuestionId === template.id ? '#D4A72C' : '#D1D5DB'), borderRadius: '6px', cursor: 'pointer', color: expandedQuestionId === template.id ? 'white' : '#374151', fontSize: '0.75rem', fontWeight: 500 }}
                                    onClick={() => toggleQuestionEdit(template)}
                                  >
                                    {expandedQuestionId === template.id ? 'Close' : 'Edit'}
                                  </button>
                                  <button
                                    style={{ padding: '0.4rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={() => handleDeleteQuestion(template.id)}
                                    title="Delete"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              {/* Accordion Edit Form */}
                              {expandedQuestionId === template.id && (
                                <div style={{ padding: '1rem', background: '#FFFBF0', borderBottom: '1px solid #E5E7EB' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Product</label>
                                        <select
                                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem', background: 'white' }}
                                          value={questionForm.productId}
                                          onChange={(e) => setQuestionForm({ ...questionForm, productId: e.target.value })}
                                        >
                                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                      </div>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Question Type</label>
                                        <select
                                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem', background: 'white' }}
                                          value={questionForm.questionType}
                                          onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value })}
                                        >
                                          <option value="text">Text</option>
                                          <option value="textarea">Text Area</option>
                                          <option value="select">Select</option>
                                          <option value="multiselect">Multi-Select</option>
                                          <option value="radio">Radio</option>
                                          <option value="checkbox">Checkbox</option>
                                          <option value="url">URL</option>
                                          <option value="email">Email</option>
                                          <option value="phone">Phone</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Question Text</label>
                                      <input
                                        type="text"
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                                        value={questionForm.questionText}
                                        onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                                      />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Section</label>
                                        <input
                                          type="text"
                                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                                          value={questionForm.section}
                                          onChange={(e) => setQuestionForm({ ...questionForm, section: e.target.value })}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Placeholder</label>
                                        <input
                                          type="text"
                                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                                          value={questionForm.placeholder}
                                          onChange={(e) => setQuestionForm({ ...questionForm, placeholder: e.target.value })}
                                        />
                                      </div>
                                    </div>
                                    {['select', 'multiselect', 'radio'].includes(questionForm.questionType) && (
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Options (one per line)</label>
                                        <textarea
                                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical' }}
                                          value={questionForm.options}
                                          onChange={(e) => setQuestionForm({ ...questionForm, options: e.target.value })}
                                          rows={3}
                                        />
                                      </div>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Help Video URL (optional)</label>
                                        <input
                                          type="url"
                                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                                          value={questionForm.videoUrl}
                                          onChange={(e) => setQuestionForm({ ...questionForm, videoUrl: e.target.value })}
                                          placeholder="https://www.loom.com/embed/..."
                                        />
                                        <span style={{ fontSize: '0.625rem', color: '#9CA3AF', marginTop: '0.25rem', display: 'block' }}>Loom, YouTube, or Vimeo embed URL</span>
                                      </div>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Help Image (optional)</label>
                                        {questionForm.imageUrl ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <img src={questionForm.imageUrl} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
                                            <button
                                              type="button"
                                              onClick={removeImage}
                                              style={{ padding: '0.25rem 0.5rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '4px', color: '#EF4444', fontSize: '0.75rem', cursor: 'pointer' }}
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        ) : (
                                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: '6px', cursor: imageUploading ? 'wait' : 'pointer', color: '#6B7280', fontSize: '0.813rem' }}>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              onChange={handleImageUpload}
                                              disabled={imageUploading}
                                              style={{ display: 'none' }}
                                            />
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                              <polyline points="17 8 12 3 7 8"></polyline>
                                              <line x1="12" y1="3" x2="12" y2="15"></line>
                                            </svg>
                                            {imageUploading ? 'Uploading...' : 'Upload image'}
                                          </label>
                                        )}
                                        <span style={{ fontSize: '0.625rem', color: '#9CA3AF', marginTop: '0.25rem', display: 'block' }}>JPEG, PNG, GIF, or WebP (max 5MB)</span>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <input
                                        type="checkbox"
                                        id={`required-${template.id}`}
                                        checked={questionForm.isRequired}
                                        onChange={(e) => setQuestionForm({ ...questionForm, isRequired: e.target.checked })}
                                      />
                                      <label htmlFor={`required-${template.id}`} style={{ fontSize: '0.875rem', color: '#374151' }}>Required question</label>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                                      <button
                                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.813rem', fontWeight: 500, cursor: 'pointer', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB' }}
                                        onClick={cancelQuestionEdit}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.813rem', fontWeight: 500, cursor: 'pointer', background: '#D4A72C', color: 'white', border: 'none' }}
                                        onClick={handleSaveQuestion}
                                      >
                                        Save Changes
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Video Tab */}
        {activeTab === 'video' && (
          <div style={{ maxWidth: '1200px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem' }}>
              {/* Video Player Section */}
              <div style={{ minWidth: 0 }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #D4DCD2', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 1.5rem', borderBottom: '1px solid #D4DCD2' }}>
                    <div>
                      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>
                        {videoChapters.find(c => c.id === activeChapter)?.title || 'Onboarding Video'}
                      </h2>
                      <p style={{ margin: 0, fontSize: '0.813rem', color: '#5A6358' }}>
                        {videoChapters.find(c => c.id === activeChapter)?.description || 'Select a chapter to view'}
                      </p>
                    </div>
                  </div>
                  <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
                    {currentChapterVideo ? (
                      <iframe
                        src={currentChapterVideo}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      />
                    ) : (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F5F4', color: '#5A6358', gap: '1rem' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48" style={{ opacity: 0.5 }}>
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#1A1F16' }}>No Video Set</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', maxWidth: '300px', textAlign: 'center' }}>
                          Click the edit button on a chapter to add a Loom video
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions Card */}
                <div style={{ background: '#FFFFFF', border: '1px solid #D4DCD2', borderRadius: '12px', overflow: 'hidden', marginTop: '1rem' }}>
                  <div style={{ padding: '1rem 1.5rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}>How to Get Loom Embed URL</h4>
                    <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.813rem', color: '#5A6358', lineHeight: 1.6 }}>
                      <li>Open your Loom video</li>
                      <li>Click Share → Embed</li>
                      <li>Copy the embed code</li>
                      <li>Extract the URL from <code style={{ background: '#F5F5F4', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.75rem' }}>src="..."</code></li>
                    </ol>
                    <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: '#8A928A' }}>
                      Example: https://www.loom.com/embed/abc123def456
                    </p>
                  </div>
                </div>
              </div>

              {/* Chapters Section */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #D4DCD2', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #D4DCD2', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>Video Chapters</h2>
                      <p style={{ margin: 0, fontSize: '0.813rem', color: '#5A6358' }}>Drag to reorder</p>
                    </div>
                    <button
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', borderRadius: '6px', fontSize: '0.813rem', fontWeight: 500, cursor: 'pointer', background: '#885430', color: 'white', border: 'none' }}
                      onClick={addChapter}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {videoChapters.map((chapter, index) => (
                      <div
                        key={chapter.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, chapter.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, chapter.id)}
                        onDragEnd={handleDragEnd}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.5rem',
                          padding: '0.875rem 1rem',
                          background: draggedChapterId === chapter.id ? '#F5F5F4' : activeChapter === chapter.id ? 'rgba(136, 84, 48, 0.08)' : 'none',
                          borderBottom: index < videoChapters.length - 1 ? '1px solid #D4DCD2' : 'none',
                          opacity: draggedChapterId === chapter.id ? 0.5 : 1,
                          cursor: 'grab',
                        }}
                      >
                        {/* Drag Handle */}
                        <div style={{ color: '#8A928A', flexShrink: 0, cursor: 'grab', padding: '0.25rem 0' }}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <circle cx="9" cy="6" r="1.5"></circle>
                            <circle cx="15" cy="6" r="1.5"></circle>
                            <circle cx="9" cy="12" r="1.5"></circle>
                            <circle cx="15" cy="12" r="1.5"></circle>
                            <circle cx="9" cy="18" r="1.5"></circle>
                            <circle cx="15" cy="18" r="1.5"></circle>
                          </svg>
                        </div>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            flex: 1,
                            padding: 0
                          }}
                          onClick={() => setActiveChapter(chapter.id)}
                        >
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: chapter.videoUrl ? '#22C55E' : activeChapter === chapter.id ? '#885430' : '#F5F5F4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: chapter.videoUrl || activeChapter === chapter.id ? 'white' : '#5A6358',
                            flexShrink: 0
                          }}>
                            {chapter.videoUrl ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            ) : index + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A1F16', marginBottom: '0.25rem' }}>{chapter.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#8A928A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {chapter.description}
                            </div>
                          </div>
                        </button>
                        <button
                          style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: '#5A6358', flexShrink: 0 }}
                          onClick={() => startEditChapter(chapter.id)}
                          title="Edit chapter"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Chapter Modal */}
            {editingChapterId && (
              <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                onClick={cancelEditChapter}
              >
                <div
                  style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #D4DCD2' }}>
                    <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Edit Chapter</h2>
                    <button
                      style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: '#5A6358' }}
                      onClick={cancelEditChapter}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, marginBottom: '0.5rem', color: '#1A1F16' }}>Title</label>
                      <input
                        type="text"
                        style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #D4DCD2', borderRadius: '8px', background: '#FEFBF7', color: '#1A1F16', fontSize: '0.875rem' }}
                        placeholder="Chapter title"
                        value={chapterForm.title}
                        onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, marginBottom: '0.5rem', color: '#1A1F16' }}>Description</label>
                      <input
                        type="text"
                        style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #D4DCD2', borderRadius: '8px', background: '#FEFBF7', color: '#1A1F16', fontSize: '0.875rem' }}
                        placeholder="Brief description"
                        value={chapterForm.description}
                        onChange={(e) => setChapterForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, marginBottom: '0.5rem', color: '#1A1F16' }}>Loom Embed URL</label>
                      <input
                        type="text"
                        style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #D4DCD2', borderRadius: '8px', background: '#FEFBF7', color: '#1A1F16', fontSize: '0.875rem' }}
                        placeholder="https://www.loom.com/embed/abc123..."
                        value={chapterForm.videoUrl}
                        onChange={(e) => setChapterForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                      />
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#5A6358', marginTop: '0.25rem' }}>
                        Paste the embed URL from Loom (Share → Embed → extract src URL)
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem', borderTop: '1px solid #D4DCD2' }}>
                    <button
                      style={{ padding: '0.625rem 1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', background: '#FEE2E2', color: '#991B1B', border: 'none' }}
                      onClick={() => {
                        if (confirm('Delete this chapter?')) {
                          deleteChapter()
                        }
                      }}
                    >
                      Delete
                    </button>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        style={{ padding: '0.625rem 1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', background: '#F5F5F4', color: '#1A1F16', border: '1px solid #D4DCD2' }}
                        onClick={cancelEditChapter}
                      >
                        Cancel
                      </button>
                      <button
                        style={{ padding: '0.625rem 1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', background: '#885430', color: 'white', border: 'none' }}
                        onClick={saveChapter}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .tabs-container {
          border-bottom: 1px solid var(--border-color);
        }
        .tabs {
          display: flex;
          gap: 0;
        }
        .tab {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab:hover {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }
        .tab.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }
        .settings-layout {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .settings-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
        }
        .settings-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .settings-card-header h2 {
          margin: 0 0 0.25rem;
          font-size: 1rem;
          font-weight: 600;
        }
        .settings-card-header p {
          margin: 0;
          font-size: 0.813rem;
          color: var(--text-secondary);
        }
        .settings-card-body {
          padding: 1.5rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-size: 0.813rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }
        .form-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(136, 84, 48, 0.1);
        }
        select.form-input {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          padding-right: 2.5rem;
          cursor: pointer;
        }
        textarea.form-input {
          resize: vertical;
          min-height: 80px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .btn-primary {
          background: var(--primary);
          color: white;
        }
        .btn-primary:hover {
          background: var(--primary-hover);
        }
        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }
        .btn-secondary:hover {
          background: var(--bg-primary);
        }
        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.813rem;
        }
        .btn-outline {
          background: transparent;
          border: 1px solid var(--border-color);
        }
        .btn-outline:hover {
          background: var(--bg-tertiary);
        }
        .btn-icon {
          padding: 0.5rem;
        }
        .btn-ghost {
          background: transparent;
          color: var(--text-secondary);
        }
        .btn-ghost:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .btn-danger {
          color: var(--error-text);
        }
        .btn-danger:hover {
          background: var(--error-bg);
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: var(--bg-secondary);
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .modal-header h2 {
          margin: 0;
          font-size: 1.125rem;
        }
        .modal-close {
          background: none;
          border: none;
          padding: 0.25rem;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .modal-close:hover {
          color: var(--text-primary);
        }
        .modal-body {
          padding: 1.5rem;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color);
        }
        .role-display {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .role-badge-large {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-tertiary);
          border-radius: 8px;
        }
        .role-badge-large.super-admin {
          background: linear-gradient(135deg, rgba(136, 84, 48, 0.1), rgba(136, 84, 48, 0.05));
          border: 1px solid rgba(136, 84, 48, 0.2);
        }
        .role-badge-large svg {
          color: var(--primary);
        }
        .role-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .role-title {
          font-weight: 600;
          font-size: 1rem;
        }
        .role-desc {
          font-size: 0.813rem;
          color: var(--text-secondary);
        }
        .role-permissions h4 {
          margin: 0 0 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }
        .permission-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.813rem;
          color: var(--text-secondary);
        }
        .permission-item.granted {
          color: var(--success-text);
        }
        .permission-item.granted svg {
          color: var(--success-text);
        }
        .session-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .session-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }
        .session-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border-radius: 8px;
          color: var(--text-secondary);
        }
        .session-icon svg {
          width: 20px;
          height: 20px;
        }
        .session-details {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .session-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .session-value {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .session-actions {
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }
        .btn-outline {
          background: transparent;
          border: 1px solid var(--border-color);
        }
        .btn-danger-outline {
          border-color: var(--error-text);
          color: var(--error-text);
        }
        .btn-danger-outline:hover {
          background: var(--error-bg);
        }
        .password-input-wrapper {
          position: relative;
        }
        .password-toggle {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          padding: 0.25rem;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .password-toggle:hover {
          color: var(--text-primary);
        }
        .password-requirements {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .requirement {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .requirement.met {
          color: var(--success-text);
        }
        .password-actions {
          margin-top: 1rem;
        }
        .checklist-groups {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .checklist-group {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
        }
        .group-title {
          background: var(--bg-secondary);
          padding: 0.75rem 1rem;
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
        }
        .checklist-items-list {
          display: flex;
          flex-direction: column;
        }
        .checklist-item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          gap: 1rem;
        }
        .checklist-item-row:last-child {
          border-bottom: none;
        }
        .checklist-item-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }
        .checklist-item-title {
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .checklist-item-desc {
          font-size: 0.813rem;
          color: var(--text-secondary);
        }
        .checklist-item-action {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }
        .checklist-item-actions {
          display: flex;
          gap: 0.25rem;
        }
        .required-badge {
          background: var(--warning-bg);
          color: var(--warning-text);
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-secondary);
        }
        .empty-state p {
          margin-bottom: 1rem;
        }
        .loading-state {
          text-align: center;
          padding: 2rem;
          color: var(--text-secondary);
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .checkbox-label input {
          width: 16px;
          height: 16px;
        }
        .form-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        /* Video Tab Styles */
        .video-tab-content {
          max-width: 1200px;
        }
        .video-layout {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 1.5rem;
        }
        @media (max-width: 900px) {
          .video-layout {
            grid-template-columns: 1fr;
          }
        }
        .video-player-section {
          min-width: 0;
        }
        .chapters-section {
          display: flex;
          flex-direction: column;
        }
        .video-player-container {
          position: relative;
          padding-top: 56.25%; /* 16:9 aspect ratio */
          background: #000;
        }
        .video-iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }
        .video-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          gap: 1rem;
        }
        .video-placeholder svg {
          opacity: 0.5;
        }
        .video-placeholder h3 {
          margin: 0;
          font-size: 1.125rem;
          color: var(--text-primary);
        }
        .video-placeholder p {
          margin: 0;
          font-size: 0.875rem;
          max-width: 300px;
          text-align: center;
        }
        .chapters-list {
          display: flex;
          flex-direction: column;
        }
        .chapter-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: none;
          border: none;
          border-bottom: 1px solid var(--border-color);
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }
        .chapter-item:last-child {
          border-bottom: none;
        }
        .chapter-item:hover {
          background: var(--bg-tertiary);
        }
        .chapter-item.active {
          background: var(--primary-light, rgba(136, 84, 48, 0.08));
        }
        .chapter-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .chapter-item.active .chapter-number {
          background: var(--primary);
          color: white;
        }
        .chapter-info {
          flex: 1;
          min-width: 0;
        }
        .chapter-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }
        .chapter-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }
        .chapter-duration {
          background: var(--bg-tertiary);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
        }
        .chapter-desc {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chapter-playing {
          color: var(--primary);
          flex-shrink: 0;
        }
      `}</style>
    </>
  )
}

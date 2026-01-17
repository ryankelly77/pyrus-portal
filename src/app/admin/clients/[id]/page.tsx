'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { CommunicationItem, formatTimelineDate } from '@/components'
import { ContentView, ResultsView, WebsiteView, ActivityView, RecommendationsView, CommunicationView } from '@/components/client-views'

// Helper to generate initials from name (same as Clients page)
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Helper to generate a consistent color from a string (same as Clients page)
function getAvatarColor(str: string): string {
  const colors = ['#885430', '#2563EB', '#7C3AED', '#0B7277', '#DC2626', '#6B7280', '#059669', '#D97706']
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Helper to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// Format price - show cents only when there's a fractional part
function formatPrice(amount: number): string {
  const hasCents = amount % 1 !== 0
  if (hasCents) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return Math.round(amount).toLocaleString('en-US')
}

// Export communications to CSV
interface CommForExport {
  sentAt: string | null
  createdAt: string | null
  type: string
  title: string
  subject: string | null
  status: string | null
  direction?: string
  source?: string
  body: string | null
}

function exportCommunicationsToCSV(communications: CommForExport[], filename: string) {
  const headers = ['Date', 'Type', 'Title', 'Subject', 'Status', 'Direction', 'Source', 'Body']
  const rows = communications.map(comm => [
    comm.sentAt ? new Date(comm.sentAt).toLocaleString() : '',
    comm.type,
    comm.title,
    comm.subject || '',
    comm.status || '',
    comm.direction || '',
    comm.source || 'database',
    (comm.body || '').replace(/"/g, '""').substring(0, 500),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

// Database client interface
interface DBClient {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  status: string | null
  growth_stage: string | null
  avatar_color: string | null
  notes: string | null
  referred_by: string | null
  referral_source: string | null
  created_at: string
  // Integration fields
  agency_dashboard_share_key: string | null
  basecamp_id: string | null
  basecamp_project_id: string | null
  landingsite_preview_url: string | null
  stripe_customer_id: string | null
}

type MainTab = 'getting-started' | 'results' | 'activity' | 'website' | 'content' | 'communication' | 'recommendations'

type RequestStatus = 'completed' | 'in-progress' | 'pending'

interface EditRequest {
  id: number
  title: string
  type: string
  status: RequestStatus
  date: string
}

interface ChecklistItem {
  id: string
  templateId: string
  title: string
  description: string | null
  actionType: string | null
  actionUrl: string | null
  actionLabel: string | null
  isCompleted: boolean
  completedAt: string | null
  notes: string | null
  product: {
    id: string
    name: string
    category: string
  }
}

interface OnboardingResponse {
  id: string
  question: string
  answer: string
  questionType: string
  product: {
    id: string
    name: string
    category: string
  }
}

interface OnboardingSummary {
  [section: string]: OnboardingResponse[]
}

interface RecommendationItem {
  id: string
  tier: string | null  // 'good', 'better', 'best', or null
  monthly_price: string | null
  onetime_price: string | null
  is_free: boolean | null
  product: {
    id: string
    name: string
    category: string
    monthly_price: string | null
    onetime_price: string | null
    short_description: string | null
  } | null
  bundle: {
    id: string
    name: string
    description: string | null
    monthly_price: string | null
    onetime_price: string | null
  } | null
  addon: {
    id: string
    name: string
    description: string | null
    price: string | null
  } | null
}

interface RecommendationHistory {
  id: string
  action: string
  details: string | null
  created_at: string
  created_by: string | null
}

interface Recommendation {
  id: string
  status: string
  good_description: string | null
  better_description: string | null
  best_description: string | null
  discount_applied: string | null
  purchased_tier: string | null
  purchased_at: string | null
  recommendation_items: RecommendationItem[]
  history?: RecommendationHistory[]
}

interface SubscriptionItem {
  id: string
  quantity: number | null
  unit_amount: string | null
  product: {
    id: string
    name: string
    category: string
    short_description: string | null
    monthly_price: string | null
  } | null
  bundle: {
    id: string
    name: string
    description: string | null
    monthly_price: string | null
  } | null
}

interface SubscriptionHistory {
  id: string
  action: string
  details: string | null
  created_at: string | null
  created_by: string | null
}

interface Subscription {
  id: string
  status: string | null
  current_period_start: string | null
  current_period_end: string | null
  monthly_amount: string | null
  created_at: string | null
  subscription_items: SubscriptionItem[]
  subscription_history?: SubscriptionHistory[]
}

// Stripe subscription directly from Stripe API
interface StripeSubscriptionItem {
  id: string
  priceId: string
  product: {
    id: string
    name: string
    description?: string
  }
  quantity: number | null
  unitAmount: number
  currency: string
  interval: string
  intervalCount: number
}

interface StripeSubscription {
  id: string
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  created: string
  items: StripeSubscriptionItem[]
}

// Stripe subscription history event
interface StripeHistoryEvent {
  id: string
  type: string
  action: string
  details: string
  date: string
  products?: string[]
}

interface ClientData {
  id: string
  name: string
  initials: string
  avatarColor: string
  email: string
  clientSince: string
  status: 'active' | 'paused' | 'onboarding'
  growthStage: 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting'
  servicesCount: number
  hasWebsite: boolean
  hasContent: boolean
  websiteData?: {
    domain: string
    previewUrl: string
    plan: string
    carePlan: string
    status: 'active' | 'development' | 'maintenance'
    launchDate: string
    hosting: {
      provider: string
      uptime: string
      lastUpdated: string
    }
  }
  editRequests?: EditRequest[]
  checklistProgress: {
    completed: number
    total: number
  }
}

const avatarColors = [
  { name: 'Brown', value: '#885430' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Teal', value: '#0B7277' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Pink', value: '#DB2777' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Violet', value: '#9333EA' },
]

// Client database
const clients: Record<string, ClientData> = {
  'tc-clinical': {
    id: 'tc-clinical',
    name: 'TC Clinical Services',
    initials: 'TC',
    avatarColor: '#885430',
    email: 'dlg.mdservices@gmail.com',
    clientSince: 'Sep 2025',
    status: 'active',
    growthStage: 'sprouting',
    servicesCount: 4,
    hasWebsite: true,
    hasContent: true,
    websiteData: {
      domain: 'tc-clinicalservices.com',
      previewUrl: 'https://app.landingsite.ai/website-preview?id=8869fd44-f6ea-4bd7-bc24-92a7a14f17a5',
      plan: 'Seed Site (AI-Built)',
      carePlan: 'Website Care Plan',
      status: 'active',
      launchDate: 'Dec 30, 2025',
      hosting: {
        provider: 'Landingsite.ai',
        uptime: '99.9%',
        lastUpdated: 'Jan 3, 2026',
      },
    },
    editRequests: [
      { id: 1, title: 'Update contact page hours', type: 'Content Update', status: 'completed', date: 'Jan 3, 2026' },
      { id: 2, title: 'Add new wound care service page', type: 'New Feature', status: 'in-progress', date: 'Jan 2, 2026' },
      { id: 3, title: 'Fix mobile menu alignment', type: 'Bug Fix', status: 'completed', date: 'Dec 28, 2025' },
      { id: 4, title: 'Update footer contact info', type: 'Content Update', status: 'completed', date: 'Dec 20, 2025' },
    ],
    checklistProgress: { completed: 5, total: 6 },
  },
  'raptor-vending': {
    id: 'raptor-vending',
    name: 'Raptor Vending',
    initials: 'RV',
    avatarColor: '#2563EB',
    email: 'info@raptorvending.com',
    clientSince: 'Nov 2025',
    status: 'active',
    growthStage: 'seedling',
    servicesCount: 2,
    hasWebsite: false,
    hasContent: false,
    checklistProgress: { completed: 3, total: 6 },
  },
}

// Video chapter interface
interface VideoChapter {
  id: string
  title: string
  description: string
  videoUrl: string
}

type GettingStartedSubtab = 'questions' | 'checklist' | 'onboarding-summary'
type ResultsSubtab = 'overview' | 'pro-dashboard'
type RecommendationsSubtab = 'smart-recommendations' | 'original-plan' | 'current-services'
type ActivityFilter = 'all' | 'task' | 'update' | 'alert' | 'content'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  // Database client state
  const [dbClient, setDbClient] = useState<DBClient | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<MainTab>('getting-started')
  const [activeSubtab, setActiveSubtab] = useState<GettingStartedSubtab>('questions')
  const [resultsSubtab, setResultsSubtab] = useState<ResultsSubtab>('overview')
  const [recommendationsSubtab, setRecommendationsSubtab] = useState<RecommendationsSubtab>('original-plan')
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [isClientView, setIsClientView] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editModalTab, setEditModalTab] = useState<'general' | 'integrations' | 'billing' | 'notifications'>('general')
  const [editFormData, setEditFormData] = useState({
    companyName: '',
    status: 'active' as 'active' | 'paused' | 'onboarding',
    primaryContact: '',
    email: '',
    phone: '',
    website: '',
    growthStage: 'prospect' as 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting',
    internalNotes: '',
    referredBy: '',
    referralSource: '',
    avatarColor: '#885430',
    // Integrations
    agencyDashboardShareKey: '',
    basecampProjectId: '',
    landsitePreviewUrl: '',
    stripeCustomerId: '',
    // Billing
    billingEmail: '',
    paymentMethod: '**** **** **** 4242',
    billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'annually',
    // Notifications
    monthlyReports: true,
    resultAlerts: true,
    recommendationUpdates: true,
    weeklyDigest: false,
  })
  const [isSaving, setIsSaving] = useState(false)

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [syncingChecklist, setSyncingChecklist] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  // Video chapters state
  const [videoChapters, setVideoChapters] = useState<VideoChapter[]>([])
  const [activeVideoChapter, setActiveVideoChapter] = useState<string>('')

  // Onboarding summary state
  const [onboardingSummary, setOnboardingSummary] = useState<OnboardingSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Onboarding questions form state (for Questions tab)
  interface OnboardingQuestion {
    id: string
    questionText: string
    questionType: string
    options: string[] | null
    placeholder: string | null
    helpText: string | null
    isRequired: boolean
    section: string | null
    product: {
      id: string
      name: string
      category: string
    }
    response: {
      id: string
      text: string | null
      options: string[] | null
    } | null
  }
  interface OnboardingFormData {
    questions: OnboardingQuestion[]
    grouped: Record<string, OnboardingQuestion[]>
    hasProducts: boolean
    progress: {
      answered: number
      total: number
      percent: number
    }
  }
  const [onboardingForm, setOnboardingForm] = useState<OnboardingFormData | null>(null)
  const [onboardingFormLoading, setOnboardingFormLoading] = useState(false)

  // Recommendation state
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)

  // Subscription state (from database)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])

  // Stripe subscriptions (directly from Stripe API)
  const [stripeSubscriptions, setStripeSubscriptions] = useState<StripeSubscription[]>([])
  const [stripeSubscriptionsLoading, setStripeSubscriptionsLoading] = useState(false)

  // Stripe subscription history
  const [stripeHistory, setStripeHistory] = useState<StripeHistoryEvent[]>([])
  const [stripeHistoryLoading, setStripeHistoryLoading] = useState(false)

  // Manual products state
  interface ManualProduct {
    id: string
    productId: string
    name: string
    category: string
    description: string | null
    source: 'manual'
    assignedAt: string | null
    notes: string | null
    monthlyPrice: number
    hasCustomPrice: boolean
  }
  const [manualProducts, setManualProducts] = useState<ManualProduct[]>([])
  const [manualProductsLoading, setManualProductsLoading] = useState(false)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<{ id: string; name: string; category: string }[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productNotes, setProductNotes] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)
  const [removingProductId, setRemovingProductId] = useState<string | null>(null)
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editingPriceValue, setEditingPriceValue] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)

  // Basecamp activities state
  interface BasecampActivity {
    id: string
    taskId: string
    kind: string
    title: string | null
    status: string
    todolist: string | null
    content: string | null
    position: number | null
    createdAt: string | null
  }
  const [basecampActivities, setBasecampActivities] = useState<BasecampActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false)

  // Payment methods state
  interface PaymentMethod {
    id: string
    type: string
    card?: {
      brand: string
      last4: string
      expMonth: number
      expYear: number
    }
    usBankAccount?: {
      bankName: string
      last4: string
      accountType: string
    }
    link?: {
      email: string
    }
    isDefault: boolean
    created: string
  }
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false)
  const [stripeBillingEmail, setStripeBillingEmail] = useState<string | null>(null)

  // Content state
  const [contentStats, setContentStats] = useState<{
    urgentReviews: number
    pendingApproval: number
    approved: number
    published: number
  } | null>(null)
  const [contentSubtab, setContentSubtab] = useState<'review' | 'files'>('review')
  const [showContentRequirementsModal, setShowContentRequirementsModal] = useState(false)

  // Content upsell state
  interface ContentProduct {
    id: string
    name: string
    short_description: string | null
    long_description: string | null
    category: string
    monthly_price: string | null
    onetime_price: string | null
    supports_quantity: boolean | null
  }
  const [availableContentProducts, setAvailableContentProducts] = useState<ContentProduct[]>([])
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ContentProduct | null>(null)

  // Result Alert modal state
  const [showResultAlertModal, setShowResultAlertModal] = useState(false)
  const [resultAlertType, setResultAlertType] = useState<'ranking' | 'traffic' | 'leads' | 'milestone' | 'other' | 'ai'>('ranking')
  const [resultAlertSubject, setResultAlertSubject] = useState('')
  const [resultAlertMessage, setResultAlertMessage] = useState('')
  const [isSendingResultAlert, setIsSendingResultAlert] = useState(false)
  // Optional structured data for highlight box
  interface KeywordRow {
    keyword: string
    newPosition: string
    prevPosition: string
  }
  const [resultAlertKeywords, setResultAlertKeywords] = useState<KeywordRow[]>([{ keyword: '', newPosition: '', prevPosition: '' }])
  const [resultAlertMilestone, setResultAlertMilestone] = useState('')

  // Helper to update a specific keyword row
  const updateKeywordRow = (index: number, field: keyof KeywordRow, value: string) => {
    setResultAlertKeywords(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  // Add a new keyword row
  const addKeywordRow = () => {
    setResultAlertKeywords(prev => [...prev, { keyword: '', newPosition: '', prevPosition: '' }])
  }

  // Remove a keyword row
  const removeKeywordRow = (index: number) => {
    setResultAlertKeywords(prev => prev.filter((_, i) => i !== index))
  }

  // Alert type options with icons and default subjects
  const alertTypes = {
    ranking: {
      label: 'Keyword Ranking',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      ),
      color: '#10B981',
      bgColor: '#D1FAE5',
      defaultSubject: 'Your Keywords Are Climbing!',
      placeholder: 'e.g., Your keyword "wound care san antonio" jumped from #24 to #7 this month!',
    },
    traffic: {
      label: 'Traffic Milestone',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
      ),
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      defaultSubject: 'Traffic Milestone Reached!',
      placeholder: 'e.g., Your website just hit 3,000 monthly visitors - up 45% from last month!',
    },
    leads: {
      label: 'Lead Increase',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <line x1="19" y1="8" x2="19" y2="14"></line>
          <line x1="22" y1="11" x2="16" y2="11"></line>
        </svg>
      ),
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      defaultSubject: 'New Lead Alert!',
      placeholder: 'e.g., Great news! You received 12 new leads this week through your Google Ads campaign.',
    },
    milestone: {
      label: 'Campaign Milestone',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <circle cx="12" cy="8" r="7"></circle>
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
        </svg>
      ),
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      defaultSubject: 'Campaign Milestone Achieved!',
      placeholder: 'e.g., Your Google Ads campaign just completed its first 90 days with a 3.2x ROI!',
    },
    other: {
      label: 'Other Update',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
      ),
      color: '#DB2777',
      bgColor: '#FDF2F8',
      defaultSubject: 'Marketing Update',
      placeholder: 'Write a custom message about the results you want to share...',
    },
    ai: {
      label: 'AI Alert',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"></path>
          <path d="M20 3v4"></path>
          <path d="M22 5h-4"></path>
          <path d="M4 17v2"></path>
          <path d="M5 18H3"></path>
        </svg>
      ),
      color: '#06B6D4',
      bgColor: '#CFFAFE',
      defaultSubject: 'AI Insights for Your Business',
      placeholder: 'e.g., Our AI analysis identified 3 new keyword opportunities that could increase your traffic by 25%.',
    },
  }

  // Communications state
  interface Communication {
    id: string
    clientId: string
    type: string  // 'email_invite', 'email_reminder', 'email_highlevel', 'result_alert', 'sms', 'chat', 'chat_facebook', 'chat_instagram', 'chat_whatsapp', 'monthly_report', etc.
    title: string
    subject: string | null
    body: string | null
    status: string | null  // 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'
    metadata: Record<string, any> | null
    highlightType: string | null  // 'success' | 'failed' | null
    recipientEmail: string | null
    openedAt: string | null
    clickedAt: string | null
    sentAt: string | null
    createdAt: string | null
    source?: 'database' | 'highlevel'
    direction?: 'inbound' | 'outbound'
  }
  const [communications, setCommunications] = useState<Communication[]>([])
  const [communicationsLoading, setCommunicationsLoading] = useState(false)
  const [commFilter, setCommFilter] = useState<'all' | 'emails' | 'alerts' | 'sms' | 'chat' | 'content'>('all')
  const [commDateRange, setCommDateRange] = useState<'all' | '7days' | '30days' | '90days'>('all')
  const [showCommDateDropdown, setShowCommDateDropdown] = useState(false)
  const commDateDropdownRef = useRef<HTMLDivElement>(null)

  // Resend invitation state
  const [isResendingInvite, setIsResendingInvite] = useState(false)
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Billing/Invoices state
  interface InvoiceLine {
    id: string
    description: string | null
    amount: number
    quantity: number | null
    period: { start: string; end: string } | null
  }
  interface Invoice {
    id: string
    number: string | null
    status: string | null
    amountDue: number
    amountPaid: number
    amountRemaining: number
    subtotal: number
    total: number
    tax: number | null
    currency: string
    created: string | null
    dueDate: string | null
    paidAt: string | null
    periodStart: string | null
    periodEnd: string | null
    hostedInvoiceUrl: string | null
    invoicePdf: string | null
    description: string | null
    subscriptionId: string | null
    lines: InvoiceLine[]
  }
  interface StripeCustomer {
    id: string
    email: string | null
    name: string | null
    phone: string | null
    created: string | null
    balance: number
    currency: string
    defaultPaymentMethod: string | null
  }
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stripeCustomer, setStripeCustomer] = useState<StripeCustomer | null>(null)
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null)
  const [invoicesLoading, setInvoicesLoading] = useState(false)

  // Handle saving client changes
  const handleSaveClient = async () => {
    if (!dbClient) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.companyName,
          contactName: editFormData.primaryContact,
          contactEmail: editFormData.email,
          status: editFormData.status,
          growthStage: editFormData.growthStage,
          notes: editFormData.internalNotes,
          referredBy: editFormData.referredBy,
          referralSource: editFormData.referralSource,
          avatarColor: editFormData.avatarColor,
          // Integration fields
          agencyDashboardShareKey: editFormData.agencyDashboardShareKey,
          basecampProjectId: editFormData.basecampProjectId,
          landsitePreviewUrl: editFormData.landsitePreviewUrl,
          stripeCustomerId: editFormData.stripeCustomerId,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to update client')
      }

      // Refetch client to get updated data
      const updatedClient = await res.json()
      setDbClient(updatedClient)

      setShowEditModal(false)
    } catch (error) {
      console.error('Failed to save client:', error)
      alert('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Fetch client from database
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/admin/clients/${clientId}`)
        if (res.ok) {
          const data: DBClient = await res.json()
          setDbClient(data)
          // Update edit form with fetched data
          setEditFormData(prev => ({
            ...prev,
            companyName: data.name,
            status: (data.status as 'active' | 'paused' | 'onboarding') || 'active',
            primaryContact: data.contact_name || '',
            email: data.contact_email || '',
            growthStage: (data.growth_stage as 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting') || 'prospect',
            internalNotes: data.notes || '',
            referredBy: data.referred_by || '',
            referralSource: data.referral_source || '',
            avatarColor: data.avatar_color || getAvatarColor(data.name),
            // Integration fields
            agencyDashboardShareKey: data.agency_dashboard_share_key || '',
            basecampProjectId: data.basecamp_project_id || '',
            landsitePreviewUrl: data.landingsite_preview_url || '',
            stripeCustomerId: data.stripe_customer_id || '',
          }))
        }
      } catch (error) {
        console.error('Failed to fetch client:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchClient()
  }, [clientId])

  // Fetch checklist items
  useEffect(() => {
    const fetchChecklist = async () => {
      setChecklistLoading(true)
      try {
        const res = await fetch(`/api/admin/clients/${clientId}/checklist`)
        if (res.ok) {
          const data: ChecklistItem[] = await res.json()
          setChecklistItems(data)
        }
      } catch (error) {
        console.error('Failed to fetch checklist:', error)
      } finally {
        setChecklistLoading(false)
      }
    }
    fetchChecklist()
  }, [clientId])

  // Fetch payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (!dbClient?.stripe_customer_id) return
      setPaymentMethodsLoading(true)
      try {
        const res = await fetch(`/api/admin/clients/${clientId}/payment-methods`)
        if (res.ok) {
          const data = await res.json()
          setPaymentMethods(data.paymentMethods || [])
          // Store billing email from Stripe
          if (data.billingEmail) {
            setStripeBillingEmail(data.billingEmail)
            setEditFormData(prev => ({
              ...prev,
              billingEmail: data.billingEmail,
            }))
          }
          // Update edit form with default payment method display
          const defaultMethod = data.paymentMethods?.find((pm: PaymentMethod) => pm.isDefault)
          if (defaultMethod?.card) {
            const brandDisplay = defaultMethod.card.brand.charAt(0).toUpperCase() + defaultMethod.card.brand.slice(1)
            setEditFormData(prev => ({
              ...prev,
              paymentMethod: `${brandDisplay} •••• ${defaultMethod.card.last4}`,
            }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch payment methods:', error)
      } finally {
        setPaymentMethodsLoading(false)
      }
    }
    fetchPaymentMethods()
  }, [clientId, dbClient?.stripe_customer_id])

  // Fetch video chapters
  useEffect(() => {
    const fetchVideoChapters = async () => {
      try {
        const res = await fetch('/api/admin/onboarding/video-chapters')
        if (res.ok) {
          const data = await res.json()
          const chapters = data.map((c: { id: string; title: string; description: string | null; video_url: string | null }) => ({
            id: c.id,
            title: c.title,
            description: c.description || '',
            videoUrl: c.video_url || ''
          })).filter((c: VideoChapter) => c.videoUrl)
          setVideoChapters(chapters)
          if (chapters.length > 0) {
            setActiveVideoChapter(chapters[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch video chapters:', error)
      }
    }
    fetchVideoChapters()
  }, [])

  // Fetch onboarding summary
  useEffect(() => {
    const fetchOnboardingSummary = async () => {
      setSummaryLoading(true)
      try {
        const res = await fetch(`/api/client/onboarding?clientId=${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setOnboardingSummary(data.onboardingSummary || null)
        }
      } catch (error) {
        console.error('Failed to fetch onboarding summary:', error)
      } finally {
        setSummaryLoading(false)
      }
    }
    fetchOnboardingSummary()
  }, [clientId])

  // Fetch onboarding form questions
  useEffect(() => {
    const fetchOnboardingForm = async () => {
      setOnboardingFormLoading(true)
      try {
        const res = await fetch(`/api/client/onboarding-form?clientId=${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setOnboardingForm(data)
        }
      } catch (error) {
        console.error('Failed to fetch onboarding form:', error)
      } finally {
        setOnboardingFormLoading(false)
      }
    }
    fetchOnboardingForm()
  }, [clientId])

  // Fetch recommendation data
  useEffect(() => {
    const fetchRecommendation = async () => {
      setRecommendationLoading(true)
      try {
        const res = await fetch(`/api/admin/recommendations/client/${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setRecommendation(data)
        }
      } catch (error) {
        console.error('Failed to fetch recommendation:', error)
      } finally {
        setRecommendationLoading(false)
      }
    }
    fetchRecommendation()
  }, [clientId])

  // Fetch subscription data (from database)
  useEffect(() => {
    const fetchSubscriptions = async () => {
      setSubscriptionsLoading(true)
      try {
        const res = await fetch(`/api/admin/clients/${clientId}/subscriptions`)
        if (res.ok) {
          const data = await res.json()
          setSubscriptions(data)
        }
      } catch (error) {
        console.error('Failed to fetch subscriptions:', error)
      } finally {
        setSubscriptionsLoading(false)
      }
    }
    fetchSubscriptions()
  }, [clientId])

  // Fetch Stripe subscriptions (directly from Stripe API)
  useEffect(() => {
    const fetchStripeSubscriptions = async () => {
      setStripeSubscriptionsLoading(true)
      try {
        const res = await fetch(`/api/admin/clients/${clientId}/stripe-subscriptions`)
        if (res.ok) {
          const data = await res.json()
          setStripeSubscriptions(data.subscriptions || [])
        }
      } catch (error) {
        console.error('Failed to fetch Stripe subscriptions:', error)
      } finally {
        setStripeSubscriptionsLoading(false)
      }
    }
    fetchStripeSubscriptions()
  }, [clientId])

  // Fetch Stripe subscription history
  useEffect(() => {
    const fetchStripeHistory = async () => {
      setStripeHistoryLoading(true)
      try {
        const res = await fetch(`/api/admin/clients/${clientId}/stripe-subscription-history`)
        if (res.ok) {
          const data = await res.json()
          setStripeHistory(data.history || [])
        }
      } catch (error) {
        console.error('Failed to fetch Stripe history:', error)
      } finally {
        setStripeHistoryLoading(false)
      }
    }
    fetchStripeHistory()
  }, [clientId])

  // Fetch manual products
  const fetchManualProducts = async () => {
    setManualProductsLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/products`)
      if (res.ok) {
        const data = await res.json()
        setManualProducts(data.manual || [])
      }
    } catch (error) {
      console.error('Failed to fetch manual products:', error)
    } finally {
      setManualProductsLoading(false)
    }
  }

  useEffect(() => {
    fetchManualProducts()
  }, [clientId])

  // Fetch all products for the add product modal
  const fetchAvailableProducts = async () => {
    try {
      const res = await fetch('/api/admin/products')
      if (res.ok) {
        const data = await res.json()
        // Filter out products already assigned
        const assignedIds = new Set(manualProducts.map(p => p.productId))
        const subProductIds = new Set(subscriptions.flatMap(s => s.subscription_items.map(i => i.product?.id)))
        const available = data
          .filter((p: { id: string }) => !assignedIds.has(p.id) && !subProductIds.has(p.id))
          .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
        setAvailableProducts(available)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  // Add product to client
  const handleAddProduct = async () => {
    if (!selectedProductId) return
    setAddingProduct(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          notes: productNotes || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setManualProducts(prev => [data, ...prev])
        setShowAddProductModal(false)
        setSelectedProductId('')
        setProductNotes('')
      } else {
        alert(data.error || 'Failed to add product')
      }
    } catch (error) {
      console.error('Failed to add product:', error)
      alert('Failed to add product. Check console for details.')
    } finally {
      setAddingProduct(false)
    }
  }

  // Remove product from client
  const handleRemoveProduct = async (clientProductId: string) => {
    if (!confirm('Remove this product from the client?')) return
    setRemovingProductId(clientProductId)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/products?clientProductId=${clientProductId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setManualProducts(prev => prev.filter(p => p.id !== clientProductId))
      }
    } catch (error) {
      console.error('Failed to remove product:', error)
    } finally {
      setRemovingProductId(null)
    }
  }

  // Update product price
  const handleUpdatePrice = async (clientProductId: string) => {
    const price = parseFloat(editingPriceValue)
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price')
      return
    }
    setSavingPrice(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientProductId,
          monthlyPrice: price,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setManualProducts(prev => prev.map(p => p.id === clientProductId ? data : p))
        setEditingPriceId(null)
        setEditingPriceValue('')
      } else {
        alert(data.error || 'Failed to update price')
      }
    } catch (error) {
      console.error('Failed to update price:', error)
      alert('Failed to update price')
    } finally {
      setSavingPrice(false)
    }
  }

  // Fetch content stats
  useEffect(() => {
    const fetchContentStats = async () => {
      try {
        const res = await fetch(`/api/admin/clients/${clientId}/content-stats`)
        if (res.ok) {
          const data = await res.json()
          setContentStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch content stats:', error)
      }
    }
    fetchContentStats()
  }, [clientId])

  // Fetch available content products for upsell
  useEffect(() => {
    const fetchContentProducts = async () => {
      try {
        const res = await fetch(`/api/admin/products/content?clientId=${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setAvailableContentProducts(data.available || [])
        }
      } catch (error) {
        console.error('Failed to fetch content products:', error)
      }
    }
    fetchContentProducts()
  }, [clientId, subscriptions])

  // Fetch communications
  const refreshCommunications = async () => {
    setCommunicationsLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/communications`)
      if (res.ok) {
        const data = await res.json()
        setCommunications(data)
      }
    } catch (error) {
      console.error('Failed to fetch communications:', error)
    } finally {
      setCommunicationsLoading(false)
    }
  }

  useEffect(() => {
    refreshCommunications()
  }, [clientId])

  // Fetch Basecamp activities
  const fetchBasecampActivities = async () => {
    if (!clientId) return
    setActivitiesLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/activities`)
      if (res.ok) {
        const data = await res.json()
        setBasecampActivities(data)
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setActivitiesLoading(false)
    }
  }

  useEffect(() => {
    fetchBasecampActivities()
  }, [clientId])

  // Fetch invoices from Stripe
  const fetchInvoices = async () => {
    setInvoicesLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/invoices`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
        setStripeCustomer(data.customer || null)
        setStripeCustomerId(data.stripeCustomerId || null)
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    } finally {
      setInvoicesLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'recommendations' && recommendationsSubtab === 'current-services') {
      fetchInvoices()
    }
  }, [clientId, activeTab, recommendationsSubtab])

  // Close date dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (commDateDropdownRef.current && !commDateDropdownRef.current.contains(event.target as Node)) {
        setShowCommDateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle adding a product to the plan
  const handleAddProductToPlan = (product: ContentProduct) => {
    const cartItem = {
      id: product.id,
      productId: product.id,
      name: product.name,
      description: product.short_description || '',
      quantity: 1,
      monthlyPrice: Number(product.monthly_price) || 0,
      onetimePrice: Number(product.onetime_price) || 0,
      pricingType: 'monthly' as const,
      category: 'product',
      supportsQuantity: product.supports_quantity || false,
    }

    // Store in sessionStorage and navigate to checkout
    sessionStorage.setItem(`checkout_${clientId}_addon`, JSON.stringify([cartItem]))
    router.push(`/admin/checkout/${clientId}?tier=addon`)
  }

  // Toggle checklist item completion
  const handleChecklistToggle = async (itemId: string, isCompleted: boolean) => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      })
      if (res.ok) {
        const updated: ChecklistItem = await res.json()
        setChecklistItems(items =>
          items.map(item => item.id === itemId ? updated : item)
        )
      }
    } catch (error) {
      console.error('Failed to toggle checklist item:', error)
    }
  }

  // Sync checklist items with onboarding responses
  const handleSyncChecklist = async () => {
    setSyncingChecklist(true)
    setSyncMessage(null)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/checklist/sync`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        // Refresh the checklist
        const refreshRes = await fetch(`/api/admin/clients/${clientId}/checklist`)
        if (refreshRes.ok) {
          setChecklistItems(await refreshRes.json())
        }
        // Show result message
        if (data.synced > 0) {
          setSyncMessage(`${data.synced} item${data.synced > 1 ? 's' : ''} synced`)
        } else {
          setSyncMessage('All synced')
        }
        // Clear message after 3 seconds
        setTimeout(() => setSyncMessage(null), 3000)
      }
    } catch (error) {
      console.error('Failed to sync checklist:', error)
      setSyncMessage('Sync failed')
      setTimeout(() => setSyncMessage(null), 3000)
    } finally {
      setSyncingChecklist(false)
    }
  }

  // Handle resending invitation email
  const handleResendInvitation = async () => {
    if (!dbClient) return

    setIsResendingInvite(true)
    setResendMessage(null)

    try {
      const res = await fetch(`/api/admin/clients/${clientId}/resend-invite`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend invitation')
      }

      if (data.emailSent) {
        setResendMessage({
          type: 'success',
          text: `Invitation sent to ${data.recipientEmail}`,
        })
      } else {
        setResendMessage({
          type: 'error',
          text: data.emailError || 'Invitation created but email not sent',
        })
      }

      // Refresh communications
      const commsRes = await fetch(`/api/admin/clients/${clientId}/communications`)
      if (commsRes.ok) {
        setCommunications(await commsRes.json())
      }

      // Clear message after 5 seconds
      setTimeout(() => setResendMessage(null), 5000)
    } catch (error) {
      console.error('Failed to resend invitation:', error)
      setResendMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to resend invitation',
      })
      setTimeout(() => setResendMessage(null), 5000)
    } finally {
      setIsResendingInvite(false)
    }
  }

  // Handle sending result alert
  const handleSendResultAlert = async () => {
    if (!dbClient || !resultAlertSubject.trim() || !resultAlertMessage.trim()) return

    setIsSendingResultAlert(true)

    try {
      // Build metadata with optional structured data
      const metadata: Record<string, any> = {
        alertType: resultAlertType,
        alertTypeLabel: alertTypes[resultAlertType].label,
      }

      // Add keyword/position data if provided (supports multiple keywords)
      const validKeywords = resultAlertKeywords.filter(row => row.keyword.trim())
      if (validKeywords.length > 0) {
        metadata.keywords = validKeywords.map(row => ({
          keyword: row.keyword.trim(),
          newPosition: row.newPosition ? parseInt(row.newPosition) : null,
          previousPosition: row.prevPosition ? parseInt(row.prevPosition) : null,
        }))
        // Also store first keyword in legacy format for backward compatibility
        const first = validKeywords[0]
        metadata.keyword = first.keyword.trim()
        if (first.newPosition) {
          metadata.newPosition = parseInt(first.newPosition)
        }
        if (first.prevPosition) {
          metadata.previousPosition = parseInt(first.prevPosition)
        }
      }

      // Add milestone data if provided
      if (resultAlertMilestone.trim()) {
        metadata.milestone = resultAlertMilestone.trim()
      }

      const res = await fetch(`/api/admin/clients/${clientId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'result_alert',
          title: resultAlertSubject,
          subject: resultAlertSubject,
          body: resultAlertMessage,
          recipientEmail: dbClient.contact_email,
          highlightType: 'success',
          metadata,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send result alert')
      }

      // Close modal and reset fields
      setShowResultAlertModal(false)
      setResultAlertType('ranking')
      setResultAlertSubject('')
      setResultAlertMessage('')
      setResultAlertKeywords([{ keyword: '', newPosition: '', prevPosition: '' }])
      setResultAlertMilestone('')

      // Show success message
      setResendMessage({
        type: 'success',
        text: `Result alert sent to ${dbClient.contact_email}`,
      })
      setTimeout(() => setResendMessage(null), 5000)

      // Refresh communications
      const commsRes = await fetch(`/api/admin/clients/${clientId}/communications`)
      if (commsRes.ok) {
        setCommunications(await commsRes.json())
      }
    } catch (error) {
      console.error('Failed to send result alert:', error)
      setResendMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send result alert',
      })
      setTimeout(() => setResendMessage(null), 5000)
    } finally {
      setIsSendingResultAlert(false)
    }
  }

  // Content upsell products - matched to database
  const contentUpsellProducts = {
    contentWriting: {
      id: '9c1028ad-0eb0-45ad-8896-9f186a165034',
      name: 'Content Writing',
      description: 'SEO and AI-optimized content up to 1,000 words for your blog or website.',
      monthlyPrice: 99,
      onetimePrice: 0,
      pricingType: 'monthly' as const,
      category: 'growth',
    },
    aiCreativeAssets: {
      id: '1d16c9f5-2311-4082-96e0-29c436fd1064',
      name: 'AI Creative Assets',
      description: 'A monthly package of custom visuals to fuel your social media, ads, and website.',
      monthlyPrice: 299,
      onetimePrice: 0,
      pricingType: 'monthly' as const,
      category: 'growth',
    },
    businessBranding: {
      id: 'e1716d43-4453-4197-941c-35e412bc004a',
      name: 'Business Branding Foundation',
      description: 'The strategic foundation every business needs. Four essential documents that guide all your marketing efforts.',
      monthlyPrice: 99,
      onetimePrice: 899,
      pricingType: 'monthly' as const,
      category: 'root',
    },
  }

  // Handler for adding upsell item to cart and navigating to checkout
  const handleAddToCart = (productKey: keyof typeof contentUpsellProducts, pricingType: 'monthly' | 'onetime' = 'monthly') => {
    const product = contentUpsellProducts[productKey]
    const cartItem = {
      id: product.id,
      productId: product.id, // Required for onboarding form to find questions
      name: product.name,
      description: product.description,
      quantity: 1,
      monthlyPrice: product.monthlyPrice,
      onetimePrice: product.onetimePrice,
      pricingType: pricingType,
      category: product.category,
    }

    // Store in sessionStorage for checkout page
    sessionStorage.setItem(`checkout_${clientId}_upsell`, JSON.stringify([cartItem]))

    // Navigate to checkout
    router.push(`/admin/checkout/${clientId}?tier=upsell`)
  }

  // Derived client data from database or fallback
  // isActiveClient is true if client has active status OR has active subscriptions
  const hasSubscriptions = subscriptions.some(s => s.status === 'active' && s.subscription_items.length > 0)
  const isActiveClient = (dbClient && (dbClient.status === 'active' || dbClient.status === 'onboarding')) || hasSubscriptions

  // Determine which tabs should be active based on integrations and purchased products
  const hasResultsAccess = !!dbClient?.agency_dashboard_share_key
  const hasActivityAccess = !!dbClient?.basecamp_project_id
  const hasWebsiteAccess = !!dbClient?.landingsite_preview_url

  // Check purchased products from ACTIVE subscriptions only
  const activeSubscriptionProducts = Array.from(new Set(
    subscriptions
      .filter(sub => sub.status === 'active' && sub.subscription_items.length > 0)
      .flatMap(sub => sub.subscription_items)
      .map(item => (item.product?.name || item.bundle?.name || '').toLowerCase())
      .filter(Boolean)
  ))

  const websiteProducts = ['bloom site', 'seedling site', 'seed site', 'website care plan', 'wordpress care plan']
  const contentProducts = ['content writing', 'blog writing', 'social media', 'content marketing', 'ai creative', 'branding foundation']

  const hasWebsiteProducts = activeSubscriptionProducts.some(name =>
    websiteProducts.some(wp => name.includes(wp))
  )
  const hasContentProducts = activeSubscriptionProducts.some(name =>
    contentProducts.some(cp => name.includes(cp))
  )

  // Recommendation state - determines which template to show
  const hasActiveSubscriptions = subscriptions.some(s => s.status === 'active' && s.subscription_items.length > 0)
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active' && s.subscription_items.length > 0)
  const firstPurchaseDate = activeSubscriptions.length > 0
    ? activeSubscriptions.reduce((oldest, sub) =>
        new Date(sub.created_at || '') < new Date(oldest.created_at || '') ? sub : oldest
      ).created_at
    : null
  const daysSincePurchase = firstPurchaseDate
    ? Math.floor((new Date().getTime() - new Date(firstPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const daysUntilSmartRec = Math.max(0, 90 - daysSincePurchase)
  // 'pending' = not purchased, 'purchased' = purchased but < 90 days, 'smart_available' = 90+ days
  const recommendationState: 'pending' | 'purchased' | 'smart_available' =
    !hasActiveSubscriptions ? 'pending' :
    daysSincePurchase >= 90 ? 'smart_available' : 'purchased'

  // Generate website data only when preview URL is available in database
  const realWebsiteData = hasWebsiteAccess && dbClient ? {
    domain: `${dbClient.name.toLowerCase().replace(/\s+/g, '')}.com`,
    previewUrl: dbClient.landingsite_preview_url!,
    plan: 'Seed Site (AI-Built)', // TODO: Get from purchased products
    carePlan: 'Website Care Plan', // TODO: Get from purchased products
    status: 'active' as const,
    launchDate: 'Coming Soon', // TODO: Track actual launch date
    hosting: {
      provider: 'Landingsite.ai',
      uptime: '99.9%',
      lastUpdated: 'Jan 3, 2026',
    },
  } : undefined

  // Generate dummy edit requests for active clients
  const dummyEditRequests = isActiveClient ? [
    { id: 1, title: 'Update contact page hours', type: 'Content Update', status: 'completed' as RequestStatus, date: 'Jan 3, 2026' },
    { id: 2, title: 'Add new service page', type: 'New Feature', status: 'in-progress' as RequestStatus, date: 'Jan 2, 2026' },
    { id: 3, title: 'Fix mobile menu alignment', type: 'Bug Fix', status: 'completed' as RequestStatus, date: 'Dec 28, 2025' },
    { id: 4, title: 'Update footer contact info', type: 'Content Update', status: 'completed' as RequestStatus, date: 'Dec 20, 2025' },
  ] : undefined

  const client: ClientData = dbClient ? {
    id: dbClient.id,
    name: dbClient.name,
    initials: getInitials(dbClient.name),
    avatarColor: dbClient.avatar_color || getAvatarColor(dbClient.name),
    email: dbClient.contact_email || '',
    clientSince: formatDate(dbClient.created_at),
    status: (dbClient.status as 'active' | 'paused' | 'onboarding') || 'active',
    growthStage: (dbClient.growth_stage as 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting') || 'prospect',
    servicesCount: checklistItems.length > 0 ? Array.from(new Set(checklistItems.map(i => i.product.id))).length : 0,
    hasWebsite: hasWebsiteProducts,
    hasContent: hasContentProducts,
    websiteData: realWebsiteData,
    editRequests: dummyEditRequests,
    checklistProgress: isActiveClient ? { completed: 5, total: 6 } : { completed: 0, total: 6 },
  } : clients['tc-clinical'] // Fallback to hardcoded data while loading

  // Activity type and data
  type Activity = {
    id: number
    type: 'content' | 'alert' | 'task' | 'update'
    title: string
    description: string
    time: string
  }

  // Activity data - varies by client (dummy data for now)
  const activitiesByClient: Record<string, Activity[]> = {
    'tc-clinical': [
      { id: 1, type: 'content' as const, title: 'Content approved and published', description: '"January Services Update" blog post is now live on your website', time: 'Today, 3:30 PM' },
      { id: 2, type: 'alert' as const, title: 'Keyword reached Page 1!', description: '"precision wound care San Antonio" moved to position #7', time: 'Today, 2:45 PM' },
      { id: 3, type: 'content' as const, title: 'New content ready for review', description: '"Q1 2026 Marketing Goals" blog post submitted for your approval', time: 'Today, 11:00 AM' },
      { id: 4, type: 'task' as const, title: 'Monthly blog post published', description: '"5 Signs Your Wound Care Needs a Specialist" is now live', time: 'Today, 10:30 AM' },
      { id: 5, type: 'alert' as const, title: 'Traffic milestone: 2,500 visitors!', description: 'Monthly website traffic exceeded 2,500 unique visitors', time: 'Yesterday, 4:30 PM' },
      { id: 6, type: 'update' as const, title: 'Google Ads campaign optimized', description: 'Adjusted bid strategy based on conversion data', time: 'Yesterday, 3:00 PM' },
      { id: 7, type: 'task' as const, title: 'Google Business Profile updated', description: 'Added new photos and updated business hours', time: 'Yesterday, 11:15 AM' },
      { id: 8, type: 'task' as const, title: 'Website launched!', description: 'tc-clinicalservices.com is now live and indexed by Google', time: 'Dec 30, 4:00 PM' },
    ],
    'raptor-vending': [
      { id: 1, type: 'update' as const, title: 'Google Ads campaign launched', description: 'Search campaign now live targeting vending machine keywords', time: 'Today, 2:00 PM' },
      { id: 2, type: 'alert' as const, title: 'First lead received!', description: 'New lead from Google Ads: Office building in Austin', time: 'Today, 11:30 AM' },
      { id: 3, type: 'task' as const, title: 'Google Business Profile claimed', description: 'Business verified and profile optimized', time: 'Yesterday, 4:00 PM' },
      { id: 4, type: 'update' as const, title: 'Ad copy approved', description: 'Client approved Google Ads copy and extensions', time: 'Jan 3, 2026' },
      { id: 5, type: 'task' as const, title: 'Onboarding completed', description: 'Initial setup and strategy call completed', time: 'Jan 2, 2026' },
    ],
  }

  const activities: Activity[] = activitiesByClient[clientId] || activitiesByClient['tc-clinical']

  const filteredActivities = activities.filter(
    (activity: Activity) => activityFilter === 'all' || activity.type === activityFilter
  )

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'completed':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )
      case 'in-progress':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        )
      case 'pending':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        )
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <>
        <AdminHeader
          title="Client Details"
          user={{ name: 'Ryan Kelly', initials: 'RK' }}
          hasNotifications={true}
          breadcrumb={
            <>
              <Link href="/admin/clients">Clients</Link>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span>Loading...</span>
            </>
          }
        />
        <div className="admin-content">
          <div className="loading-state">
            <p>Loading client details...</p>
          </div>
        </div>
      </>
    )
  }

  // Show not found state
  if (!dbClient) {
    return (
      <>
        <AdminHeader
          title="Client Details"
          user={{ name: 'Ryan Kelly', initials: 'RK' }}
          hasNotifications={true}
          breadcrumb={
            <>
              <Link href="/admin/clients">Clients</Link>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span>Not Found</span>
            </>
          }
        />
        <div className="admin-content">
          <div className="no-results">
            <p>Client not found. <Link href="/admin/clients">Return to Clients</Link></p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Client Details"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
        breadcrumb={
          <>
            <Link href="/admin/clients">Clients</Link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span>{client.name}</span>
          </>
        }
        actions={
          <Link href={`/getting-started?viewingAs=${params.id}`} className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            View as Client
          </Link>
        }
      />

      <div className="admin-content">
        {/* Client Header Card */}
        <div className="client-header-card">
          <div className="client-header">
            <div className="client-info">
              <div className="client-avatar" style={{ background: client.avatarColor }}>{client.initials}</div>
              <div className="client-details">
                <h1>
                  {client.name}
                  {(() => {
                    // Use same logic as client list page - based on db status/growth_stage
                    const growthStage = dbClient?.growth_stage || 'prospect'
                    const isProspect = growthStage === 'prospect'
                    let displayStatus: 'active' | 'inactive' | 'paused' | 'prospect' = 'active'
                    if (dbClient?.status === 'inactive') {
                      displayStatus = 'inactive'
                    } else if (dbClient?.status === 'paused') {
                      displayStatus = 'paused'
                    } else if (dbClient?.status === 'pending' || isProspect) {
                      displayStatus = 'prospect'
                    }
                    const labels: Record<string, string> = {
                      active: 'Active',
                      inactive: 'Inactive',
                      paused: 'Paused',
                      prospect: 'Prospect',
                    }
                    return (
                      <span className={`status-badge ${displayStatus}`}>
                        {labels[displayStatus]}
                      </span>
                    )
                  })()}
                </h1>
                <p className="client-meta">
                  {client.email}
                  {(() => {
                    const activeSubscriptions = subscriptions.filter(s => s.status === 'active' && s.subscription_items.length > 0)
                    if (activeSubscriptions.length > 0) {
                      const oldestSub = activeSubscriptions.reduce((oldest, sub) =>
                        new Date(sub.created_at || 0) < new Date(oldest.created_at || 0) ? sub : oldest
                      )
                      const date = new Date(oldestSub.created_at || 0)
                      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      return ` • Client since ${monthYear}`
                    } else if (dbClient?.created_at) {
                      const date = new Date(dbClient.created_at)
                      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      return ` • Prospect since ${monthYear}`
                    }
                    return ''
                  })()}
                  {' • '}
                  <span
                    className="services-link"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setActiveTab('recommendations')
                      setRecommendationsSubtab('current-services')
                    }}
                  >{subscriptions.flatMap(s => s.subscription_items).length} services</span>
                </p>
              </div>
            </div>
            <div className="header-actions">
              {resendMessage && (
                <span style={{
                  fontSize: '13px',
                  color: resendMessage.type === 'success' ? '#059669' : '#DC2626',
                  padding: '6px 12px',
                  background: resendMessage.type === 'success' ? '#E8F5E9' : '#FEE2E2',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {resendMessage.text}
                </span>
              )}
              {hasActiveSubscriptions && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowResultAlertModal(true)}
                  disabled={!dbClient?.contact_email}
                  title={!dbClient?.contact_email ? 'No contact email on file' : 'Send a result alert email to this client'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  Send Result Alert
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={handleResendInvitation}
                disabled={isResendingInvite || !recommendation || !dbClient?.contact_email}
                title={!dbClient?.contact_email ? 'No contact email on file' : !recommendation ? 'No recommendation to send' : 'Resend proposal invitation email'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                {isResendingInvite ? 'Sending...' : 'Resend Invitation'}
              </button>
              <button className="btn btn-primary" onClick={() => setShowEditModal(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                Edit Client
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button className={`tab-btn ${activeTab === 'getting-started' ? 'active' : ''}`} onClick={() => setActiveTab('getting-started')}>
            {hasActiveSubscriptions ? 'Getting Started' : 'Welcome'}
          </button>
          <button className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>
            Results
            {!hasActiveSubscriptions && <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
            {hasActiveSubscriptions && !hasResultsAccess && <span className="tab-badge coming-soon">Coming Soon</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
            Activity
            {!hasActiveSubscriptions && <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
            {hasActiveSubscriptions && !hasActivityAccess && <span className="tab-badge coming-soon">Coming Soon</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'website' ? 'active' : ''}`} onClick={() => setActiveTab('website')}>
            Website
            {!hasActiveSubscriptions && <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
            {hasActiveSubscriptions && hasWebsiteProducts && !hasWebsiteAccess && <span className="tab-badge coming-soon">Coming Soon</span>}
            {hasActiveSubscriptions && !hasWebsiteProducts && <span className="tab-badge inactive">Inactive</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>
            Content
            {!hasActiveSubscriptions && <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
            {hasActiveSubscriptions && hasContentProducts && !hasActivityAccess && <span className="tab-badge coming-soon">Coming Soon</span>}
            {hasActiveSubscriptions && !hasContentProducts && <span className="tab-badge inactive">Inactive</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>
            Recommendations
          </button>
          <button className={`tab-btn ${activeTab === 'communication' ? 'active' : ''}`} onClick={() => setActiveTab('communication')}>
            Communication
            {!hasActiveSubscriptions && <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
          </button>
        </div>

        {/* ==================== GETTING STARTED TAB ==================== */}
        {activeTab === 'getting-started' && (
          <>
            {!hasActiveSubscriptions ? (
              /* Pending Client Welcome View */
              <div className="pending-client-view">
                {/* Welcome Section */}
                <div className="welcome-hero">
                  <div className="welcome-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <h2>Welcome to Pyrus, {dbClient?.contact_name || dbClient?.name || 'Client'}!</h2>
                  <p>We&apos;ve prepared a personalized marketing proposal for {dbClient?.name}. Review your options and choose the plan that fits your goals.</p>
                </div>

                {/* Three Column Action Cards */}
                <div className="pending-action-grid three-col">
                  {/* View Recommendation Card */}
                  <div className="pending-action-card primary">
                    <div className="action-card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </div>
                    <h3>View Your Proposal</h3>
                    <p>We&apos;ve analyzed your business and prepared tailored marketing recommendations with transparent pricing.</p>
                    <Link
                      href={`/recommendations?viewingAs=${clientId}`}
                      className="btn btn-primary"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      Review Recommendations
                    </Link>
                  </div>

                  {/* Why Choose Pyrus Card */}
                  <div className="pending-action-card">
                    <div className="action-card-icon secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h3>Why Choose Pyrus?</h3>
                    <div className="benefits-list">
                      <div className="benefit-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>30-day money-back guarantee</span>
                      </div>
                      <div className="benefit-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Month-to-month, no contracts</span>
                      </div>
                      <div className="benefit-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>AI-powered marketing tools</span>
                      </div>
                      <div className="benefit-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Local business expertise</span>
                      </div>
                    </div>
                    <div className="tagline-small">Simple. Scalable. Results-driven.</div>
                  </div>

                  {/* What Happens Next Card */}
                  <div className="pending-action-card">
                    <div className="action-card-icon secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <h3>What Happens Next?</h3>
                    <div className="next-steps-list">
                      <div className="next-step">
                        <span className="step-num">1</span>
                        <span>Review your personalized proposal</span>
                      </div>
                      <div className="next-step">
                        <span className="step-num">2</span>
                        <span>Select a plan that fits your goals</span>
                      </div>
                      <div className="next-step">
                        <span className="step-num">3</span>
                        <span>Complete quick onboarding questions</span>
                      </div>
                      <div className="next-step">
                        <span className="step-num">4</span>
                        <span>We get to work growing your business!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
            {/* Getting Started Sub-tabs */}
            <div className="getting-started-subtabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className={`getting-started-subtab ${activeSubtab === 'questions' ? 'active' : ''}`}
                  onClick={() => setActiveSubtab('questions')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  Questions
                </button>
                <button
                  className={`getting-started-subtab ${activeSubtab === 'checklist' ? 'active' : ''}`}
                  onClick={() => setActiveSubtab('checklist')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Checklist
                </button>
                <button
                  className={`getting-started-subtab ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`}
                  onClick={() => setActiveSubtab('onboarding-summary')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Summary
                </button>
              </div>
              {activeSubtab === 'checklist' && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {resendMessage && (
                    <span style={{
                      fontSize: '13px',
                      color: resendMessage.type === 'success' ? '#059669' : '#DC2626',
                      padding: '4px 8px',
                      background: resendMessage.type === 'success' ? '#E8F5E9' : '#FEE2E2',
                      borderRadius: '4px',
                    }}>
                      {resendMessage.text}
                    </span>
                  )}
                  {recommendation && (
                    <button
                      onClick={handleResendInvitation}
                      disabled={isResendingInvite || !dbClient?.contact_email}
                      className="getting-started-subtab"
                      title={!dbClient?.contact_email ? 'No contact email on file' : 'Resend proposal invitation email'}
                      style={{ opacity: isResendingInvite || !dbClient?.contact_email ? 0.6 : 1 }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                      {isResendingInvite ? 'Sending...' : 'Resend Invitation'}
                    </button>
                  )}
                  <button
                    onClick={handleSyncChecklist}
                    disabled={syncingChecklist || !!syncMessage}
                    className="getting-started-subtab"
                    title="Re-sync checklist with onboarding responses"
                    style={{ opacity: syncingChecklist ? 0.6 : 1 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    {syncMessage || (syncingChecklist ? 'Syncing...' : 'Sync')}
                  </button>
                </div>
              )}
            </div>

            {/* Questions Tab Content */}
            <div className={`gs-tab-content ${activeSubtab === 'questions' ? 'active' : ''}`} id="questions">
              {onboardingFormLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: 40, height: 40 }}></div>
                </div>
              ) : onboardingForm?.hasProducts && onboardingForm.questions.length > 0 ? (
                <div className="onboarding-questions" style={{ maxWidth: '800px' }}>
                  {/* Progress Header */}
                  <div className="questions-card" style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600, color: '#1A1F16' }}>Onboarding Questions</h3>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>View and manage client onboarding responses</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#324438' }}>
                            {onboardingForm.progress.percent}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {onboardingForm.progress.answered} of {onboardingForm.progress.total} completed
                          </div>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#E5E7EB', borderRadius: '3px', marginTop: '1rem' }}>
                        <div style={{ width: `${onboardingForm.progress.percent}%`, height: '100%', background: '#22C55E', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Questions by Section */}
                  {Object.entries(onboardingForm.grouped).map(([section, questions]) => (
                    <div key={section} className="questions-card" style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '1.5rem' }}>
                      <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1A1F16' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          {section}
                        </h3>
                      </div>
                      <div style={{ padding: '1.5rem' }}>
                        {questions.map((q) => (
                          <div key={q.id} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #F3F4F6' }}>
                            <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block', color: '#374151' }}>
                              {q.questionText}
                              {q.isRequired && <span style={{ color: '#DC2626', marginLeft: '4px' }}>*</span>}
                            </label>
                            {q.helpText && (
                              <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.5rem' }}>{q.helpText}</p>
                            )}
                            <div style={{
                              padding: '0.75rem',
                              background: q.response ? '#F0FDF4' : '#F9FAFB',
                              borderRadius: '8px',
                              border: q.response ? '1px solid #BBF7D0' : '1px solid #E5E7EB',
                            }}>
                              {q.response ? (
                                <span style={{ color: '#166534', fontSize: '0.875rem' }}>
                                  {q.response.text || (q.response.options && q.response.options.join(', ')) || 'Answered'}
                                </span>
                              ) : (
                                <span style={{ color: '#9CA3AF', fontSize: '0.875rem', fontStyle: 'italic' }}>Not answered yet</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="inactive-service-container">
                  <div className="inactive-service-card">
                    <div className="inactive-service-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="48" height="48">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <h3>No Onboarding Questions</h3>
                    <p>
                      {onboardingForm?.hasProducts === false
                        ? `${dbClient?.name} doesn't have any active services yet. Onboarding questions will appear here once they have purchased services.`
                        : `No onboarding question templates have been configured for ${dbClient?.name}'s services. Add question templates in Settings to see them here.`
                      }
                    </p>
                    <div className="inactive-service-info" style={{ marginTop: '1.5rem' }}>
                      <h4>What you&apos;ll see here:</h4>
                      <ul>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Business information and goals
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Target audience details
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Brand preferences and guidelines
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Service-specific requirements
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Checklist Tab Content */}
            <div className={`gs-tab-content ${activeSubtab === 'checklist' ? 'active' : ''}`} id="checklist">
              <div className="onboarding-grid">
                <div className="checklist-card">
                  <div className="checklist-header">
                    <h3>Onboarding Checklist</h3>
                    <p>Complete these steps to get the most from your marketing</p>
                    {checklistItems.length > 0 && (
                      <div className="progress-bar-container">
                        <div className="progress-bar-label">
                          <span>Progress</span>
                          <span>{checklistItems.filter(i => i.isCompleted).length} of {checklistItems.length} completed</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${checklistItems.length > 0
                                ? (checklistItems.filter(i => i.isCompleted).length / checklistItems.length) * 100
                                : 0}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="checklist-items">
                    {checklistLoading ? (
                      <div className="checklist-loading">Loading checklist...</div>
                    ) : checklistItems.length === 0 ? (
                      <div className="checklist-empty">
                        <p>No checklist items yet. Items will appear here after purchase.</p>
                      </div>
                    ) : (
                      checklistItems.map((item) => (
                        <div
                          key={item.id}
                          className={`checklist-item ${item.isCompleted ? 'completed' : ''}`}
                          onClick={() => handleChecklistToggle(item.id, item.isCompleted)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className={`checklist-checkbox ${item.isCompleted ? 'completed' : ''}`}>
                            {item.isCompleted && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                          <div className="checklist-item-content">
                            <div className="checklist-item-title">{item.title}</div>
                            <div className="checklist-item-desc">
                              {item.isCompleted && item.completedAt
                                ? `Completed ${new Date(item.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                : item.description || `From ${item.product.name}`
                              }
                            </div>
                          </div>
                          {item.actionType === 'link' && item.actionUrl && !item.isCompleted && (
                            <div className="checklist-item-action" onClick={(e) => e.stopPropagation()}>
                              <a href={item.actionUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                                {item.actionLabel || 'Open'}
                              </a>
                            </div>
                          )}
                          {item.actionType === 'button' && !item.isCompleted && (
                            <div className="checklist-item-action" onClick={(e) => e.stopPropagation()}>
                              <button className="btn btn-secondary">{item.actionLabel || 'Action'}</button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="sidebar-card video-sidebar">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      Getting Started Videos
                    </h4>
                    {videoChapters.length > 0 ? (
                      <>
                        <div className="video-player-wrapper" style={{ position: 'relative', paddingTop: '56.25%', background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                          {(() => {
                            const activeChapter = videoChapters.find(c => c.id === activeVideoChapter)
                            return activeChapter?.videoUrl ? (
                              <iframe
                                src={activeChapter.videoUrl}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                allowFullScreen
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                              />
                            ) : null
                          })()}
                        </div>
                        <div className="video-chapter-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {videoChapters.map((chapter, index) => (
                            <button
                              key={chapter.id}
                              onClick={() => setActiveVideoChapter(chapter.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                background: activeVideoChapter === chapter.id ? 'rgba(136, 84, 48, 0.08)' : 'transparent',
                                border: activeVideoChapter === chapter.id ? '1px solid rgba(136, 84, 48, 0.2)' : '1px solid transparent',
                                borderRadius: '8px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                width: '100%',
                              }}
                            >
                              <span style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: activeVideoChapter === chapter.id ? '#885430' : '#E8EDEA',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: activeVideoChapter === chapter.id ? 'white' : '#5A6358',
                                flexShrink: 0,
                              }}>{index + 1}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#1A1F16', marginBottom: '0.125rem' }}>{chapter.title}</span>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#5A6358', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chapter.description}</span>
                              </div>
                              {activeVideoChapter === chapter.id && (
                                <svg viewBox="0 0 24 24" fill="#885430" width="14" height="14" style={{ flexShrink: 0, marginTop: '0.25rem' }}>
                                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="video-container">
                        <div className="video-placeholder">
                          <div className="video-play-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                          </div>
                        </div>
                        <p className="video-caption">Videos coming soon! Learn how to navigate your portal and get the most from your marketing partnership.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Onboarding Summary Tab Content */}
            <div className={`gs-tab-content ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`} id="onboarding-summary">
              <div className="onboarding-summary">
                {/* Client Info Section - from database */}
                <div className="summary-section">
                  <h3 className="summary-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Client Info
                  </h3>
                  <div className="summary-grid">
                    <div className="summary-field">
                      <label>Contact Name</label>
                      <span>{dbClient?.contact_name || 'Not provided'}</span>
                    </div>
                    <div className="summary-field">
                      <label>Company</label>
                      <span>{dbClient?.name || 'Not provided'}</span>
                    </div>
                    <div className="summary-field">
                      <label>Email</label>
                      <span>{dbClient?.contact_email || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Onboarding Responses */}
                {summaryLoading ? (
                  <div className="summary-section">
                    <p>Loading onboarding responses...</p>
                  </div>
                ) : onboardingSummary && Object.keys(onboardingSummary).length > 0 ? (
                  Object.entries(onboardingSummary).map(([section, responses]) => (
                    <div key={section} className="summary-section">
                      <h3 className="summary-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        {section}
                      </h3>
                      <div className="summary-content">
                        {responses.map((response) => (
                          <div key={response.id} className="summary-field full-width">
                            <label>{response.question}</label>
                            <span>{response.answer || 'Not answered'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="summary-section">
                    <p style={{ color: '#6B7280', fontStyle: 'italic' }}>No onboarding responses yet. The client will complete the onboarding form after checkout.</p>
                  </div>
                )}
              </div>
            </div>
              </>
            )}
          </>
        )}

        {/* ==================== RESULTS TAB ==================== */}
        {activeTab === 'results' && (
          <div className="results-content">
            {hasResultsAccess ? (
              /* Active Results - use shared ResultsView component */
              <ResultsView clientId={clientId} isAdmin={true} />
            ) : checklistItems.length > 0 ? (
              /* Service purchased but not yet activated */
              <div className="coming-soon-placeholder">
                <div className="coming-soon-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </div>
                <h2>Results Coming Soon</h2>
                <p>We&apos;re setting up {dbClient?.name}&apos;s analytics dashboard. Marketing performance metrics, keyword rankings, and lead tracking will appear here once campaigns are active.</p>
                <div className="coming-soon-timeline">
                  <div className="timeline-item">
                    <div className="timeline-dot active"></div>
                    <span>Account setup complete</span>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-dot pending"></div>
                    <span>Campaign configuration in progress</span>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-dot pending"></div>
                    <span>Analytics dashboard connection</span>
                  </div>
                </div>
              </div>
            ) : (
              /* No service - Upsell */
              <div className="inactive-service-container">
                <div className="inactive-service-card">
                  <div className="inactive-service-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                  </div>
                  <h3>Results Dashboard Not Active</h3>
                  <p>This client does not currently have marketing services. Activate a marketing plan to track their website performance, SEO rankings, and lead generation.</p>

                  <div className="inactive-service-actions">
                    <button className="btn btn-primary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                      </svg>
                      Create Recommendation
                    </button>
                    <button className="btn btn-secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                      </svg>
                      View Marketing Plans
                    </button>
                  </div>
                </div>

                <div className="inactive-service-info">
                  <h4>Marketing Services Include:</h4>
                  <ul>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      SEO optimization and keyword tracking
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Google Ads management
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Website analytics and reporting
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Lead generation tracking
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Monthly performance reports
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== ACTIVITY TAB ==================== */}
        {activeTab === 'activity' && (
          <div className="activity-content">
            <ActivityView clientId={clientId} isAdmin={true} clientName={dbClient?.name} />
          </div>
        )}

        {/* ==================== WEBSITE TAB ==================== */}
        {activeTab === 'website' && (
          <div className="website-tab-content">
            <WebsiteView clientId={clientId} isAdmin={true} clientName={dbClient?.name} />
          </div>
        )}

        {/* ==================== CONTENT TAB ==================== */}
        {activeTab === 'content' && (
          <div className="content-manager-tab">
            {hasContentProducts && hasActivityAccess ? (
              /* Active Content - has content products AND Basecamp configured */
              <ContentView clientId={clientId} isAdmin={true} />
            ) : hasContentProducts && !hasActivityAccess ? (
              /* Content Purchased - show active state with placeholder data */
              <>
                {/* Content Stats - matching prototype exactly */}
                <div className="content-stats">
                  <div className={`content-stat-card ${contentStats?.urgentReviews ? 'urgent' : ''}`}>
                    <div className="stat-label">Urgent Reviews</div>
                    <div className="stat-value">{contentStats?.urgentReviews ?? '--'}</div>
                    <div className="stat-desc">Less than 24 hours</div>
                  </div>
                  <div className="content-stat-card">
                    <div className="stat-label">Pending Approval</div>
                    <div className="stat-value">{contentStats?.pendingApproval ?? '--'}</div>
                    <div className="stat-desc">Awaiting your review</div>
                  </div>
                  <div className="content-stat-card">
                    <div className="stat-label">Approved</div>
                    <div className="stat-value">{contentStats?.approved ?? '--'}</div>
                    <div className="stat-desc">Ready for publishing</div>
                  </div>
                  <div className="content-stat-card">
                    <div className="stat-label">Published</div>
                    <div className="stat-value">{contentStats?.published ?? '--'}</div>
                    <div className="stat-desc">Live content</div>
                  </div>
                </div>

                {/* Content Actions Bar - matching prototype */}
                <div className="content-actions-bar" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={() => setShowContentRequirementsModal(true)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      View Content Requirements
                    </button>
                    <div className="content-plan-inline">
                      <span className="plan-inline-label">Your Plan:</span>
                      {(() => {
                        const contentItems = subscriptions.flatMap(sub => sub.subscription_items)
                          .filter(item => {
                            const name = (item.product?.name || item.bundle?.name || '').toLowerCase()
                            return contentProducts.some(cp => name.includes(cp))
                          })
                        // Combine items with same name and sum quantities
                        const combinedItems: { name: string; totalQty: number }[] = []
                        contentItems.forEach(item => {
                          const name = item.product?.name || item.bundle?.name || ''
                          const qty = item.quantity || 1
                          const existing = combinedItems.find(ci => ci.name === name)
                          if (existing) {
                            existing.totalQty += qty
                          } else {
                            combinedItems.push({ name, totalQty: qty })
                          }
                        })
                        return combinedItems.length > 0 ? (
                          combinedItems.map((item, index) => {
                            // Show quantity for Content Writing since it's configurable
                            const displayName = item.name.toLowerCase().includes('content writing')
                              ? `(${item.totalQty}) ${item.name}`
                              : item.name
                            return (
                              <span key={item.name}>
                                {index > 0 && <span className="plan-inline-divider">•</span>}
                                <span className="plan-inline-item">{displayName}</span>
                              </span>
                            )
                          })
                        ) : (
                          <span className="plan-inline-item">No content services yet</span>
                        )
                      })()}
                    </div>
                  </div>
                  {/* Upsell buttons for products not purchased - right side */}
                  {availableContentProducts.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {availableContentProducts.map(product => {
                        // Determine color and icon based on product
                        const isWriting = product.name.toLowerCase().includes('writing')
                        const isCreative = product.name.toLowerCase().includes('creative')
                        const isBranding = product.name.toLowerCase().includes('branding')

                        const buttonStyle = isWriting
                          ? { background: '#7C3AED', borderColor: '#7C3AED', color: 'white' }
                          : isCreative
                            ? { background: '#F59E0B', borderColor: '#F59E0B', color: 'white' }
                            : isBranding
                              ? { background: '#0EA5E9', borderColor: '#0EA5E9', color: 'white' }
                              : {}

                        return (
                          <button
                            key={product.id}
                            className="btn"
                            style={buttonStyle}
                            onClick={() => {
                              setSelectedProduct(product)
                              setShowProductModal(true)
                            }}
                          >
                            {isWriting && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                              </svg>
                            )}
                            {isCreative && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                              </svg>
                            )}
                            {isBranding && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                <path d="M2 17l10 5 10-5"></path>
                                <path d="M2 12l10 5 10-5"></path>
                              </svg>
                            )}
                            Add {product.name.replace('Business ', '').replace(' Assets', '')}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Content Tabs - matching prototype */}
                <div className="results-subtabs">
                  <button
                    className={`results-subtab ${contentSubtab === 'review' ? 'active' : ''}`}
                    onClick={() => setContentSubtab('review')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Content Review
                  </button>
                  <button
                    className={`results-subtab ${contentSubtab === 'files' ? 'active' : ''}`}
                    onClick={() => setContentSubtab('files')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Files
                  </button>
                </div>

                {/* Content Review Tab */}
                {contentSubtab === 'review' && (
                  <>
                    {/* Content Filters - aligned right */}
                    <div className="content-filters" style={{ marginBottom: '1rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline btn-sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        Search
                      </button>
                      <button className="btn btn-outline btn-sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Sort by Date
                      </button>
                    </div>

                    {/* Coming Soon Message */}
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
                      <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="32" height="32">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                      </div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1F2937', marginBottom: '0.5rem' }}>Content Coming Soon</h3>
                      <p style={{ color: '#6B7280', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                        Your content team is getting started on your first pieces. You&apos;ll be notified when content is ready for review.
                      </p>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#DEF7EC', color: '#03543F', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '500' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Content service active
                      </div>
                    </div>
                  </>
                )}

                {/* Files Tab */}
                {contentSubtab === 'files' && (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
                    <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="32" height="32">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1F2937', marginBottom: '0.5rem' }}>No Files Yet</h3>
                    <p style={{ color: '#6B7280', maxWidth: '400px', margin: '0 auto' }}>
                      Files from your content team will appear here. This includes brand assets, documents, images, and videos.
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Upsell - no content products purchased */
              <div className="content-upsell-container">
                {/* Hero Section */}
                <div className="content-hero">
                  <div className="content-hero-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                      <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                      <path d="M2 2l7.586 7.586"></path>
                      <circle cx="11" cy="11" r="2"></circle>
                    </svg>
                  </div>
                  <h2 className="content-hero-title">Content is the Engine Behind Your Growth</h2>
                  <p className="content-hero-subtitle">
                    Every successful marketing channel depends on quality content. Without it, your SEO stalls,
                    social media falls flat, and paid ads underperform.
                  </p>
                </div>

                {/* Visual Hub Diagram */}
                <div className="content-hub-section">
                  <div className="content-hub-diagram">
                    {/* Center Hub */}
                    <div className="hub-center">
                      <div className="hub-center-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" width="32" height="32">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                      </div>
                      <span>Content</span>
                    </div>

                    {/* Connecting Lines */}
                    <svg className="hub-connections" viewBox="0 0 400 320">
                      <path d="M 200 150 Q 120 100 60 70" stroke="#8B5CF6" strokeWidth="3" fill="none" strokeDasharray="8 4" className="hub-line" />
                      <path d="M 200 150 Q 280 100 340 70" stroke="#22C55E" strokeWidth="3" fill="none" strokeDasharray="8 4" className="hub-line" />
                      <path d="M 200 150 L 200 295" stroke="#F59E0B" strokeWidth="3" fill="none" strokeDasharray="8 4" className="hub-line" />
                    </svg>

                    {/* Spoke: SEO */}
                    <div className="hub-spoke spoke-seo">
                      <div className="spoke-icon seo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <circle cx="11" cy="11" r="8"></circle>
                          <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                      </div>
                      <div className="spoke-content">
                        <span className="spoke-title">SEO</span>
                        <span className="spoke-desc">Blog posts, landing pages, meta content</span>
                      </div>
                    </div>

                    {/* Spoke: Social Media */}
                    <div className="hub-spoke spoke-social">
                      <div className="spoke-icon social">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                        </svg>
                      </div>
                      <div className="spoke-content">
                        <span className="spoke-title">Social Media</span>
                        <span className="spoke-desc">Posts, images, videos, brand assets</span>
                      </div>
                    </div>

                    {/* Spoke: Paid Ads */}
                    <div className="hub-spoke spoke-ads">
                      <div className="spoke-icon ads">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="3" y1="9" x2="21" y2="9"></line>
                          <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                      </div>
                      <div className="spoke-content">
                        <span className="spoke-title">Paid Advertising</span>
                        <span className="spoke-desc">Ad copy, creative assets, landing pages</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Offerings */}
                <div className="content-offerings-section">
                  <h3 className="offerings-title">Our Content Solutions</h3>
                  <p className="offerings-subtitle">Professional content that powers every marketing channel</p>

                  <div className="content-offerings-grid">
                    {/* Content Writing */}
                    <div className="content-offering-card">
                      <div className="offering-header">
                        <div className="offering-icon writing">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                            <path d="M2 2l7.586 7.586"></path>
                            <circle cx="11" cy="11" r="2"></circle>
                          </svg>
                        </div>
                        <div className="offering-price-tag">
                          <span className="price">$99</span>
                          <span className="per">per article</span>
                        </div>
                      </div>
                      <h4 className="offering-title">Content Writing</h4>
                      <p className="offering-description">
                        SEO and AI-optimized content up to 1,000 words for your blog or website.
                        Each piece is crafted to rank and convert.
                      </p>
                      <div className="offering-powers">
                        <span className="powers-label">Powers:</span>
                        <div className="powers-tags">
                          <span className="power-tag seo">SEO Rankings</span>
                          <span className="power-tag social">Blog Strategy</span>
                        </div>
                      </div>
                      <ul className="offering-features">
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Keyword-optimized for search
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          AI-enhanced for engagement
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Up to 1,000 words
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          One round of revisions
                        </li>
                      </ul>
                      <button className="btn btn-secondary" onClick={() => handleAddToCart('contentWriting')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add to Plan
                      </button>
                    </div>

                    {/* AI Creative Assets */}
                    <div className="content-offering-card featured">
                      <div className="offering-badge">Best Value</div>
                      <div className="offering-header">
                        <div className="offering-icon creative">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                        </div>
                        <div className="offering-price-tag">
                          <span className="price">$299</span>
                          <span className="per">/month</span>
                        </div>
                      </div>
                      <h4 className="offering-title">AI Creative Assets</h4>
                      <p className="offering-description">
                        A monthly package of custom visuals to fuel your social media, ads, and website
                        with scroll-stopping content.
                      </p>
                      <div className="offering-powers">
                        <span className="powers-label">Powers:</span>
                        <div className="powers-tags">
                          <span className="power-tag social">Social Media</span>
                          <span className="power-tag ads">Paid Ads</span>
                        </div>
                      </div>
                      <ul className="offering-features">
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          4 custom AI-generated images
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          1 short-form AI animated video
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          10 curated premium stock images
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          10 curated premium stock videos
                        </li>
                      </ul>
                      <button className="btn btn-primary" onClick={() => handleAddToCart('aiCreativeAssets')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add to Plan
                      </button>
                    </div>

                    {/* Business Branding Foundation */}
                    <div className="content-offering-card">
                      <div className="offering-header">
                        <div className="offering-icon branding">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                          </svg>
                        </div>
                        <div className="offering-price-tag">
                          <span className="price">$99</span>
                          <span className="per">/month</span>
                          <span className="price-alt">or $899 one-time</span>
                        </div>
                      </div>
                      <h4 className="offering-title">Business Branding Foundation</h4>
                      <p className="offering-description">
                        The strategic foundation every business needs. Four essential documents that
                        guide all your marketing efforts.
                      </p>
                      <div className="offering-powers">
                        <span className="powers-label">Powers:</span>
                        <div className="powers-tags">
                          <span className="power-tag seo">SEO</span>
                          <span className="power-tag social">Social</span>
                          <span className="power-tag ads">Ads</span>
                        </div>
                      </div>
                      <ul className="offering-features">
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Strategic Positioning &amp; Brand Framework
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Brand Messaging &amp; Go-To-Market Playbook
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Competitive Comparison Analysis
                        </li>
                        <li>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Brand Color Guidelines
                        </li>
                      </ul>
                      <button className="btn btn-secondary" onClick={() => handleAddToCart('businessBranding')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add to Plan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== COMMUNICATION TAB ==================== */}
        {activeTab === 'communication' && (
          <CommunicationView
            clientId={clientId}
            isAdmin={true}
            clientName={dbClient?.name}
            communications={communications}
            communicationsLoading={communicationsLoading}
            onRefresh={refreshCommunications}
          />
        )}

        {/* ==================== RECOMMENDATIONS TAB ==================== */}
        {activeTab === 'recommendations' && (
          <RecommendationsView
            clientId={clientId}
            isAdmin={true}
            clientName={dbClient?.name}
            dbClient={dbClient}
            recommendation={recommendation}
            recommendationLoading={recommendationLoading}
            subscriptions={subscriptions}
            subscriptionsLoading={subscriptionsLoading}
            stripeSubscriptions={stripeSubscriptions}
            stripeSubscriptionsLoading={stripeSubscriptionsLoading}
            manualProducts={manualProducts}
            manualProductsLoading={manualProductsLoading}
            isActiveClient={isActiveClient}
            stripeHistory={stripeHistory}
            stripeHistoryLoading={stripeHistoryLoading}
            invoices={invoices}
            invoicesLoading={invoicesLoading}
            stripeCustomerId={stripeCustomerId}
          />
        )}

      </div>

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="edit-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal-content edit-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </div>
                <div>
                  <h2>Edit Client</h2>
                  <p className="modal-subtitle">Update client information and settings</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="modal-tabs">
              <button
                className={`modal-tab ${editModalTab === 'general' ? 'active' : ''}`}
                onClick={() => setEditModalTab('general')}
              >
                General
              </button>
              <button
                className={`modal-tab ${editModalTab === 'integrations' ? 'active' : ''}`}
                onClick={() => setEditModalTab('integrations')}
              >
                Integrations
              </button>
              <button
                className={`modal-tab ${editModalTab === 'billing' ? 'active' : ''}`}
                onClick={() => setEditModalTab('billing')}
              >
                Billing
              </button>
              <button
                className={`modal-tab ${editModalTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setEditModalTab('notifications')}
              >
                Notifications
              </button>
            </div>

            <div className="modal-body">
              {editModalTab === 'general' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="companyName">Company Name</label>
                      <input
                        type="text"
                        id="companyName"
                        className="form-control"
                        value={editFormData.companyName}
                        onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="status">Status</label>
                      <select
                        id="status"
                        className="form-control"
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as 'active' | 'paused' | 'onboarding' })}
                      >
                        <option value="active">Active</option>
                        <option value="onboarding">Onboarding</option>
                        <option value="paused">Paused</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="primaryContact">Primary Contact Name</label>
                      <input
                        type="text"
                        id="primaryContact"
                        className="form-control"
                        value={editFormData.primaryContact}
                        onChange={(e) => setEditFormData({ ...editFormData, primaryContact: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        className="form-control"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        className="form-control"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="website">Website</label>
                      <input
                        type="url"
                        id="website"
                        className="form-control"
                        value={editFormData.website}
                        onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Growth Stage</label>
                    <div className="growth-stage-options">
                      {(['seedling', 'sprouting', 'blooming', 'harvesting'] as const).map((stage) => (
                        <button
                          key={stage}
                          type="button"
                          className={`growth-stage-btn ${editFormData.growthStage === stage ? 'active' : ''}`}
                          onClick={() => setEditFormData({ ...editFormData, growthStage: stage })}
                        >
                          {stage.charAt(0).toUpperCase() + stage.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Avatar Color</label>
                    <div className="color-picker-grid">
                      {avatarColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`color-picker-option ${editFormData.avatarColor === color.value ? 'selected' : ''}`}
                          style={{ background: color.value }}
                          onClick={() => setEditFormData({ ...editFormData, avatarColor: color.value })}
                          title={color.name}
                        >
                          {editFormData.avatarColor === color.value && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="internalNotes">Internal Notes</label>
                    <textarea
                      id="internalNotes"
                      className="form-control"
                      rows={4}
                      value={editFormData.internalNotes}
                      onChange={(e) => setEditFormData({ ...editFormData, internalNotes: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label htmlFor="referredBy">Referred By</label>
                      <input
                        type="text"
                        id="referredBy"
                        className="form-control"
                        value={editFormData.referredBy}
                        onChange={(e) => setEditFormData({ ...editFormData, referredBy: e.target.value })}
                        placeholder="Name of referrer"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="referralSource">Referral Source</label>
                      <select
                        id="referralSource"
                        className="form-control"
                        value={editFormData.referralSource}
                        onChange={(e) => setEditFormData({ ...editFormData, referralSource: e.target.value })}
                      >
                        <option value="">Select source...</option>
                        <option value="client">Existing Client</option>
                        <option value="partner">Partner</option>
                        <option value="employee">Employee</option>
                        <option value="website">Website</option>
                        <option value="social">Social Media</option>
                        <option value="event">Event</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {editModalTab === 'integrations' && (
                <>
                  <p className="form-section-desc" style={{ marginBottom: '1.5rem', color: '#6B7280' }}>
                    Connect external services to enable features like Results dashboard and Activity feed.
                  </p>

                  <div className="form-group">
                    <label htmlFor="agencyDashboardShareKey">Agency Dashboard Share Key</label>
                    <input
                      type="text"
                      id="agencyDashboardShareKey"
                      className="form-control"
                      placeholder="e.g., MjI5MTgtfC00NDUyMC18LXJPN0xveFpTQmM="
                      value={editFormData.agencyDashboardShareKey}
                      onChange={(e) => setEditFormData({ ...editFormData, agencyDashboardShareKey: e.target.value })}
                    />
                    <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
                      From agencydashboard.io campaign share link. Enables the Results tab.
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="basecampProjectId">Basecamp Project ID</label>
                    <input
                      type="text"
                      id="basecampProjectId"
                      className="form-control"
                      placeholder="e.g., 43126663"
                      value={editFormData.basecampProjectId}
                      onChange={(e) => setEditFormData({ ...editFormData, basecampProjectId: e.target.value })}
                    />
                    <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
                      From URL: 3.basecamp.com/5202430/projects/<strong>[this number]</strong>. Enables Activity tab.
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="stripeCustomerId">Stripe Customer ID</label>
                    <input
                      type="text"
                      id="stripeCustomerId"
                      className="form-control"
                      placeholder="e.g., cus_ABC123..."
                      value={editFormData.stripeCustomerId}
                      onChange={(e) => setEditFormData({ ...editFormData, stripeCustomerId: e.target.value })}
                    />
                    <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
                      Links invoices and billing from Stripe. Find in Stripe Dashboard → Customers.
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="landsitePreviewUrl">Landingsite Preview URL</label>
                    <input
                      type="url"
                      id="landsitePreviewUrl"
                      className="form-control"
                      placeholder="e.g., https://app.landingsite.ai/website-preview?id=..."
                      value={editFormData.landsitePreviewUrl}
                      onChange={(e) => setEditFormData({ ...editFormData, landsitePreviewUrl: e.target.value })}
                    />
                    <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
                      For Seedling Site (AI-built website) preview in Website tab.
                    </small>
                  </div>
                </>
              )}

              {editModalTab === 'billing' && (
                <>
                  <div className="form-group">
                    <label htmlFor="billingEmail">Billing Contact Email</label>
                    <input
                      type="email"
                      id="billingEmail"
                      className="form-control"
                      value={editFormData.billingEmail}
                      onChange={(e) => setEditFormData({ ...editFormData, billingEmail: e.target.value })}
                      readOnly={!!stripeBillingEmail}
                      style={stripeBillingEmail ? { backgroundColor: '#F9FAFB' } : {}}
                    />
                    {stripeBillingEmail && (
                      <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
                        From Stripe customer record.{' '}
                        <a
                          href={`https://dashboard.stripe.com/customers/${dbClient?.stripe_customer_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2563EB' }}
                        >
                          Edit in Stripe
                        </a>
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Payment Methods</label>
                    {paymentMethodsLoading ? (
                      <div className="payment-method-display" style={{ opacity: 0.6 }}>
                        <div className="payment-method-info">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                          </svg>
                          <span>Loading...</span>
                        </div>
                      </div>
                    ) : !dbClient?.stripe_customer_id ? (
                      <div className="payment-method-display" style={{ background: '#F9FAFB', border: '1px dashed #D1D5DB' }}>
                        <div className="payment-method-info" style={{ color: '#6B7280' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                          </svg>
                          <span>No Stripe customer linked</span>
                        </div>
                      </div>
                    ) : paymentMethods.length === 0 ? (
                      <div className="payment-method-display" style={{ background: '#FEF3C7', border: '1px solid #F59E0B' }}>
                        <div className="payment-method-info" style={{ color: '#92400E' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </svg>
                          <span>No payment method on file</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {paymentMethods.map(pm => (
                          <div key={pm.id} className="payment-method-display" style={pm.isDefault ? { borderColor: '#10B981' } : {}}>
                            <div className="payment-method-info">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                <line x1="1" y1="10" x2="23" y2="10"></line>
                              </svg>
                              <span>
                                {pm.card ? (
                                  <>
                                    {pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)} •••• {pm.card.last4}
                                    <span style={{ color: '#6B7280', marginLeft: '0.5rem' }}>
                                      Exp {pm.card.expMonth.toString().padStart(2, '0')}/{pm.card.expYear.toString().slice(-2)}
                                    </span>
                                  </>
                                ) : pm.usBankAccount ? (
                                  <>
                                    {pm.usBankAccount.bankName} •••• {pm.usBankAccount.last4}
                                    <span style={{ color: '#6B7280', marginLeft: '0.5rem' }}>
                                      {pm.usBankAccount.accountType.charAt(0).toUpperCase() + pm.usBankAccount.accountType.slice(1)}
                                    </span>
                                  </>
                                ) : pm.link ? (
                                  <>
                                    Stripe Link ({pm.link.email})
                                  </>
                                ) : (
                                  pm.type
                                )}
                              </span>
                              {pm.isDefault && (
                                <span style={{
                                  background: '#D1FAE5',
                                  color: '#065F46',
                                  padding: '0.125rem 0.5rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  marginLeft: '0.5rem',
                                }}>Default</span>
                              )}
                            </div>
                            {dbClient?.stripe_customer_id && (
                              <a
                                href={`https://dashboard.stripe.com/customers/${dbClient.stripe_customer_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="payment-update-btn"
                                style={{ textDecoration: 'none' }}
                              >
                                Manage in Stripe
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="billingCycle">Billing Cycle</label>
                    <select
                      id="billingCycle"
                      className="form-control"
                      value={editFormData.billingCycle}
                      onChange={(e) => setEditFormData({ ...editFormData, billingCycle: e.target.value as 'monthly' | 'quarterly' | 'annually' })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>
                </>
              )}

              {editModalTab === 'notifications' && (
                <div className="notification-toggles">
                  <div className="notification-toggle-item">
                    <div className="notification-toggle-info">
                      <div className="notification-toggle-title">Monthly Reports</div>
                      <div className="notification-toggle-desc">Send automated monthly performance reports</div>
                    </div>
                    <div className="edit-toggle-wrap">
                      <input
                        type="checkbox"
                        checked={editFormData.monthlyReports}
                        onChange={(e) => setEditFormData({ ...editFormData, monthlyReports: e.target.checked })}
                      />
                      <span className="edit-toggle-track"></span>
                    </div>
                  </div>

                  <div className="notification-toggle-item">
                    <div className="notification-toggle-info">
                      <div className="notification-toggle-title">Result Alerts</div>
                      <div className="notification-toggle-desc">Notify when significant milestones are achieved</div>
                    </div>
                    <div className="edit-toggle-wrap">
                      <input
                        type="checkbox"
                        checked={editFormData.resultAlerts}
                        onChange={(e) => setEditFormData({ ...editFormData, resultAlerts: e.target.checked })}
                      />
                      <span className="edit-toggle-track"></span>
                    </div>
                  </div>

                  <div className="notification-toggle-item">
                    <div className="notification-toggle-info">
                      <div className="notification-toggle-title">Recommendation Updates</div>
                      <div className="notification-toggle-desc">Notify when new recommendations are available</div>
                    </div>
                    <div className="edit-toggle-wrap">
                      <input
                        type="checkbox"
                        checked={editFormData.recommendationUpdates}
                        onChange={(e) => setEditFormData({ ...editFormData, recommendationUpdates: e.target.checked })}
                      />
                      <span className="edit-toggle-track"></span>
                    </div>
                  </div>

                  <div className="notification-toggle-item">
                    <div className="notification-toggle-info">
                      <div className="notification-toggle-title">Weekly Digest</div>
                      <div className="notification-toggle-desc">Send weekly summary of activity and results</div>
                    </div>
                    <div className="edit-toggle-wrap">
                      <input
                        type="checkbox"
                        checked={editFormData.weeklyDigest}
                        onChange={(e) => setEditFormData({ ...editFormData, weeklyDigest: e.target.checked })}
                      />
                      <span className="edit-toggle-track"></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveClient} disabled={isSaving}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Requirements Modal */}
      {showContentRequirementsModal && (
        <div className="modal-overlay active" onClick={() => setShowContentRequirementsModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-header-icon" style={{ background: '#DBEAFE', color: '#2563EB' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <div>
                  <h2 className="modal-title">Content Requirements</h2>
                  <p className="modal-subtitle">Guidelines for reviewing and approving content</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowContentRequirementsModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="requirements-content">
                <div className="requirements-intro">
                  <p>To ensure your content meets quality standards and can be published quickly, please review the following requirements and guidelines.</p>
                </div>

                <div className="requirements-section">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Review Timeline
                  </h3>
                  <div className="timeline-items">
                    <div className="timeline-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>Content must be reviewed within <strong>48 hours</strong> of submission</span>
                    </div>
                    <div className="timeline-item urgent">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <span>Urgent content (marked red) requires review within <strong>24 hours</strong></span>
                    </div>
                    <div className="timeline-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>After approval, content will be published within <strong>1-2 business days</strong></span>
                    </div>
                  </div>
                </div>

                <div className="requirements-section">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    Content Types
                  </h3>
                  <div className="content-types-grid">
                    <div className="content-type-item">
                      <span className="platform-badge website">Website Content</span>
                      <p>Blog posts, service pages, landing pages, and website copy updates</p>
                    </div>
                    <div className="content-type-item">
                      <span className="platform-badge gbp">Google Business Profile</span>
                      <p>Business updates, posts, offers, and event announcements</p>
                    </div>
                    <div className="content-type-item">
                      <span className="platform-badge social">Social Posts</span>
                      <p>Facebook, Instagram, and LinkedIn posts with captions and hashtags</p>
                    </div>
                    <div className="content-type-item">
                      <span className="platform-badge ai-creative">AI Creative</span>
                      <p>AI-generated graphics, banners, social images, and promotional visuals</p>
                    </div>
                  </div>
                </div>

                <div className="requirements-section">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Approval Guidelines
                  </h3>
                  <div className="checklist-items-modal">
                    <div className="checklist-item-modal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Verify all facts, dates, and contact information are accurate</span>
                    </div>
                    <div className="checklist-item-modal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Check that pricing and promotional details are correct</span>
                    </div>
                    <div className="checklist-item-modal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Ensure brand voice and tone are consistent</span>
                    </div>
                    <div className="checklist-item-modal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Review for spelling and grammatical errors</span>
                    </div>
                    <div className="checklist-item-modal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Confirm all links and calls-to-action are appropriate</span>
                    </div>
                  </div>
                </div>

                <div className="requirements-section">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    Rejection Process
                  </h3>
                  <div className="process-items">
                    <div className="process-item">
                      <span className="process-number">1</span>
                      <span>If content needs changes, click <strong>&quot;Reject&quot;</strong> and provide specific feedback</span>
                    </div>
                    <div className="process-item">
                      <span className="process-number">2</span>
                      <span>Our team will revise and resubmit within <strong>24-48 hours</strong></span>
                    </div>
                    <div className="process-item">
                      <span className="process-number">3</span>
                      <span>You&apos;ll receive a notification when revised content is ready for review</span>
                    </div>
                  </div>
                </div>

                <div className="requirements-section">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Need Help?
                  </h3>
                  <p className="help-text">If you have questions about any content or need to discuss changes before approval, use the <strong>chat widget</strong> in the bottom right corner of your screen to message our team directly.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowContentRequirementsModal(false)}>Got It</button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showProductModal && selectedProduct && (
        <div className="modal-overlay active" onClick={() => setShowProductModal(false)}>
          <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-header-icon" style={{
                  background: selectedProduct.name.toLowerCase().includes('writing') ? '#F3E8FF'
                    : selectedProduct.name.toLowerCase().includes('creative') ? '#FEF3C7'
                    : selectedProduct.name.toLowerCase().includes('branding') ? '#E0F2FE'
                    : '#F3F4F6',
                  color: selectedProduct.name.toLowerCase().includes('writing') ? '#7C3AED'
                    : selectedProduct.name.toLowerCase().includes('creative') ? '#F59E0B'
                    : selectedProduct.name.toLowerCase().includes('branding') ? '#0EA5E9'
                    : '#6B7280'
                }}>
                  {selectedProduct.name.toLowerCase().includes('writing') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  )}
                  {selectedProduct.name.toLowerCase().includes('creative') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  )}
                  {selectedProduct.name.toLowerCase().includes('branding') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="M2 17l10 5 10-5"></path>
                      <path d="M2 12l10 5 10-5"></path>
                    </svg>
                  )}
                  {!selectedProduct.name.toLowerCase().includes('writing') && !selectedProduct.name.toLowerCase().includes('creative') && !selectedProduct.name.toLowerCase().includes('branding') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="modal-title">{selectedProduct.name}</h2>
                  <p className="modal-subtitle">
                    {Number(selectedProduct.monthly_price) > 0
                      ? `$${Number(selectedProduct.monthly_price).toLocaleString()}/month`
                      : Number(selectedProduct.onetime_price) > 0
                        ? `$${Number(selectedProduct.onetime_price).toLocaleString()} one-time`
                        : 'Contact for pricing'}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowProductModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="product-detail-content">
                {selectedProduct.short_description && (
                  <p className="product-short-desc" style={{ fontSize: '1rem', color: '#374151', marginBottom: '1.5rem' }}>
                    {selectedProduct.short_description}
                  </p>
                )}

                {selectedProduct.long_description && (
                  <div className="product-long-desc" style={{ color: '#4B5563', lineHeight: '1.6' }}>
                    {selectedProduct.long_description.split('\n').map((para, i) => (
                      <p key={i} style={{ marginBottom: '1rem' }}>{para}</p>
                    ))}
                  </div>
                )}

                {!selectedProduct.long_description && (
                  <div className="product-features" style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                      What&apos;s Included:
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {selectedProduct.name.toLowerCase().includes('writing') && (
                        <>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Professional blog posts and articles
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            SEO-optimized website copy
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Editing and proofreading
                          </li>
                        </>
                      )}
                      {selectedProduct.name.toLowerCase().includes('creative') && (
                        <>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            AI-generated graphics and images
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Social media visuals and graphics
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Promotional banners and ad creatives
                          </li>
                        </>
                      )}
                      {selectedProduct.name.toLowerCase().includes('branding') && (
                        <>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Logo design and refinement
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Brand color palette and typography
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4B5563' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Brand guidelines document
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowProductModal(false)
                  handleAddProductToPlan(selectedProduct)
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add to Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Result Alert Modal */}
      {showResultAlertModal && (
        <div className="modal-overlay active" onClick={() => setShowResultAlertModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-header-icon" style={{ background: alertTypes[resultAlertType].bgColor, color: alertTypes[resultAlertType].color }}>
                  {alertTypes[resultAlertType].icon}
                </div>
                <div>
                  <h2 className="modal-title">Send Result Alert</h2>
                  <p className="modal-subtitle">Share exciting marketing wins with {dbClient?.name || 'the client'}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowResultAlertModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              {/* Alert Type Selection */}
              <div className="form-group">
                <label className="form-label">What type of win are you sharing?</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                  {(Object.keys(alertTypes) as Array<keyof typeof alertTypes>).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setResultAlertType(type)
                        if (!resultAlertSubject || Object.values(alertTypes).some(t => t.defaultSubject === resultAlertSubject)) {
                          setResultAlertSubject(alertTypes[type].defaultSubject)
                        }
                        // Clear all type-specific fields when switching to prevent cross-contamination
                        setResultAlertKeywords([{ keyword: '', newPosition: '', prevPosition: '' }])
                        setResultAlertMilestone('')
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '16px 12px',
                        border: resultAlertType === type ? `2px solid ${alertTypes[type].color}` : '2px solid var(--border-color)',
                        borderRadius: '12px',
                        background: resultAlertType === type ? alertTypes[type].bgColor : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ color: alertTypes[type].color }}>
                        {alertTypes[type].icon}
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: resultAlertType === type ? 600 : 500,
                        color: resultAlertType === type ? alertTypes[type].color : 'var(--text-secondary)',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}>
                        {alertTypes[type].label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Recipient</label>
                  <input
                    type="text"
                    className="form-input"
                    value={dbClient?.contact_email || ''}
                    disabled
                    style={{ background: '#f9fafb' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject Line</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={alertTypes[resultAlertType].defaultSubject}
                    value={resultAlertSubject}
                    onChange={(e) => setResultAlertSubject(e.target.value)}
                  />
                </div>
              </div>

              {/* Optional Keyword/Position fields for ranking alerts */}
              {(resultAlertType === 'ranking' || resultAlertType === 'traffic') && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                      Keyword Rankings (Optional)
                    </div>
                    <button
                      type="button"
                      onClick={addKeywordRow}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#166534',
                        background: '#D1FAE5',
                        border: '1px solid #A7F3D0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add Keyword
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {resultAlertKeywords.map((row, index) => (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          {index === 0 && <label className="form-label" style={{ fontSize: '11px' }}>Keyword</label>}
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g., wound care san antonio"
                            value={row.keyword}
                            onChange={(e) => updateKeywordRow(index, 'keyword', e.target.value)}
                            style={{ fontSize: '13px' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          {index === 0 && <label className="form-label" style={{ fontSize: '11px' }}>New Pos.</label>}
                          <input
                            type="number"
                            className="form-input"
                            placeholder="7"
                            value={row.newPosition}
                            onChange={(e) => updateKeywordRow(index, 'newPosition', e.target.value)}
                            style={{ fontSize: '13px' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          {index === 0 && <label className="form-label" style={{ fontSize: '11px' }}>Prev Pos.</label>}
                          <input
                            type="number"
                            className="form-input"
                            placeholder="24"
                            value={row.prevPosition}
                            onChange={(e) => updateKeywordRow(index, 'prevPosition', e.target.value)}
                            style={{ fontSize: '13px' }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeKeywordRow(index)}
                          disabled={resultAlertKeywords.length === 1}
                          style={{
                            width: '32px',
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'transparent',
                            border: '1px solid #E5E7EB',
                            borderRadius: '6px',
                            cursor: resultAlertKeywords.length === 1 ? 'not-allowed' : 'pointer',
                            opacity: resultAlertKeywords.length === 1 ? 0.4 : 1,
                            color: '#6B7280',
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Milestone field for milestone alerts */}
              {resultAlertType === 'milestone' && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400E', marginBottom: '12px' }}>
                    Highlight Box (Optional)
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Milestone Achievement</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., 10,000 Monthly Visitors!"
                      value={resultAlertMilestone}
                      onChange={(e) => setResultAlertMilestone(e.target.value)}
                      style={{ fontSize: '13px' }}
                    />
                  </div>
                </div>
              )}

              {/* Optional Highlight field for leads alerts */}
              {resultAlertType === 'leads' && (
                <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#5B21B6', marginBottom: '12px' }}>
                    Highlight Box (Optional)
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Lead Highlight</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., 15 New Leads This Week!"
                      value={resultAlertMilestone}
                      onChange={(e) => setResultAlertMilestone(e.target.value)}
                      style={{ fontSize: '13px' }}
                    />
                  </div>
                </div>
              )}

              {/* Optional Highlight field for other alerts */}
              {resultAlertType === 'other' && (
                <div style={{ background: '#FDF2F8', border: '1px solid #FBCFE8', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#9D174D', marginBottom: '12px' }}>
                    Highlight Box (Optional)
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Highlight Text</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Campaign Launch Complete!"
                      value={resultAlertMilestone}
                      onChange={(e) => setResultAlertMilestone(e.target.value)}
                      style={{ fontSize: '13px' }}
                    />
                  </div>
                </div>
              )}

              {/* Optional Highlight field for AI alerts */}
              {resultAlertType === 'ai' && (
                <div style={{ background: '#ECFEFF', border: '1px solid #A5F3FC', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0E7490', marginBottom: '12px' }}>
                    Highlight Box (Optional)
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>AI Insight</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., 3 New Keyword Opportunities Identified"
                      value={resultAlertMilestone}
                      onChange={(e) => setResultAlertMilestone(e.target.value)}
                      style={{ fontSize: '13px' }}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  className="form-textarea"
                  placeholder={alertTypes[resultAlertType].placeholder}
                  rows={4}
                  value={resultAlertMessage}
                  onChange={(e) => setResultAlertMessage(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Preview Card */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '16px',
                marginTop: '8px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Email Preview
                </div>
                <div style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: alertTypes[resultAlertType].bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: alertTypes[resultAlertType].color,
                    }}>
                      {alertTypes[resultAlertType].icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
                        {resultAlertSubject || alertTypes[resultAlertType].defaultSubject}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        From: Pyrus Digital Media
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {resultAlertMessage || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Your message will appear here...</span>}
                  </div>

                  {/* Preview highlight box */}
                  {(resultAlertKeywords.some(row => row.keyword.trim()) || resultAlertMilestone) && (
                    <div style={{
                      marginTop: '16px',
                      padding: '14px 16px',
                      background: `linear-gradient(135deg, ${alertTypes[resultAlertType].bgColor} 0%, ${alertTypes[resultAlertType].bgColor}dd 100%)`,
                      borderLeft: `4px solid ${alertTypes[resultAlertType].color}`,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: alertTypes[resultAlertType].color,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <div style={{ transform: 'scale(0.75)' }}>
                          {alertTypes[resultAlertType].icon}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        {resultAlertKeywords.filter(row => row.keyword.trim()).map((row, idx) => (
                          <div key={idx} style={{ marginBottom: idx < resultAlertKeywords.filter(r => r.keyword.trim()).length - 1 ? '12px' : 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                              &quot;{row.keyword}&quot; — Now Position #{row.newPosition || '?'}
                            </div>
                            {row.prevPosition && row.newPosition && (
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Moved from position #{row.prevPosition} to #{row.newPosition} (up {parseInt(row.prevPosition) - parseInt(row.newPosition)} spots!)
                                {parseInt(row.newPosition) <= 10 && ' - First page visibility achieved'}
                              </div>
                            )}
                          </div>
                        ))}
                        {resultAlertMilestone && (
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                            {resultAlertMilestone}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowResultAlertModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSendResultAlert}
                disabled={isSendingResultAlert || !resultAlertSubject.trim() || !resultAlertMessage.trim()}
                style={{ background: alertTypes[resultAlertType].color }}
              >
                {isSendingResultAlert ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16 }}></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    Send {alertTypes[resultAlertType].label} Alert
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="modal-overlay active" onClick={() => setShowAddProductModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Add Product to Client</h2>
              <button className="modal-close" onClick={() => setShowAddProductModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#6B7280', marginBottom: '1rem' }}>
                Manually assign a product to this client. This is for clients who haven&apos;t gone through the standard purchase flow.
              </p>
              <div className="form-group">
                <label htmlFor="product-select">Select Product</label>
                <select
                  id="product-select"
                  className="form-input"
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                >
                  <option value="">Choose a product...</option>
                  {availableProducts.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.category})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="product-notes">Notes (optional)</label>
                <textarea
                  id="product-notes"
                  className="form-input"
                  value={productNotes}
                  onChange={e => setProductNotes(e.target.value)}
                  placeholder="e.g., Transferred from legacy system, Comp'd for beta testing"
                  rows={2}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddProductModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddProduct}
                disabled={!selectedProductId || addingProduct}
              >
                {addingProduct ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

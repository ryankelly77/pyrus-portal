/**
 * Types for the Client Detail Page (/admin/clients/[id])
 * These types are specific to the client detail page UI and data structures
 */

// ============================================================================
// TAB & NAVIGATION TYPES
// ============================================================================

export type MainTab = 'getting-started' | 'results' | 'activity' | 'website' | 'content' | 'communication' | 'recommendations'

export type GettingStartedSubtab = 'questions' | 'checklist' | 'onboarding-summary'
export type ResultsSubtab = 'overview' | 'pro-dashboard'
export type RecommendationsSubtab = 'smart-recommendations' | 'original-plan' | 'current-services'
export type ActivityFilter = 'all' | 'task' | 'update' | 'alert' | 'content'

// ============================================================================
// CLIENT & DATABASE TYPES
// ============================================================================

/**
 * Extended database client interface with all fields used in client detail page
 * This extends the base DBClient with additional website and integration fields
 */
export interface ClientPageDBClient {
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
  start_date: string | null
  // Integration fields
  agency_dashboard_share_key: string | null
  basecamp_id: string | null
  basecamp_project_id: string | null
  landingsite_preview_url: string | null
  stripe_customer_id: string | null
  // Website fields
  website_url: string | null
  hosting_type: 'ai_site' | 'pyrus_hosted' | 'client_hosted' | null
  hosting_provider: string | null
  website_provider: 'pear' | 'pyrus' | 'other' | null
  website_launch_date: string | null
  uptimerobot_monitor_id: string | null
  // Onboarding
  onboarding_completed_at: string | null
  // Content approval workflow settings
  content_approval_mode: 'full_approval' | 'initial_approval' | 'auto' | null
  approval_threshold: number | null
}

export type RequestStatus = 'completed' | 'in-progress' | 'pending'

export interface EditRequest {
  id: number
  title: string
  type: string
  status: RequestStatus
  date: string
}

export interface ClientData {
  id: string
  name: string
  initials: string
  avatarColor: string
  email: string
  clientSince: string
  status: 'active' | 'paused' | 'onboarding' | 'test' | 'prospect'
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

// ============================================================================
// CHECKLIST & ONBOARDING TYPES
// ============================================================================

export interface ChecklistItem {
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

export interface OnboardingResponse {
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

export interface OnboardingSummary {
  [section: string]: OnboardingResponse[]
}

export interface OnboardingQuestion {
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

export interface OnboardingFormData {
  questions: OnboardingQuestion[]
  grouped: Record<string, OnboardingQuestion[]>
  hasProducts: boolean
  progress: {
    answered: number
    total: number
    percent: number
  }
}

export interface VideoChapter {
  id: string
  title: string
  description: string
  videoUrl: string
}

// ============================================================================
// RECOMMENDATION TYPES
// ============================================================================

export interface RecommendationItem {
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
    long_description: string | null
  } | null
  bundle: {
    id: string
    name: string
    description: string | null
    long_description: string | null
    monthly_price: string | null
    onetime_price: string | null
  } | null
  addon: {
    id: string
    name: string
    description: string | null
    long_description: string | null
    price: string | null
  } | null
}

export interface RecommendationHistory {
  id: string
  action: string
  details: string | null
  created_at: string
  created_by: string | null
}

export interface Recommendation {
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

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

export interface SubscriptionItem {
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

export interface SubscriptionHistory {
  id: string
  action: string
  details: string | null
  created_at: string | null
  created_by: string | null
}

export interface Subscription {
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
export interface StripeSubscriptionItem {
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

export interface StripeSubscription {
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
export interface StripeHistoryEvent {
  id: string
  type: string
  action: string
  details: string
  date: string
  products?: string[]
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface ManualProduct {
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

export interface TestProduct {
  id: string
  product_id: string
  name: string
  category: string
  monthly_price: number
}

export interface ContentProduct {
  id: string
  name: string
  short_description: string | null
  long_description: string | null
  category: string
  monthly_price: string | null
  onetime_price: string | null
  supports_quantity: boolean | null
}

export interface AvailableProduct {
  id: string
  name: string
  category: string
}

export interface Service {
  name: string
  quantity: number
  details?: string
}

// ============================================================================
// ACTIVITY TYPES
// ============================================================================

export interface BasecampActivity {
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

export interface Activity {
  id: number
  type: 'content' | 'alert' | 'task' | 'update'
  title: string
  description: string
  time: string
}

// ============================================================================
// COMMUNICATION TYPES
// ============================================================================

export interface Communication {
  id: string
  clientId: string
  type: string  // 'email_invite', 'email_reminder', 'email_highlevel', 'result_alert', 'sms', 'chat', etc.
  title: string
  subject: string | null
  body: string | null
  status: string | null  // 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'
  metadata: Record<string, unknown> | null
  highlightType: string | null  // 'success' | 'failed' | null
  recipientEmail: string | null
  openedAt: string | null
  clickedAt: string | null
  sentAt: string | null
  createdAt: string | null
  source?: 'database' | 'highlevel'
  direction?: 'inbound' | 'outbound'
}

export interface CommForExport {
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

// ============================================================================
// BILLING TYPES
// ============================================================================

export interface PaymentMethod {
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

export interface InvoiceLine {
  id: string
  description: string | null
  amount: number
  quantity: number | null
  period: { start: string; end: string } | null
}

export interface Invoice {
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

export interface StripeCustomer {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  created: string | null
  balance: number
  currency: string
  defaultPaymentMethod: string | null
}

// ============================================================================
// RESULT ALERT TYPES
// ============================================================================

export interface KeywordRow {
  keyword: string
  newPosition: string
  prevPosition: string
}

export type ResultAlertType = 'ranking' | 'traffic' | 'leads' | 'milestone' | 'other' | 'ai'

export interface AlertTypeConfig {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
  defaultSubject: string
  placeholder: string
}

// ============================================================================
// EDIT FORM TYPES
// ============================================================================

export interface EditFormData {
  companyName: string
  status: 'active' | 'paused' | 'onboarding' | 'test' | 'prospect'
  primaryContact: string
  email: string
  phone: string
  growthStage: 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting'
  internalNotes: string
  referredBy: string
  referralSource: string
  avatarColor: string
  // Website
  websiteUrl: string
  hostingType: '' | 'ai_site' | 'pyrus_hosted' | 'client_hosted'
  hostingProvider: string
  websiteProvider: '' | 'pear' | 'pyrus' | 'other'
  websiteLaunchDate: string
  uptimerobotMonitorId: string
  // Integrations
  agencyDashboardShareKey: string
  basecampProjectId: string
  stripeCustomerId: string
  // Billing
  billingEmail: string
  paymentMethod: string
  billingCycle: 'monthly' | 'quarterly' | 'annually'
  // Notifications
  monthlyReports: boolean
  resultAlerts: boolean
  recommendationUpdates: boolean
  weeklyDigest: boolean
  // Content approval workflow
  contentApprovalMode: 'full_approval' | 'initial_approval' | 'auto'
  approvalThreshold: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const AVATAR_COLORS = [
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
] as const

export type AvatarColor = typeof AVATAR_COLORS[number]

import { z } from 'zod'
import { CLIENT_STATUSES } from '@/lib/constants/status'

export const clientCreateSchema = z.object({
  name: z.string().min(1).max(255),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  growthStage: z.string().nullable().optional(),
  status: z.enum(CLIENT_STATUSES as unknown as [string, ...string[]]).optional(),
  notes: z.string().nullable().optional(),
  basecampProjectId: z.string().nullable().optional(),
  dashboardToken: z.string().nullable().optional(),
  stripeCustomerId: z.string().nullable().optional(),
})

export const clientUpdateSchema = clientCreateSchema.partial()

// Service schema for content/website services
export const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  details: z.string().optional(),
})

export const productCreateSchema = z.object({
  name: z.string().min(1).max(255),
  shortDesc: z.string().nullable().optional(),
  longDesc: z.string().nullable().optional(),
  category: z.string().min(1).max(100),
  status: z.string().nullable().optional(),
  monthlyPrice: z.preprocess((v) => (v === '' ? null : Number(v)), z.number().nullable().optional()),
  onetimePrice: z.preprocess((v) => (v === '' ? null : Number(v)), z.number().nullable().optional()),
  supportsQuantity: z.boolean().optional(),
  stripeProductId: z.string().nullable().optional(),
  stripeMonthlyPriceId: z.string().nullable().optional(),
  stripeOnetimePriceId: z.string().nullable().optional(),
  dependencies: z.array(z.string()).nullable().optional(),
  sortOrder: z.number().nullable().optional(),
  includesContent: z.boolean().optional(),
  contentServices: z.array(serviceSchema).nullable().optional(),
  includesWebsite: z.boolean().optional(),
  websiteServices: z.array(serviceSchema).nullable().optional(),
})

export const bundleCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  monthlyPrice: z.preprocess((v) => (v === '' ? null : Number(v)), z.number().nullable().optional()),
  onetimePrice: z.preprocess((v) => (v === '' ? null : Number(v)), z.number().nullable().optional()),
  status: z.string().nullable().optional(),
  stripeProductId: z.string().nullable().optional(),
  stripePriceId: z.string().nullable().optional(),
  products: z.array(z.string()).nullable().optional(),
})

export const recommendationItemSchema = z.object({
  productId: z.string().nullable().optional(),
  bundleId: z.string().nullable().optional(),
  addonId: z.string().nullable().optional(),
  quantity: z.number().optional(),
  monthlyPrice: z.preprocess((v) => (v === '' ? 0 : Number(v)), z.number().optional()),
  onetimePrice: z.preprocess((v) => (v === '' ? 0 : Number(v)), z.number().optional()),
  isFree: z.boolean().optional(),
  tierName: z.string().nullable().optional(),
})

export const recommendationCreateSchema = z.object({
  clientId: z.string().min(1),
  tierName: z.string().nullable().optional(),
  items: z.array(recommendationItemSchema).optional(),
  totalMonthly: z.preprocess((v) => (v === '' ? 0 : Number(v)), z.number().optional()),
  totalOnetime: z.preprocess((v) => (v === '' ? 0 : Number(v)), z.number().optional()),
  discountApplied: z.preprocess((v) => (v === '' ? 0 : Number(v)), z.number().optional()),
  notes: z.string().nullable().optional(),
})

export const notificationsReadSchema = z.object({
  notifications: z.array(z.object({ id: z.string(), type: z.string() })),
})

export const addonCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  price: z.preprocess((v) => (v === '' ? 0 : Number(v)), z.number()),
  status: z.string().nullable().optional(),
  stripeProductId: z.string().nullable().optional(),
  stripePriceId: z.string().nullable().optional(),
  products: z.array(z.string()).nullable().optional(),
})

export const subscriptionItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  quantity: z.number().int().min(1),
  monthlyPrice: z.preprocess((v) => Number(v), z.number().min(0)),
  onetimePrice: z.preprocess((v) => Number(v), z.number().min(0)),
  pricingType: z.enum(['monthly', 'onetime']).optional(),
  category: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  bundleId: z.string().nullable().optional(),
  addonId: z.string().nullable().optional(),
  isFree: z.boolean().optional(),
})

export const subscriptionCreateSchema = z.object({
  clientId: z.string().min(1),
  items: z.array(subscriptionItemSchema).min(1),
  tier: z.string().min(1),
  totalMonthly: z.preprocess((v) => Number(v), z.number().min(0)).optional(),
  stripeSubscriptionId: z.string().nullable().optional(),
  paymentIntentId: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  userRole: z.string().nullable().optional(),
})

export const contentCreateSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(1),
  contentType: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  bodyContent: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  urgent: z.boolean().optional(),
  deadline: z.string().nullable().optional(),
  targetKeyword: z.string().nullable().optional(),
  secondaryKeywords: z.string().nullable().optional(),
  wordCount: z.preprocess((v) => (v === null || v === '' ? null : Number(v)), z.number().nullable().optional()),
  seoOptimized: z.boolean().optional(),
  aiOptimized: z.boolean().optional(),
  status: z.string().nullable().optional(),
})

export const linkUserSchema = z.object({
  userEmail: z.string().email(),
  clientId: z.string().nullable().optional(),
  clientName: z.string().nullable().optional(),
})

export const communicationCreateSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  subject: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  metadata: z.any().nullable().optional(),
  highlightType: z.string().nullable().optional(),
  recipientEmail: z.string().email().nullable().optional(),
  createdBy: z.string().nullable().optional(),
})

export const checklistGenerateSchema = z.object({
  productIds: z.array(z.string()).min(1),
})

export const questionTemplateSchema = z.object({
  productId: z.string().min(1),
  questionText: z.string().min(1),
  questionType: z.enum(['text', 'textarea', 'select', 'multiselect', 'radio', 'checkbox', 'url', 'email', 'phone']),
  options: z.any().nullable().optional(),
  placeholder: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  isRequired: z.boolean().optional(),
  section: z.string().nullable().optional(),
  sortOrder: z.number().nullable().optional(),
})

export const checklistTemplateSchema = z.object({
  productId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  actionType: z.string().nullable().optional(),
  actionUrl: z.string().nullable().optional(),
  actionLabel: z.string().nullable().optional(),
  sortOrder: z.number().nullable().optional(),
  autoCompleteQuestionId: z.string().nullable().optional(),
  autoCompleteValues: z.string().nullable().optional(),
})

export const recommendationInviteSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().nullable().optional(),
  email: z.string().email(),
  message: z.string().nullable().optional(),
})

export const recommendationViewSchema = z.object({
  inviteId: z.string().min(1),
  viewedAt: z.string().nullable().optional(),
})

export const subscriptionHistorySchema = z.object({
  subscriptionId: z.string().min(1),
  action: z.string().min(1),
  details: z.string().nullable().optional(),
})

export const uploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().optional(),
  metadata: z.any().nullable().optional(),
})

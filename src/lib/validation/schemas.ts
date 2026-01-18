import { z } from 'zod'

export const clientCreateSchema = z.object({
  name: z.string().min(1).max(255),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  growthStage: z.string().nullable().optional(),
  status: z.enum(['active', 'paused', 'churned', 'prospect']).optional(),
  notes: z.string().nullable().optional(),
  basecampProjectId: z.string().nullable().optional(),
  dashboardToken: z.string().nullable().optional(),
  stripeCustomerId: z.string().nullable().optional(),
})

export const clientUpdateSchema = clientCreateSchema.partial()

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertCategory =
  | 'subscription_safeguard'
  | 'state_reset_blocked'
  | 'sync_failure'
  | 'api_error'
  | 'stripe_error'
  | 'auth_error'
  | 'data_integrity'

export interface AlertOptions {
  severity: AlertSeverity
  category: AlertCategory
  message: string
  metadata?: Record<string, unknown>
  sourceFile?: string
  clientId?: string
  userId?: string
}

/**
 * Log a system alert to the database
 * Use this for production monitoring of safeguard triggers, errors, and data integrity issues
 *
 * @example
 * // Log a subscription safeguard trigger
 * await logAlert({
 *   severity: 'warning',
 *   category: 'subscription_safeguard',
 *   message: 'Blocked duplicate subscription creation',
 *   clientId: 'abc-123',
 *   metadata: { existingSubscriptionId: 'sub_xxx' },
 *   sourceFile: 'create-subscription-from-setup/route.ts'
 * })
 */
export async function logAlert(options: AlertOptions): Promise<void> {
  const { severity, category, message, metadata, sourceFile, clientId, userId } = options

  try {
    await prisma.system_alerts.create({
      data: {
        severity,
        category,
        message,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
        source_file: sourceFile,
        client_id: clientId,
        user_id: userId,
      },
    })

    // Also log to console for immediate visibility in logs
    const logFn = severity === 'critical' ? console.error : severity === 'warning' ? console.warn : console.info
    logFn(`[ALERT:${severity.toUpperCase()}] [${category}] ${message}`, {
      clientId,
      metadata,
      sourceFile,
    })
  } catch (error) {
    // Don't let alert logging failures break the main flow
    console.error('Failed to log alert:', error, { options })
  }
}

/**
 * Quick helper for subscription safeguard alerts
 */
export async function logSubscriptionSafeguard(
  message: string,
  clientId?: string,
  metadata?: Record<string, unknown>,
  sourceFile?: string
): Promise<void> {
  await logAlert({
    severity: 'warning',
    category: 'subscription_safeguard',
    message,
    clientId,
    metadata,
    sourceFile,
  })
}

/**
 * Quick helper for state reset blocked alerts
 */
export async function logStateResetBlocked(
  message: string,
  clientId?: string,
  metadata?: Record<string, unknown>,
  sourceFile?: string
): Promise<void> {
  await logAlert({
    severity: 'warning',
    category: 'state_reset_blocked',
    message,
    clientId,
    metadata,
    sourceFile,
  })
}

/**
 * Quick helper for sync failure alerts
 */
export async function logSyncFailure(
  message: string,
  clientId?: string,
  metadata?: Record<string, unknown>,
  sourceFile?: string
): Promise<void> {
  await logAlert({
    severity: 'warning',
    category: 'sync_failure',
    message,
    clientId,
    metadata,
    sourceFile,
  })
}

/**
 * Quick helper for critical errors
 */
export async function logCriticalError(
  category: AlertCategory,
  message: string,
  metadata?: Record<string, unknown>,
  clientId?: string,
  sourceFile?: string
): Promise<void> {
  await logAlert({
    severity: 'critical',
    category,
    message,
    clientId,
    metadata,
    sourceFile,
  })
}

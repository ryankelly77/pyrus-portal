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
  | 'checkout_error'
  | 'billing_sync_failure'
  | 'email_error'
  | 'crm_error'
  | 'basecamp_error'
  | 'uptime_error'
  | 'storage_error'

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

/**
 * Quick helper for checkout errors (warning severity)
 */
export async function logCheckoutError(
  message: string,
  clientId?: string,
  metadata?: Record<string, unknown>,
  sourceFile?: string
): Promise<void> {
  await logAlert({
    severity: 'warning',
    category: 'checkout_error',
    message,
    clientId,
    metadata,
    sourceFile,
  })
}

/**
 * Quick helper for billing sync failures (critical - money moved but DB didn't update)
 */
export async function logBillingSyncFailure(
  message: string,
  clientId?: string,
  metadata?: Record<string, unknown>,
  sourceFile?: string
): Promise<void> {
  await logAlert({
    severity: 'critical',
    category: 'billing_sync_failure',
    message,
    clientId,
    metadata,
    sourceFile,
  })
}

/**
 * Quick helper for auth errors
 */
export async function logAuthError(
  message: string,
  severity: AlertSeverity = 'warning',
  metadata?: Record<string, unknown>,
  sourceFile?: string
): Promise<void> {
  await logAlert({
    severity,
    category: 'auth_error',
    message,
    metadata,
    sourceFile,
  })
}

/**
 * Quick helper for email errors
 */
export async function logEmailError(
  message: string,
  clientId?: string,
  metadata?: Record<string, unknown>,
  sourceFile?: string
): Promise<void> {
  await logAlert({
    severity: 'warning',
    category: 'email_error',
    message,
    clientId,
    metadata,
    sourceFile,
  })
}

/**
 * Quick helper for CRM (HighLevel) errors
 */
export async function logCrmError(
  message: string,
  clientId?: string,
  metadata?: Record<string, unknown>,
  sourceFile?: string
): Promise<void> {
  await logAlert({
    severity: 'warning',
    category: 'crm_error',
    message,
    clientId,
    metadata,
    sourceFile,
  })
}

/**
 * Quick helper for Basecamp errors
 */
export async function logBasecampError(
  message: string,
  clientId?: string,
  metadata?: Record<string, unknown>,
  sourceFile?: string
): Promise<void> {
  await logAlert({
    severity: 'warning',
    category: 'basecamp_error',
    message,
    clientId,
    metadata,
    sourceFile,
  })
}

/**
 * Quick helper for uptime monitoring errors
 */
export async function logUptimeError(
  message: string,
  severity: AlertSeverity = 'info',
  metadata?: Record<string, unknown>,
  sourceFile?: string
): Promise<void> {
  await logAlert({
    severity,
    category: 'uptime_error',
    message,
    metadata,
    sourceFile,
  })
}

/**
 * Quick helper for storage errors
 */
export async function logStorageError(
  message: string,
  metadata?: Record<string, unknown>,
  sourceFile?: string
): Promise<void> {
  await logAlert({
    severity: 'warning',
    category: 'storage_error',
    message,
    metadata,
    sourceFile,
  })
}

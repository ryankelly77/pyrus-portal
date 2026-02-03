import { NextRequest, NextResponse } from 'next/server'
import { logAlert, AlertSeverity, AlertCategory } from '@/lib/alerts'

interface LogAlertRequest {
  severity: AlertSeverity
  category: AlertCategory
  message: string
  metadata?: Record<string, unknown>
  clientId?: string
}

// Simple in-memory rate limiting (per IP, 10 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT) {
    return false
  }

  entry.count++
  return true
}

// Clean up old entries periodically (every 100 requests)
let requestCount = 0
function cleanupRateLimitMap() {
  requestCount++
  if (requestCount % 100 === 0) {
    const now = Date.now()
    const entries = Array.from(rateLimitMap.entries())
    for (const [ip, entry] of entries) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(ip)
      }
    }
  }
}

// POST /api/alerts/log - Log alert from client-side code
export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    cleanupRateLimitMap()

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body = (await request.json()) as LogAlertRequest
    const { severity, category, message, metadata, clientId } = body

    if (!severity || !category || !message) {
      return NextResponse.json(
        { error: 'severity, category, and message are required' },
        { status: 400 }
      )
    }

    // Validate severity and category values
    const validSeverities: AlertSeverity[] = ['info', 'warning', 'critical']
    const validCategories: AlertCategory[] = [
      'subscription_safeguard',
      'state_reset_blocked',
      'sync_failure',
      'api_error',
      'stripe_error',
      'auth_error',
      'data_integrity',
    ]

    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity value' },
        { status: 400 }
      )
    }

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category value' },
        { status: 400 }
      )
    }

    // Log the alert (fire and forget on the client side, but we await here)
    await logAlert({
      severity,
      category,
      message,
      metadata: { ...metadata, source: 'client' },
      clientId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging alert:', error)
    return NextResponse.json(
      { error: 'Failed to log alert' },
      { status: 500 }
    )
  }
}

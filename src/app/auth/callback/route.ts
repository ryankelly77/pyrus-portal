import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAuthError } from '@/lib/alerts'
import { prisma } from '@/lib/prisma'
import { enrollInAutomations } from '@/lib/email/automation-service'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/getting-started'
  const errorParam = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Check if provider returned an error
  if (errorParam) {
    console.error('Auth callback provider error:', errorParam, errorDescription)
    logAuthError(
      `Auth callback provider error: ${errorParam}`,
      'warning',
      { error: errorParam, errorDescription, next, step: 'provider_error' },
      'auth/callback/route.ts'
    )
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorParam)}`, requestUrl.origin))
  }

  try {
    if (code) {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Auth callback error:', error)
        logAuthError(
          `Auth callback failed: ${error.message}`,
          'warning',
          { error: error.message, next, step: 'exchange_code' },
          'auth/callback/route.ts'
        )
        return NextResponse.redirect(new URL('/login?error=auth_callback_failed', requestUrl.origin))
      }

      // Track client login for automations (non-blocking)
      trackClientLogin(supabase).catch(console.error)
    }

    // Redirect to the next page (e.g., /reset-password)
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  } catch (error) {
    console.error('Auth callback exception:', error)
    logAuthError(
      `Auth callback exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'warning',
      { error: error instanceof Error ? error.message : String(error), next, step: 'callback_handler' },
      'auth/callback/route.ts'
    )
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', requestUrl.origin))
  }
}

/**
 * Track client login for automation triggers
 */
async function trackClientLogin(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user profile
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Only track client logins (not admin logins)
    if (!profile || profile.role !== 'client' || !profile.client) {
      return
    }

    // Enroll in client_login automations
    await enrollInAutomations('client_login', {
      recipientEmail: profile.email,
      recipientName: profile.full_name || profile.email,
      triggerRecordType: 'profile',
      triggerRecordId: profile.id,
      contextData: {
        userId: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        clientId: profile.client.id,
        clientName: profile.client.name,
        loginAt: new Date().toISOString(),
      },
    })

    console.log(`Tracked client login for ${profile.email}`)
  } catch (error) {
    console.error('Failed to track client login:', error)
  }
}

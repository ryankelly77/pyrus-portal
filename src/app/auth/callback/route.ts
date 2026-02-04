import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAuthError } from '@/lib/alerts'

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

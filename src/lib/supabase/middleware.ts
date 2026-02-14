import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  // Note: Can't log to DB from Edge runtime, so we log to console and let it gracefully fail
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // Only log actual errors, not expected "no session" cases
      // Common expected errors: "Auth session missing", "invalid claim: missing sub claim"
      const isExpectedNoSession =
        error.message.includes('session') ||
        error.message.includes('missing sub claim') ||
        error.message.includes('not authenticated') ||
        error.code === 'session_not_found'

      if (!isExpectedNoSession) {
        console.error('[AUTH] Session refresh failed in middleware:', {
          error: error.message,
          path: request.nextUrl.pathname,
        })
        // Fire-and-forget alert to API (async, don't await)
        fetch(new URL('/api/alerts/log', request.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            severity: 'critical',
            category: 'auth_error',
            message: `Session refresh failed in middleware: ${error.message}`,
            metadata: { path: request.nextUrl.pathname, error: error.message },
          }),
        }).catch(() => {})
      }
    }
    user = data.user
  } catch (error) {
    console.error('[AUTH] Session refresh exception in middleware:', {
      error: error instanceof Error ? error.message : String(error),
      path: request.nextUrl.pathname,
    })
    // Fire-and-forget alert to API
    fetch(new URL('/api/alerts/log', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severity: 'critical',
        category: 'auth_error',
        message: `Session refresh exception in middleware: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: { path: request.nextUrl.pathname, error: error instanceof Error ? error.message : String(error) },
      }),
    }).catch(() => {})
  }

  return { supabaseResponse, user }
}

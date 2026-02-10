import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback', '/test', '/api/client', '/view-proposal', '/api/proposal', '/api/mailgun/webhook', '/api/webhooks', '/accept-invite', '/api/accept-invite', '/api/cron']

// Routes only accessible by super_admin
const superAdminRoutes = ['/products', '/rewards', '/settings']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const path = request.nextUrl.pathname

  // Add pathname to request headers so server components can read it
  // This is done by setting it on the request object that gets passed through
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', path)

  // Protect admin API routes: return 401 JSON for unauthenticated requests
  if (path.startsWith('/api/admin')) {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Copy supabase cookies to the response
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    })
    supabaseResponse.cookies.getAll().forEach(cookie => {
      response.cookies.set(cookie.name, cookie.value, cookie)
    })
    return response
  }

  // Allow public routes
  if (publicRoutes.some(route => path.startsWith(route))) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    })
    supabaseResponse.cookies.getAll().forEach(cookie => {
      response.cookies.set(cookie.name, cookie.value, cookie)
    })
    return response
  }

  // Redirect to login if not authenticated
  if (!user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(redirectUrl)
  }

  // Return response with pathname header for authenticated routes
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  supabaseResponse.cookies.getAll().forEach(cookie => {
    response.cookies.set(cookie.name, cookie.value, cookie)
  })
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

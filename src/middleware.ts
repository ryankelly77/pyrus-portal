import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback', '/test', '/api/client', '/view-proposal', '/api/proposal', '/api/mailgun/webhook', '/api/webhooks', '/accept-invite', '/api/accept-invite']

// Routes only accessible by super_admin
const superAdminRoutes = ['/products', '/rewards', '/settings']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const path = request.nextUrl.pathname

  // Add pathname to response headers for use in layouts
  supabaseResponse.headers.set('x-pathname', path)

  // Protect admin API routes: return 401 JSON for unauthenticated requests
  if (path.startsWith('/api/admin')) {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return supabaseResponse
  }

  // Allow public routes
  if (publicRoutes.some(route => path.startsWith(route))) {
    return supabaseResponse
  }

  // Redirect to login if not authenticated
  if (!user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
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

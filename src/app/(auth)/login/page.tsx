'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Get redirect URL from query params (e.g., ?redirect=/recommendations)
  // Default to /getting-started for client portal
  const redirectUrl = searchParams.get('redirect') || '/getting-started'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      fetch('/api/alerts/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          severity: 'info',
          category: 'auth_error',
          message: `Login failed: ${error.message}`,
          metadata: { email, error: error.message, step: 'sign_in' },
        }),
      }).catch(() => {})
      setLoading(false)
      return
    }

    // Fetch user's profile and permissions to determine redirect
    let finalRedirect = redirectUrl
    try {
      const meRes = await fetch('/api/auth/me')
      if (meRes.ok) {
        const profile: { role?: string; permissions?: Record<string, boolean> } = await meRes.json()

        // Admin roles go to /admin, clients go to /getting-started
        const adminRoles = ['super_admin', 'admin', 'production_team', 'sales']
        if (profile.role && adminRoles.includes(profile.role)) {
          // Super admin always goes to dashboard
          if (profile.role === 'super_admin') {
            finalRedirect = '/admin/dashboard'
          } else {
            // For other admin roles, find their first accessible page
            const userPerms = profile.permissions || {}

            // Menu items in order of priority
            const menuOrder = [
              { key: 'dashboard', path: '/admin/dashboard' },
              { key: 'recommendations', path: '/admin/recommendations' },
              { key: 'clients', path: '/admin/clients' },
              { key: 'users', path: '/admin/users' },
              { key: 'content', path: '/admin/content' },
              { key: 'websites', path: '/admin/websites' },
              { key: 'notifications', path: '/admin/notifications' },
              { key: 'products', path: '/admin/products' },
              { key: 'rewards', path: '/admin/rewards' },
              { key: 'revenue', path: '/admin/revenue' },
              { key: 'performance', path: '/admin/performance' },
              { key: 'settings', path: '/admin/settings' },
              { key: 'alerts', path: '/admin/alerts' },
            ]

            // Find first accessible page
            const firstAccessible = menuOrder.find(item => userPerms[item.key] === true)
            finalRedirect = firstAccessible?.path || '/admin/recommendations'
          }
        } else if (!searchParams.get('redirect')) {
          // Only default to /getting-started if no explicit redirect was requested
          finalRedirect = '/getting-started'
        }
      }
    } catch (e) {
      console.error('Failed to fetch profile for redirect:', e)
      fetch('/api/alerts/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          severity: 'info',
          category: 'auth_error',
          message: `Profile fetch for redirect failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
          metadata: { email, error: e instanceof Error ? e.message : String(e), step: 'fetch_profile_redirect' },
        }),
      }).catch(() => {})
    }

    // Log the login activity
    try {
      const logRes = await fetch('/api/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: 'login',
          description: 'Logged into the portal',
        }),
      })
      if (!logRes.ok) {
        const logData = await logRes.json()
        console.error('Failed to log login activity:', logData)
      }
    } catch (e) {
      // Don't block login if activity logging fails
      console.error('Failed to log login activity:', e)
    }

    router.push(finalRedirect)
    router.refresh()
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Logo */}
          <div className="login-header">
            <Image
              src="/pyrus-logo-icon.png"
              alt="Pyrus"
              width={48}
              height={48}
              className="login-logo"
            />
            <h1>Pyrus Portal</h1>
            <p>Sign in to your account</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary login-btn"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Footer links */}
          <div className="login-footer">
            <a href="/forgot-password">Forgot your password?</a>
          </div>

          <div className="login-register">
            <span>New to Pyrus? </span>
            <Link href={`/register${redirectUrl !== '/getting-started' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}>
              Create an account
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-page);
          padding: 20px;
        }

        .login-container {
          width: 100%;
          max-width: 400px;
        }

        .login-card {
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          padding: 40px;
          border: 1px solid var(--border-light);
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-header h1 {
          font-size: 24px;
          font-weight: 700;
          color: var(--pyrus-brown);
          margin-top: 16px;
          margin-bottom: 8px;
        }

        .login-header p {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .login-error {
          background: var(--error-bg);
          border: 1px solid var(--error-border);
          color: var(--error-text);
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          margin-bottom: 20px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .form-group input {
          padding: 10px 14px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--pyrus-brown);
          box-shadow: 0 0 0 3px rgba(136, 84, 48, 0.1);
        }

        .form-group input::placeholder {
          color: var(--text-muted);
        }

        .login-btn {
          width: 100%;
          height: 44px;
          font-size: 14px;
          font-weight: 600;
          margin-top: 8px;
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-footer {
          text-align: center;
          margin-top: 24px;
        }

        .login-footer a {
          font-size: 13px;
          color: var(--pyrus-brown);
          text-decoration: none;
        }

        .login-footer a:hover {
          text-decoration: underline;
        }

        .login-register {
          text-align: center;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-light);
          font-size: 14px;
          color: var(--text-secondary);
        }

        .login-register a {
          color: var(--pyrus-brown);
          text-decoration: none;
          font-weight: 500;
        }

        .login-register a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)'
      }}>
        Loading...
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

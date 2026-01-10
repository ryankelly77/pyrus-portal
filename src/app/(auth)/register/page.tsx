'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Get redirect URL from query params (e.g., ?redirect=/recommendations)
  const redirectUrl = searchParams.get('redirect') || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    console.log('Registration form submitted:', { email, fullName })

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    // Sign up with Supabase
    console.log('Calling Supabase signUp...')
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    console.log('Supabase signUp response:', { data, error: signUpError })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      // Email confirmation required
      setSuccess(true)
      setLoading(false)
      return
    }

    // If we have a session, the user is logged in
    if (data.session) {
      // Associate with pending client if available
      // Check URL param first (more reliable), then localStorage
      const urlInviteToken = searchParams.get('invite')
      const pendingClientId = localStorage.getItem('pyrus_pending_client_id')
      const inviteToken = urlInviteToken || localStorage.getItem('pyrus_invite_token')

      if (inviteToken) {
        try {
          // Use token-only association - the API will find the client from the token
          await fetch('/api/client/associate-by-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: inviteToken }),
          })
          // Clear the pending data
          localStorage.removeItem('pyrus_pending_client_id')
          localStorage.removeItem('pyrus_invite_token')
        } catch (e) {
          console.error('Failed to associate client:', e)
        }
      } else if (pendingClientId) {
        // Fallback to old method if we have clientId but no token
        try {
          await fetch('/api/client/associate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: pendingClientId,
              token: localStorage.getItem('pyrus_invite_token'),
            }),
          })
          localStorage.removeItem('pyrus_pending_client_id')
          localStorage.removeItem('pyrus_invite_token')
        } catch (e) {
          console.error('Failed to associate client:', e)
        }
      }

      // Log the registration activity
      try {
        await fetch('/api/activity/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_type: 'registration',
            description: 'Registered for the portal',
          }),
        })
      } catch (e) {
        console.error('Failed to log registration activity:', e)
      }

      router.push(redirectUrl)
      router.refresh()
    }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <Image
                src="/pyrus-logo-icon.png"
                alt="Pyrus"
                width={48}
                height={48}
                className="login-logo"
              />
              <h1>Check Your Email</h1>
              <p>We&apos;ve sent you a confirmation link</p>
            </div>

            <div className="success-message">
              <p>
                Please check your email at <strong>{email}</strong> and click the confirmation link to complete your registration.
              </p>
              <p style={{ marginTop: '1rem', fontSize: '14px', color: '#5A6358' }}>
                After confirming, you&apos;ll be able to sign in and view your recommendations.
              </p>
            </div>

            <div className="login-footer">
              <Link href="/login">Return to Sign In</Link>
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

          .success-message {
            background: #D1FAE5;
            border: 1px solid #A7F3D0;
            color: #065F46;
            padding: 16px;
            border-radius: var(--radius-sm);
            font-size: 14px;
            line-height: 1.5;
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
        `}</style>
      </div>
    )
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
            <h1>Create Account</h1>
            <p>Sign up to view your recommendations</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* Register form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>

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
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary login-btn"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Sign in link */}
          <div className="login-footer">
            <span>Already have an account? </span>
            <Link href={`/login${redirectUrl !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}>
              Sign in
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
          font-size: 13px;
          color: var(--text-secondary);
        }

        .login-footer a {
          color: var(--pyrus-brown);
          text-decoration: none;
          font-weight: 500;
        }

        .login-footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}

export default function RegisterPage() {
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
      <RegisterForm />
    </Suspense>
  )
}

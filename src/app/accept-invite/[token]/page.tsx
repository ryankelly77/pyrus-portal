'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface InviteData {
  id: string
  email: string
  fullName: string
  role: string
  clientIds: string[]
  expiresAt: string
}

export default function AcceptInvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Fetch invite data on mount
  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/accept-invite/${token}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Invalid or expired invitation')
          return
        }

        setInviteData(data.invite)
      } catch (err) {
        setError('Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchInvite()
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/accept-invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create account')
        return
      }

      setSuccess(true)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setError('Failed to create account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pageStyles = `
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
  `

  if (loading) {
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
              <h1>Pyrus Portal</h1>
              <p>Loading invitation...</p>
            </div>
          </div>
        </div>
        <style>{pageStyles}</style>
      </div>
    )
  }

  if (error && !inviteData) {
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
              <h1>Invalid Invitation</h1>
              <p>{error}</p>
            </div>
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Link href="/login" className="btn btn-primary">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
        <style>{pageStyles}</style>
      </div>
    )
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="48" height="48" style={{ margin: '0 auto', display: 'block' }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <h1>Account Created!</h1>
              <p>Redirecting you to login...</p>
            </div>
          </div>
        </div>
        <style>{pageStyles}</style>
      </div>
    )
  }

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
            <h1>Welcome, {inviteData?.fullName?.split(' ')[0] || 'there'}!</h1>
            <p>Set up your password to complete your account</p>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={inviteData?.email || ''}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={inviteData?.fullName || ''}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={8}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary login-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="login-footer">
            Already have an account? <Link href="/login">Sign in</Link>
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
          font-size: 14px;
          color: var(--text-secondary);
        }

        .login-footer :global(a) {
          color: var(--pyrus-brown);
          text-decoration: none;
          font-weight: 500;
        }

        .login-footer :global(a:hover) {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}

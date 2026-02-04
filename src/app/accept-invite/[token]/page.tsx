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

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading invitation...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !inviteData) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <Image
              src="/pyrus-logo.png"
              alt="Pyrus Digital Media"
              width={140}
              height={35}
              priority
            />
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" width="48" height="48" style={{ margin: '0 auto 16px' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <h2 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Invalid Invitation</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</p>
            <Link href="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <Image
              src="/pyrus-logo.png"
              alt="Pyrus Digital Media"
              width={140}
              height={35}
              priority
            />
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="48" height="48" style={{ margin: '0 auto 16px' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h2 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Account Created!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Redirecting you to login...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <Image
            src="/pyrus-logo.png"
            alt="Pyrus Digital Media"
            width={140}
            height={35}
            priority
          />
        </div>

        <h1 className="auth-title">Welcome, {inviteData?.fullName?.split(' ')[0] || 'there'}!</h1>
        <p className="auth-subtitle">Set up your password to complete your account</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={inviteData?.email || ''}
              disabled
              style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={inviteData?.fullName || ''}
              disabled
              style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }}
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

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

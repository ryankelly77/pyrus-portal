'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

export default function ViewProposalPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [error, setError] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string>('')

  useEffect(() => {
    async function validateAndRedirect() {
      try {
        // Validate token and mark as viewed
        const res = await fetch(`/api/proposal/${token}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Invalid or expired link')
          return
        }

        // Store client info for the redirect
        setClientName(data.client?.name || '')

        // Store the client ID in localStorage so we can associate it after login/registration
        if (data.client?.id) {
          localStorage.setItem('pyrus_pending_client_id', data.client.id)
          localStorage.setItem('pyrus_invite_token', token)
        }

        // Redirect to register page with redirect to recommendations
        // Small delay to show the loading state
        setTimeout(() => {
          router.push('/register?redirect=/recommendations')
        }, 1500)
      } catch (err) {
        console.error('Failed to validate proposal:', err)
        setError('Failed to load proposal')
      }
    }

    if (token) {
      validateAndRedirect()
    }
  }, [token, router])

  if (error) {
    return (
      <div className="proposal-redirect-page">
        <div className="redirect-card error">
          <div className="error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h1>Unable to Load Proposal</h1>
          <p>{error}</p>
          <p className="error-contact">
            If you believe this is an error, please contact us at{' '}
            <a href="mailto:support@pyrusdigitalmedia.com">support@pyrusdigitalmedia.com</a>
          </p>
        </div>

        <style jsx>{`
          .proposal-redirect-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #324438 0%, #1A1F16 100%);
            padding: 20px;
          }

          .redirect-card {
            background: white;
            border-radius: 16px;
            padding: 48px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }

          .redirect-card.error {
            border-top: 4px solid #DC2626;
          }

          .error-icon {
            color: #DC2626;
            margin-bottom: 24px;
          }

          h1 {
            font-size: 24px;
            color: #1A1F16;
            margin-bottom: 12px;
          }

          p {
            color: #5A6358;
            margin-bottom: 16px;
            line-height: 1.6;
          }

          .error-contact a {
            color: #324438;
            font-weight: 500;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="proposal-redirect-page">
      <div className="redirect-card">
        <div className="logo-container">
          <Image
            src="/pyrus-logo-icon.png"
            alt="Pyrus"
            width={64}
            height={64}
          />
        </div>
        <h1>Welcome to Pyrus!</h1>
        {clientName && <p className="client-name">Proposal for <strong>{clientName}</strong></p>}
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Redirecting you to create an account...</p>
        </div>
        <p className="info-text">
          Create an account to view your personalized marketing recommendations.
        </p>
      </div>

      <style jsx>{`
        .proposal-redirect-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #324438 0%, #1A1F16 100%);
          padding: 20px;
        }

        .redirect-card {
          background: white;
          border-radius: 16px;
          padding: 48px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .logo-container {
          margin-bottom: 24px;
        }

        h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1A1F16;
          margin-bottom: 8px;
        }

        .client-name {
          font-size: 16px;
          color: #5A6358;
          margin-bottom: 32px;
        }

        .client-name strong {
          color: #324438;
        }

        .loading-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #E5E7EB;
          border-top-color: #324438;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-indicator p {
          font-size: 14px;
          color: #324438;
          font-weight: 500;
        }

        .info-text {
          font-size: 14px;
          color: #5A6358;
          line-height: 1.6;
        }
      `}</style>
    </div>
  )
}

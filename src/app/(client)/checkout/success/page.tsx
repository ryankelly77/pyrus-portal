'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const viewingAs = searchParams.get('viewingAs')
  const tier = searchParams.get('tier')
  const paymentIntent = searchParams.get('payment_intent')
  const redirectStatus = searchParams.get('redirect_status')
  
  const { client, loading: clientLoading } = useClientData(viewingAs)
  const [isVerifying, setIsVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verifyPayment() {
      if (redirectStatus === 'succeeded') {
        setIsVerifying(false)
        return
      }
      if (redirectStatus === 'failed') {
        setError('Payment was not successful. Please try again.')
        setIsVerifying(false)
        return
      }
      setIsVerifying(false)
    }
    verifyPayment()
  }, [paymentIntent, redirectStatus])

  const tierLabel = tier ? { good: 'Good', better: 'Better', best: 'Best' }[tier] || tier : 'Your'

  if (clientLoading || isVerifying) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left"><h1>Processing...</h1></div>
        </div>
        <div className="client-content">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 24px' }}></div>
            <h2>Verifying your payment...</h2>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left"><h1>Payment Issue</h1></div>
        </div>
        <div className="client-content">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <Link href={`/checkout${tier ? `?tier=${tier}` : ''}${viewingAs ? `${tier ? '&' : '?'}viewingAs=${viewingAs}` : ''}`} className="btn btn-primary">Try Again</Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="client-top-header">
        <div className="client-top-header-left"><h1>Welcome to Pyrus!</h1></div>
      </div>
      <div className="client-content">
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--pyrus-green-wash)', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--pyrus-green)" strokeWidth="2.5" width="50" height="50">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 style={{ fontSize: 28, marginBottom: 16, textAlign: 'center' }}>Thank you for your purchase!</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 32 }}>
            Your {tierLabel} plan is now active. We're excited to help {client.name} grow!
          </p>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>What happens next?</h3>
            <p>1. Check your email - We've sent a confirmation with your receipt</p>
            <p>2. Complete onboarding - Answer a few questions to help us get started</p>
            <p>3. We start working - Our team will begin implementing your marketing plan</p>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href={`/getting-started${viewingAs ? `?viewingAs=${viewingAs}` : ''}`} className="btn btn-primary btn-lg">
              Complete Onboarding
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

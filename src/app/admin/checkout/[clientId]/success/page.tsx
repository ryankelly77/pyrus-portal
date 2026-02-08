'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

interface DBClient {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
}

export default function CheckoutSuccessPage() {
  const { user } = useUserProfile()
  const params = useParams()
  const searchParams = useSearchParams()
  const clientId = params.clientId as string
  const tier = searchParams.get('tier') || 'better'
  const amount = searchParams.get('amount') || '0'

  const [client, setClient] = useState<DBClient | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadClient() {
      try {
        const res = await fetch(`/api/admin/clients/${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setClient(data)
        }
      } catch (error) {
        console.error('Failed to load client:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadClient()
  }, [clientId])

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)
  const confirmationNumber = `PYR-${Date.now().toString().slice(-8)}`

  if (isLoading) {
    return (
      <>
        <AdminHeader
          title="Payment Complete"
          user={user}
          hasNotifications={true}
        />
        <div className="admin-content">
          <div className="checkout-success-page">
            <p>Loading...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Payment Complete"
        user={user}
        hasNotifications={true}
      />

      <div className="admin-content">
        <div className="checkout-success-page">
          <div className="success-card">
            <div className="success-icon-large">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <h1>Payment Successful!</h1>
            <p className="success-subtitle">
              {client?.name}&apos;s {tierLabel} plan has been activated.
            </p>

            <div className="success-details-card">
              <div className="detail-row">
                <span className="detail-label">Amount Charged</span>
                <span className="detail-value">${Number(amount).toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Confirmation #</span>
                <span className="detail-value">{confirmationNumber}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Receipt Sent To</span>
                <span className="detail-value">{client?.contact_email || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Plan</span>
                <span className="detail-value">{tierLabel}</span>
              </div>
            </div>

            <div className="success-actions">
              <Link href={`/admin/clients/${clientId}`} className="btn btn-primary">
                View Client
              </Link>
              <Link href="/admin/recommendations" className="btn btn-secondary">
                Back to Recommendations
              </Link>
            </div>

            <p className="success-note">
              A confirmation email has been sent to the client. The services will be activated within 24 hours.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

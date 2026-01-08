'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'

interface CartItem {
  id: string
  name: string
  description: string
  quantity: number
  monthlyPrice: number
  onetimePrice: number
  pricingType: 'monthly' | 'onetime'
}

interface DBClient {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  avatar_color: string | null
  growth_stage: string | null
  status: string | null
}

// Helper to generate initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Helper to generate a consistent color from a string
function getAvatarColor(str: string): string {
  const colors = ['#885430', '#2563EB', '#7C3AED', '#0B7277', '#DC2626', '#6B7280', '#059669', '#D97706']
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = params.clientId as string
  const tier = searchParams.get('tier') || 'better'

  const [client, setClient] = useState<DBClient | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card_on_file' | 'new_card'>('card_on_file')

  // Load client and cart items from sessionStorage
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch client info
        const clientRes = await fetch(`/api/admin/clients/${clientId}`)
        if (clientRes.ok) {
          const clientData = await clientRes.json()
          setClient(clientData)
        }

        // Get cart items from sessionStorage
        const storedCart = sessionStorage.getItem(`checkout_${clientId}_${tier}`)
        if (storedCart) {
          setCartItems(JSON.parse(storedCart))
        }
      } catch (error) {
        console.error('Failed to load checkout data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [clientId, tier])

  // Calculate totals
  const monthlyTotal = cartItems.reduce((sum, item) => {
    if (item.pricingType === 'monthly') {
      return sum + (item.monthlyPrice * item.quantity)
    }
    return sum
  }, 0)

  const onetimeTotal = cartItems.reduce((sum, item) => {
    if (item.pricingType === 'onetime') {
      return sum + (item.onetimePrice * item.quantity)
    }
    return sum
  }, 0)

  const dueToday = monthlyTotal + onetimeTotal

  const handleProcessPayment = async () => {
    setIsProcessing(true)
    try {
      // Simulate payment processing - Stripe integration later
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Clear cart from sessionStorage
      sessionStorage.removeItem(`checkout_${clientId}_${tier}`)

      // Redirect to success page or back to recommendation builder
      router.push(`/admin/checkout/${clientId}/success?tier=${tier}&amount=${dueToday}`)
    } catch (error) {
      console.error('Payment failed:', error)
      alert('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <AdminHeader
          title="Checkout"
          user={{ name: 'Ryan Kelly', initials: 'RK' }}
          hasNotifications={true}
        />
        <div className="admin-content">
          <div className="checkout-page">
            <p>Loading...</p>
          </div>
        </div>
      </>
    )
  }

  if (!client) {
    return (
      <>
        <AdminHeader
          title="Checkout"
          user={{ name: 'Ryan Kelly', initials: 'RK' }}
          hasNotifications={true}
        />
        <div className="admin-content">
          <div className="checkout-page">
            <p>Client not found</p>
            <Link href="/admin/recommendations" className="btn btn-secondary">
              Back to Recommendations
            </Link>
          </div>
        </div>
      </>
    )
  }

  if (cartItems.length === 0) {
    return (
      <>
        <AdminHeader
          title="Checkout"
          user={{ name: 'Ryan Kelly', initials: 'RK' }}
          hasNotifications={true}
          breadcrumb={
            <>
              <Link href="/admin/recommendations">Recommendations</Link>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span>Checkout</span>
            </>
          }
        />
        <div className="admin-content">
          <div className="checkout-page checkout-empty">
            <div className="empty-cart-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
            <h2>No items in cart</h2>
            <p>Add items to a plan in the recommendation builder first.</p>
            <Link href={`/admin/recommendation-builder/${clientId}`} className="btn btn-primary">
              Back to Recommendation Builder
            </Link>
          </div>
        </div>
      </>
    )
  }

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)
  const avatarColor = client.avatar_color || getAvatarColor(client.name)

  return (
    <>
      <AdminHeader
        title="Checkout"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
        breadcrumb={
          <>
            <Link href="/admin/recommendations">Recommendations</Link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <Link href={`/admin/recommendation-builder/${clientId}`}>{client.name}</Link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span>Checkout</span>
          </>
        }
      />

      <div className="admin-content">
        <div className="checkout-page">
          <div className="checkout-grid">
            {/* Left Column - Order Summary */}
            <div className="checkout-main">
              <div className="checkout-section">
                <div className="checkout-section-header">
                  <h2>Order Summary</h2>
                  <span className="tier-badge">{tierLabel} Plan</span>
                </div>

                <div className="checkout-client-card">
                  <div className="client-avatar" style={{ background: avatarColor }}>
                    {getInitials(client.name)}
                  </div>
                  <div className="client-info">
                    <h3>{client.name}</h3>
                    <p>{client.contact_email || 'No email on file'}</p>
                  </div>
                </div>

                <div className="checkout-items">
                  {cartItems.map((item) => (
                    <div key={item.id} className="checkout-item">
                      <div className="checkout-item-info">
                        <span className="item-name">{item.name}</span>
                        {item.quantity > 1 && (
                          <span className="item-quantity">x{item.quantity}</span>
                        )}
                      </div>
                      <div className="checkout-item-price">
                        {item.pricingType === 'monthly' ? (
                          <span>${(item.monthlyPrice * item.quantity).toLocaleString()}/mo</span>
                        ) : (
                          <span>${(item.onetimePrice * item.quantity).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="checkout-section">
                <h2>Payment Method</h2>
                <div className="payment-options">
                  <label className={`payment-option ${paymentMethod === 'card_on_file' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card_on_file"
                      checked={paymentMethod === 'card_on_file'}
                      onChange={() => setPaymentMethod('card_on_file')}
                    />
                    <div className="payment-option-content">
                      <div className="payment-option-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                          <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                      </div>
                      <div className="payment-option-details">
                        <span className="payment-option-title">Card on File</span>
                        <span className="payment-option-subtitle">Visa ending in 4242</span>
                      </div>
                    </div>
                  </label>
                  <label className={`payment-option ${paymentMethod === 'new_card' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="new_card"
                      checked={paymentMethod === 'new_card'}
                      onChange={() => setPaymentMethod('new_card')}
                    />
                    <div className="payment-option-content">
                      <div className="payment-option-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </div>
                      <div className="payment-option-details">
                        <span className="payment-option-title">New Card</span>
                        <span className="payment-option-subtitle">Add a new payment method</span>
                      </div>
                    </div>
                  </label>
                </div>

                {paymentMethod === 'new_card' && (
                  <div className="new-card-form">
                    <p className="stripe-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                      Stripe payment form will be integrated here
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Price Summary */}
            <div className="checkout-sidebar">
              <div className="checkout-summary-card">
                <h3>Price Summary</h3>

                <div className="summary-lines">
                  {monthlyTotal > 0 && (
                    <div className="summary-line">
                      <span>Monthly Services</span>
                      <span>${monthlyTotal.toLocaleString()}/mo</span>
                    </div>
                  )}
                  {onetimeTotal > 0 && (
                    <div className="summary-line">
                      <span>One-time Setup</span>
                      <span>${onetimeTotal.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="summary-total">
                  <span>Due Today</span>
                  <span className="total-amount">${dueToday.toLocaleString()}</span>
                </div>

                {monthlyTotal > 0 && (
                  <p className="recurring-note">
                    Then ${monthlyTotal.toLocaleString()}/mo starting next billing cycle
                  </p>
                )}

                <button
                  className="btn btn-success btn-large btn-full"
                  onClick={handleProcessPayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <span className="spinner"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                      </svg>
                      Charge ${dueToday.toLocaleString()}
                    </>
                  )}
                </button>

                <p className="checkout-disclaimer">
                  By processing this payment, you confirm the client has authorized this charge. A receipt will be sent to {client.contact_email || 'the client'}.
                </p>
              </div>

              <Link
                href={`/admin/recommendation-builder/${clientId}`}
                className="btn btn-secondary btn-full"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to Builder
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

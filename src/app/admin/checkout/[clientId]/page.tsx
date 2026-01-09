'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { AdminHeader } from '@/components/layout'
import CheckoutForm from './CheckoutForm'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BundleProduct {
  id: string
  name: string
  monthlyPrice: number
  onetimePrice: number
}

interface CartItem {
  id: string
  name: string
  description: string
  quantity: number
  monthlyPrice: number
  onetimePrice: number
  pricingType: 'monthly' | 'onetime'
  category?: string
  bundleProducts?: BundleProduct[]
  fullPrice?: number
  isFree?: boolean
  freeQuantity?: number
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
  const [paymentMethod, setPaymentMethod] = useState<'card_on_file' | 'new_card'>('new_card')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [isCardFormExpanded, setIsCardFormExpanded] = useState(false)

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

  // Valid coupon codes (client-side validation, server validates too)
  const VALID_COUPONS: Record<string, number> = {
    'HARVEST5X': 5,
    'CULTIVATE10': 10,
    'TEST2': 100,
  }

  // Apply coupon code
  const applyCoupon = () => {
    setCouponError(null)
    const code = couponCode.trim().toUpperCase()

    if (!code) {
      setCouponError('Please enter a coupon code')
      return
    }

    const discount = VALID_COUPONS[code]
    if (discount === undefined) {
      setCouponError('Invalid coupon code')
      return
    }

    setAppliedCoupon({ code, discount })
    setCouponCode('')
    // Mark that we need to refresh the payment intent (but keep form expanded)
    setClientSecret(null)
  }

  // Remove coupon
  const removeCoupon = () => {
    setAppliedCoupon(null)
    // Mark that we need to refresh the payment intent (but keep form expanded)
    setClientSecret(null)
  }

  // Expand card form
  const expandCardForm = () => {
    setIsCardFormExpanded(true)
  }

  // Create PaymentIntent when cart is loaded and payment method is new_card
  const createPaymentIntent = async (forceRefresh = false) => {
    if (!client || cartItems.length === 0) return
    if (clientSecret && !forceRefresh) return

    // If total is $0 (e.g., 100% coupon), we'll handle this in the UI
    if (finalDueToday === 0) {
      return
    }

    setIsCreatingPayment(true)
    setPaymentError(null)

    try {
      // For now, use payment-intent with total amount for all payments
      // TODO: Use subscription endpoint when products have Stripe Price IDs configured
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          items: cartItems,
          amount: finalDueToday * 100, // Convert to cents (after coupon discount)
          couponCode: appliedCoupon?.code,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment')
      }

      setClientSecret(data.clientSecret)
    } catch (error) {
      console.error('Error creating payment:', error)
      setPaymentError(error instanceof Error ? error.message : 'Failed to initialize payment')
    } finally {
      setIsCreatingPayment(false)
    }
  }

  // Calculate totals (accounting for free items and bundle savings)
  // Items can have BOTH monthly AND one-time fees - both are charged in month 1

  // Full price = sum of all monthly items at regular price (using fullPrice for bundles)
  const fullPriceMonthly = cartItems.reduce((sum, item) => {
    // Skip items that chose one-time only pricing (no monthly component)
    if (item.pricingType === 'onetime') {
      return sum
    }
    if (item.monthlyPrice > 0) {
      const isBundle = item.category === 'bundle' && item.fullPrice && item.fullPrice > 0
      // For bundles, use fullPrice (sum of individual products)
      // For regular items, use monthlyPrice
      const itemFullPrice = isBundle ? item.fullPrice! : item.monthlyPrice
      return sum + (itemFullPrice * item.quantity)
    }
    return sum
  }, 0)

  // Bundle savings = difference between full price and bundle price
  const bundleSavings = cartItems.reduce((sum, item) => {
    if (item.pricingType !== 'onetime' && item.category === 'bundle' && item.fullPrice && item.fullPrice > 0) {
      return sum + ((item.fullPrice - item.monthlyPrice) * item.quantity)
    }
    return sum
  }, 0)

  // Free items value (monthly items that are free)
  const freeItemsValue = cartItems.reduce((sum, item) => {
    if (item.pricingType === 'onetime') return sum
    if (item.isFree && item.monthlyPrice > 0) {
      return sum + (item.monthlyPrice * item.quantity)
    }
    const freeQty = item.freeQuantity || 0
    if (freeQty > 0 && item.monthlyPrice > 0) {
      return sum + (item.monthlyPrice * freeQty)
    }
    return sum
  }, 0)

  // Actual monthly total (what they pay recurring)
  const monthlyTotal = fullPriceMonthly - bundleSavings - freeItemsValue

  // One-time fees
  // - If pricingType is 'onetime', charge onetimePrice (user chose one-time instead of monthly)
  // - Items with both prices are alternatives, not additive
  const onetimeTotal = cartItems.reduce((sum, item) => {
    // Only charge one-time if user explicitly chose one-time pricing
    if (item.pricingType === 'onetime' && item.onetimePrice > 0) {
      return sum + (item.onetimePrice * item.quantity)
    }
    return sum
  }, 0)

  // Due today = first month's recurring + all one-time fees
  const dueToday = monthlyTotal + onetimeTotal

  // Apply coupon discount
  const couponDiscount = appliedCoupon
    ? Math.round(dueToday * (appliedCoupon.discount / 100))
    : 0
  const finalDueToday = Math.max(0, dueToday - couponDiscount)

  // Auto-create payment intent when form is expanded and we don't have a clientSecret
  useEffect(() => {
    if (isCardFormExpanded && !clientSecret && !isCreatingPayment && finalDueToday > 0 && client) {
      createPaymentIntent()
    }
  }, [isCardFormExpanded, clientSecret, finalDueToday, client])

  const handlePaymentSuccess = async () => {
    // Note: Don't clear cart from sessionStorage yet - onboarding page needs it
    // sessionStorage.removeItem(`checkout_${clientId}_${tier}`)

    // Update client's growth stage to "seedling"
    try {
      await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ growthStage: 'seedling' }),
      })
    } catch (error) {
      console.error('Failed to update client stage:', error)
    }

    // Redirect to onboarding form (which will redirect to success after completion)
    router.push(`/admin/checkout/${clientId}/onboarding?tier=${tier}&amount=${finalDueToday}`)
  }

  const handlePaymentError = (error: string) => {
    setPaymentError(error)
  }

  const handleProcessPayment = async () => {
    // For card on file - simulate for now
    setIsProcessing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      // Don't clear sessionStorage yet - onboarding needs it
      router.push(`/admin/checkout/${clientId}/onboarding?tier=${tier}&amount=${finalDueToday}`)
    } catch (error) {
      console.error('Payment failed:', error)
      setPaymentError('Payment failed. Please try again.')
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
                  {cartItems.map((item) => {
                    const isBundle = item.category === 'bundle' && item.bundleProducts && item.bundleProducts.length > 0
                    const bundleSavings = isBundle && item.fullPrice ? item.fullPrice - item.monthlyPrice : 0
                    const freeQty = item.freeQuantity || 0
                    const paidQty = item.quantity - freeQty

                    // Determine price display
                    let priceDisplay: React.ReactNode
                    if (item.isFree) {
                      priceDisplay = (
                        <>
                          <span className="original-price">${item.monthlyPrice}/mo</span>
                          <span>Free</span>
                        </>
                      )
                    } else if (freeQty > 0 && item.pricingType === 'monthly') {
                      priceDisplay = (
                        <span>{freeQty} Free, {paidQty} × ${item.monthlyPrice}/mo</span>
                      )
                    } else if (item.pricingType === 'monthly') {
                      priceDisplay = (
                        <span>${(item.monthlyPrice * item.quantity).toLocaleString()}/mo</span>
                      )
                    } else {
                      priceDisplay = (
                        <span>${(item.onetimePrice * item.quantity).toLocaleString()} one-time</span>
                      )
                    }

                    return (
                      <div key={item.id} className={`checkout-item${isBundle ? ' is-bundle' : ''}${item.isFree ? ' is-free' : ''}`}>
                        <div className="checkout-item-info">
                          <span className="item-name">{item.name}</span>
                          {item.quantity > 1 && !item.isFree && freeQty === 0 && (
                            <span className="item-quantity">x{item.quantity}</span>
                          )}
                        </div>
                        <div className="checkout-item-price">
                          {priceDisplay}
                        </div>

                        {/* Bundle breakdown */}
                        {isBundle && item.bundleProducts && (
                          <div className="checkout-bundle-details">
                            <div className="bundle-products-header">
                              <span>Includes</span>
                              <span>Reg. Price</span>
                            </div>
                            <ul className="bundle-products-breakdown">
                              {item.bundleProducts.map((bp) => (
                                <li key={bp.id} className="bundle-product-row">
                                  <span className="product-name">{bp.name}</span>
                                  <span className="product-price">${bp.monthlyPrice}/mo</span>
                                </li>
                              ))}
                            </ul>
                            {bundleSavings > 0 && (
                              <div className="bundle-savings-row">
                                <span className="savings-label">Bundle Savings</span>
                                <span className="savings-amount">-${bundleSavings.toLocaleString()}/mo</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
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
                    {/* Show expand button if form not yet expanded */}
                    {!isCardFormExpanded && (
                      <button
                        className="btn btn-secondary btn-full"
                        onClick={expandCardForm}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                          <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                        Enter Card Details
                      </button>
                    )}

                    {/* Card form area - stays visible once expanded */}
                    {isCardFormExpanded && (
                      <div className="card-form-expanded">
                        {/* Show $0 message if coupon makes it free */}
                        {finalDueToday === 0 ? (
                          <div className="free-order-message">
                            <div className="free-order-icon">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                            <p>Your total is $0 - no payment required!</p>
                            <button
                              className="btn btn-success btn-full"
                              onClick={handlePaymentSuccess}
                            >
                              Complete Order
                            </button>
                          </div>
                        ) : (
                          <>
                            {isCreatingPayment && (
                              <div className="payment-loading">
                                <span className="spinner"></span>
                                <span>Preparing payment form...</span>
                              </div>
                            )}
                            {paymentError && (
                              <div className="payment-error">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="8" x2="12" y2="12"></line>
                                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <span>{paymentError}</span>
                              </div>
                            )}
                            {clientSecret && (
                              <Elements
                                stripe={stripePromise}
                                options={{
                                  clientSecret,
                                  appearance: {
                                    theme: 'stripe',
                                    variables: {
                                      colorPrimary: '#2563EB',
                                      colorBackground: '#ffffff',
                                      colorText: '#1f2937',
                                      colorDanger: '#dc2626',
                                      fontFamily: 'Inter, system-ui, sans-serif',
                                      borderRadius: '8px',
                                    },
                                  },
                                }}
                              >
                                <CheckoutForm
                                  amount={finalDueToday}
                                  clientName={client.name}
                                  onSuccess={handlePaymentSuccess}
                                  onError={handlePaymentError}
                                />
                              </Elements>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Price Summary */}
            <div className="checkout-sidebar">
              <div className="checkout-summary-card">
                <h3>Price Summary</h3>

                <div className="summary-lines">
                  {fullPriceMonthly > 0 && (
                    <div className="summary-line">
                      <span>Monthly Services</span>
                      <span>${fullPriceMonthly.toLocaleString()}/mo</span>
                    </div>
                  )}
                  {onetimeTotal > 0 && (
                    <div className="summary-line">
                      <span>One-Time Fees</span>
                      <span>${onetimeTotal.toLocaleString()}</span>
                    </div>
                  )}
                  {bundleSavings > 0 && (
                    <div className="summary-line savings">
                      <span>Bundle Savings</span>
                      <span className="savings-amount">-${bundleSavings.toLocaleString()}/mo</span>
                    </div>
                  )}
                  {freeItemsValue > 0 && (
                    <div className="summary-line savings">
                      <span>Free Items</span>
                      <span className="savings-amount">-${freeItemsValue.toLocaleString()}/mo</span>
                    </div>
                  )}
                </div>

                {/* Coupon Code Section */}
                <div className="coupon-section">
                  {appliedCoupon ? (
                    <div className="coupon-applied">
                      <div className="coupon-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>{appliedCoupon.code}</span>
                        <span className="coupon-discount">-{appliedCoupon.discount}%</span>
                      </div>
                      <button
                        type="button"
                        className="coupon-remove"
                        onClick={removeCoupon}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="coupon-input-group">
                      <input
                        type="text"
                        placeholder="Coupon code"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value)
                          setCouponError(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            applyCoupon()
                          }
                        }}
                        className={couponError ? 'input-error' : ''}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={applyCoupon}
                        disabled={isApplyingCoupon}
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="coupon-error">{couponError}</p>
                  )}
                  {appliedCoupon && couponDiscount > 0 && (
                    <div className="summary-line savings coupon-savings">
                      <span>Coupon Discount</span>
                      <span className="savings-amount">-${couponDiscount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="summary-total">
                  <span>Due Today</span>
                  <span className="total-amount">${finalDueToday.toLocaleString()}</span>
                </div>

                {monthlyTotal > 0 && (
                  <p className="recurring-note">
                    Then ${monthlyTotal.toLocaleString()}/mo each month
                  </p>
                )}

                {/* Only show charge button for card on file method */}
                {paymentMethod === 'card_on_file' && (
                  <>
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
                          Charge ${finalDueToday.toLocaleString()}
                        </>
                      )}
                    </button>

                    <p className="checkout-disclaimer">
                      By processing this payment, you confirm the client has authorized this charge. A receipt will be sent to {client.contact_email || 'the client'}.
                    </p>
                  </>
                )}

                {/* Show message when new card is selected */}
                {paymentMethod === 'new_card' && !clientSecret && (
                  <p className="checkout-disclaimer">
                    Click "Enter Card Details" to begin payment.
                  </p>
                )}

                <div className="stripe-security-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Secure payments powered by <strong>Stripe</strong></span>
                </div>
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

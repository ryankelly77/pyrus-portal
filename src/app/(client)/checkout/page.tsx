'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getClientByViewingAs } from '@/lib/client-data'

interface CartItem {
  id: string
  name: string
  description: string
  price: number
  billingPeriod: 'monthly' | 'one-time'
  category: 'website' | 'content' | 'care'
}

// Product catalog
const productCatalog: Record<string, CartItem> = {
  'seed-site': {
    id: 'seed-site',
    name: 'Seed Site',
    description: 'AI-built modern website with up to 5 pages',
    price: 249,
    billingPeriod: 'monthly',
    category: 'website'
  },
  'sprout-site': {
    id: 'sprout-site',
    name: 'Sprout Site',
    description: 'Custom WordPress website with up to 5 pages',
    price: 300,
    billingPeriod: 'monthly',
    category: 'website'
  },
  'bloom-site': {
    id: 'bloom-site',
    name: 'Bloom Site',
    description: 'Premium WordPress website with up to 10 pages',
    price: 450,
    billingPeriod: 'monthly',
    category: 'website'
  },
  'harvest-site': {
    id: 'harvest-site',
    name: 'Harvest Site',
    description: 'Enterprise WordPress website with unlimited pages',
    price: 600,
    billingPeriod: 'monthly',
    category: 'website'
  },
  'wordpress-care': {
    id: 'wordpress-care',
    name: 'WordPress Care Plan',
    description: 'Hosting, security updates, backups & technical maintenance',
    price: 49,
    billingPeriod: 'monthly',
    category: 'care'
  },
  'website-care': {
    id: 'website-care',
    name: 'Website Care Plan',
    description: 'Content updates, design changes & ongoing requests',
    price: 149,
    billingPeriod: 'monthly',
    category: 'care'
  },
  'content-writing': {
    id: 'content-writing',
    name: 'Content Writing',
    description: 'SEO and AI-optimized content up to 1,000 words',
    price: 99,
    billingPeriod: 'one-time',
    category: 'content'
  },
  'ai-creative-assets': {
    id: 'ai-creative-assets',
    name: 'AI Creative Assets',
    description: 'Monthly package of custom visuals for social, ads & website',
    price: 299,
    billingPeriod: 'monthly',
    category: 'content'
  },
  'business-branding': {
    id: 'business-branding',
    name: 'Business Branding Foundation',
    description: 'Strategic brand positioning and messaging documents',
    price: 99,
    billingPeriod: 'monthly',
    category: 'content'
  }
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const itemId = searchParams.get('item')
  const client = getClientByViewingAs(viewingAs)

  // Build cart from URL parameter
  const initialCartItems: CartItem[] = itemId && productCatalog[itemId]
    ? [productCatalog[itemId]]
    : []

  const [cartItems] = useState<CartItem[]>(initialCartItems)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [isProcessing, setIsProcessing] = useState(false)

  const monthlyTotal = cartItems.reduce((sum, item) => sum + item.price, 0)
  const annualTotal = monthlyTotal * 12 * 0.9 // 10% discount for annual

  const handleCheckout = async () => {
    setIsProcessing(true)
    // TODO: Integrate with Stripe API
    setTimeout(() => {
      setIsProcessing(false)
      alert('Stripe integration coming soon!')
    }, 1500)
  }

  // Empty cart state
  if (cartItems.length === 0) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <Link href={`/website${viewingAs ? `?viewingAs=${viewingAs}` : ''}`} className="checkout-back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M19 12H5"></path>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back
            </Link>
            <h1>Checkout</h1>
          </div>
        </div>
        <div className="client-content">
          <div className="checkout-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <h2>Your cart is empty</h2>
            <p>Browse our services and add something to get started.</p>
            <Link href={`/website${viewingAs ? `?viewingAs=${viewingAs}` : ''}`} className="btn btn-primary">
              Browse Services
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <Link href={`/website${viewingAs ? `?viewingAs=${viewingAs}` : ''}`} className="checkout-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M19 12H5"></path>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </Link>
          <h1>Checkout</h1>
        </div>
        <div className="client-top-header-right">
          <div className="checkout-secure-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Secure Checkout
          </div>
        </div>
      </div>

      <div className="client-content">
        <div className="checkout-container">
          {/* Main Checkout Content */}
          <div className="checkout-main">
            {/* Order Items */}
            <div className="checkout-section">
              <h2 className="checkout-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                Your Order
              </h2>

              <div className="checkout-items">
                {cartItems.map((item) => (
                  <div key={item.id} className="checkout-item">
                    <div className="checkout-item-icon">
                      {item.category === 'website' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="2" y1="12" x2="22" y2="12"></line>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                      )}
                      {item.category === 'content' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                      )}
                      {item.category === 'care' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                      )}
                    </div>
                    <div className="checkout-item-details">
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                    </div>
                    <div className="checkout-item-price">
                      <span className="price">${item.price}</span>
                      <span className="period">/{item.billingPeriod === 'monthly' ? 'mo' : ''}</span>
                    </div>
                    <button className="checkout-item-remove" title="Remove item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <Link href={`/website${viewingAs ? `?viewingAs=${viewingAs}` : ''}`} className="checkout-add-more">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add more services
              </Link>
            </div>

            {/* Billing Cycle */}
            <div className="checkout-section">
              <h2 className="checkout-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Billing Cycle
              </h2>

              <div className="billing-cycle-options">
                <label className={`billing-option ${billingCycle === 'monthly' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="billingCycle"
                    value="monthly"
                    checked={billingCycle === 'monthly'}
                    onChange={() => setBillingCycle('monthly')}
                  />
                  <div className="billing-option-content">
                    <span className="billing-option-label">Monthly</span>
                    <span className="billing-option-price">${monthlyTotal}/mo</span>
                  </div>
                </label>
                <label className={`billing-option ${billingCycle === 'annual' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="billingCycle"
                    value="annual"
                    checked={billingCycle === 'annual'}
                    onChange={() => setBillingCycle('annual')}
                  />
                  <div className="billing-option-content">
                    <div className="billing-option-header">
                      <span className="billing-option-label">Annual</span>
                      <span className="billing-option-badge">Save 10%</span>
                    </div>
                    <span className="billing-option-price">${Math.round(annualTotal / 12)}/mo</span>
                    <span className="billing-option-detail">Billed ${annualTotal.toLocaleString()} annually</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Payment Method */}
            <div className="checkout-section">
              <h2 className="checkout-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
                Payment Method
              </h2>

              <div className="payment-form">
                <div className="stripe-placeholder">
                  <div className="stripe-placeholder-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                  </div>
                  <p>Stripe payment form will appear here</p>
                  <span className="stripe-placeholder-note">Card number, expiry, CVC</span>
                </div>
              </div>

              <div className="payment-methods-accepted">
                <span>We accept:</span>
                <div className="payment-icons">
                  <div className="payment-icon" title="Visa">
                    <svg viewBox="0 0 50 50" width="32" height="20">
                      <rect width="50" height="50" rx="5" fill="#1A1F71"/>
                      <text x="25" y="32" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">VISA</text>
                    </svg>
                  </div>
                  <div className="payment-icon" title="Mastercard">
                    <svg viewBox="0 0 50 50" width="32" height="20">
                      <rect width="50" height="50" rx="5" fill="#EB001B"/>
                      <circle cx="20" cy="25" r="12" fill="#EB001B"/>
                      <circle cx="30" cy="25" r="12" fill="#F79E1B"/>
                    </svg>
                  </div>
                  <div className="payment-icon" title="American Express">
                    <svg viewBox="0 0 50 50" width="32" height="20">
                      <rect width="50" height="50" rx="5" fill="#006FCF"/>
                      <text x="25" y="32" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">AMEX</text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Info */}
            <div className="checkout-section">
              <h2 className="checkout-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Billing Information
              </h2>

              <div className="billing-info-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input type="text" id="firstName" defaultValue={client.firstName} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input type="text" id="lastName" defaultValue={client.lastName} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" defaultValue={client.email} />
                </div>
                <div className="form-group">
                  <label htmlFor="company">Company Name</label>
                  <input type="text" id="company" defaultValue={client.name} />
                </div>
                <div className="form-group">
                  <label htmlFor="address">Billing Address</label>
                  <input type="text" id="address" placeholder="Street address" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input type="text" id="city" />
                  </div>
                  <div className="form-group form-group-small">
                    <label htmlFor="state">State</label>
                    <input type="text" id="state" />
                  </div>
                  <div className="form-group form-group-small">
                    <label htmlFor="zip">ZIP</label>
                    <input type="text" id="zip" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="checkout-sidebar">
            <div className="order-summary">
              <h3 className="order-summary-title">Order Summary</h3>

              <div className="order-summary-items">
                {cartItems.map((item) => (
                  <div key={item.id} className="order-summary-item">
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">${item.price}/mo</span>
                  </div>
                ))}
              </div>

              <div className="order-summary-divider"></div>

              <div className="order-summary-row">
                <span>Subtotal</span>
                <span>${monthlyTotal}/mo</span>
              </div>

              {billingCycle === 'annual' && (
                <div className="order-summary-row discount">
                  <span>Annual discount (10%)</span>
                  <span>-${Math.round(monthlyTotal * 12 * 0.1)}</span>
                </div>
              )}

              <div className="order-summary-divider"></div>

              <div className="order-summary-total">
                <span>Total</span>
                <div className="total-amount">
                  <span className="amount">
                    ${billingCycle === 'monthly' ? monthlyTotal : Math.round(annualTotal / 12)}
                  </span>
                  <span className="period">/mo</span>
                </div>
              </div>

              {billingCycle === 'annual' && (
                <p className="order-summary-note">
                  You&apos;ll be charged ${annualTotal.toLocaleString()} today for 12 months of service.
                </p>
              )}

              <button
                className={`btn btn-primary btn-lg checkout-btn ${isProcessing ? 'processing' : ''}`}
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Complete Purchase
                  </>
                )}
              </button>

              <div className="checkout-guarantee">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
                <span>30-day money-back guarantee</span>
              </div>

              <p className="checkout-terms">
                By completing this purchase, you agree to our{' '}
                <a href="/terms">Terms of Service</a> and{' '}
                <a href="/privacy">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

import { useState } from 'react'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'

interface PaymentFormProps {
  clientId: string
  recommendationId: string | null
  selectedTier: string | null
  cartItems: Array<{
    id: string
    name: string
    price: number
    billingPeriod: 'monthly' | 'one-time'
    isFree?: boolean
  }>
  couponCode: string | null
  billingCycle: 'monthly' | 'annual'
  viewingAs: string | null
  onError: (error: string) => void
}

export default function PaymentForm({
  clientId,
  recommendationId,
  selectedTier,
  cartItems,
  couponCode,
  billingCycle,
  viewingAs,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)

    try {
      // First confirm the SetupIntent to save the payment method
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/checkout/success',
        },
        redirect: 'if_required',
      })

      if (setupError) {
        onError(setupError.message || 'Payment setup failed')
        setIsProcessing(false)
        return
      }

      if (!setupIntent || setupIntent.status !== 'succeeded') {
        // If redirect was required, user will be redirected
        return
      }

      // Payment method saved, now create the subscription
      const response = await fetch('/api/stripe/create-subscription-from-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          paymentMethodId: setupIntent.payment_method,
          recommendationId,
          selectedTier,
          cartItems: cartItems.filter(item => !item.isFree).map(item => ({
            name: item.name,
            price: item.price,
            billingPeriod: item.billingPeriod,
          })),
          couponCode,
          billingCycle,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        onError(data.error || 'Failed to create subscription')
        setIsProcessing(false)
        return
      }

      // Subscription created successfully, redirect to success page
      const successUrl = new URL('/checkout/success', window.location.origin)
      successUrl.searchParams.set('tier', selectedTier || '')
      if (viewingAs) {
        successUrl.searchParams.set('viewingAs', viewingAs)
      }
      successUrl.searchParams.set('redirect_status', 'succeeded')

      window.location.href = successUrl.toString()
    } catch (err) {
      console.error('Payment error:', err)
      onError('An unexpected error occurred')
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: 'tabs',
          paymentMethodOrder: billingCycle === 'annual' ? ['us_bank_account'] : ['card', 'us_bank_account'],
          wallets: {
            applePay: billingCycle === 'annual' ? 'never' : 'auto',
            googlePay: billingCycle === 'annual' ? 'never' : 'auto',
          },
        }}
      />
      
      <button
        type="submit"
        className={`btn btn-primary btn-lg checkout-btn ${isProcessing ? 'processing' : ''}`}
        disabled={!stripe || isProcessing}
        style={{ marginTop: 24, width: '100%' }}
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
    </form>
  )
}

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
  onProcessingChange?: (isProcessing: boolean) => void
  onReadyChange?: (isReady: boolean) => void
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
  onProcessingChange,
  onReadyChange,
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  // Notify parent of ready state changes
  const isReady = !!(stripe && elements)
  if (onReadyChange) {
    // Use effect-like pattern to notify parent
    setTimeout(() => onReadyChange(isReady), 0)
  }

  const updateProcessing = (value: boolean) => {
    setIsProcessing(value)
    onProcessingChange?.(value)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    updateProcessing(true)

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
        updateProcessing(false)
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
        updateProcessing(false)
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
      updateProcessing(false)
    }
  }

  return (
    <form id="checkout-payment-form" onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: billingCycle === 'annual' ? 'accordion' : 'tabs',
          paymentMethodOrder: billingCycle === 'annual' ? ['us_bank_account'] : ['card', 'us_bank_account'],
          business: { name: 'Pyrus Digital Media' },
          wallets: {
            applePay: billingCycle === 'annual' ? 'never' : 'auto',
            googlePay: billingCycle === 'annual' ? 'never' : 'auto',
          },
          // Only show ACH for annual billing
          ...(billingCycle === 'annual' && {
            fields: {
              billingDetails: 'auto',
            },
          }),
        }}
      />
    </form>
  )
}

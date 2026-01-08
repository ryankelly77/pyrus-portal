'use client'

import { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

interface CheckoutFormProps {
  amount: number
  clientName: string
  onSuccess: () => void
  onError: (error: string) => void
}

export default function CheckoutForm({
  amount,
  clientName,
  onSuccess,
  onError,
}: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/admin/checkout/success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        // Show error to user
        setErrorMessage(error.message || 'An error occurred during payment.')
        onError(error.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment successful
        onSuccess()
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        // 3D Secure or other authentication required - Stripe handles this
        setErrorMessage('Additional authentication required. Please complete the verification.')
      } else {
        setErrorMessage('Unexpected payment status. Please try again.')
      }
    } catch (err) {
      console.error('Payment error:', err)
      setErrorMessage('An unexpected error occurred.')
      onError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <div className="payment-element-container">
        <PaymentElement
          options={{
            layout: 'tabs',
            business: {
              name: 'Pyrus Digital',
            },
          }}
        />
      </div>

      {errorMessage && (
        <div className="payment-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-success btn-large btn-full"
        disabled={!stripe || isProcessing}
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
            Pay ${amount.toLocaleString()}
          </>
        )}
      </button>

      <p className="checkout-disclaimer">
        By processing this payment, you confirm {clientName} has authorized this charge.
      </p>
    </form>
  )
}

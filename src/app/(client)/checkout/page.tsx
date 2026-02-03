'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'
import { usePageView } from '@/hooks/usePageView'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import PaymentForm from './PaymentForm'

// Initialize Stripe - log if key is missing
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
if (!stripePublishableKey) {
  console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
}
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

interface CartItem {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number // Used for free items to show their value
  billingPeriod: 'monthly' | 'one-time'
  category: string
  isFree?: boolean
  billingTermMonths?: number | null // 12 = 12-month term, null = ongoing
}

interface RecommendationItem {
  id: string
  tier: string | null
  quantity: number | null
  monthly_price: string | null
  onetime_price: string | null
  is_free: boolean | null
  product: { id: string; name: string; category: string; short_description: string | null; monthly_price: string | null; onetime_price: string | null } | null
  bundle: { id: string; name: string; description: string | null; monthly_price: string | null } | null
  addon: { id: string; name: string; description: string | null; monthly_price: string | null } | null
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

// Growth Rewards coupon configuration
const VALID_COUPONS: Record<string, { discount: number; minSpend: number; stripePromoId: string }> = {
  'HARVEST5X': { discount: 5, minSpend: 1000, stripePromoId: 'promo_1So64eG6lmzQA2EMJxCe2Ad0' },
  'CULTIVATE10': { discount: 10, minSpend: 2000, stripePromoId: 'promo_1So65IG6lmzQA2EM3OJ2MVpO' },
  'TEST2': { discount: 100, minSpend: 0, stripePromoId: 'promo_1R3gHLG6lmzQA2EMFa3v79yi' },
}

// Helper to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const itemId = searchParams.get('item')
  const productId = searchParams.get('product') // Product UUID from smart recommendations
  const priceOption = searchParams.get('price') // 'monthly' or 'onetime'
  const tier = searchParams.get('tier') // 'good', 'better', or 'best'
  const urlCoupon = searchParams.get('coupon')
  const fromPage = searchParams.get('from') // Track where user came from
  const { client, loading: clientLoading } = useClientData(viewingAs)
  usePageView({ page: '/checkout', pageName: 'Checkout' })

  // Determine back link destination
  const backHref = fromPage === 'welcome' || fromPage === 'getting-started'
    ? `/getting-started${viewingAs ? `?viewingAs=${viewingAs}` : ''}`
    : `/recommendations${viewingAs ? `?viewingAs=${viewingAs}` : ''}`

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedTier, setSelectedTier] = useState<string | null>(tier)
  const [recommendationId, setRecommendationId] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [isLoading, setIsLoading] = useState(true) // Always start loading
  const [mounted, setMounted] = useState(false)

  // Track mount state to prevent SSR/hydration flash
  useEffect(() => {
    setMounted(true)
  }, [])
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [stripeCouponDiscount, setStripeCouponDiscount] = useState<{ type: 'percent' | 'amount'; value: number } | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false)
  const [isPaymentReady, setIsPaymentReady] = useState(false)
  const [isFreeOrderProcessing, setIsFreeOrderProcessing] = useState(false)
  const [freeOrderError, setFreeOrderError] = useState<string | null>(null)

  // Saved payment methods state
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<Array<{
    id: string
    type: string
    brand: string
    last4: string
    expMonth: number
    expYear: number
    bankName?: string
    accountType?: string
    linkEmail?: string
    isDefault: boolean
  }>>([])
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true)
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | 'new'>('new')

  // Existing subscription state (for adding products to existing clients)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [subscriptionCheckComplete, setSubscriptionCheckComplete] = useState(false)
  const [existingSubscription, setExistingSubscription] = useState<{
    id: string
    billingDate: number
    currentPeriodEnd: string
    nextBillingDate: string
  } | null>(null)
  const [prorationAmount, setProrationAmount] = useState<number | null>(null)
  const [prorationLoading, setProrationLoading] = useState(false)

  // Handle $0 order submission (no payment needed)
  const handleFreeOrderSubmit = async () => {
    setIsFreeOrderProcessing(true)
    setFreeOrderError(null)

    try {
      const effectiveClientId = viewingAs || client.id
      const response = await fetch('/api/stripe/create-free-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: effectiveClientId,
          recommendationId,
          selectedTier,
          cartItems: cartItems.filter(item => !item.isFree).map(item => ({
            name: item.name,
            price: item.price,
            billingPeriod: item.billingPeriod,
          })),
          couponCode: appliedCoupon,
          billingCycle,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setFreeOrderError(data.error || 'Failed to process order')
        setIsFreeOrderProcessing(false)
        return
      }

      // Order created successfully, redirect to success page
      const successUrl = new URL('/checkout/success', window.location.origin)
      successUrl.searchParams.set('tier', selectedTier || '')
      if (viewingAs) {
        successUrl.searchParams.set('viewingAs', viewingAs)
      }
      successUrl.searchParams.set('redirect_status', 'succeeded')

      window.location.href = successUrl.toString()
    } catch (err) {
      console.error('Free order error:', err)
      setFreeOrderError('An unexpected error occurred')
      setIsFreeOrderProcessing(false)
    }
  }

  // Handle order submission with saved payment method
  const handleSavedPaymentMethodSubmit = async () => {
    if (selectedPaymentMethodId === 'new') return

    setIsPaymentProcessing(true)
    setStripeError(null)

    try {
      const effectiveClientId = viewingAs || client.id

      // For existing clients with active subscriptions, add to existing subscription
      if (hasActiveSubscription) {
        await handleAddToExistingSubscription()
        return
      }

      const response = await fetch('/api/stripe/create-subscription-from-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: effectiveClientId,
          paymentMethodId: selectedPaymentMethodId,
          recommendationId,
          selectedTier,
          cartItems: cartItems.filter(item => !item.isFree).map(item => ({
            name: item.name,
            price: item.price,
            billingPeriod: item.billingPeriod,
          })),
          couponCode: appliedCoupon,
          billingCycle,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setStripeError(data.error || 'Failed to create subscription')
        setIsPaymentProcessing(false)
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
      console.error('Saved payment method error:', err)
      setStripeError('An unexpected error occurred')
      setIsPaymentProcessing(false)
    }
  }

  // Handle adding items to existing Stripe subscription with proration
  const handleAddToExistingSubscription = async () => {
    setIsPaymentProcessing(true)
    setStripeError(null)

    try {
      const effectiveClientId = viewingAs || client.id

      // Add each cart item to the subscription
      // Term products (12-month) use no proration, ongoing products use proration
      for (const item of cartItems) {
        if (!item.id || item.isFree) continue

        const response = await fetch(`/api/admin/clients/${effectiveClientId}/stripe-subscriptions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: item.id,
            billing_term_months: item.billingTermMonths || null,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || `Failed to add ${item.name} to subscription`)
        }
      }

      // Redirect to success page
      const successUrl = new URL('/checkout/success', window.location.origin)
      successUrl.searchParams.set('tier', selectedTier || '')
      if (viewingAs) {
        successUrl.searchParams.set('viewingAs', viewingAs)
      }
      successUrl.searchParams.set('redirect_status', 'succeeded')
      successUrl.searchParams.set('existing', 'true')

      window.location.href = successUrl.toString()
    } catch (err) {
      console.error('Add to subscription error:', err)
      setStripeError(err instanceof Error ? err.message : 'Failed to add to subscription')
      setIsPaymentProcessing(false)
    }
  }

  // Fetch recommendation items when tier is provided, or product from smart recommendations
  useEffect(() => {
    // Handle individual product from smart recommendations
    if (productId) {
      const clientId = viewingAs || client.id
      if (clientLoading || !clientId) {
        return
      }

      const fetchProduct = async () => {
        try {
          const res = await fetch(`/api/products/${productId}`)
          if (res.ok) {
            const product = await res.json()
            const monthlyPrice = Number(product.monthly_price || 0)
            const onetimePrice = Number(product.onetime_price || 0)

            // Determine which price to use based on priceOption
            let price: number
            let billingPeriod: 'monthly' | 'one-time'
            if (priceOption === 'monthly' && monthlyPrice > 0) {
              price = monthlyPrice
              billingPeriod = 'monthly'
            } else if (priceOption === 'onetime' && onetimePrice > 0) {
              price = onetimePrice
              billingPeriod = 'one-time'
            } else {
              // Default: prefer monthly if available
              price = monthlyPrice > 0 ? monthlyPrice : onetimePrice
              billingPeriod = monthlyPrice > 0 ? 'monthly' : 'one-time'
            }

            const cartItem: CartItem = {
              id: product.id,
              name: product.name,
              description: product.short_description || product.description || '',
              price,
              billingPeriod,
              category: product.category || 'service',
              billingTermMonths: product.billing_term_months || null,
            }
            setCartItems([cartItem])
          }
        } catch (error) {
          console.error('Failed to fetch product:', error)
        } finally {
          setIsLoading(false)
        }
      }

      fetchProduct()
      return
    }

    if (!tier) {
      // Build cart from product catalog for individual items
      if (itemId && productCatalog[itemId]) {
        setCartItems([productCatalog[itemId]])
      }
      setIsLoading(false)
      return
    }

    // Wait for client data to load before fetching
    if (clientLoading) {
      return
    }

    // Don't fetch until we have a client ID - prevents premature isLoading=false
    const clientId = viewingAs || client.id
    if (!clientId) {
      setIsLoading(false)
      return
    }

    async function fetchRecommendationItems() {
      try {
        const res = await fetch(`/api/client/recommendation?clientId=${clientId}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.recommendation) {
            setRecommendationId(data.recommendation.id)
            const tierItems = data.recommendation.recommendation_items.filter(
              (item: RecommendationItem) => item.tier === tier
            )

            // Convert recommendation items to cart items
            const items: CartItem[] = tierItems.map((item: RecommendationItem) => {
              const name = item.product?.name || item.bundle?.name || item.addon?.name || 'Service'
              const description = item.product?.short_description || item.bundle?.description || item.addon?.description || ''
              const monthlyPrice = Number(item.monthly_price || 0)
              const onetimePrice = Number(item.onetime_price || 0)
              const isFree = item.is_free || false
              const actualPrice = monthlyPrice > 0 ? monthlyPrice : onetimePrice

              // For free items, get original price from product/bundle/addon
              const productOriginalPrice = Number(item.product?.monthly_price || item.product?.onetime_price || 0)
              const bundleOriginalPrice = Number(item.bundle?.monthly_price || 0)
              const addonOriginalPrice = Number(item.addon?.monthly_price || 0)
              const originalPrice = isFree ? (productOriginalPrice || bundleOriginalPrice || addonOriginalPrice) : undefined

              return {
                id: item.id,
                name,
                description,
                price: isFree ? 0 : actualPrice,
                originalPrice, // Track original value for free items
                billingPeriod: monthlyPrice > 0 || item.product?.monthly_price || item.bundle?.monthly_price || item.addon?.monthly_price ? 'monthly' : 'one-time',
                category: item.product?.category || 'service',
                isFree
              } as CartItem
            })

            setCartItems(items)
          }
        }
      } catch (error) {
        console.error('Failed to fetch recommendation:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendationItems()
  }, [tier, viewingAs, client.id, itemId, productId, priceOption, clientLoading])

  // Fetch saved payment methods and check for existing subscriptions
  useEffect(() => {
    const effectiveClientId = viewingAs || client.id
    if (!effectiveClientId || clientLoading) {
      return
    }

    async function fetchPaymentMethodsAndSubscription() {
      try {
        const res = await fetch(`/api/client/subscription?clientId=${effectiveClientId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.paymentMethods && data.paymentMethods.length > 0) {
            setSavedPaymentMethods(data.paymentMethods)
            // Auto-select the default payment method if one exists
            const defaultMethod = data.paymentMethods.find((pm: { isDefault: boolean }) => pm.isDefault)
            if (defaultMethod) {
              setSelectedPaymentMethodId(defaultMethod.id)
            } else {
              // Select the first payment method as default
              setSelectedPaymentMethodId(data.paymentMethods[0].id)
            }
          }

          // Check if client has an active subscription
          if (data.subscription && data.subscription.status === 'active') {
            setHasActiveSubscription(true)
            // Parse billing date from currentPeriodEnd
            const periodEnd = data.subscription.currentPeriodEnd
              ? new Date(data.subscription.currentPeriodEnd)
              : null
            if (periodEnd) {
              const billingDate = periodEnd.getDate()
              setExistingSubscription({
                id: data.subscription.id,
                billingDate,
                currentPeriodEnd: data.subscription.currentPeriodEnd,
                nextBillingDate: periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              })
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch payment methods:', error)
      } finally {
        setLoadingPaymentMethods(false)
        setSubscriptionCheckComplete(true)
      }
    }

    fetchPaymentMethodsAndSubscription()
  }, [viewingAs, client.id, clientLoading])

  // Fetch proration preview for existing clients
  useEffect(() => {
    if (!hasActiveSubscription || !existingSubscription || cartItems.length === 0) {
      return
    }

    const effectiveClientId = viewingAs || client.id
    if (!effectiveClientId) return

    // Only fetch if we have product IDs
    const itemsWithId = cartItems.filter(item => item.id)
    if (itemsWithId.length === 0) return

    setProrationLoading(true)

    async function fetchProration() {
      try {
        const response = await fetch(`/api/admin/clients/${effectiveClientId}/proration-preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: itemsWithId.map(item => ({ productId: item.id })),
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setProrationAmount(data.prorationAmount)
        }
      } catch (error) {
        console.error('Failed to fetch proration:', error)
      } finally {
        setProrationLoading(false)
      }
    }

    fetchProration()
  }, [hasActiveSubscription, existingSubscription, cartItems, viewingAs, client.id])

  // Calculate base monthly total (excluding Analytics which is always free)
  const baseMonthlyTotal = cartItems.reduce((sum, item) => {
    if (item.billingPeriod === 'monthly' && !item.name.includes('Analytics Tracking')) {
      return sum + item.price
    }
    return sum
  }, 0)

  const monthlyTotal = cartItems.reduce((sum, item) =>
    item.billingPeriod === 'monthly' ? sum + item.price : sum, 0
  )
  const onetimeTotal = cartItems.reduce((sum, item) =>
    item.billingPeriod === 'one-time' ? sum + item.price : sum, 0
  )

  // Calculate free items value (for showing as discount)
  const freeItemsValue = cartItems.reduce((sum, item) =>
    item.isFree && item.originalPrice ? sum + item.originalPrice : sum, 0
  )
  const freeItemsCount = cartItems.filter(item => item.isFree).length

  // Validate coupon against Stripe
  const validateCouponWithStripe = async (code: string): Promise<{ valid: boolean; error?: string; discount?: { type: 'percent' | 'amount'; value: number } }> => {
    try {
      const res = await fetch('/api/stripe/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()

      if (!data.valid) {
        return { valid: false, error: data.error || 'Invalid coupon code' }
      }

      // Check Growth Rewards minimum spend requirement
      const upperCode = code.toUpperCase()
      const growthRewardsCoupon = VALID_COUPONS[upperCode]
      if (growthRewardsCoupon && baseMonthlyTotal < growthRewardsCoupon.minSpend) {
        return {
          valid: false,
          error: `This coupon requires a minimum of $${growthRewardsCoupon.minSpend}/mo (current: $${baseMonthlyTotal}/mo)`
        }
      }

      return { valid: true, discount: data.discount }
    } catch (err) {
      console.error('Coupon validation error:', err)
      return { valid: false, error: 'Failed to validate coupon' }
    }
  }

  const handleApplyCoupon = async () => {
    const code = couponInput.toUpperCase().trim()
    if (!code) return

    setCouponLoading(true)
    setCouponError(null)

    const result = await validateCouponWithStripe(code)

    if (result.valid) {
      setAppliedCoupon(code)
      setStripeCouponDiscount(result.discount || null)
      setCouponError(null)
      setCouponInput('')
    } else {
      setCouponError(result.error || 'Invalid coupon')
      setAppliedCoupon(null)
      setStripeCouponDiscount(null)
    }

    setCouponLoading(false)
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponError(null)
    setStripeCouponDiscount(null)
  }

  // Auto-apply coupon from URL when cart is loaded
  // Validate against Stripe before applying
  useEffect(() => {
    if (urlCoupon && cartItems.length > 0 && !appliedCoupon && !couponLoading) {
      const validateUrlCoupon = async () => {
        setCouponLoading(true)
        const result = await validateCouponWithStripe(urlCoupon)
        if (result.valid) {
          setAppliedCoupon(urlCoupon.toUpperCase())
          setStripeCouponDiscount(result.discount || null)
        } else {
          setCouponError(result.error || 'Coupon not valid')
        }
        setCouponLoading(false)
      }
      validateUrlCoupon()
    }
  }, [urlCoupon, cartItems.length, appliedCoupon, baseMonthlyTotal, couponLoading])

  // Fetch SetupIntent client secret for Stripe Elements
  // Re-fetch when billing cycle changes (different payment methods for annual vs monthly)
  // Skip for $0 orders (no payment needed)
  // Skip if using a saved payment method
  useEffect(() => {
    const effectiveClientId = viewingAs || client.id
    console.log('[Stripe] Effect triggered:', {
      cartItemsLength: cartItems.length,
      effectiveClientId,
      viewingAs,
      clientId: client.id,
      clientLoading,
      selectedPaymentMethodId
    })

    if (cartItems.length === 0) {
      console.log('[Stripe] Early return: no cart items')
      return
    }
    if (!effectiveClientId) {
      console.log('[Stripe] Early return: no client ID')
      return
    }

    // Wait for payment methods to finish loading
    if (loadingPaymentMethods) {
      console.log('[Stripe] Waiting for payment methods to load')
      return
    }

    // Don't create SetupIntent if using a saved payment method
    if (selectedPaymentMethodId !== 'new') {
      console.log('[Stripe] Skipping SetupIntent: using saved payment method')
      setClientSecret(null)
      return
    }

    // Calculate if this is a $0 order (e.g., 100% discount coupon)
    const currentMonthlyTotal = cartItems.reduce((sum, item) =>
      item.billingPeriod === 'monthly' ? sum + item.price : sum, 0
    )
    const currentOnetimeTotal = cartItems.reduce((sum, item) =>
      item.billingPeriod === 'one-time' ? sum + item.price : sum, 0
    )
    const currentCouponDiscount = appliedCoupon && VALID_COUPONS[appliedCoupon]
      ? Math.round(currentMonthlyTotal * (VALID_COUPONS[appliedCoupon].discount / 100) * 100) / 100
      : 0
    const currentDiscountedMonthly = currentMonthlyTotal - currentCouponDiscount
    const currentAnnualTotal = currentDiscountedMonthly * 12 * 0.9
    const currentTotalDue = billingCycle === 'monthly'
      ? currentDiscountedMonthly + currentOnetimeTotal
      : currentAnnualTotal + currentOnetimeTotal

    if (currentTotalDue === 0) {
      console.log('[Stripe] Skipping SetupIntent: $0 order')
      setClientSecret(null)
      return
    }

    // Reset client secret when billing cycle changes
    setClientSecret(null)

    async function createSetupIntent() {
      console.log('[Stripe] Creating SetupIntent for client:', effectiveClientId)
      try {
        const res = await fetch('/api/stripe/setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: effectiveClientId,
            email: client.contactEmail,
            name: client.name,
            billingCycle,
            hasOnetimeItems: currentOnetimeTotal > 0,
          }),
        })
        console.log('[Stripe] Response status:', res.status)
        const data = await res.json()
        console.log('[Stripe] Response data:', data)
        if (data.clientSecret) {
          console.log('[Stripe] Got client secret, setting state')
          setClientSecret(data.clientSecret)
        } else if (data.error) {
          console.error('[Stripe] API error:', data.error)
          setStripeError(data.error)
        } else {
          console.error('[Stripe] Unexpected response:', data)
          setStripeError('Unexpected response from payment server')
        }
      } catch (error) {
        console.error('[Stripe] Failed to create SetupIntent:', error)
        setStripeError('Failed to initialize payment form')
      }
    }

    createSetupIntent()
  }, [cartItems, client.id, client.contactEmail, client.name, viewingAs, billingCycle, clientLoading, appliedCoupon, selectedPaymentMethodId, loadingPaymentMethods])

  // Calculate discount - use Stripe-validated discount if available, fallback to hardcoded
  const couponDiscountPercent = stripeCouponDiscount?.type === 'percent'
    ? stripeCouponDiscount.value
    : (appliedCoupon && VALID_COUPONS[appliedCoupon]?.discount) || 0

  // Apply discount to monthly total
  const monthlyDiscount = couponDiscountPercent > 0
    ? Math.round(monthlyTotal * (couponDiscountPercent / 100) * 100) / 100
    : 0
  const discountedMonthlyTotal = monthlyTotal - monthlyDiscount

  // Apply discount to one-time total
  const onetimeDiscount = couponDiscountPercent > 0
    ? Math.round(onetimeTotal * (couponDiscountPercent / 100) * 100) / 100
    : 0
  const discountedOnetimeTotal = onetimeTotal - onetimeDiscount

  // Total coupon discount for display
  const couponDiscount = monthlyDiscount + onetimeDiscount

  const annualTotal = discountedMonthlyTotal * 12 * 0.9 // 10% discount for annual

  // Calculate total due today - for detecting $0 orders
  const totalDueToday = billingCycle === 'monthly'
    ? discountedMonthlyTotal + discountedOnetimeTotal
    : annualTotal + discountedOnetimeTotal
  const isZeroOrder = totalDueToday === 0

  // Check if all monthly items in cart are term products (12-month term)
  // Term products for existing clients: $0 due today, starts on next billing date
  const allItemsAreTermProducts = cartItems
    .filter(item => item.billingPeriod === 'monthly' && !item.isFree)
    .every(item => item.billingTermMonths && item.billingTermMonths > 0)

  // For existing clients with term products, due today is $0
  const isTermProductCheckout = hasActiveSubscription && allItemsAreTermProducts && cartItems.some(item => item.billingTermMonths)

  // Check if this is a one-time only purchase (no monthly items)
  const isOnetimeOnlyPurchase = discountedMonthlyTotal === 0 && discountedOnetimeTotal > 0


  // Loading state when mounting or fetching recommendation items
  if (!mounted || clientLoading || isLoading) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <Link href={backHref} className="checkout-back-link">
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
            <div className="spinner" style={{ width: 48, height: 48 }}></div>
            <h2>Loading your plan...</h2>
            <p>Please wait while we prepare your order.</p>
          </div>
        </div>
      </>
    )
  }

  // Empty cart state
  if (cartItems.length === 0) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <Link href={backHref} className="checkout-back-link">
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
            <Link href={`/recommendations${viewingAs ? `?viewingAs=${viewingAs}` : ''}`} className="btn btn-primary">
              View Recommendations
            </Link>
          </div>
        </div>
      </>
    )
  }

  // Get tier label for display
  const tierLabel = selectedTier ? {
    good: 'Good',
    better: 'Better',
    best: 'Best'
  }[selectedTier] : null

  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <Link href={backHref} className="checkout-back-link">
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
                {tierLabel ? `Your ${tierLabel} Plan` : 'Your Order'}
              </h2>

              <div className="checkout-items">
                {cartItems.map((item) => (
                  <div key={item.id} className="checkout-item">
                    <div className="checkout-item-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="checkout-item-details">
                      <h4>
                        {item.name}
                        {item.isFree && <span className="checkout-free-badge">FREE</span>}
                      </h4>
                      <p>{item.description}</p>
                    </div>
                    <div className="checkout-item-price">
                      {item.isFree ? (
                        <>
                          <span className="price included">Included</span>
                        </>
                      ) : (
                        <>
                          <span className="price">${item.price.toLocaleString()}</span>
                          <span className="period">
                            {item.billingPeriod === 'monthly'
                              ? item.billingTermMonths
                                ? `/mo for ${item.billingTermMonths} months`
                                : '/mo'
                              : ' one-time'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Billing Cycle - Only show if there are monthly items and not a term-only or one-time purchase */}
            {monthlyTotal > 0 && !isTermProductCheckout && !isOnetimeOnlyPurchase && (
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
                      <span className="billing-option-price">${discountedMonthlyTotal.toLocaleString(undefined, { minimumFractionDigits: discountedMonthlyTotal % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}/mo</span>
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
                      <span className="billing-option-price">${(annualTotal / 12).toLocaleString(undefined, { minimumFractionDigits: (annualTotal / 12) % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}/mo</span>
                      <span className="billing-option-detail">Billed ${annualTotal.toLocaleString(undefined, { minimumFractionDigits: annualTotal % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })} annually</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Payment Method - Hidden for $0 orders */}
            {!isZeroOrder && (
              <div className="checkout-section">
                <h2 className="checkout-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  Payment Method
                </h2>

                <div className="payment-form">
                  {/* For existing clients with active subscriptions adding monthly items, show their existing payment method */}
                  {/* One-time purchases require ACH, so they go through the regular payment selection flow */}
                  {hasActiveSubscription && savedPaymentMethods.length > 0 && !isOnetimeOnlyPurchase ? (
                    <div className="existing-client-payment">
                      <div style={{
                        backgroundColor: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" width="20" height="20">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span style={{ color: '#166534' }}>Using your existing payment method on file</span>
                      </div>
                      {savedPaymentMethods[0] && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                          </svg>
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {savedPaymentMethods[0].brand.charAt(0).toUpperCase() + savedPaymentMethods[0].brand.slice(1)} ending in {savedPaymentMethods[0].last4}
                            </div>
                            {savedPaymentMethods[0].expMonth > 0 && savedPaymentMethods[0].expYear > 0 && (
                              <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                Expires {savedPaymentMethods[0].expMonth}/{savedPaymentMethods[0].expYear}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {prorationAmount !== null && prorationAmount > 0 && !isOnetimeOnlyPurchase && !isTermProductCheckout && (
                        <div style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          backgroundColor: '#FEF3C7',
                          borderRadius: '8px',
                          border: '1px solid #FCD34D',
                        }}>
                          <div style={{ fontWeight: 600, color: '#92400E', marginBottom: '0.25rem' }}>
                            Prorated charge: ${prorationAmount.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#92400E' }}>
                            This covers the remaining days until your next billing date
                            {existingSubscription?.nextBillingDate && <> ({existingSubscription.nextBillingDate})</>}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : loadingPaymentMethods ? (
                    <div className="stripe-loading">
                      <div className="spinner" style={{ width: 24, height: 24 }}></div>
                      <p>Loading payment methods...</p>
                    </div>
                  ) : (
                    <>
                      {/* Saved Payment Methods - filter to ACH only for one-time or annual */}
                      {savedPaymentMethods.filter(pm =>
                        (billingCycle === 'annual' || onetimeTotal > 0) ? pm.type === 'us_bank_account' : true
                      ).length > 0 && (
                        <div className="saved-payment-methods">
                          {savedPaymentMethods.filter(pm =>
                            (billingCycle === 'annual' || onetimeTotal > 0) ? pm.type === 'us_bank_account' : true
                          ).map((pm) => (
                            <label
                              key={pm.id}
                              className={`payment-method-option ${selectedPaymentMethodId === pm.id ? 'selected' : ''}`}
                            >
                              <input
                                type="radio"
                                name="paymentMethod"
                                value={pm.id}
                                checked={selectedPaymentMethodId === pm.id}
                                onChange={() => setSelectedPaymentMethodId(pm.id)}
                              />
                              <div className="payment-method-option-content">
                                {pm.type === 'card' ? (
                                  <>
                                    <div className="payment-method-icon">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                        <line x1="1" y1="10" x2="23" y2="10"></line>
                                      </svg>
                                    </div>
                                    <div className="payment-method-details">
                                      <span className="payment-method-brand">{pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)}</span>
                                      <span className="payment-method-last4">ending in {pm.last4}</span>
                                      {pm.expMonth > 0 && pm.expYear > 0 && (
                                        <span className="payment-method-exp">Expires {pm.expMonth}/{pm.expYear}</span>
                                      )}
                                    </div>
                                  </>
                                ) : pm.type === 'us_bank_account' ? (
                                  <>
                                    <div className="payment-method-icon">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                        <path d="M3 21h18"></path>
                                        <path d="M3 10h18"></path>
                                        <path d="M5 6l7-3 7 3"></path>
                                        <path d="M4 10v11"></path>
                                        <path d="M20 10v11"></path>
                                        <path d="M8 14v3"></path>
                                        <path d="M12 14v3"></path>
                                        <path d="M16 14v3"></path>
                                      </svg>
                                    </div>
                                    <div className="payment-method-details">
                                      <span className="payment-method-brand">{pm.bankName || 'Bank Account'}</span>
                                      <span className="payment-method-last4">ending in {pm.last4}</span>
                                      {pm.accountType && (
                                        <span className="payment-method-exp">{pm.accountType.charAt(0).toUpperCase() + pm.accountType.slice(1)}</span>
                                      )}
                                    </div>
                                  </>
                                ) : pm.type === 'link' ? (
                                  <>
                                    <div className="payment-method-icon">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                      </svg>
                                    </div>
                                    <div className="payment-method-details">
                                      <span className="payment-method-brand">Link</span>
                                      <span className="payment-method-last4">{pm.linkEmail}</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="payment-method-icon">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                        <line x1="1" y1="10" x2="23" y2="10"></line>
                                      </svg>
                                    </div>
                                    <div className="payment-method-details">
                                      <span className="payment-method-brand">{pm.type}</span>
                                      <span className="payment-method-last4">ending in {pm.last4}</span>
                                    </div>
                                  </>
                                )}
                                {pm.isDefault && <span className="payment-method-default-badge">Default</span>}
                              </div>
                            </label>
                          ))}

                          {/* Add New Payment Method Option */}
                          <label
                            className={`payment-method-option ${selectedPaymentMethodId === 'new' ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="new"
                              checked={selectedPaymentMethodId === 'new'}
                              onChange={() => setSelectedPaymentMethodId('new')}
                            />
                            <div className="payment-method-option-content">
                              <div className="payment-method-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </div>
                              <div className="payment-method-details">
                                <span className="payment-method-brand">Add new payment method</span>
                              </div>
                            </div>
                          </label>
                        </div>
                      )}

                      {/* Stripe PaymentElement - only show when adding new payment method */}
                      {(selectedPaymentMethodId === 'new' || savedPaymentMethods.length === 0) && (
                        <>
                          {!stripePromise ? (
                            <div className="stripe-error">
                              <p>Payment system is not configured. Please contact support.</p>
                            </div>
                          ) : stripeError ? (
                            <div className="stripe-error">
                              <p>{stripeError}</p>
                            </div>
                          ) : !clientSecret ? (
                            <div className="stripe-loading">
                              <div className="spinner" style={{ width: 24, height: 24 }}></div>
                              <p>Loading payment form...</p>
                            </div>
                          ) : (
                            <Elements
                              key={`${clientSecret}-${billingCycle}`}
                              stripe={stripePromise}
                              options={{
                                clientSecret,
                                appearance: {
                                  theme: 'stripe',
                                  variables: {
                                    colorPrimary: '#324438',
                                    fontFamily: 'Inter, system-ui, sans-serif',
                                  },
                                },
                              }}
                            >
                              <PaymentForm
                                clientId={viewingAs || client.id}
                                recommendationId={recommendationId}
                                selectedTier={selectedTier}
                                cartItems={cartItems}
                                couponCode={appliedCoupon}
                                billingCycle={billingCycle}
                                viewingAs={viewingAs}
                                onError={(error) => setStripeError(error)}
                                onProcessingChange={setIsPaymentProcessing}
                                onReadyChange={setIsPaymentReady}
                              />
                            </Elements>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>

                {(billingCycle === 'annual' || onetimeTotal > 0) && (
                  <div className="ach-notice">
                    <div className="ach-notice-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                        <path d="M3 21h18"></path>
                        <path d="M3 10h18"></path>
                        <path d="M5 6l7-3 7 3"></path>
                        <path d="M4 10v11"></path>
                        <path d="M20 10v11"></path>
                        <path d="M8 14v3"></path>
                        <path d="M12 14v3"></path>
                        <path d="M16 14v3"></path>
                      </svg>
                    </div>
                    <div className="ach-notice-content">
                      <strong>Bank Transfer (ACH) Required</strong>
                      <p>
                        {billingCycle === 'annual' && onetimeTotal > 0
                          ? 'Annual billing and one-time purchases require payment via ACH bank transfer.'
                          : billingCycle === 'annual'
                            ? 'Annual billing requires payment via ACH bank transfer for security.'
                            : 'One-time purchases require payment via ACH bank transfer. If you prefer credit or debit card, go back and try the monthly payment option.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                    <input type="text" id="firstName" defaultValue={client.contactName.split(' ')[0] || ''} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input type="text" id="lastName" defaultValue={client.contactName.split(' ').slice(1).join(' ') || ''} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" defaultValue={client.contactEmail || ''} />
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
              <h3 className="order-summary-title">
                {tierLabel ? `${tierLabel} Plan Summary` : 'Order Summary'}
              </h3>

              {/* Item count summary - show full price including free items' value */}
              <div className="order-summary-row">
                <span>{cartItems.length} service{cartItems.length !== 1 ? 's' : ''}</span>
                <span>${(monthlyTotal + freeItemsValue).toLocaleString()}/mo</span>
              </div>

              {/* Free items discount */}
              {freeItemsCount > 0 && freeItemsValue > 0 && (
                <div className="order-summary-row discount">
                  <span>Free item{freeItemsCount !== 1 ? 's' : ''} ({freeItemsCount})</span>
                  <span>-${freeItemsValue.toLocaleString()}/mo</span>
                </div>
              )}

              {onetimeTotal > 0 && (
                <div className="order-summary-row">
                  <span>One-time fees</span>
                  <span>${discountedOnetimeTotal.toLocaleString()}</span>
                </div>
              )}
              {onetimeDiscount > 0 && (
                <div className="order-summary-row discount">
                  <span>One-time discount ({couponDiscountPercent}% off)</span>
                  <span>-${onetimeDiscount.toLocaleString()}</span>
                </div>
              )}

              <div className="order-summary-divider"></div>

              {/* Coupon Section */}
              <div className="coupon-section">
                {appliedCoupon ? (
                  <div className="applied-coupon">
                    <div className="applied-coupon-info">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                        <line x1="7" y1="7" x2="7.01" y2="7"></line>
                      </svg>
                      <span className="coupon-code">{appliedCoupon}</span>
                      {stripeCouponDiscount?.type === 'percent' ? (
                        <span className="coupon-discount">({stripeCouponDiscount.value}% off)</span>
                      ) : VALID_COUPONS[appliedCoupon] ? (
                        <span className="coupon-discount">({VALID_COUPONS[appliedCoupon].discount}% off)</span>
                      ) : couponLoading ? (
                        <span className="coupon-discount">(Validating...)</span>
                      ) : (
                        <span className="coupon-discount">(Applied at checkout)</span>
                      )}
                    </div>
                    <button type="button" className="remove-coupon" onClick={handleRemoveCoupon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="coupon-input-row">
                    <input
                      type="text"
                      placeholder="Coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && !couponLoading && handleApplyCoupon()}
                      className="coupon-input"
                      disabled={couponLoading}
                    />
                    <button
                      type="button"
                      className="btn btn-sm coupon-apply-btn"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                    >
                      {couponLoading ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="coupon-error">{couponError}</p>
                )}
              </div>

              <div className="order-summary-divider"></div>

              {/* Discounts */}
              {appliedCoupon && couponDiscount > 0 && (
                <div className="order-summary-row discount">
                  <span>Coupon ({appliedCoupon})</span>
                  <span>-${couponDiscount.toLocaleString(undefined, { minimumFractionDigits: couponDiscount % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}/mo</span>
                </div>
              )}

              {billingCycle === 'annual' && discountedMonthlyTotal > 0 && (
                <div className="order-summary-row discount">
                  <span>Annual discount (10%)</span>
                  <span>-${(discountedMonthlyTotal * 12 * 0.1).toLocaleString(undefined, { minimumFractionDigits: (discountedMonthlyTotal * 12 * 0.1) % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="order-summary-divider"></div>

              <div className="order-summary-total">
                <span>{hasActiveSubscription && !isOnetimeOnlyPurchase ? (isTermProductCheckout ? 'Due Today' : 'Prorated Due Today') : 'Total Due Today'}</span>
                <div className="total-amount">
                  {!subscriptionCheckComplete ? (
                    // Still checking for existing subscription
                    <span className="amount" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="spinner" style={{ width: 16, height: 16 }}></span>
                    </span>
                  ) : isOnetimeOnlyPurchase ? (
                    // One-time only purchase - show full one-time total (no proration)
                    <span className="amount">${discountedOnetimeTotal.toLocaleString()}</span>
                  ) : hasActiveSubscription ? (
                    // Existing client with monthly items
                    isTermProductCheckout ? (
                      // Term product - $0 due today, starts on next billing date
                      <span className="amount">$0.00</span>
                    ) : prorationLoading ? (
                      <span className="amount" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="spinner" style={{ width: 16, height: 16 }}></span>
                      </span>
                    ) : prorationAmount !== null ? (
                      <span className="amount">${prorationAmount.toFixed(2)}</span>
                    ) : (
                      <span className="amount">--</span>
                    )
                  ) : (
                    <>
                      <span className="amount">
                        ${(billingCycle === 'monthly'
                          ? discountedMonthlyTotal + discountedOnetimeTotal
                          : annualTotal + discountedOnetimeTotal
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: (billingCycle === 'monthly' ? discountedMonthlyTotal + discountedOnetimeTotal : annualTotal + discountedOnetimeTotal) % 1 !== 0 ? 2 : 0,
                          maximumFractionDigits: 2
                        })}
                      </span>
                      {billingCycle === 'monthly' && discountedMonthlyTotal > 0 && <span className="period">{discountedOnetimeTotal > 0 ? '' : '/mo'}</span>}
                    </>
                  )}
                </div>
              </div>

              {billingCycle === 'annual' && discountedMonthlyTotal > 0 && (
                <p className="order-summary-note">
                  You&apos;ll be charged ${(annualTotal + discountedOnetimeTotal).toLocaleString()} today for 12 months of service{discountedOnetimeTotal > 0 ? ' plus one-time fees' : ''}.
                </p>
              )}

              {billingCycle === 'monthly' && discountedMonthlyTotal > 0 && subscriptionCheckComplete && (
                <p className="order-summary-note">
                  {hasActiveSubscription && existingSubscription && isTermProductCheckout ? (
                    // Term product for existing client - starts on next billing date
                    <>Billing starts {existingSubscription.nextBillingDate} at ${discountedMonthlyTotal.toLocaleString(undefined, { minimumFractionDigits: discountedMonthlyTotal % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}/mo for 12 months (${(discountedMonthlyTotal * 12).toLocaleString()} total).</>
                  ) : hasActiveSubscription && existingSubscription ? (
                    // Ongoing product for existing client - show proration message
                    <>then, ${discountedMonthlyTotal.toLocaleString(undefined, { minimumFractionDigits: discountedMonthlyTotal % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}/mo on the {existingSubscription.billingDate}{getOrdinalSuffix(existingSubscription.billingDate)} of each month.</>
                  ) : discountedOnetimeTotal > 0 ? (
                    <>You&apos;ll be charged ${(discountedMonthlyTotal + discountedOnetimeTotal).toLocaleString(undefined, { minimumFractionDigits: (discountedMonthlyTotal + discountedOnetimeTotal) % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })} today, then ${discountedMonthlyTotal.toLocaleString(undefined, { minimumFractionDigits: discountedMonthlyTotal % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}/mo on the {(() => {
                      const day = new Date().getDate()
                      const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'
                      return `${day}${suffix}`
                    })()} of each month.</>
                  ) : (
                    <>then, ${discountedMonthlyTotal.toLocaleString(undefined, { minimumFractionDigits: discountedMonthlyTotal % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}/mo on the {(() => {
                      const day = new Date().getDate()
                      const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'
                      return `${day}${suffix}`
                    })()} of each month.</>
                  )}
                </p>
              )}

              {/* Note for one-time only purchases */}
              {discountedMonthlyTotal === 0 && discountedOnetimeTotal > 0 && (
                <p className="order-summary-note">
                  This is a one-time purchase. You&apos;ll be charged ${discountedOnetimeTotal.toLocaleString()} today.
                </p>
              )}

              {/* Complete Purchase Button - Different for $0 vs paid orders vs saved payment method vs existing subscription */}
              {isZeroOrder ? (
                <>
                  {freeOrderError && (
                    <div className="stripe-error" style={{ marginBottom: '1rem' }}>
                      <p>{freeOrderError}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleFreeOrderSubmit}
                    className={`btn btn-primary btn-lg checkout-btn ${isFreeOrderProcessing ? 'processing' : ''}`}
                    disabled={isFreeOrderProcessing}
                    style={{ width: '100%', marginTop: '1rem' }}
                  >
                    {isFreeOrderProcessing ? (
                      <>
                        <span className="spinner"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Complete Order
                      </>
                    )}
                  </button>
                </>
              ) : hasActiveSubscription ? (
                // Existing client - add to subscription
                <button
                  type="button"
                  onClick={handleAddToExistingSubscription}
                  className={`btn btn-primary btn-lg checkout-btn ${isPaymentProcessing ? 'processing' : ''}`}
                  disabled={isPaymentProcessing || prorationLoading}
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  {isPaymentProcessing ? (
                    <>
                      <span className="spinner"></span>
                      Adding to Subscription...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add to Subscription
                    </>
                  )}
                </button>
              ) : selectedPaymentMethodId !== 'new' ? (
                // Using saved payment method
                <button
                  type="button"
                  onClick={handleSavedPaymentMethodSubmit}
                  className={`btn btn-primary btn-lg checkout-btn ${isPaymentProcessing ? 'processing' : ''}`}
                  disabled={isPaymentProcessing}
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  {isPaymentProcessing ? (
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
              ) : (
                // Using new payment method via Stripe Elements
                <button
                  type="submit"
                  form="checkout-payment-form"
                  className={`btn btn-primary btn-lg checkout-btn ${isPaymentProcessing ? 'processing' : ''}`}
                  disabled={!isPaymentReady || isPaymentProcessing || !clientSecret}
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  {isPaymentProcessing ? (
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
              )}

              <div className="checkout-trust-badges">
                <div className="checkout-guarantee">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <polyline points="9 12 11 14 15 10"></polyline>
                  </svg>
                  <span>30-day money-back guarantee</span>
                </div>
                <div className="checkout-secure-inline">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Secure checkout by Stripe</span>
                </div>
              </div>

              <p className="checkout-terms">
                By completing this purchase, you agree to our{' '}
                <button type="button" className="checkout-terms-link" onClick={() => setShowTermsModal(true)}>Terms of Service</button> and{' '}
                <button type="button" className="checkout-terms-link" onClick={() => setShowPrivacyModal(true)}>Privacy Policy</button>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="privacy-modal-overlay" onClick={() => setShowPrivacyModal(false)}>
          <div className="privacy-modal" onClick={(e) => e.stopPropagation()}>
            <div className="privacy-modal-header">
              <h2>Privacy Policy</h2>
              <button className="privacy-modal-close" onClick={() => setShowPrivacyModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="privacy-modal-content">
              <section className="privacy-section">
                <h3>Who we are</h3>
                <p>Our website address is: https://pyrusdigitalmedia.com.</p>
              </section>

              <section className="privacy-section">
                <h3>Comments</h3>
                <p>When visitors leave comments on the site we collect the data shown in the comments form, and also the visitor&apos;s IP address and browser user agent string to help spam detection.</p>
                <p>An anonymized string created from your email address (also called a hash) may be provided to the Gravatar service to see if you are using it. The Gravatar service privacy policy is available here: https://automattic.com/privacy/. After approval of your comment, your profile picture is visible to the public in the context of your comment.</p>
              </section>

              <section className="privacy-section">
                <h3>Media</h3>
                <p>If you upload images to the website, you should avoid uploading images with embedded location data (EXIF GPS) included. Visitors to the website can download and extract any location data from images on the website.</p>
              </section>

              <section className="privacy-section">
                <h3>Cookies</h3>
                <p>If you leave a comment on our site you may opt-in to saving your name, email address and website in cookies. These are for your convenience so that you do not have to fill in your details again when you leave another comment. These cookies will last for one year.</p>
                <p>If you visit our login page, we will set a temporary cookie to determine if your browser accepts cookies. This cookie contains no personal data and is discarded when you close your browser.</p>
                <p>When you log in, we will also set up several cookies to save your login information and your screen display choices. Login cookies last for two days, and screen options cookies last for a year. If you select &quot;Remember Me&quot;, your login will persist for two weeks. If you log out of your account, the login cookies will be removed.</p>
                <p>If you edit or publish an article, an additional cookie will be saved in your browser. This cookie includes no personal data and simply indicates the post ID of the article you just edited. It expires after 1 day.</p>
              </section>

              <section className="privacy-section">
                <h3>Embedded content from other websites</h3>
                <p>Articles on this site may include embedded content (e.g. videos, images, articles, etc.). Embedded content from other websites behaves in the exact same way as if the visitor has visited the other website.</p>
                <p>These websites may collect data about you, use cookies, embed additional third-party tracking, and monitor your interaction with that embedded content, including tracking your interaction with the embedded content if you have an account and are logged in to that website.</p>
              </section>

              <section className="privacy-section">
                <h3>Who we share your data with</h3>
                <p>If you request a password reset, your IP address will be included in the reset email.</p>
              </section>

              <section className="privacy-section">
                <h3>How long we retain your data</h3>
                <p>If you leave a comment, the comment and its metadata are retained indefinitely. This is so we can recognize and approve any follow-up comments automatically instead of holding them in a moderation queue.</p>
                <p>For users that register on our website (if any), we also store the personal information they provide in their user profile. All users can see, edit, or delete their personal information at any time (except they cannot change their username). Website administrators can also see and edit that information.</p>
              </section>

              <section className="privacy-section">
                <h3>What rights you have over your data</h3>
                <p>If you have an account on this site, or have left comments, you can request to receive an exported file of the personal data we hold about you, including any data you have provided to us. You can also request that we erase any personal data we hold about you. This does not include any data we are obliged to keep for administrative, legal, or security purposes.</p>
              </section>

              <section className="privacy-section">
                <h3>Where we send your data</h3>
                <p>Visitor comments may be checked through an automated spam detection service.</p>
              </section>
            </div>
            <div className="privacy-modal-footer">
              <button className="btn btn-primary" onClick={() => setShowPrivacyModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="privacy-modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div className="privacy-modal" onClick={(e) => e.stopPropagation()}>
            <div className="privacy-modal-header">
              <h2>Terms of Service</h2>
              <button className="privacy-modal-close" onClick={() => setShowTermsModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="privacy-modal-content">
              <section className="privacy-section">
                <h3>1. Agreement to Terms</h3>
                <p>By accessing or using the services provided by Pyrus Digital Media (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
              </section>

              <section className="privacy-section">
                <h3>2. Services</h3>
                <p>Pyrus Digital Media provides digital marketing services including but not limited to website design and development, search engine optimization (SEO), paid advertising management, content creation, and related consulting services.</p>
                <p>We reserve the right to modify, suspend, or discontinue any aspect of our services at any time without prior notice.</p>
              </section>

              <section className="privacy-section">
                <h3>3. Client Responsibilities</h3>
                <p>You agree to provide accurate, complete, and current information as required for us to deliver our services. You are responsible for maintaining the confidentiality of any account credentials and for all activities that occur under your account.</p>
                <p>You agree to promptly review and respond to requests for content approval, feedback, or information necessary to complete your project.</p>
              </section>

              <section className="privacy-section">
                <h3>4. Payment Terms</h3>
                <p>Payment is due according to the terms specified in your service agreement or invoice. For recurring services, you authorize us to charge your payment method on a recurring basis until you cancel.</p>
                <p><strong>30-Day Money-Back Guarantee:</strong> We offer a 30-day money-back guarantee on our services. If you are not satisfied with our services within the first 30 days of your subscription, you may request a full refund by contacting us in writing. This guarantee applies to the first billing cycle only and excludes any third-party costs or fees already incurred on your behalf.</p>
                <p>After the 30-day guarantee period, fees are non-refundable unless otherwise specified in writing or required by applicable law. We reserve the right to suspend services for accounts with overdue balances.</p>
              </section>

              <section className="privacy-section">
                <h3>5. Intellectual Property</h3>
                <p>Upon full payment, you will own the final deliverables created specifically for you, unless otherwise agreed. We retain ownership of any pre-existing materials, templates, frameworks, or tools used in creating your deliverables.</p>
                <p>We reserve the right to showcase completed work in our portfolio unless you request otherwise in writing.</p>
              </section>

              <section className="privacy-section">
                <h3>6. Confidentiality</h3>
                <p>We will maintain the confidentiality of your proprietary information and will not disclose it to third parties except as necessary to provide our services or as required by law.</p>
              </section>

              <section className="privacy-section">
                <h3>7. Limitation of Liability</h3>
                <p>To the maximum extent permitted by law, Pyrus Digital Media shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.</p>
                <p>Our total liability for any claim arising from these terms or our services shall not exceed the amount paid by you for the services in the twelve (12) months preceding the claim.</p>
              </section>

              <section className="privacy-section">
                <h3>8. Termination</h3>
                <p>Either party may terminate services with 30 days written notice. Upon termination, you are responsible for payment of all services rendered up to the termination date.</p>
                <p>We may terminate or suspend services immediately if you breach these terms or fail to make timely payments.</p>
              </section>

              <section className="privacy-section">
                <h3>9. Dispute Resolution</h3>
                <p>Any disputes arising from these terms or our services shall be resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in accordance with applicable laws.</p>
              </section>

              <section className="privacy-section">
                <h3>10. Changes to Terms</h3>
                <p>We may update these Terms of Service from time to time. We will notify you of any material changes by posting the new terms on our website or through direct communication. Your continued use of our services after such changes constitutes acceptance of the updated terms.</p>
              </section>

              <section className="privacy-section">
                <h3>11. Contact Information</h3>
                <p>If you have any questions about these Terms of Service, please contact us at:</p>
                <p>Pyrus Digital Media<br />702 Houston St, Fort Worth, TX 76102<br />Email: support@pyrusdigitalmedia.com<br />Website: https://pyrusdigitalmedia.com</p>
              </section>
            </div>
            <div className="privacy-modal-footer">
              <button className="btn btn-primary" onClick={() => setShowTermsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

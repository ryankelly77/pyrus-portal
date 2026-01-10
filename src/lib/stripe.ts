import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Use the latest API version from the installed package
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

// Coupon configuration matching REWARD_TIERS in pricing.ts
export const COUPON_CODES: Record<string, number> = {
  'HARVEST5X': 5,    // 5% discount at $1000+ monthly
  'CULTIVATE10': 10, // 10% discount at $2000+ monthly
}

// Helper to get coupon/promotion code from Stripe
export async function getOrCreateCoupon(code: string): Promise<string | null> {
  const upperCode = code.toUpperCase()

  // First, try to find as a Stripe Promotion Code
  try {
    const promoCodes = await stripe.promotionCodes.list({
      code: code, // Stripe promotion codes are case-sensitive, try original
      active: true,
      limit: 1,
    })

    if (promoCodes.data.length > 0) {
      // Return the coupon ID associated with this promotion code
      const promoCode = promoCodes.data[0]
      console.log(`Found Stripe promotion code: ${code} -> coupon ${promoCode.coupon.id}`)
      return promoCode.coupon.id
    }
  } catch (err) {
    console.log('Promotion code lookup failed:', err)
  }

  // Fall back to hardcoded coupon codes
  const discountPercent = COUPON_CODES[upperCode]
  if (!discountPercent) {
    console.log(`Coupon code not found: ${code}`)
    return null
  }

  try {
    // Try to retrieve existing coupon
    const coupon = await stripe.coupons.retrieve(upperCode)
    return coupon.id
  } catch {
    // Create coupon if it doesn't exist
    const coupon = await stripe.coupons.create({
      id: upperCode,
      percent_off: discountPercent,
      duration: 'forever',
      name: `${discountPercent}% Growth Rewards Discount`,
    })
    return coupon.id
  }
}

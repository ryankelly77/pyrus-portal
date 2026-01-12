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
  'TEST2': 100,      // 100% discount for testing
}

// Helper to get coupon/promotion code from Stripe
export async function getOrCreateCoupon(code: string): Promise<string | null> {
  const upperCode = code.toUpperCase()
  const lowerCode = code.toLowerCase()

  // Try multiple case variations for Stripe Promotion Code lookup
  const codesToTry = [code, lowerCode, upperCode]

  for (const tryCode of codesToTry) {
    try {
      console.log(`Trying promotion code lookup: "${tryCode}"`)
      const promoCodes = await stripe.promotionCodes.list({
        code: tryCode,
        active: true,
        limit: 1,
        expand: ['data.coupon'],
      })

      if (promoCodes.data.length > 0) {
        // Return the coupon ID associated with this promotion code
        const promoCode = promoCodes.data[0] as unknown as { coupon: { id: string } }
        console.log(`Found Stripe promotion code: ${tryCode} -> coupon ${promoCode.coupon.id}`)
        return promoCode.coupon.id
      }
    } catch (err) {
      console.log(`Promotion code lookup failed for "${tryCode}":`, err)
    }
  }

  // Fall back to hardcoded coupon codes
  const discountPercent = COUPON_CODES[upperCode]
  if (!discountPercent) {
    console.log(`Coupon code not found in Stripe or hardcoded list: ${code}`)
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

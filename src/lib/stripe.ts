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

// Known promotion codes mapped to their Stripe promotion code IDs
export const PROMOTION_CODE_IDS: Record<string, string> = {
  'SAVE10': 'promo_1SwWW4G6lmzQA2EM4mlTKbvs',
  'BIGDEAL100': 'promo_1SwWbPG6lmzQA2EMsLCs0AP8',
}

// Available coupon codes for admin UI dropdowns
export const AVAILABLE_COUPON_CODES = [
  { code: 'SAVE10', label: 'SAVE10 - 10% Off' },
  { code: 'BIGDEAL100', label: 'BIGDEAL100' },
]

// Helper to get coupon/promotion code from Stripe
export async function getOrCreateCoupon(code: string): Promise<string | null> {
  const upperCode = code.toUpperCase()
  const lowerCode = code.toLowerCase()

  // Check if we have a known promotion code ID mapping
  const knownPromoId = PROMOTION_CODE_IDS[upperCode]
  if (knownPromoId) {
    try {
      console.log(`[Coupon] Looking up known promotion code ID: ${knownPromoId}`)
      const promoCode = await stripe.promotionCodes.retrieve(knownPromoId, {
        expand: ['coupon'],
      }) as any
      if (promoCode.active) {
        const coupon = promoCode.coupon as { id: string }
        console.log(`[Coupon] Found promotion code ${upperCode} -> coupon ${coupon.id}`)
        return coupon.id
      }
    } catch (err) {
      console.log(`[Coupon] Known promotion code lookup failed for ${upperCode}:`, err)
    }
  }

  // Try multiple case variations for Stripe Promotion Code lookup
  const codesToTry = [code, lowerCode, upperCode]

  for (const tryCode of codesToTry) {
    try {
      console.log(`[Coupon] Trying promotion code lookup: "${tryCode}"`)
      const promoCodes = await stripe.promotionCodes.list({
        code: tryCode,
        active: true,
        limit: 1,
        expand: ['data.coupon'],
      })

      if (promoCodes.data.length > 0) {
        // Return the coupon ID associated with this promotion code
        const promoCode = promoCodes.data[0] as unknown as { coupon: { id: string } }
        console.log(`[Coupon] Found Stripe promotion code: ${tryCode} -> coupon ${promoCode.coupon.id}`)
        return promoCode.coupon.id
      }
    } catch (err) {
      console.log(`[Coupon] Promotion code lookup failed for "${tryCode}":`, err)
    }
  }

  // Fall back to hardcoded coupon codes
  const discountPercent = COUPON_CODES[upperCode]
  console.log(`[Coupon] Checking hardcoded list for ${upperCode}: ${discountPercent}%`)
  if (!discountPercent) {
    console.log(`[Coupon] Code not found in Stripe or hardcoded list: ${code}`)
    return null
  }

  try {
    // Try to retrieve existing coupon
    console.log(`[Coupon] Trying to retrieve existing Stripe coupon: ${upperCode}`)
    const coupon = await stripe.coupons.retrieve(upperCode)
    console.log(`[Coupon] Found existing coupon: ${coupon.id}`)
    return coupon.id
  } catch (retrieveErr: any) {
    console.log(`[Coupon] Coupon ${upperCode} not found, creating new one. Error:`, retrieveErr?.message)
    try {
      // Create coupon if it doesn't exist
      const coupon = await stripe.coupons.create({
        id: upperCode,
        percent_off: discountPercent,
        duration: 'forever',
        name: `${discountPercent}% Growth Rewards Discount`,
      })
      console.log(`[Coupon] Created new coupon: ${coupon.id}`)
      return coupon.id
    } catch (createErr: any) {
      console.error(`[Coupon] Failed to create coupon ${upperCode}:`, createErr?.message)
      return null
    }
  }
}

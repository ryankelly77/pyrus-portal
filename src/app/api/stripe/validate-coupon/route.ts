import { NextRequest, NextResponse } from 'next/server'
import { stripe, COUPON_CODES, PROMOTION_CODE_IDS } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body as { code: string }

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Coupon code is required' },
        { status: 400 }
      )
    }

    const upperCode = code.toUpperCase()
    const lowerCode = code.toLowerCase()

    // Check if we have a known promotion code ID mapping
    const knownPromoId = PROMOTION_CODE_IDS[upperCode]
    if (knownPromoId) {
      try {
        console.log(`[Coupon] Looking up known promotion code ID: ${knownPromoId}`)
        const promoCode = await stripe.promotionCodes.retrieve(knownPromoId) as any

        console.log(`[Coupon] Promo code active: ${promoCode.active}`)

        if (promoCode.active) {
          // Get the coupon ID - it's nested under promotion.coupon in the new API
          const couponId = promoCode.promotion?.coupon || promoCode.coupon
          console.log(`[Coupon] Coupon ID: ${couponId}`)

          if (couponId) {
            // Fetch the actual coupon to get discount details
            const coupon = await stripe.coupons.retrieve(typeof couponId === 'string' ? couponId : couponId.id)
            console.log(`[Coupon] Coupon details: percent_off=${coupon.percent_off}, amount_off=${coupon.amount_off}`)

            return NextResponse.json({
              valid: true,
              code: upperCode,
              discount: coupon.percent_off
                ? { type: 'percent', value: coupon.percent_off }
                : coupon.amount_off
                  ? { type: 'amount', value: coupon.amount_off / 100, currency: coupon.currency }
                  : null,
            })
          }
        } else {
          return NextResponse.json({
            valid: false,
            error: 'This coupon is no longer active',
          })
        }
      } catch (err) {
        console.log(`[Coupon] Known promotion code lookup failed:`, err)
      }
    }

    // Try multiple case variations for Stripe Promotion Code lookup
    const codesToTry = [code, lowerCode, upperCode]

    for (const tryCode of codesToTry) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: tryCode,
          active: true,
          limit: 1,
          expand: ['data.coupon'],
        })

        if (promoCodes.data.length > 0) {
          const promoCode = promoCodes.data[0] as any
          const coupon = promoCode.coupon as {
            id: string
            percent_off: number | null
            amount_off: number | null
            currency: string | null
            valid: boolean
          }

          // Check if coupon is still valid
          if (!coupon.valid) {
            return NextResponse.json({
              valid: false,
              error: 'This coupon has expired',
            })
          }

          return NextResponse.json({
            valid: true,
            code: tryCode,
            discount: coupon.percent_off
              ? { type: 'percent', value: coupon.percent_off }
              : coupon.amount_off
                ? { type: 'amount', value: coupon.amount_off / 100, currency: coupon.currency }
                : null,
          })
        }
      } catch (err) {
        // Continue to next variation
        console.log(`[Coupon] Promotion code lookup failed for "${tryCode}"`)
      }
    }

    // Check hardcoded coupon codes
    const discountPercent = COUPON_CODES[upperCode]
    if (discountPercent) {
      // Verify it exists in Stripe or can be created
      try {
        const coupon = await stripe.coupons.retrieve(upperCode)
        return NextResponse.json({
          valid: true,
          code: upperCode,
          discount: { type: 'percent', value: coupon.percent_off || discountPercent },
        })
      } catch {
        // Coupon doesn't exist in Stripe yet but it's in our hardcoded list
        // It will be created when subscription is made
        return NextResponse.json({
          valid: true,
          code: upperCode,
          discount: { type: 'percent', value: discountPercent },
        })
      }
    }

    // Coupon not found anywhere
    return NextResponse.json({
      valid: false,
      error: 'Invalid coupon code',
    })

  } catch (error) {
    console.error('Error validating coupon:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate coupon' },
      { status: 500 }
    )
  }
}

import { prisma } from '../src/lib/prisma'

async function updatePurchaseDescriptions() {
  // Get all purchase activity logs
  const purchases = await prisma.activity_log.findMany({
    where: { activity_type: 'purchase' },
    include: {
      client: {
        select: { name: true, contact_name: true }
      }
    }
  })

  console.log('Found', purchases.length, 'purchase records')

  let updated = 0
  for (const purchase of purchases) {
    const metadata = purchase.metadata as Record<string, unknown> || {}
    const tier = metadata.tier as string | undefined
    const monthlyTotal = (metadata.monthlyTotal as number) || 0
    const onetimeTotal = (metadata.onetimeTotal as number) || 0
    const couponCode = metadata.couponCode as string | undefined
    const isFreeOrder = metadata.isFreeOrder as boolean | undefined

    console.log('\nPurchase ID:', purchase.id)
    console.log('  Current desc:', purchase.description)
    console.log('  Metadata:', JSON.stringify(metadata))

    // Build new description with amounts
    const tierDisplay = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : ''
    let newDesc = `${purchase.client?.contact_name || purchase.client?.name || 'Client'} purchased the ${tierDisplay} Plan`

    if (monthlyTotal > 0 || onetimeTotal > 0) {
      const amountParts: string[] = []
      if (monthlyTotal > 0) amountParts.push(`$${monthlyTotal.toLocaleString()}/mo`)
      if (onetimeTotal > 0) amountParts.push(`$${onetimeTotal.toLocaleString()} one-time`)
      newDesc += ` - ${amountParts.join(' + ')}`
    }

    if (isFreeOrder && couponCode) {
      newDesc += ` (100% off with ${couponCode})`
    } else if (couponCode) {
      newDesc += ` (with coupon: ${couponCode})`
    }

    console.log('  New desc:', newDesc)

    // Update if different
    if (newDesc !== purchase.description) {
      await prisma.activity_log.update({
        where: { id: purchase.id },
        data: { description: newDesc }
      })
      updated++
      console.log('  UPDATED!')
    } else {
      console.log('  (no change needed)')
    }
  }

  console.log('\nDone! Updated', updated, 'of', purchases.length, 'records')
}

updatePurchaseDescriptions().catch(console.error).finally(() => prisma.$disconnect())

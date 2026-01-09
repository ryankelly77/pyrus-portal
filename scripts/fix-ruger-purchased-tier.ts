import { prisma } from '../src/lib/prisma'

async function fix() {
  // Find Ruger
  const ruger = await prisma.clients.findFirst({
    where: { name: { contains: 'Ruger' } }
  })
  console.log('Ruger:', ruger?.id, ruger?.name)

  if (!ruger) {
    console.log('Ruger not found')
    return
  }

  // Get the recommendation
  const rec = await prisma.recommendations.findFirst({
    where: { client_id: ruger.id },
    orderBy: { updated_at: 'desc' }
  })
  console.log('Recommendation:', rec?.id)
  console.log('  Status:', rec?.status)
  console.log('  Purchased tier:', rec?.purchased_tier)
  console.log('  Purchased at:', rec?.purchased_at)

  // If purchased_tier is null or 'addon', set it to 'better'
  if (rec && (!rec.purchased_tier || rec.purchased_tier === 'addon')) {
    console.log('\nUpdating purchased_tier to "better"...')
    await prisma.recommendations.update({
      where: { id: rec.id },
      data: {
        purchased_tier: 'better',
        purchased_at: rec.purchased_at || new Date()
      }
    })
    console.log('Done!')
  } else {
    console.log('\nNo update needed')
  }

  await prisma.$disconnect()
}

fix().catch(console.error)

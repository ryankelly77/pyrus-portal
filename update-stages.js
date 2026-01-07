const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Get all clients
  const clients = await prisma.clients.findMany()
  console.log('Current clients:')
  clients.forEach(c => console.log(`  ${c.name}: ${c.growth_stage || 'null'}`))

  // Update some clients with different stages
  if (clients.length >= 1) {
    await prisma.clients.update({
      where: { id: clients[0].id },
      data: { growth_stage: 'seedling' }
    })
    console.log(`\nUpdated ${clients[0].name} to seedling`)
  }

  if (clients.length >= 2) {
    await prisma.clients.update({
      where: { id: clients[1].id },
      data: { growth_stage: 'sprouting' }
    })
    console.log(`Updated ${clients[1].name} to sprouting`)
  }

  if (clients.length >= 3) {
    await prisma.clients.update({
      where: { id: clients[2].id },
      data: { growth_stage: 'blooming' }
    })
    console.log(`Updated ${clients[2].name} to blooming`)
  }

  if (clients.length >= 4) {
    await prisma.clients.update({
      where: { id: clients[3].id },
      data: { growth_stage: 'harvesting' }
    })
    console.log(`Updated ${clients[3].name} to harvesting`)
  }

  // Keep rest as prospect if they exist
  console.log('\nDone! Refresh the Clients page to see the different stages.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

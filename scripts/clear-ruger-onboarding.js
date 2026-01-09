const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
require('dotenv').config()

async function main() {
  const connectionString = process.env.DATABASE_URL
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Find Ruger client
  const ruger = await prisma.clients.findFirst({
    where: { name: { contains: 'Ruger' } }
  })

  if (!ruger) {
    console.log('Ruger client not found')
    await pool.end()
    await prisma.$disconnect()
    return
  }

  console.log('Found Ruger:', ruger.id)

  // Clear checklist items
  const deletedChecklist = await prisma.client_checklist_items.deleteMany({
    where: { client_id: ruger.id }
  })
  console.log(`Deleted ${deletedChecklist.count} checklist items`)

  // Clear onboarding responses
  const deletedResponses = await prisma.client_onboarding_responses.deleteMany({
    where: { client_id: ruger.id }
  })
  console.log(`Deleted ${deletedResponses.count} onboarding responses`)

  console.log('Ruger onboarding data cleared!')

  await pool.end()
  await prisma.$disconnect()
}

main().catch(console.error)

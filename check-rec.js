require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // Check all recommendations
  const allRecs = await prisma.recommendations.findMany({
    include: { client: true, recommendation_items: true }
  })
  console.log('All recommendations in DB:', allRecs.length)
  allRecs.forEach(rec => {
    console.log('---')
    console.log('ID:', rec.id)
    console.log('Client ID:', rec.client_id)
    console.log('Client Name:', rec.client?.name)
    console.log('Status:', rec.status)
    console.log('Items count:', rec.recommendation_items?.length)
  })

  // Also check Ruger's client ID
  const ruger = await prisma.clients.findFirst({ where: { name: { contains: 'Ruger' } } })
  console.log('\n--- Ruger client ---')
  console.log('Ruger ID:', ruger?.id)
  console.log('Ruger Name:', ruger?.name)
}
main().catch(console.error).finally(() => prisma.$disconnect())

require('dotenv').config({ path: '.env.local' })
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
  // Find Ruger
  const ruger = await prisma.clients.findFirst({
    where: { name: { contains: 'Ruger', mode: 'insensitive' } }
  })

  if (!ruger) {
    console.log('Ruger not found')
    return
  }

  console.log('=== RUGER ===')
  console.log('ID:', ruger.id)
  console.log('Name:', ruger.name)

  // Get Ruger's onboarding responses
  console.log('\n=== RUGER RESPONSES ===')
  const responses = await prisma.client_onboarding_responses.findMany({
    where: { client_id: ruger.id },
    include: { question: true }
  })

  responses.forEach(r => {
    console.log('Q:', r.question.question_text.substring(0, 60))
    console.log('A:', r.response_text || JSON.stringify(r.response_options))
    console.log('Question ID:', r.question_id)
    console.log('')
  })

  // Get checklist templates with auto-complete settings
  console.log('\n=== CHECKLIST TEMPLATES (with auto-complete) ===')
  const templates = await prisma.onboarding_checklist_templates.findMany({
    where: { is_active: true },
    include: { product: { select: { name: true } } }
  })

  templates.forEach(t => {
    console.log('Title:', t.title)
    console.log('Product:', t.product.name)
    console.log('Auto-complete Question ID:', t.auto_complete_question_id || 'NOT SET')
    console.log('Auto-complete Values:', t.auto_complete_values || 'NOT SET')
    console.log('')
  })

  // Get Ruger's checklist items
  console.log('\n=== RUGER CHECKLIST ITEMS ===')
  const checklistItems = await prisma.client_checklist_items.findMany({
    where: { client_id: ruger.id },
    include: { template: true }
  })

  if (checklistItems.length === 0) {
    console.log('No checklist items found for Ruger')
  } else {
    checklistItems.forEach(c => {
      console.log('Title:', c.template.title)
      console.log('Completed:', c.is_completed)
      console.log('Notes:', c.notes)
      console.log('')
    })
  }
}

main().catch(console.error).finally(() => {
  pool.end()
  prisma.$disconnect()
})

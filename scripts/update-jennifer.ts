import { prisma } from '../src/lib/prisma'

async function main() {
  // Find Jennifer
  const client = await prisma.clients.findFirst({
    where: { name: { contains: 'Jennifer', mode: 'insensitive' } }
  })

  if (!client) {
    console.log('Client not found')
    return
  }

  console.log('Found client:', client.name, client.id)

  // Update with Basecamp Project ID
  const updated = await prisma.clients.update({
    where: { id: client.id },
    data: { basecamp_project_id: '43126663' }
  })

  console.log('Updated basecamp_project_id:', updated.basecamp_project_id)
}

main().finally(() => prisma.$disconnect())

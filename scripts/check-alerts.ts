import { prisma } from '../src/lib/prisma'

async function main() {
  const alerts = await prisma.client_communications.findMany({
    where: { comm_type: 'result_alert' },
    orderBy: { created_at: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      subject: true,
      body: true,
      metadata: true,
      created_at: true,
    }
  })

  console.log('Recent Result Alerts:')
  for (let i = 0; i < alerts.length; i++) {
    const alert = alerts[i]
    console.log('\n--- Alert ' + (i + 1) + ' ---')
    console.log('Title:', alert.title)
    console.log('Subject:', alert.subject)
    console.log('Body:', alert.body ? String(alert.body).substring(0, 150) : 'NULL')
    console.log('Metadata:', JSON.stringify(alert.metadata, null, 2))
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())

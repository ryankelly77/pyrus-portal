import { dbPool } from '@/lib/prisma'

async function main() {
  // Get Tracie's client ID
  const clientResult = await dbPool.query(`
    SELECT id FROM clients WHERE name ILIKE '%Tracie%' LIMIT 1
  `)

  if (clientResult.rows.length === 0) {
    console.log('Tracie not found')
    process.exit(1)
  }

  const tracieId = clientResult.rows[0].id
  console.log('Found Tracie:', tracieId)

  // Add notification to client_communications
  await dbPool.query(`
    INSERT INTO client_communications (
      client_id, comm_type, title, subject, body, status,
      highlight_type, sent_at, created_at
    ) VALUES (
      $1,
      'task_complete',
      'Onboarding Completed!',
      'You completed your onboarding questionnaire',
      'Thanks for completing your onboarding questionnaire! Your marketing team now has everything they need to get started on your project.',
      'sent',
      'success',
      '2026-01-13 00:16:00+00',
      '2026-01-13 00:16:00+00'
    )
  `, [tracieId])
  console.log('Created client_communications notification')

  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

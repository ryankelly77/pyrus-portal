import { dbPool } from '@/lib/prisma'

async function main() {
  // Add column if not exists
  await dbPool.query(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ
  `)
  console.log('Added onboarding_completed_at column')

  // Set Tracie's completion date: 1/12/26 at 6:16PM CST (which is 2026-01-13 00:16:00 UTC)
  // CST is UTC-6, so 6:16PM CST = 18:16 CST = 00:16 UTC next day
  const result = await dbPool.query(`
    UPDATE clients
    SET onboarding_completed_at = '2026-01-13 00:16:00+00'
    WHERE name ILIKE '%Tracie%'
    RETURNING id, name, onboarding_completed_at
  `)
  console.log('Updated Tracie:', result.rows)

  // Create activity log entry
  if (result.rows.length > 0) {
    const tracieId = result.rows[0].id
    await dbPool.query(`
      INSERT INTO activity_log (client_id, activity_type, description, metadata, created_at)
      VALUES ($1, 'onboarding_completed', 'Completed onboarding questionnaire', '{"source": "client_portal"}', '2026-01-13 00:16:00+00')
    `, [tracieId])
    console.log('Created activity log entry')
  }

  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

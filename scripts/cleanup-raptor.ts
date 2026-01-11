import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function cleanup() {
  console.log('Connecting to database...')
  const client = await pool.connect()
  
  try {
    // Find Raptor Vending client
    const clientResult = await client.query(
      "SELECT id, name, status, growth_stage FROM clients WHERE name ILIKE '%Raptor%'"
    )
    
    if (clientResult.rows.length === 0) {
      console.log('Raptor Vending client not found')
      return
    }
    
    const raptorClient = clientResult.rows[0]
    console.log('Found client:', raptorClient.id, raptorClient.name)
    console.log('Current status:', raptorClient.status)
    console.log('Current growth_stage:', raptorClient.growth_stage)
    
    // Get subscriptions
    const subsResult = await client.query(
      'SELECT id FROM subscriptions WHERE client_id = $1',
      [raptorClient.id]
    )
    console.log('Found', subsResult.rows.length, 'subscriptions')
    
    // Delete subscription items
    for (const sub of subsResult.rows) {
      const deleteItems = await client.query(
        'DELETE FROM subscription_items WHERE subscription_id = $1',
        [sub.id]
      )
      console.log('Deleted subscription items for sub:', sub.id)
    }
    
    // Delete subscriptions
    const deleteSubs = await client.query(
      'DELETE FROM subscriptions WHERE client_id = $1',
      [raptorClient.id]
    )
    console.log('Deleted', deleteSubs.rowCount, 'subscriptions')
    
    // Delete purchase activity logs
    const deleteActivity = await client.query(
      "DELETE FROM activity_log WHERE client_id = $1 AND activity_type = 'purchase'",
      [raptorClient.id]
    )
    console.log('Deleted', deleteActivity.rowCount, 'purchase activity logs')
    
    // Reset client to prospect
    await client.query(
      "UPDATE clients SET status = 'active', growth_stage = 'prospect', start_date = NULL WHERE id = $1",
      [raptorClient.id]
    )
    console.log('Reset client to prospect status')
    
    // Reset recommendations
    const updateRecs = await client.query(
      "UPDATE recommendations SET status = 'sent', purchased_tier = NULL, purchased_at = NULL WHERE client_id = $1 AND status = 'accepted'",
      [raptorClient.id]
    )
    console.log('Reset', updateRecs.rowCount, 'recommendations to sent status')
    
    console.log('')
    console.log('Cleanup complete! Raptor Vending is ready for a fresh test purchase.')
  } finally {
    client.release()
    await pool.end()
  }
}

cleanup().catch(console.error)

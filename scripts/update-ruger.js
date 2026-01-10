const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function run() {
  try {
    // First check current status
    const before = await pool.query(
      "SELECT id, name, status FROM clients WHERE id = '80330ba2-e2e8-4c14-aa6f-9ecfaa268118'"
    );
    console.log('Before:', before.rows[0]);
    
    // Update to pending
    await pool.query(
      "UPDATE clients SET status = 'pending' WHERE id = '80330ba2-e2e8-4c14-aa6f-9ecfaa268118'"
    );
    
    // Verify
    const after = await pool.query(
      "SELECT id, name, status FROM clients WHERE id = '80330ba2-e2e8-4c14-aa6f-9ecfaa268118'"
    );
    console.log('After:', after.rows[0]);
    
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

run();

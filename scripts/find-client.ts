import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function find() {
  // Search for clients with similar names
  const clients = await pool.query(`
    SELECT id, name, contact_name, contact_email, status
    FROM clients
    WHERE LOWER(name) LIKE '%raptor%'
       OR LOWER(contact_name) LIKE '%cristian%'
       OR LOWER(contact_email) LIKE '%cristian%'
       OR LOWER(contact_email) LIKE '%raptor%'
    LIMIT 10
  `);
  console.log('Matching clients:');
  console.table(clients.rows);

  // Get all recent invites
  const invites = await pool.query(`
    SELECT ri.email, ri.first_name, ri.last_name, c.id as client_id, c.name as client_name
    FROM recommendation_invites ri
    JOIN recommendations r ON r.id = ri.recommendation_id
    JOIN clients c ON c.id = r.client_id
    ORDER BY ri.created_at DESC
    LIMIT 10
  `);
  console.log('\nAll recent invites:');
  console.table(invites.rows);

  await pool.end();
}

find().catch(console.error);

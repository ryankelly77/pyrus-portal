import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const users = await pool.query(`
    SELECT p.id, p.email, p.client_id, p.full_name
    FROM profiles p
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT 5
  `);
  console.log('Recent profiles:');
  console.table(users.rows);

  const invites = await pool.query(`
    SELECT ri.email, ri.first_name, ri.last_name, r.client_id, c.name as client_name
    FROM recommendation_invites ri
    JOIN recommendations r ON r.id = ri.recommendation_id
    JOIN clients c ON c.id = r.client_id
    ORDER BY ri.created_at DESC
    LIMIT 5
  `);
  console.log('\nRecent invites:');
  console.table(invites.rows);

  await pool.end();
}

check().catch(console.error);

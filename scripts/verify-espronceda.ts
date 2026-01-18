import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const clientId = "a1015e4b-62df-41b8-bea9-f1365bda7fad"

async function main() {
  const client = await pool.query("SELECT name, contact_name, contact_email FROM clients WHERE id = $1", [clientId])
  console.log("Client:", client.rows[0])

  const responses = await pool.query(`
    SELECT q.section, q.question_text, r.response_text
    FROM client_onboarding_responses r
    JOIN onboarding_question_templates q ON r.question_id = q.id
    WHERE r.client_id = $1
    ORDER BY q.section, q.sort_order
  `, [clientId])

  console.log("\nForm Responses (" + responses.rows.length + " total):")
  let currentSection = ""
  for (const row of responses.rows) {
    if (row.section !== currentSection) {
      currentSection = row.section
      console.log("\n=== " + currentSection + " ===")
    }
    const question = row.question_text.substring(0, 60)
    const answer = (row.response_text || "").substring(0, 100)
    console.log("Q: " + question)
    console.log("A: " + answer)
    console.log("")
  }

  await pool.end()
}

main().catch(console.error)

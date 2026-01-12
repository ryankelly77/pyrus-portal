/**
 * Debug script to test HighLevel API integration
 * Run with: npx tsx scripts/debug-highlevel.ts [email]
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local first (Next.js convention)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
// Fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// V1 API works with Location API Keys
const HIGHLEVEL_API_V1_URL = 'https://rest.gohighlevel.com/v1'
// V2 API requires OAuth
const HIGHLEVEL_API_V2_URL = 'https://services.leadconnectorhq.com'

async function main() {
  console.log('\n=== HighLevel API Debug Script ===\n')

  // Check environment variables
  const apiKey = process.env.HIGHLEVEL_API_KEY
  const locationId = process.env.HIGHLEVEL_LOCATION_ID

  console.log('1. Checking environment variables:')
  console.log(`   HIGHLEVEL_API_KEY: ${apiKey ? `Set (${apiKey.substring(0, 20)}...)` : '❌ NOT SET'}`)
  console.log(`   HIGHLEVEL_LOCATION_ID: ${locationId ? `Set (${locationId})` : '❌ NOT SET'}`)

  if (!apiKey || !locationId) {
    console.log('\n❌ Missing environment variables. Please set HIGHLEVEL_API_KEY and HIGHLEVEL_LOCATION_ID')
    process.exit(1)
  }

  // Test V1 API connection (contacts)
  console.log('\n2. Testing V1 API connection (rest.gohighlevel.com)...')
  try {
    const response = await fetch(`${HIGHLEVEL_API_V1_URL}/contacts/?limit=5`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      const contacts = data.contacts || []
      console.log(`   ✅ V1 API works! Found ${data.meta?.total || contacts.length} total contacts`)

      if (contacts.length > 0) {
        console.log('\n   Sample contacts:')
        contacts.slice(0, 3).forEach((contact: any, i: number) => {
          console.log(`   ${i + 1}. ${contact.firstName || ''} ${contact.lastName || ''} - ${contact.email || 'no email'} (ID: ${contact.id})`)
        })
      }
    } else {
      const errorText = await response.text()
      console.log(`   ❌ V1 API error: ${response.status}`)
      console.log(`   Response: ${errorText}`)
    }
  } catch (error) {
    console.log(`   ❌ Connection error: ${error}`)
  }

  // Test V2 API (requires OAuth)
  console.log('\n3. Testing V2 API connection (services.leadconnectorhq.com)...')
  try {
    const response = await fetch(
      `${HIGHLEVEL_API_V2_URL}/conversations/search?locationId=${locationId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    )

    if (response.ok) {
      console.log(`   ✅ V2 API works (unexpected with Location API Key)`)
    } else {
      const errorText = await response.text()
      console.log(`   ⚠️  V2 API returned: ${response.status}`)
      console.log(`   This is expected - V2 API requires OAuth, not Location API Key`)
      console.log(`   Messages/Conversations require OAuth or webhooks integration`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
  }

  // Test specific email lookup
  const testEmail = process.argv[2]
  if (testEmail) {
    console.log(`\n4. Testing email lookup for: ${testEmail}`)
    try {
      const searchResponse = await fetch(
        `${HIGHLEVEL_API_V1_URL}/contacts/?query=${encodeURIComponent(testEmail)}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (searchResponse.ok) {
        const data = await searchResponse.json()
        const contacts = data.contacts || []
        const exactMatch = contacts.find((c: any) => c.email?.toLowerCase() === testEmail.toLowerCase())

        if (exactMatch) {
          console.log(`   ✅ Found exact match: ${exactMatch.firstName} ${exactMatch.lastName}`)
          console.log(`   HighLevel Contact ID: ${exactMatch.id}`)
          console.log(`   Email: ${exactMatch.email}`)
          console.log(`   Phone: ${exactMatch.phone || 'not set'}`)
        } else if (contacts.length > 0) {
          console.log(`   ⚠️  Found ${contacts.length} partial matches but no exact email match`)
        } else {
          console.log(`   ❌ No contact found with email: ${testEmail}`)
        }
      } else {
        const errorText = await searchResponse.text()
        console.log(`   ❌ Search error: ${searchResponse.status}`)
        console.log(`   Response: ${errorText}`)
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error}`)
    }
  } else {
    console.log('\n   Tip: Pass an email as argument to test specific lookup:')
    console.log('   npx tsx scripts/debug-highlevel.ts ryan@raptor-vending.com')
  }

  console.log('\n=== Summary ===')
  console.log('✅ V1 API: Works with Location API Key (contacts, notes, tasks)')
  console.log('❌ V2 API: Requires OAuth for conversations/messages')
  console.log('')
  console.log('To get messages in the timeline, you need to either:')
  console.log('1. Set up HighLevel OAuth (create marketplace app)')
  console.log('2. Use HighLevel webhooks to push messages to your database')
  console.log('\n=== Debug Complete ===\n')
}

main().catch(console.error)

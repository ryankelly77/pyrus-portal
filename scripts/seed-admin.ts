/**
 * Seed script to create a test admin user in Supabase
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Requirements:
 *   - SUPABASE_SERVICE_ROLE_KEY must be set in .env.local
 *   - The profiles table must exist in Supabase (run the schema migration first)
 *
 * This script will:
 *   1. Create a user with email ryan@pearanalytics.com
 *   2. Create a profile with role super_admin
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing required environment variables:')
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseServiceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nMake sure these are set in your .env.local file.')
  console.error('You can find the service role key in your Supabase dashboard under Settings > API.')
  process.exit(1)
}

// Create Supabase admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const ADMIN_EMAIL = 'ryan@pearanalytics.com'
const ADMIN_PASSWORD = 'AdminTest123!' // Change this after first login
const ADMIN_FULL_NAME = 'Ryan Kelly'

async function seedAdmin() {
  console.log('🌱 Seeding admin user...\n')

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL)

  if (existingUser) {
    console.log(`⚠️  User ${ADMIN_EMAIL} already exists (ID: ${existingUser.id})`)

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', existingUser.id)
      .single()

    if (existingProfile) {
      console.log(`   Profile exists with role: ${existingProfile.role}`)

      // Update to super_admin if not already
      if (existingProfile.role !== 'super_admin') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'super_admin' })
          .eq('id', existingUser.id)

        if (updateError) {
          console.error('   Failed to update role:', updateError.message)
        } else {
          console.log('   ✅ Updated role to super_admin')
        }
      }
    } else {
      // Create profile for existing user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: existingUser.id,
          email: ADMIN_EMAIL,
          full_name: ADMIN_FULL_NAME,
          role: 'super_admin',
        })

      if (profileError) {
        console.error('   Failed to create profile:', profileError.message)
      } else {
        console.log('   ✅ Created profile with role super_admin')
      }
    }

    console.log('\n✅ Done!')
    return
  }

  // Create new user
  console.log(`Creating user: ${ADMIN_EMAIL}`)
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: ADMIN_FULL_NAME,
    },
  })

  if (createError) {
    console.error('Failed to create user:', createError.message)
    process.exit(1)
  }

  console.log(`✅ Created user (ID: ${newUser.user.id})`)

  // Create profile
  console.log('Creating profile with super_admin role...')
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: newUser.user.id,
      email: ADMIN_EMAIL,
      full_name: ADMIN_FULL_NAME,
      role: 'super_admin',
    })

  if (profileError) {
    console.error('Failed to create profile:', profileError.message)
    console.error('You may need to create the profile manually in Supabase.')
    process.exit(1)
  }

  console.log('✅ Created profile')

  console.log('\n' + '='.repeat(50))
  console.log('🎉 Admin user created successfully!')
  console.log('='.repeat(50))
  console.log(`\nEmail:    ${ADMIN_EMAIL}`)
  console.log(`Password: ${ADMIN_PASSWORD}`)
  console.log(`Role:     super_admin`)
  console.log('\n⚠️  Change your password after first login!')
}

seedAdmin().catch(console.error)

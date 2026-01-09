// Run this script once to create the storage bucket
// Usage: node scripts/create-storage-bucket.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createBucket() {
  console.log('Creating onboarding-images bucket...')

  const { data, error } = await supabase.storage.createBucket('onboarding-images', {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  })

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket already exists!')
    } else {
      console.error('Error creating bucket:', error.message)
      process.exit(1)
    }
  } else {
    console.log('Bucket created successfully:', data)
  }
}

createBucket()

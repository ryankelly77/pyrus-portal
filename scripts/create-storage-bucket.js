// Script to create Supabase storage bucket
// Run with: node scripts/create-storage-bucket.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL')
    console.error('  SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nGet these from your Supabase dashboard:')
    console.error('  Project Settings > API')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Create the uploads bucket
  const { data, error } = await supabase.storage.createBucket('uploads', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  })

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket "uploads" already exists!')
    } else {
      console.error('Error creating bucket:', error.message)
      process.exit(1)
    }
  } else {
    console.log('Created bucket:', data)
  }

  // Also create a client-files bucket for client-specific uploads
  const { data: data2, error: error2 } = await supabase.storage.createBucket('client-files', {
    public: false, // Private bucket
    fileSizeLimit: 10485760,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  })

  if (error2) {
    if (error2.message.includes('already exists')) {
      console.log('Bucket "client-files" already exists!')
    } else {
      console.error('Error creating client-files bucket:', error2.message)
    }
  } else {
    console.log('Created bucket:', data2)
  }

  console.log('\nStorage buckets ready!')
  console.log('  - uploads (public): For general uploads like logos, images')
  console.log('  - client-files (private): For client-specific documents')
}

main()

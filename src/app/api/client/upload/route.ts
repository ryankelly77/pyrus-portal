import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createStorageClient } from '@supabase/supabase-js'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Initialize Supabase client for storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseStorage = supabaseUrl && supabaseServiceKey
  ? createStorageClient(supabaseUrl, supabaseServiceKey)
  : null

// Allowed file types for edit requests
const ALLOWED_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  // Videos
  'video/mp4', 'video/quicktime', 'video/webm',
]

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export async function POST(request: NextRequest) {
  try {
    // Check storage configuration
    if (!supabaseStorage) {
      console.error('Supabase storage not configured')
      return NextResponse.json({
        error: 'Storage service not configured'
      }, { status: 500 })
    }

    // Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's client ID
    const profileResult = await dbPool.query(
      'SELECT client_id FROM profiles WHERE id = $1',
      [user.id]
    )
    const profile = profileResult.rows[0]

    if (!profile?.client_id) {
      return NextResponse.json({ error: 'No client associated with user' }, { status: 403 })
    }

    const clientId = profile.client_id

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'File type not allowed. Supported: images, PDFs, Word docs, Excel, videos'
      }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 25MB'
      }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `edit-requests/${clientId}/${timestamp}_${safeFilename}`

    // Convert File to ArrayBuffer
    const buffer = await file.arrayBuffer()

    // Upload to Supabase Storage
    const { data, error } = await supabaseStorage.storage
      .from('client-files')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({
        error: 'Failed to upload file'
      }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabaseStorage.storage
      .from('client-files')
      .getPublicUrl(storagePath)

    // Return file info
    return NextResponse.json({
      name: file.name,
      url: urlData.publicUrl,
      type: file.type,
      size: file.size,
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}

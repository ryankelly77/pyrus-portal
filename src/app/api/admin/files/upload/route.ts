import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { dbPool } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, isEmailConfigured } from '@/lib/email/mailgun'
import { getFileNotificationEmail } from '@/lib/email/templates/file-notification'

export const dynamic = 'force-dynamic'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://portal.pyrusdigitalmedia.com'

// Initialize Supabase client for storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables for storage')
}

const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
)

// Map file extensions to types
function getFileType(filename: string): 'docs' | 'images' | 'video' {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  const videoExts = ['mp4', 'mov', 'avi', 'webm', 'mkv']

  if (imageExts.includes(ext)) return 'images'
  if (videoExts.includes(ext)) return 'video'
  return 'docs'
}

export async function POST(request: NextRequest) {
  try {
    // Check Supabase configuration
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase storage not configured')
      return NextResponse.json({
        error: 'Storage service not configured. Please contact support.'
      }, { status: 500 })
    }

    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const formData = await request.formData()
    const file = formData.get('file') as File
    const clientId = formData.get('clientId') as string
    const category = formData.get('category') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be less than 50MB' }, { status: 400 })
    }

    console.log(`Uploading file: ${file.name} (${file.size} bytes) for client ${clientId}`)

    // Generate unique filename
    const timestamp = Date.now()
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${clientId}/${timestamp}_${safeFilename}`

    // Convert File to ArrayBuffer
    const buffer = await file.arrayBuffer()

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('client-files')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (error) {
      console.error('Storage upload error:', error)
      console.error('Storage error details:', JSON.stringify(error, null, 2))

      // Check for common errors
      if (error.message?.includes('Bucket not found')) {
        return NextResponse.json({
          error: 'Storage bucket not found. Please ensure the client-files bucket exists in Supabase.'
        }, { status: 500 })
      }

      return NextResponse.json({
        error: `Failed to upload file: ${error.message || 'Unknown storage error'}`
      }, { status: 500 })
    }

    console.log('File uploaded successfully to storage:', data?.path)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('client-files')
      .getPublicUrl(storagePath)

    // Determine file type from extension
    const fileType = getFileType(file.name)

    // Save to database
    const result = await dbPool.query(
      `INSERT INTO client_files (client_id, name, type, category, url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [clientId, file.name, fileType, category, urlData.publicUrl, user.id]
    )

    console.log('File record saved to database:', result.rows[0]?.id)

    // Send email notification to client
    if (isEmailConfigured()) {
      try {
        // Fetch client details for the email
        const clientResult = await dbPool.query(
          `SELECT name, contact_name, contact_email FROM clients WHERE id = $1`,
          [clientId]
        )

        const client = clientResult.rows[0]

        if (client?.contact_email) {
          const emailData = getFileNotificationEmail({
            clientName: client.name || 'Your Company',
            contactName: client.contact_name || '',
            fileName: file.name,
            fileCategory: category,
            portalUrl: `${PORTAL_URL}/portal/files`
          })

          const emailResult = await sendEmail({
            to: client.contact_email,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
            tags: ['file-notification']
          })

          if (emailResult.success) {
            console.log(`File notification email sent to ${client.contact_email}`)
          } else {
            console.warn(`Failed to send file notification email: ${emailResult.error}`)
          }
        } else {
          console.log('No contact email found for client, skipping notification')
        }
      } catch (emailError) {
        // Don't fail the upload if email fails
        console.error('Error sending file notification email:', emailError)
      }
    }

    return NextResponse.json({ file: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to upload file: ${errorMessage}` }, { status: 500 })
  }
}

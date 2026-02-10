import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { sendEmail } from '@/lib/email/mailgun'
import { getContentReadyForReviewEmail, getRevisionResubmittedEmail, getContentPublishedEmail } from '@/lib/email/templates/content-status'

// Convert status to human-readable label
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    sent_for_review: 'Sent for Review',
    client_reviewing: 'Client Reviewing',
    revisions_requested: 'Revisions Requested',
    approved: 'Approved',
    internal_review: 'Internal Review',
    final_optimization: 'Final Optimization',
    image_selection: 'Image Selection',
    scheduled: 'Scheduled',
    posted: 'Posted',
  }
  return labels[status] || status
}

export const dynamic = 'force-dynamic'

// GET - Get single content item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params

    const result = await dbPool.query(
      `SELECT
        c.*,
        cl.name as client_name,
        cl.contact_email as client_email
      FROM content c
      LEFT JOIN clients cl ON cl.id = c.client_id
      WHERE c.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Get revision history
    const revisions = await dbPool.query(
      `SELECT cr.*, p.full_name as creator_name
       FROM content_revisions cr
       LEFT JOIN profiles p ON p.id = cr.created_by
       WHERE cr.content_id = $1
       ORDER BY cr.created_at DESC`,
      [id]
    )

    // Get comments
    const comments = await dbPool.query(
      `SELECT cc.*, p.full_name as user_name
       FROM content_comments cc
       LEFT JOIN profiles p ON p.id = cc.user_id
       WHERE cc.content_id = $1
       ORDER BY cc.created_at DESC`,
      [id]
    )

    return NextResponse.json({
      ...result.rows[0],
      revisions: revisions.rows,
      comments: comments.rows
    })
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}

// PUT - Update content
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params
    const body = await request.json()
    const {
      title,
      contentType,
      platform,
      bodyContent,
      excerpt,
      urgent,
      deadline,
      targetKeyword,
      secondaryKeywords,
      wordCount,
      seoOptimized,
      aiOptimized,
      status,
      clientId,
      featuredImage,
      videoUrl,
      socialPlatforms
    } = body

    // Build dynamic update query
    const updates: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramIndex = 1

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`)
      values.push(title)
    }
    if (contentType !== undefined) {
      updates.push(`content_type = $${paramIndex++}`)
      values.push(contentType)
    }
    if (platform !== undefined) {
      updates.push(`platform = $${paramIndex++}`)
      values.push(platform)
    }
    if (bodyContent !== undefined) {
      updates.push(`body = $${paramIndex++}`)
      values.push(bodyContent)
    }
    if (excerpt !== undefined) {
      updates.push(`excerpt = $${paramIndex++}`)
      values.push(excerpt)
    }
    if (urgent !== undefined) {
      updates.push(`urgent = $${paramIndex++}`)
      values.push(urgent)
    }
    if (deadline !== undefined) {
      updates.push(`deadline = $${paramIndex++}`)
      values.push(deadline)
    }
    if (targetKeyword !== undefined) {
      updates.push(`target_keyword = $${paramIndex++}`)
      values.push(targetKeyword)
    }
    if (secondaryKeywords !== undefined) {
      updates.push(`secondary_keywords = $${paramIndex++}`)
      values.push(secondaryKeywords)
    }
    if (wordCount !== undefined) {
      updates.push(`word_count = $${paramIndex++}`)
      values.push(wordCount)
    }
    if (seoOptimized !== undefined) {
      updates.push(`seo_optimized = $${paramIndex++}`)
      values.push(seoOptimized)
    }
    if (aiOptimized !== undefined) {
      updates.push(`ai_optimized = $${paramIndex++}`)
      values.push(aiOptimized)
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(status)
    }
    if (clientId !== undefined) {
      updates.push(`client_id = $${paramIndex++}`)
      values.push(clientId)
    }
    if (featuredImage !== undefined) {
      updates.push(`featured_image = $${paramIndex++}`)
      values.push(featuredImage)
    }
    if (videoUrl !== undefined) {
      updates.push(`video_url = $${paramIndex++}`)
      values.push(videoUrl)
    }
    if (socialPlatforms !== undefined) {
      updates.push(`social_platforms = $${paramIndex++}`)
      values.push(JSON.stringify(socialPlatforms))
    }

    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(id)
    const result = await dbPool.query(
      `UPDATE content SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating content:', error)
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 })
  }
}

// DELETE - Delete content
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params

    // Delete related records first
    await dbPool.query('DELETE FROM content_comments WHERE content_id = $1', [id])
    await dbPool.query('DELETE FROM content_revisions WHERE content_id = $1', [id])

    const result = await dbPool.query(
      'DELETE FROM content WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Error deleting content:', error)
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 })
  }
}

// PATCH - Workflow actions (submit, approve, reject, publish)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('=== PATCH /api/admin/content/[id] called ===')
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params
    const body = await request.json()
    const { action, feedback, publishedUrl } = body
    console.log('PATCH request received:', { id, action, hasProfile: !!profile })

    let newStatus: string
    let updates: string[] = ['updated_at = NOW()']
    const values: (string | null)[] = []
    let paramIndex = 1

    // Get content and client info for email notifications
    const contentInfoResult = await dbPool.query(
      `SELECT c.*, cl.name as client_name, cl.contact_email as client_email
       FROM content c
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE c.id = $1`,
      [id]
    )
    const contentInfo = contentInfoResult.rows[0]
    const isResubmission = contentInfo?.status === 'revisions_requested' || contentInfo?.status === 'revision'

    switch (action) {
      case 'submit':
        newStatus = 'sent_for_review'
        // Calculate deadline (5 days for standard, 1 day for urgent)
        const isUrgent = contentInfo?.urgent
        const deadlineDays = isUrgent ? 1 : 5
        updates.push(`deadline = NOW() + INTERVAL '${deadlineDays} days'`)
        break

      case 'approve':
        newStatus = 'approved'
        break

      case 'reject':
        newStatus = 'revisions_requested'
        if (feedback) {
          updates.push(`revision_feedback = $${paramIndex++}`)
          values.push(feedback)
        }
        updates.push(`revision_count = COALESCE(revision_count, 0) + 1`)
        break

      case 'publish':
        newStatus = 'posted'
        updates.push(`published_at = NOW()`)
        if (publishedUrl) {
          updates.push(`published_url = $${paramIndex++}`)
          values.push(publishedUrl)
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    updates.push(`status = $${paramIndex++}`)
    values.push(newStatus)

    // Update status_history JSONB array
    updates.push(`status_history = COALESCE(status_history, '[]'::jsonb) || $${paramIndex++}::jsonb`)
    values.push(JSON.stringify({
      status: newStatus,
      changed_at: new Date().toISOString(),
      changed_by_id: user?.id || null,
      changed_by_name: profile?.full_name || 'System',
      note: feedback || null
    }))

    updates.push(`status_changed_at = NOW()`)

    values.push(id)

    const result = await dbPool.query(
      `UPDATE content SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Create a revision record for tracking
    await dbPool.query(
      `INSERT INTO content_revisions (content_id, body, revision_notes)
       SELECT id, body, $2 FROM content WHERE id = $1`,
      [id, `Status changed to ${getStatusLabel(newStatus)}${feedback ? ': ' + feedback : ''}`]
    )

    // Send email notifications for submit action
    if (action === 'submit') {
      console.log('Submit action triggered, checking email conditions:', {
        hasClientEmail: !!contentInfo?.client_email,
        clientEmail: contentInfo?.client_email,
        clientName: contentInfo?.client_name,
        contentTitle: contentInfo?.title,
      })

      if (contentInfo?.client_email) {
        try {
          const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.pyrusdigitalmedia.com'}/content/review/${id}`

          const emailData = {
            recipientName: contentInfo.client_name || 'there',
            contentTitle: contentInfo.title || 'Content',
            clientName: contentInfo.client_name || 'your company',
            changedByName: profile.full_name || 'Pyrus Team',
            portalUrl,
            reviewRound: contentInfo.revision_count || 0,
          }

          const emailTemplate = isResubmission
            ? getRevisionResubmittedEmail(emailData)
            : getContentReadyForReviewEmail(emailData)

          console.log('Sending email to:', contentInfo.client_email, 'Subject:', emailTemplate.subject)

          const emailResult = await sendEmail({
            to: contentInfo.client_email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
            tags: ['content-review', isResubmission ? 'resubmission' : 'new-content'],
          })

          console.log('Email send result:', JSON.stringify(emailResult))

          if (emailResult.success) {
            console.log(`Review notification email sent successfully to ${contentInfo.client_email}, messageId: ${emailResult.messageId}`)
          } else {
            console.error(`Email send failed: ${emailResult.error}`)
          }
        } catch (emailError) {
          // Log but don't fail the request if email fails
          console.error('Failed to send review notification email:', emailError)
        }
      } else {
        console.log('No client email found - skipping email notification')
      }
    }

    // Send email notification for publish action
    if (action === 'publish') {
      if (contentInfo?.client_email) {
        try {
          const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.pyrusdigitalmedia.com'}/content/review/${id}`

          const emailData = {
            recipientName: contentInfo.client_name || 'there',
            contentTitle: contentInfo.title || 'Content',
            clientName: contentInfo.client_name || 'your company',
            changedByName: profile.full_name || 'Pyrus Team',
            portalUrl,
            publishedUrl: publishedUrl || undefined,
          }

          const emailTemplate = getContentPublishedEmail(emailData)

          console.log('Sending published notification to:', contentInfo.client_email)

          const emailResult = await sendEmail({
            to: contentInfo.client_email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
            tags: ['content-status', 'published'],
          })

          if (emailResult.success) {
            console.log(`Published notification email sent to ${contentInfo.client_email}`)
          } else {
            console.error(`Published email send failed: ${emailResult.error}`)
          }
        } catch (emailError) {
          console.error('Failed to send published notification email:', emailError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      content: result.rows[0],
      action,
      newStatus
    })
  } catch (error) {
    console.error('Error processing action:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}

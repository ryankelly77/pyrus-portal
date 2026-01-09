const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
require('dotenv').config()

/**
 * Communication Types:
 * - email_invite: Portal Invitation (INVITATION label, blue)
 * - email_reminder: Invitation Reminder (REMINDER label, yellow)
 * - result_alert: Result Alert - keyword rankings, traffic milestones (RESULT ALERT label, purple)
 * - content_approved: Content Approved/Published (CONTENT label, green, "Published" status)
 * - content_review: Content Ready for Review (CONTENT label, green, "Pending Review" status)
 * - content_revision: Revision Requested (CONTENT label, green, "Needs Revision" status)
 * - monthly_report: Monthly Report (REPORT label, green)
 * - chat: Basecamp/Chat message (CHAT label, blue)
 *
 * Statuses: sent, delivered, opened, clicked, failed, bounced
 * Content statuses: pending_review, published, needs_revision
 */

async function main() {
  const connectionString = process.env.DATABASE_URL
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Find Ruger client
  const ruger = await prisma.clients.findFirst({
    where: { name: { contains: 'Ruger' } }
  })

  if (!ruger) {
    console.log('Ruger client not found')
    await pool.end()
    await prisma.$disconnect()
    return
  }

  console.log('Found Ruger:', ruger.id)

  // Clear existing communications for Ruger
  await prisma.client_communications.deleteMany({
    where: { client_id: ruger.id }
  })
  console.log('Cleared existing communications')

  // Sample communications data matching the prototype
  const communications = [
    // Result Alert - Keyword ranking
    {
      client_id: ruger.id,
      comm_type: 'result_alert',
      title: 'Result Alert Sent',
      subject: 'Your keyword is now ranking on Page 1!',
      body: null,
      status: 'opened',
      highlight_type: 'success',
      metadata: {
        keyword: 'custom firearms San Antonio',
        oldPosition: 24,
        newPosition: 7,
        change: 'Moved from position #24 to #7 (up 17 spots!) - First page visibility achieved'
      },
      recipient_email: ruger.contact_email,
      opened_at: new Date('2026-01-09T14:50:00Z'),
      clicked_at: null,
      sent_at: new Date('2026-01-09T14:45:00Z'),
    },
    // Content Approved and Published
    {
      client_id: ruger.id,
      comm_type: 'content_approved',
      title: 'Content Approved',
      subject: '"January Services Update" blog post has been approved and published',
      body: 'Your approved content is now live on your website. View it at ruger-firearms.com/blog/january-services-update',
      status: 'published',
      highlight_type: null,
      metadata: {
        contentTitle: 'January Services Update',
        contentType: 'blog_post',
        url: '/blog/january-services-update'
      },
      recipient_email: ruger.contact_email,
      opened_at: null,
      clicked_at: null,
      sent_at: new Date('2026-01-09T15:30:00Z'),
    },
    // Content Ready for Review
    {
      client_id: ruger.id,
      comm_type: 'content_review',
      title: 'Content Ready for Review',
      subject: '"Q1 2026 Marketing Goals" blog post is waiting for your approval',
      body: 'New content has been submitted for your review. Please approve or request revisions.',
      status: 'pending_review',
      highlight_type: null,
      metadata: {
        contentTitle: 'Q1 2026 Marketing Goals',
        contentType: 'blog_post',
        reviewUrl: '/admin/content/review/123'
      },
      recipient_email: ruger.contact_email,
      opened_at: new Date('2026-01-09T11:05:00Z'),
      clicked_at: null,
      sent_at: new Date('2026-01-09T11:00:00Z'),
    },
    // Invitation Reminder
    {
      client_id: ruger.id,
      comm_type: 'email_reminder',
      title: 'Invitation Reminder',
      subject: 'Your Pyrus Digital portal is waiting for you',
      body: null,
      status: 'clicked',
      highlight_type: null,
      metadata: {
        clickedButton: 'Create Account',
        clickedAt: '9:24 AM CST'
      },
      recipient_email: ruger.contact_email,
      opened_at: new Date('2026-01-08T09:20:00Z'),
      clicked_at: new Date('2026-01-08T09:24:00Z'),
      sent_at: new Date('2026-01-08T08:00:00Z'),
    },
    // Revision Requested
    {
      client_id: ruger.id,
      comm_type: 'content_revision',
      title: 'Revision Requested',
      subject: '"Holiday Promotion Post" requires changes before publishing',
      body: null,
      status: 'needs_revision',
      highlight_type: null,
      metadata: {
        contentTitle: 'Holiday Promotion Post',
        contentType: 'blog_post',
        feedback: 'Please update the pricing information to reflect January rates and adjust the call-to-action button text.'
      },
      recipient_email: ruger.contact_email,
      opened_at: null,
      clicked_at: null,
      sent_at: new Date('2026-01-05T14:30:00Z'),
    },
    // Portal Invitation (Failed)
    {
      client_id: ruger.id,
      comm_type: 'email_invite',
      title: 'Portal Invitation',
      subject: 'Welcome to Your Pyrus Digital Portal',
      body: null,
      status: 'failed',
      highlight_type: 'failed',
      metadata: {
        errorMessage: 'Delivery failed: Mailbox full / temporary error',
        resentAt: 'Dec 31'
      },
      recipient_email: ruger.contact_email,
      opened_at: null,
      clicked_at: null,
      sent_at: new Date('2025-12-29T14:30:00Z'),
    },
    // Monthly Report
    {
      client_id: ruger.id,
      comm_type: 'monthly_report',
      title: 'December 2025 Monthly Report',
      subject: 'Your December marketing performance report is ready',
      body: 'View your comprehensive monthly report showing traffic, leads, and campaign performance.',
      status: 'opened',
      highlight_type: null,
      metadata: {
        reportMonth: 'December 2025',
        reportUrl: '/reports/december-2025'
      },
      recipient_email: ruger.contact_email,
      opened_at: new Date('2026-01-02T11:30:00Z'),
      clicked_at: null,
      sent_at: new Date('2026-01-02T09:00:00Z'),
    },
    // Result Alert - Traffic Milestone
    {
      client_id: ruger.id,
      comm_type: 'result_alert',
      title: 'Traffic Milestone Achieved',
      subject: "You've hit 1,000 monthly visitors!",
      body: null,
      status: 'opened',
      highlight_type: 'success',
      metadata: {
        milestone: '1,000 monthly visitors',
        previousBest: 850,
        change: 'Website traffic exceeded 1,000 unique visitors for the first time!'
      },
      recipient_email: ruger.contact_email,
      opened_at: new Date('2026-01-07T10:15:00Z'),
      clicked_at: null,
      sent_at: new Date('2026-01-07T10:00:00Z'),
    },
    // Portal Invitation (Successful resend)
    {
      client_id: ruger.id,
      comm_type: 'email_invite',
      title: 'Portal Invitation',
      subject: 'Welcome to Your Pyrus Digital Portal',
      body: 'Your personalized client portal is ready. Click the link below to get started.',
      status: 'clicked',
      highlight_type: null,
      metadata: {
        clickedButton: 'Access Portal',
        clickedAt: '10:15 AM CST'
      },
      recipient_email: ruger.contact_email,
      opened_at: new Date('2025-12-31T10:10:00Z'),
      clicked_at: new Date('2025-12-31T10:15:00Z'),
      sent_at: new Date('2025-12-31T09:00:00Z'),
    },
  ]

  // Insert communications
  for (const comm of communications) {
    await prisma.client_communications.create({
      data: comm
    })
  }

  console.log(`Created ${communications.length} sample communications for Ruger`)

  await pool.end()
  await prisma.$disconnect()
}

main().catch(console.error)

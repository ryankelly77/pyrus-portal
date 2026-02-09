/**
 * Content Status Email Templates
 *
 * Email templates for content workflow status change notifications.
 */

interface ContentEmailData {
  recipientName: string
  contentTitle: string
  clientName: string
  changedByName: string
  portalUrl: string
  reviewRound?: number
  note?: string
  publishedUrl?: string
  scheduledDate?: string
}

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

// Brand colors matching the existing templates
const BRAND_GREEN = '#324438'
const DARK_TEXT = '#1A1F16'
const BODY_TEXT = '#5A6358'
const MUTED_TEXT = '#8B9088'
const LIGHT_BG = '#F8FAF8'
const BORDER_COLOR = '#e5e7eb'

/**
 * Build the standard email HTML template
 */
function buildEmailHtml(params: {
  preheader: string
  heading: string
  body: string // can contain HTML
  ctaUrl?: string
  ctaText?: string
  footerNote?: string
}): string {
  const { preheader, heading, body, ctaUrl, ctaText, footerNote } = params

  const ctaButton = ctaUrl && ctaText ? `
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 24px;">
      <tr>
        <td align="center">
          <a href="${ctaUrl}" style="display: inline-block; padding: 16px 32px; background-color: ${BRAND_GREEN}; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>
    <p style="margin: 20px 0 0; font-size: 14px; color: ${MUTED_TEXT}; line-height: 1.6; text-align: center;">
      Or copy and paste this link:<br />
      <a href="${ctaUrl}" style="color: ${BRAND_GREEN}; word-break: break-all;">${ctaUrl}</a>
    </p>
  ` : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td { padding: 0; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <!-- Preheader text (hidden preview text) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${preheader}
  </div>
  <div style="display: none; max-height: 0px; overflow: hidden;">
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid ${BORDER_COLOR};">
              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${DARK_TEXT}; line-height: 1.3;">
                ${heading}
              </h1>
              <div style="font-size: 16px; color: ${BODY_TEXT}; line-height: 1.6;">
                ${body}
              </div>
              ${ctaButton}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: ${LIGHT_BG}; border-radius: 0 0 12px 12px; border-top: 1px solid ${BORDER_COLOR};">
              ${footerNote ? `
              <p style="margin: 0 0 12px; font-size: 12px; color: ${MUTED_TEXT}; line-height: 1.6; text-align: center;">
                ${footerNote}
              </p>
              ` : ''}
              <p style="margin: 0; font-size: 12px; color: ${MUTED_TEXT}; line-height: 1.6; text-align: center;">
                This is an automated notification from Pyrus Digital Media.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: ${MUTED_TEXT}; line-height: 1.6; text-align: center;">
                Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: ${BRAND_GREEN};">pyrusdigitalmedia.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// ============================================================
// Client-facing emails
// ============================================================

/**
 * Content ready for client review
 */
export function getContentReadyForReviewEmail(data: ContentEmailData): EmailTemplate {
  const subject = `Content ready for your review: ${data.contentTitle}`

  const html = buildEmailHtml({
    preheader: `New content is ready for your review: ${data.contentTitle}`,
    heading: `Content Ready for Review`,
    body: `
      <p style="margin: 0 0 16px;">Hi there,</p>
      <p style="margin: 0 0 16px;">
        New content titled "<strong>${data.contentTitle}</strong>" has been created for ${data.clientName} and is ready for your review.
      </p>
      <p style="margin: 0 0 16px;">
        Please review the content and either approve it or request revisions. Once approved, we'll move forward with final optimization and publishing.
      </p>
    `,
    ctaUrl: data.portalUrl,
    ctaText: 'Review Now',
    footerNote: 'You have 5 business days to review this content.',
  })

  const text = `
Content Ready for Review

Hi there,

New content titled "${data.contentTitle}" has been created for ${data.clientName} and is ready for your review.

Please review the content and either approve it or request revisions.

Review now: ${data.portalUrl}

You have 5 business days to review this content.

- Pyrus Digital Media
`

  return { subject, html, text }
}

/**
 * Revision resubmitted for re-review
 */
export function getRevisionResubmittedEmail(data: ContentEmailData): EmailTemplate {
  const roundText = data.reviewRound ? ` (Round ${data.reviewRound})` : ''
  const subject = `Updated content ready for re-review: ${data.contentTitle}${roundText}`

  const html = buildEmailHtml({
    preheader: `We've made changes based on your feedback: ${data.contentTitle}`,
    heading: `Updated Content Ready`,
    body: `
      <p style="margin: 0 0 16px;">Hi there,</p>
      <p style="margin: 0 0 16px;">
        We've updated "<strong>${data.contentTitle}</strong>" based on your feedback and it's ready for your review again${roundText}.
      </p>
      <p style="margin: 0 0 16px;">
        Please take another look and let us know if you'd like to approve or request additional changes.
      </p>
    `,
    ctaUrl: data.portalUrl,
    ctaText: 'Review Updated Content',
  })

  const text = `
Updated Content Ready${roundText}

Hi there,

We've updated "${data.contentTitle}" based on your feedback and it's ready for your review again.

Please take another look and let us know if you'd like to approve or request additional changes.

Review now: ${data.portalUrl}

- Pyrus Digital Media
`

  return { subject, html, text }
}

/**
 * Content has been published
 */
export function getContentPublishedEmail(data: ContentEmailData): EmailTemplate {
  const subject = `Your content has been published: ${data.contentTitle}`

  const hasPublishedUrl = data.publishedUrl && data.publishedUrl.trim() !== ''

  const html = buildEmailHtml({
    preheader: `Great news! "${data.contentTitle}" is now live.`,
    heading: `Content Published!`,
    body: `
      <p style="margin: 0 0 16px;">Hi there,</p>
      <p style="margin: 0 0 16px;">
        Great news! "<strong>${data.contentTitle}</strong>" has been published and is now live.
      </p>
      ${hasPublishedUrl ? `
      <p style="margin: 0 0 16px;">
        <a href="${data.publishedUrl}" style="color: ${BRAND_GREEN}; font-weight: 600;">View it live here →</a>
      </p>
      ` : ''}
      <p style="margin: 0;">
        You can always view all your content in the portal.
      </p>
    `,
    ctaUrl: data.portalUrl,
    ctaText: 'View in Portal',
  })

  const text = `
Content Published!

Hi there,

Great news! "${data.contentTitle}" has been published and is now live.
${hasPublishedUrl ? `\nView it live: ${data.publishedUrl}` : ''}

View in portal: ${data.portalUrl}

- Pyrus Digital Media
`

  return { subject, html, text }
}

/**
 * Content has been scheduled
 */
export function getContentScheduledEmail(data: ContentEmailData): EmailTemplate {
  const subject = `Content scheduled for publishing: ${data.contentTitle}`

  const html = buildEmailHtml({
    preheader: `"${data.contentTitle}" is scheduled to go live soon.`,
    heading: `Content Scheduled`,
    body: `
      <p style="margin: 0 0 16px;">Hi there,</p>
      <p style="margin: 0 0 16px;">
        "<strong>${data.contentTitle}</strong>" has been scheduled for publishing${data.scheduledDate ? ` on <strong>${data.scheduledDate}</strong>` : ''}.
      </p>
      <p style="margin: 0;">
        We'll send you another notification once it goes live.
      </p>
    `,
    ctaUrl: data.portalUrl,
    ctaText: 'View in Portal',
  })

  const text = `
Content Scheduled

Hi there,

"${data.contentTitle}" has been scheduled for publishing${data.scheduledDate ? ` on ${data.scheduledDate}` : ''}.

We'll send you another notification once it goes live.

View in portal: ${data.portalUrl}

- Pyrus Digital Media
`

  return { subject, html, text }
}

// ============================================================
// Team-facing emails
// ============================================================

/**
 * Client started reviewing
 */
export function getClientStartedReviewingEmail(data: ContentEmailData): EmailTemplate {
  const subject = `${data.clientName} is reviewing: ${data.contentTitle}`

  const html = buildEmailHtml({
    preheader: `${data.changedByName} from ${data.clientName} started reviewing content.`,
    heading: `Client Reviewing Content`,
    body: `
      <p style="margin: 0 0 16px;">
        <strong>${data.changedByName}</strong> from ${data.clientName} has started reviewing "<strong>${data.contentTitle}</strong>".
      </p>
      <p style="margin: 0;">
        They may approve the content or request revisions soon.
      </p>
    `,
    ctaUrl: data.portalUrl,
    ctaText: 'View Content',
  })

  const text = `
Client Reviewing Content

${data.changedByName} from ${data.clientName} has started reviewing "${data.contentTitle}".

They may approve the content or request revisions soon.

View content: ${data.portalUrl}

- Pyrus Digital Media
`

  return { subject, html, text }
}

/**
 * Client approved
 */
export function getClientApprovedEmail(data: ContentEmailData): EmailTemplate {
  const subject = `✅ Approved: ${data.contentTitle} — ${data.clientName}`

  const html = buildEmailHtml({
    preheader: `${data.clientName} approved "${data.contentTitle}". Ready for final optimization.`,
    heading: `Content Approved!`,
    body: `
      <p style="margin: 0 0 16px;">
        <strong>${data.changedByName}</strong> from ${data.clientName} has approved "<strong>${data.contentTitle}</strong>".
      </p>
      <p style="margin: 0;">
        The content is now ready for final optimization and publishing.
      </p>
    `,
    ctaUrl: data.portalUrl,
    ctaText: 'Begin Final Optimization',
  })

  const text = `
Content Approved!

${data.changedByName} from ${data.clientName} has approved "${data.contentTitle}".

The content is now ready for final optimization and publishing.

View content: ${data.portalUrl}

- Pyrus Digital Media
`

  return { subject, html, text }
}

/**
 * Client requested revisions
 */
export function getRevisionsRequestedEmail(data: ContentEmailData): EmailTemplate {
  const roundText = data.reviewRound ? ` — Round ${data.reviewRound}` : ''
  const subject = `⚠️ Revisions requested: ${data.contentTitle}${roundText}`

  const feedbackHtml = data.note ? `
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px;">
            Client Feedback
          </p>
          <p style="margin: 0; font-size: 14px; color: #78350F; line-height: 1.6;">
            ${data.note.replace(/\n/g, '<br />')}
          </p>
        </td>
      </tr>
    </table>
  ` : ''

  const html = buildEmailHtml({
    preheader: `${data.clientName} requested changes to "${data.contentTitle}".`,
    heading: `Revisions Requested`,
    body: `
      <p style="margin: 0 0 16px;">
        <strong>${data.changedByName}</strong> from ${data.clientName} has requested revisions on "<strong>${data.contentTitle}</strong>"${roundText}.
      </p>
      ${feedbackHtml}
      <p style="margin: 0;">
        Please review the feedback and make the necessary updates.
      </p>
    `,
    ctaUrl: data.portalUrl,
    ctaText: 'Edit Content',
  })

  const text = `
Revisions Requested${roundText}

${data.changedByName} from ${data.clientName} has requested revisions on "${data.contentTitle}".

${data.note ? `Client Feedback:\n${data.note}\n` : ''}
Please review the feedback and make the necessary updates.

Edit content: ${data.portalUrl}

- Pyrus Digital Media
`

  return { subject, html, text }
}

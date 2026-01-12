interface ResultAlertData {
  firstName: string
  clientName: string
  alertType: 'ranking' | 'traffic' | 'leads' | 'milestone' | 'other' | string
  alertTypeLabel: string
  subject: string
  message: string
  portalUrl?: string
  metadata?: {
    keyword?: string
    newPosition?: number
    previousPosition?: number
    milestone?: string
    change?: string
  }
}

export function getResultAlertEmail(data: ResultAlertData): { subject: string; html: string; text: string } {
  const { firstName, clientName, alertType, alertTypeLabel, subject, message, portalUrl, metadata } = data

  // Get icon and color based on alert type - matches Send Result Alert modal exactly
  const getAlertStyle = () => {
    switch (alertType) {
      case 'ranking':
        // Keyword Ranking - green
        return { icon: '🔍', color: '#10B981', bgColor: '#D1FAE5' }
      case 'traffic':
        // Traffic Milestone - blue
        return { icon: '📈', color: '#3B82F6', bgColor: '#DBEAFE' }
      case 'leads':
        // Lead Increase - purple
        return { icon: '👤', color: '#8B5CF6', bgColor: '#EDE9FE' }
      case 'milestone':
        // Campaign Milestone - amber
        return { icon: '🏆', color: '#F59E0B', bgColor: '#FEF3C7' }
      case 'ai':
        // AI Alert - cyan
        return { icon: '✨', color: '#06B6D4', bgColor: '#CFFAFE' }
      case 'other':
      default:
        // Other Update - darker pink
        return { icon: '⚡', color: '#DB2777', bgColor: '#FDF2F8' }
    }
  }

  const style = getAlertStyle()
  const viewPortalUrl = portalUrl || 'https://portal.pyrusdigitalmedia.com'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${alertTypeLabel}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">
              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />
            </td>
          </tr>

          <!-- Alert Badge -->
          <tr>
            <td style="padding: 30px 40px 0; text-align: center;">
              <span style="display: inline-block; padding: 8px 16px; background-color: ${style.bgColor}; color: ${style.color}; font-size: 14px; font-weight: 600; border-radius: 20px;">
                ${style.icon} ${alertTypeLabel}
              </span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 30px 40px 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3; text-align: center;">
                ${subject}
              </h1>

              <p style="margin: 0 0 20px; font-size: 16px; color: #5A6358; line-height: 1.6;">
                Hi ${firstName},
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; color: #5A6358; line-height: 1.6;">
                ${message}
              </p>

              ${metadata?.keyword ? `
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: ${style.bgColor}; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #5A6358;">Keyword</p>
                    <p style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #1A1F16;">"${metadata.keyword}"</p>
                    <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${style.color};">
                      Position #${metadata.newPosition}
                      ${metadata.previousPosition ? `<span style="font-size: 14px; font-weight: 400; color: #5A6358;"> (was #${metadata.previousPosition})</span>` : ''}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              ${metadata?.milestone ? `
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: ${style.bgColor}; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${style.color};">
                      ${metadata.milestone}
                    </p>
                    ${metadata.change ? `<p style="margin: 8px 0 0; font-size: 14px; color: #5A6358;">${metadata.change}</p>` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${viewPortalUrl}/results" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      View Full Results
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #5A6358;">
                Keep up the great work! Your marketing is making an impact.
              </p>
              <p style="margin: 0 0 16px; font-size: 14px; color: #324438;">
                <a href="mailto:support@pyrusdigitalmedia.com" style="color: #324438; text-decoration: none;">support@pyrusdigitalmedia.com</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #8B9088;">
                Pyrus Digital Media<br />
                702 Houston St, Fort Worth, TX 76102<br />
                <a href="https://pyrusdigitalmedia.com" style="color: #8B9088;">pyrusdigitalmedia.com</a>
              </p>
            </td>
          </tr>

        </table>

        <!-- Unsubscribe Footer -->
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8B9088;">
                You're receiving this result alert for ${clientName} because you're subscribed to marketing updates.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const text = `
${alertTypeLabel}

${subject}

Hi ${firstName},

${message}

${metadata?.keyword ? `
Keyword: "${metadata.keyword}"
Position: #${metadata.newPosition}${metadata.previousPosition ? ` (was #${metadata.previousPosition})` : ''}
` : ''}

${metadata?.milestone ? `
${metadata.milestone}
${metadata.change || ''}
` : ''}

View your full results at:
${viewPortalUrl}/results

---
Keep up the great work! Your marketing is making an impact.

Pyrus Digital Media
702 Houston St, Fort Worth, TX 76102
support@pyrusdigitalmedia.com
https://pyrusdigitalmedia.com

You're receiving this result alert for ${clientName} because you're subscribed to marketing updates.
  `.trim()

  return { subject, html, text }
}

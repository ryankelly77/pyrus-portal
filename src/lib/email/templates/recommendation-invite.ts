interface RecommendationInviteData {
  firstName: string
  clientName: string
  inviteUrl: string
  senderName?: string
}

export function getRecommendationInviteEmail(data: RecommendationInviteData): { subject: string; html: string; text: string } {
  const { firstName, clientName, inviteUrl, senderName } = data

  const subject = `Your Personalized Marketing Proposal for ${clientName}`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Marketing Proposal</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background-color: #324438; border-radius: 12px 12px 0 0;">
              <img src="https://pyrusdigitalmedia.com/wp-content/uploads/2024/11/pyrus-logo-white.png" alt="Pyrus Digital Media" style="height: 40px; width: auto;" />
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">
                Hi ${firstName},
              </h1>

              <p style="margin: 0 0 20px; font-size: 16px; color: #5A6358; line-height: 1.6;">
                We've prepared a personalized marketing proposal for <strong>${clientName}</strong>. Inside, you'll find tailored recommendations designed to help grow your business online.
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #5A6358; line-height: 1.6;">
                Click below to view your proposal and explore the options we've put together for you:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; transition: background-color 0.2s;">
                      View Your Proposal
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6;">
                Or copy and paste this link into your browser:<br />
                <a href="${inviteUrl}" style="color: #324438; word-break: break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Features Section -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F8FAF8; border-radius: 8px; padding: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #324438; text-transform: uppercase; letter-spacing: 0.5px;">
                      Why Choose Pyrus?
                    </h3>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #5A6358;">
                          <span style="color: #324438; margin-right: 8px;">✓</span> 30-day money-back guarantee
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #5A6358;">
                          <span style="color: #324438; margin-right: 8px;">✓</span> Month-to-month, no contracts
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #5A6358;">
                          <span style="color: #324438; margin-right: 8px;">✓</span> AI-powered marketing tools
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #5A6358;">
                          <span style="color: #324438; margin-right: 8px;">✓</span> Local business expertise
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #5A6358;">
                Questions? We're here to help.
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
                You're receiving this email because a marketing proposal was created for ${clientName}.
                ${senderName ? `This proposal was sent by ${senderName}.` : ''}
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
Hi ${firstName},

We've prepared a personalized marketing proposal for ${clientName}. Inside, you'll find tailored recommendations designed to help grow your business online.

View your proposal here:
${inviteUrl}

Why Choose Pyrus?
✓ 30-day money-back guarantee
✓ Month-to-month, no contracts
✓ AI-powered marketing tools
✓ Local business expertise

Questions? We're here to help.
Email: support@pyrusdigitalmedia.com

---
Pyrus Digital Media
702 Houston St, Fort Worth, TX 76102
https://pyrusdigitalmedia.com

You're receiving this email because a marketing proposal was created for ${clientName}.
${senderName ? `This proposal was sent by ${senderName}.` : ''}
  `.trim()

  return { subject, html, text }
}

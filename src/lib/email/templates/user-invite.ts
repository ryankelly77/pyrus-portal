interface UserInviteData {
  firstName: string
  inviteUrl: string
  role: 'client' | 'admin' | 'super_admin' | 'production_team' | 'sales'
  clientName?: string // Only for client users
  inviterName?: string
}

export function getUserInviteEmail(data: UserInviteData): { subject: string; html: string; text: string } {
  const { firstName, inviteUrl, role, clientName, inviterName } = data

  const isAdminRole = role !== 'client'
  const roleDisplay = getRoleDisplay(role)

  const subject = isAdminRole
    ? `You've been invited to join the Pyrus Admin Portal`
    : `You've been invited to the ${clientName} Portal`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portal Invitation</title>
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

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">
                Hi ${firstName},
              </h1>

              <p style="margin: 0 0 20px; font-size: 16px; color: #5A6358; line-height: 1.6;">
                ${isAdminRole
                  ? `You've been invited to join the Pyrus Digital Media admin portal as <strong>${roleDisplay}</strong>.`
                  : `You've been invited to access the client portal for <strong>${clientName}</strong>.`
                }
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #5A6358; line-height: 1.6;">
                Click the button below to set up your account and get started:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Set Up Your Account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6;">
                Or copy and paste this link into your browser:<br />
                <a href="${inviteUrl}" style="color: #324438; word-break: break-all;">${inviteUrl}</a>
              </p>

              <p style="margin: 20px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6;">
                This link will expire in 7 days.
              </p>
            </td>
          </tr>

          <!-- What to Expect Section -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F8FAF8; border-radius: 8px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #324438; text-transform: uppercase; letter-spacing: 0.5px;">
                      What You'll Get Access To
                    </h3>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      ${getAccessListHtml(role)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 12px 0 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">
                Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: #324438;">pyrusdigitalmedia.com</a>
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

  const text = `
Hi ${firstName},

${isAdminRole
  ? `You've been invited to join the Pyrus Digital Media admin portal as ${roleDisplay}.`
  : `You've been invited to access the client portal for ${clientName}.`
}

Click the link below to set up your account:
${inviteUrl}

This link will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

- Pyrus Digital Media
`

  return { subject, html, text }
}

function getRoleDisplay(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin'
    case 'admin':
      return 'Admin'
    case 'production_team':
      return 'Production Team Member'
    case 'sales':
      return 'Sales Team Member'
    default:
      return 'User'
  }
}

function getAccessListHtml(role: string): string {
  const checkmark = '<span style="color: #324438; margin-right: 8px;">&#10003;</span>'
  const rowStyle = 'padding: 8px 0; font-size: 14px; color: #5A6358;'

  const items: string[] = []

  switch (role) {
    case 'super_admin':
    case 'admin':
      items.push('Full admin dashboard access')
      items.push('Client and user management')
      items.push('Analytics and reporting')
      break
    case 'production_team':
      items.push('Content production dashboard')
      items.push('Project and task management')
      items.push('Client content workflows')
      break
    case 'sales':
      items.push('Sales pipeline dashboard')
      items.push('Client recommendations')
      items.push('Revenue reporting')
      break
    default: // client
      items.push('View your marketing progress')
      items.push('Access reports and analytics')
      items.push('Communicate with your team')
  }

  return items.map(item => `
    <tr>
      <td style="${rowStyle}">
        ${checkmark} ${item}
      </td>
    </tr>
  `).join('')
}

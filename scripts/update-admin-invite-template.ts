/**
 * Script to update the user-invite-admin email template
 * to use dynamic ${accessListHtml} variable
 *
 * Run with: npx tsx scripts/update-admin-invite-template.ts
 */

import { Pool } from 'pg'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const newBodyHtml = `<!DOCTYPE html>
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
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">
              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">
                Hi \${firstName},
              </h1>
              <p style="margin: 0 0 20px; font-size: 16px; color: #5A6358; line-height: 1.6;">
                You've been invited to join the Pyrus Digital Media admin portal as <strong>\${roleDisplay}</strong>.
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; color: #5A6358; line-height: 1.6;">
                Click the button below to set up your account and get started:
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="\${inviteUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Set Up Your Account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6;">
                Or copy and paste this link into your browser:<br />
                <a href="\${inviteUrl}" style="color: #324438; word-break: break-all;">\${inviteUrl}</a>
              </p>
              <p style="margin: 20px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6;">
                This link will expire in 7 days.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F8FAF8; border-radius: 8px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #324438; text-transform: uppercase; letter-spacing: 0.5px;">
                      What You'll Get Access To
                    </h3>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      \${accessListHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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
</html>`

const newAvailableVariables = [
  { key: 'firstName', description: "Recipient's first name", example: 'John' },
  { key: 'roleDisplay', description: 'Human-readable role name', example: 'Admin' },
  { key: 'inviteUrl', description: 'Account setup URL with invite token', example: 'https://portal.pyrusdigitalmedia.com/accept-invite?token=abc123' },
  { key: 'inviterName', description: 'Name of person who sent the invite', example: 'Jane Smith' },
  { key: 'accessListHtml', description: 'HTML table rows of role-specific access items (auto-generated based on role)', example: '<tr><td>...</td></tr>' },
]

async function main() {
  console.log('Updating user-invite-admin template...')

  const result = await pool.query(
    `UPDATE email_templates
     SET body_html = $1,
         available_variables = $2,
         updated_at = NOW()
     WHERE slug = 'user-invite-admin'
     RETURNING id, updated_at`,
    [newBodyHtml, JSON.stringify(newAvailableVariables)]
  )

  if (result.rowCount === 0) {
    console.error('Template not found! Make sure the user-invite-admin template exists.')
    process.exit(1)
  }

  console.log('Template updated successfully!')
  console.log('Template ID:', result.rows[0].id)
  console.log('Updated at:', result.rows[0].updated_at)

  await pool.end()
}

main().catch((e) => {
  console.error('Error updating template:', e)
  process.exit(1)
})

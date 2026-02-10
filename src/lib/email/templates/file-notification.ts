interface FileNotificationData {
  clientName: string
  contactName: string
  fileName: string
  fileCategory: string
  portalUrl: string
}

export function getFileNotificationEmail(data: FileNotificationData): { subject: string; html: string; text: string } {
  const { clientName, contactName, fileName, fileCategory, portalUrl } = data

  const subject = `New file added to your portal: ${fileName}`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New File Added</title>
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
                Hi ${contactName || 'there'},
              </h1>

              <p style="margin: 0 0 20px; font-size: 16px; color: #5A6358; line-height: 1.6;">
                A new file has been added to your ${clientName} portal.
              </p>

              <!-- File Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F8FAF8; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-size: 12px; color: #8B9088; text-transform: uppercase; letter-spacing: 0.5px;">File Name</span><br />
                          <span style="font-size: 16px; color: #1A1F16; font-weight: 500;">${fileName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-size: 12px; color: #8B9088; text-transform: uppercase; letter-spacing: 0.5px;">Category</span><br />
                          <span style="font-size: 16px; color: #1A1F16; font-weight: 500;">${fileCategory}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 30px; font-size: 16px; color: #5A6358; line-height: 1.6;">
                Log in to your portal to view and download the file.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      View in Portal
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">
                You're receiving this because you have an account on the Pyrus Digital Media portal.
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
Hi ${contactName || 'there'},

A new file has been added to your ${clientName} portal.

File Name: ${fileName}
Category: ${fileCategory}

Log in to your portal to view and download the file:
${portalUrl}

- Pyrus Digital Media
`

  return { subject, html, text }
}

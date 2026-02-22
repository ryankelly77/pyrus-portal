# Email Template Skill - Pyrus Portal

This skill documents how to create email templates in Pyrus Portal.

## 1. Template Structure

Every email template has three required parts:

| Field | Description | Variable Support |
|-------|-------------|------------------|
| `subject_template` | Email subject line | Yes - `${variableName}` |
| `body_html` | Full HTML email with wrapper | Yes - `${variableName}` |
| `body_text` | Plain text fallback (REQUIRED) | Yes - `${variableName}` |

### Database Fields
```sql
-- Core fields
slug                 VARCHAR     -- Unique identifier (lowercase, hyphens)
name                 VARCHAR     -- Display name
description          TEXT        -- Admin description
trigger_event        VARCHAR     -- e.g., 'user_invite_sent'
trigger_description  TEXT        -- Human-readable trigger description
recipient_type       VARCHAR     -- 'user', 'client', 'admin', 'prospect', 'any'
subject_template     TEXT        -- Subject with variables
body_html            TEXT        -- Full HTML email
body_text            TEXT        -- Plain text version (REQUIRED)
available_variables  JSONB       -- Array of {key, description, example}
is_active            BOOLEAN     -- Enable/disable template
is_system            BOOLEAN     -- Protected system template
category_id          UUID        -- FK to email_categories
```

---

## 2. Pyrus Branding

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary Green | `#324438` | CTA buttons, links, checkmarks |
| Primary Brown | `#885430` | Alternative CTA (password reset) |
| Light Background | `#F8FAF8` | Feature boxes, footer |
| Card Background | `#ffffff` | Main content area |
| Page Background | `#f5f5f5` | Body/outer background |
| Dark Text | `#1A1F16` | Headings |
| Body Text | `#5A6358` | Paragraph text |
| Muted Text | `#8B9088` | Secondary/footer text |
| Border | `#e5e7eb` | Dividers |
| Success Badge | `#D1FAE5` bg, `#10B981` text | Alert badges |

### Visual Elements
```
Logo URL:       https://portal.pyrusdigitalmedia.com/pyrus-logo.png
Logo Height:    36px
Card Radius:    12px
Button Radius:  8px
Box Radius:     8px
Max Width:      600px
Padding:        40px (main content), 24px (header/footer)
```

---

## 3. Available Variables

### Global Variables (Auto-injected)
These are available on ALL templates automatically:

| Variable | Description | Example |
|----------|-------------|---------|
| `${firstName}` | Recipient's first name | John |
| `${lastName}` | Recipient's last name | Smith |
| `${fullName}` | Recipient's full name | John Smith |
| `${email}` | Recipient's email | john@example.com |
| `${clientName}` | Client/company name | Acme Corp |
| `${portalUrl}` | Portal base URL | https://portal.pyrusdigitalmedia.com |
| `${supportEmail}` | Support email | support@pyrusdigitalmedia.com |
| `${currentDate}` | Today's date | February 21, 2026 |
| `${currentYear}` | Current year | 2026 |

### Variable Syntax
```html
<!-- Both syntaxes work: -->
${variableName}
{{variableName}}

<!-- Nested paths supported: -->
${client.name}
```

### HTML Escaping Rules
- Variables are **HTML-escaped by default** to prevent XSS
- Variables ending in `Html`, `Link`, or `Url` are **NOT escaped**
- Example: `${accessListHtml}` outputs raw HTML

---

## 4. Template Naming Convention

### Slug Format
```
[feature]-[action]-[modifier]
```

### Examples
| Slug | Description |
|------|-------------|
| `password-reset` | Password reset email |
| `user-invite-client` | Client user invitation |
| `user-invite-admin` | Admin user invitation |
| `content-ready-for-review` | Content awaiting client review |
| `content-revision-resubmitted` | Revised content ready for re-review |
| `content-client-approved` | Client approved content (team-facing) |
| `recommendation-invite` | Proposal/recommendation invitation |
| `result-alert` | Marketing result notification |

### Trigger Event Names
```
password_reset_requested
user_invite_sent
content_status_changed
content_review_started
content_approved
content_revisions_requested
file_uploaded
recommendation_sent
result_alert_sent
```

---

## 5. Standard Components

### Header with Logo
```html
<tr>
  <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">
    <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />
  </td>
</tr>
```

### CTA Button (Primary Green)
```html
<table role="presentation" style="width: 100%; border-collapse: collapse;">
  <tr>
    <td align="center">
      <a href="${actionUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
        Button Text
      </a>
    </td>
  </tr>
</table>
```

### "Why Choose Pyrus?" Box
```html
<table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F8FAF8; border-radius: 8px;">
  <tr>
    <td style="padding: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #324438; text-transform: uppercase; letter-spacing: 0.5px;">
        Why Choose Pyrus?
      </h3>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> 30-day money-back guarantee</td></tr>
        <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> Month-to-month, no contracts</td></tr>
        <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> AI-powered marketing tools</td></tr>
        <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> Local business expertise</td></tr>
      </table>
    </td>
  </tr>
</table>
```

### "What You'll Get Access To" Box
```html
<table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F8FAF8; border-radius: 8px;">
  <tr>
    <td style="padding: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #324438; text-transform: uppercase; letter-spacing: 0.5px;">
        What You'll Get Access To
      </h3>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> View your marketing progress</td></tr>
        <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> Access reports and analytics</td></tr>
        <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> Communicate with your team</td></tr>
      </table>
    </td>
  </tr>
</table>
```

### Footer
```html
<tr>
  <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">
      This is an automated notification from Pyrus Digital Media.
    </p>
    <p style="margin: 12px 0 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">
      Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: #324438;">pyrusdigitalmedia.com</a>
    </p>
  </td>
</tr>
```

### Full Footer with Contact Info
```html
<tr>
  <td style="padding: 30px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #E5E7EB;">
    <p style="margin: 0 0 8px; font-size: 14px; color: #5A6358;">Questions? We're here to help.</p>
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
```

### Fallback Link (below CTA button)
```html
<p style="margin: 20px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6; text-align: center;">
  Or copy and paste this link:<br />
  <a href="${actionUrl}" style="color: #324438; word-break: break-all;">${actionUrl}</a>
</p>
```

---

## 6. Complete HTML Template Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Title</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <!-- Preheader (hidden preview text) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">Preview text here</div>

  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Card -->
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
                Your main message goes here. Explain what this email is about.
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; color: #5A6358; line-height: 1.6;">
                Additional context or call to action description.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Primary Action
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link -->
              <p style="margin: 30px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6;">
                Or copy and paste this link into your browser:<br />
                <a href="${actionUrl}" style="color: #324438; word-break: break-all;">${actionUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Optional Feature Box -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F8FAF8; border-radius: 8px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #324438; text-transform: uppercase; letter-spacing: 0.5px;">
                      Feature Box Title
                    </h3>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> Benefit one</td></tr>
                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> Benefit two</td></tr>
                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> Benefit three</td></tr>
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
                This is an automated notification from Pyrus Digital Media.
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
```

---

## 7. Plain Text Template Example

**ALWAYS create a plain text version.** Match the structure of the HTML:

```
Hi ${firstName},

Your main message goes here. Explain what this email is about.

Additional context or call to action description.

Click here to take action:
${actionUrl}

---
This is an automated notification from Pyrus Digital Media.
Pyrus Digital Media | pyrusdigitalmedia.com
```

---

## 8. Sending Templates Programmatically

```typescript
import { sendTemplatedEmail } from '@/lib/email/template-service'

const result = await sendTemplatedEmail({
  templateSlug: 'content-ready-for-review',
  to: 'client@example.com',
  variables: {
    firstName: 'John',
    clientName: 'Acme Corp',
    contentTitle: '10 Tips for Local SEO',
    portalUrl: 'https://portal.pyrusdigitalmedia.com/content/abc123',
  },
  userId: user.id,        // Optional: recipient user ID for logging
  clientId: client.id,    // Optional: client ID for logging
  tags: ['content-review'], // Optional: Mailgun tags
})

if (result.success) {
  console.log('Email sent:', result.messageId)
} else {
  console.error('Email failed:', result.error)
}
```

---

## 9. Common Mistakes to Avoid

### DON'T forget the plain text version
```typescript
// WRONG - Missing body_text
body_html: '...',
body_text: null,  // Will cause rendering issues

// RIGHT - Always provide plain text
body_html: '...',
body_text: 'Hi ${firstName},\n\nYour message here...',
```

### DON'T use CSS classes (must be inline)
```html
<!-- WRONG - Classes won't work in email clients -->
<p class="text-gray-600">Hello</p>

<!-- RIGHT - Inline styles only -->
<p style="color: #5A6358;">Hello</p>
```

### DON'T forget the logo
```html
<!-- WRONG - Missing logo -->
<td style="padding: 32px;">Welcome!</td>

<!-- RIGHT - Always include logo in header -->
<td style="padding: 32px 40px 24px; text-align: center;">
  <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" ... />
</td>
```

### DON'T use divs for layout (use tables)
```html
<!-- WRONG - Divs don't work reliably in email -->
<div style="display: flex;">
  <div>Column 1</div>
  <div>Column 2</div>
</div>

<!-- RIGHT - Tables for layout -->
<table role="presentation" style="width: 100%;">
  <tr>
    <td>Column 1</td>
    <td>Column 2</td>
  </tr>
</table>
```

### DON'T use external stylesheets
```html
<!-- WRONG - External CSS won't load -->
<link rel="stylesheet" href="styles.css">

<!-- RIGHT - All styles inline -->
<body style="margin: 0; padding: 0; ...">
```

### DON'T forget role="presentation" on layout tables
```html
<!-- WRONG - Screen readers may interpret as data table -->
<table style="width: 100%;">

<!-- RIGHT - Marks table as layout-only -->
<table role="presentation" style="width: 100%;">
```

### DON'T use background images (unreliable support)
```html
<!-- WRONG - Background images often blocked -->
<td style="background-image: url(...);">

<!-- RIGHT - Use solid colors -->
<td style="background-color: #F8FAF8;">
```

---

## 10. Template Categories

| Category | Slug | Description |
|----------|------|-------------|
| Transactional | `transactional` | Auth & account emails (password reset, invites) |
| Workflow | `workflow` | Content workflow notifications |
| Sales | `sales` | Proposals & recommendations |
| Alerts | `alerts` | Result alerts & notifications |

---

## 11. Testing Templates

1. Go to Admin > Emails > [Template]
2. Click "Send Test Email"
3. Enter a test email address
4. Check both HTML and plain text rendering
5. Test on multiple email clients (Gmail, Outlook, Apple Mail)

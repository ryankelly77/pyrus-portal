# Email Template Manager

## Overview
The Email Template Manager allows admins to view and edit all automated emails sent by the Pyrus Portal without code changes.

## Accessing Templates
Navigate to **Settings → Email Templates** in the admin panel.

## Features

### Viewing Templates
- Templates are grouped by category: Transactional, Workflow, Sales & Proposals, Alerts
- Filter by status (Active/Inactive), recipient type, or search by name
- Toggle templates on/off without editing

### Editing Templates
Click any template name to edit:
- **Subject Line**: Supports variables like `${clientName}`
- **HTML Body**: Full HTML editor with syntax highlighting
- **Plain Text**: Fallback for email clients that don't support HTML
- **Live Preview**: See rendered email with example values

### Using Variables
Variables are inserted using `${variableName}` syntax. Available variables are shown in the right panel. Click "Copy" to copy the variable syntax.

Common variables:
- `${firstName}` - Recipient's first name
- `${clientName}` - Client company name
- `${portalUrl}` - Link to the portal

### Version History
Every save creates a version. Click "View History" to:
- See all previous versions with timestamps
- Preview any past version
- Restore a previous version if needed

### Testing
Before saving, send a test email:
1. Click "Send Test Email"
2. Enter recipient email (defaults to your email)
3. Review with example values filled in
4. Check your inbox

## For Developers

### Adding a New Email Type

1. **Create the template in the database:**
   - Go to Supabase dashboard → SQL Editor
   - Insert into `email_templates` table
   - Or add via the admin UI (requires removing is_system restriction)

2. **Define available variables:**
```json
[
  {"key": "userName", "description": "Recipient name", "example": "John Smith"},
  {"key": "actionUrl", "description": "CTA button URL", "example": "https://..."}
]
```

3. **Send the email from code:**
```typescript
import { sendTemplatedEmail } from '@/lib/email/template-service'

await sendTemplatedEmail({
  templateSlug: 'your-new-template',
  to: recipient.email,
  variables: {
    userName: recipient.name,
    actionUrl: 'https://...',
  },
  userId: recipient.id,
  clientId: client.id,
})
```

4. **Handle the result:**
```typescript
const result = await sendTemplatedEmail({...})
if (!result.success) {
  console.error('Email failed:', result.error)
  // Handle error
}
// result.logId contains the email_logs record ID
```

### Template Service API
```typescript
// Send a templated email
sendTemplatedEmail(options: {
  templateSlug: string
  to: string
  variables: Record<string, any>
  userId?: string
  clientId?: string
  replyTo?: string
  subject?: string  // Override template subject
}): Promise<SendResult>

// Invalidate cache after template update
invalidateTemplateCache(slug?: string): void

// Update email status from webhook
updateEmailLogStatus(messageId: string, status: string): Promise<void>
```

### Database Tables

- `email_categories` - Template groupings
- `email_templates` - Template definitions and content
- `email_template_versions` - Auto-created on every save
- `email_logs` - Record of every email sent

## Troubleshooting

### Email not sending
1. Check template is active (is_active = true)
2. Check email_logs for error messages
3. Verify Mailgun API key in environment variables

### Variables not replacing
1. Ensure variable name matches exactly (case-sensitive)
2. Check available_variables in template matches what code sends
3. Look for typos in `${variableName}` syntax

### Template changes not appearing
1. Cache TTL is 5 minutes - wait or restart server
2. Check the save was successful (look for toast notification)
3. Verify in database that content updated

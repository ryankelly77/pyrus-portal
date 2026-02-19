# Claude Code Guidelines for Pyrus Portal

## Pre-commit Rules (CRITICAL)

BEFORE committing or pushing any code, you MUST:
1. Run `npm run build` and verify it completes with zero errors
2. If the build fails, fix ALL errors before committing
3. Never commit code that doesn't pass a clean build

Do not skip this step. Do not assume it will build. Actually run it and verify.

---

## Project Overview

Pyrus Portal is a client management platform built with Next.js 15 (App Router). It provides:
- **Client Portal**: Dashboard, results, content approval, billing, recommendations
- **Admin Portal**: Client management, revenue tracking, content workflow, email automation
- **Sales Pipeline**: Lead tracking with scoring and tier predictions

### Tech Stack
- **Framework**: Next.js 15 (App Router, React 19)
- **Database**: PostgreSQL via Supabase + Prisma ORM
- **Auth**: Supabase Auth with custom role-based permissions
- **Payments**: Stripe (subscriptions, invoices, payment methods)
- **Email**: Mailgun for transactional emails
- **Styling**: CSS variables with custom design system (no Tailwind in most components)
- **Deployment**: Vercel with cron jobs

---

## Project Structure

```
src/
├── app/
│   ├── (client)/          # Client-facing pages (dashboard, results, content, etc.)
│   ├── admin/             # Admin pages
│   │   ├── clients/       # Client management
│   │   ├── content/       # Content approval workflow
│   │   ├── emails/        # Email templates & automations
│   │   ├── products/      # Product/bundle/addon management
│   │   ├── revenue/       # Revenue dashboard & pipeline
│   │   ├── settings/      # Admin settings (announcements, tutorials, roles)
│   │   ├── users/         # User management & impersonation
│   │   └── websites/      # Website edit request management
│   └── api/               # API routes
│       ├── admin/         # Admin-only endpoints
│       ├── client/        # Client-facing endpoints
│       ├── cron/          # Scheduled jobs (pipeline-scores, process-automations)
│       ├── stripe/        # Stripe integration
│       └── webhooks/      # External webhooks (Basecamp, HighLevel, UptimeRobot)
├── components/
│   ├── admin/             # Admin-specific components
│   ├── client/            # Client-specific components (AlertBanner, ImpersonationBanner)
│   ├── client-views/      # Shared client view components
│   ├── content/           # Content workflow components
│   ├── layout/            # Layout components (AdminHeader, AdminSidebar)
│   ├── pipeline/          # Sales pipeline components
│   └── recommendation-builder/  # Smart recommendation builder
├── hooks/
│   ├── useClientData.ts   # Client data fetching
│   ├── useUserProfile.ts  # User profile with permissions
│   └── usePageView.ts     # Page view tracking
└── lib/
    ├── email/             # Email services (automation, templates, mailgun)
    ├── performance/       # Performance scoring algorithms
    ├── pipeline/          # Pipeline scoring and lead management
    ├── services/          # Business logic services
    ├── supabase/          # Supabase client helpers
    └── validation/        # Input validation schemas
```

---

## Database Models (Prisma)

### Core Entities
- `clients` - Client accounts
- `profiles` - User profiles (linked to Supabase auth)
- `products`, `bundles`, `addons` - Product catalog
- `subscriptions`, `subscription_items` - Billing

### Content & Workflow
- `content`, `content_comments`, `content_revisions` - Content items and approval
- `website_edit_requests` - Client website change requests

### Email System
- `email_templates`, `email_template_versions` - Template management
- `email_automations`, `email_automation_steps` - Automation workflows
- `email_automation_enrollments`, `email_automation_step_logs` - Execution tracking

### Email Template Conventions
Standard variables available in templates:
- `${firstName}` - Recipient's first name
- `${clientName}` - Client/company name
- `${inviteUrl}` - Recommendation invite URL
- `${portalUrl}` - Link to client portal

Template slugs follow pattern: `[feature]-[action]-[stage]`
Examples: `recommendation-reminder-soft`, `recommendation-viewed-thanks`

Templates require both HTML body and plain text body for email client compatibility.

### Recommendations & Performance
- `recommendations`, `recommendation_history` - Manual recommendations
- `smart_recommendations`, `smart_recommendation_items` - AI-powered recommendations
- `score_history`, `metric_snapshots` - Performance tracking

### Admin Features
- `role_permissions` - Role-based access control
- `client_announcements`, `announcement_dismissals` - Client notifications
- `bug_reports` - Bug tracking

---

## Key Patterns

### Authentication & Authorization

```typescript
// Server-side auth check pattern
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check role/permissions via profiles table
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id }
  })
}
```

### Service Role Client (for bypassing RLS)

```typescript
import { createServiceClient } from '@/lib/supabase/server'

// Use for cron jobs, webhooks, admin operations that need full access
const supabase = await createServiceClient()
```

### Database Queries (Prisma + dbPool)

```typescript
// Use Prisma for typed queries
import { prisma } from '@/lib/prisma'
const clients = await prisma.clients.findMany()

// Use dbPool for complex joins or raw SQL
import { dbPool } from '@/lib/prisma'
const result = await dbPool.query('SELECT * FROM clients WHERE ...')
```

### Impersonation System

Cookies used for impersonation:
- `impersonating_user_id` - The user being impersonated
- `impersonating_user_name` - Display name
- `impersonating_admin_id` - The super admin doing the impersonation

Admin layout checks these cookies and uses the impersonated user's permissions.

### Route-Based Tabs Pattern

Pages with tabs use route-based navigation (not client state):
```
/admin/settings           → General tab
/admin/settings/roles     → Roles tab
/admin/settings/announcements → Announcements tab
```

Layout file renders tab navigation, child `page.tsx` renders content.

### Large Component Refactoring Pattern
When a page exceeds ~2000 lines:
1. Extract types to `src/types/[feature].ts`
2. Extract modals to `src/components/admin/[feature]/modals/`
3. Create barrel export: `src/components/admin/[feature]/modals/index.ts`
4. Extract data fetching to `src/hooks/use-[feature]-data.ts`
5. Keep page.tsx as orchestrator only

Example (client page refactor):
- Before: 5,141 lines in one file
- After: 2,710 lines in page.tsx + extracted modals + data hook

---

## API Conventions

### Response Format
```typescript
// Success
return NextResponse.json({ data: result })
return NextResponse.json(result) // Direct object OK for simple cases

// Error
return NextResponse.json({ error: 'Message' }, { status: 400 })
```

### Admin vs Client APIs
- `/api/admin/*` - Requires admin/super_admin role
- `/api/client/*` - Requires authenticated user with client association

---

## Environment Variables

Required in `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database
DATABASE_URL=
DIRECT_URL=  # For Prisma migrations

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Mailgun
MAILGUN_API_KEY=
MAILGUN_DOMAIN=

# Optional
CRON_SECRET=  # Protect cron endpoints
UPTIMEROBOT_API_KEY=
```

---

## Cron Jobs (vercel.json)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `/api/cron/pipeline-scores` | Daily 6am | Update lead pipeline scores |
| `/api/cron/process-automations` | Hourly | Execute email automation steps |

### Email Automation System
**Triggers** (fire via Mailgun webhooks or app events):
- `recommendation_sent` - When recommendation email is sent
- `recommendation_email_opened` - Mailgun webhook on open
- `recommendation_email_clicked` - Mailgun webhook on click
- `recommendation_viewed` - When client views recommendation

**Exit Conditions** (checked before each email send):
- `on_purchase` - Client makes a purchase
- `on_email_open` - Client opens any email in sequence
- `on_email_click` - Client clicks link in any email
- `on_recommendation_viewed` - Client views their recommendation
- `on_unsubscribe` - Client unsubscribes

Duplicate enrollment prevention: Users cannot be enrolled in the same automation twice while active.

---

## Common Tasks

### Adding a New Admin Page

1. Create route: `src/app/admin/[page-name]/page.tsx`
2. Add to sidebar: `src/components/layout/admin-sidebar.tsx`
3. Add permission check to layout if needed

### Adding a New API Route

1. Create `route.ts` in appropriate folder
2. Add auth check at start
3. Use try/catch with proper error responses

### Adding to Client Announcements

Announcements support:
- Target types: `all`, specific clients, admin users
- Display pages: dashboard, results, content, etc.
- Persistence: dismissable, show for X days, required

---

## Testing

```bash
npm test          # Run tests once
npm run test:watch  # Watch mode
```

Tests use Vitest. Test files are colocated with source files or in `__tests__` folders.

---

## Deployment

1. Push to `main` branch
2. Vercel auto-deploys
3. Database migrations: Run via Supabase dashboard or `npx prisma migrate deploy`

---

## Dev Server Troubleshooting
If dev server crashes or becomes slow:
1. Clear cache: `rm -rf .next && npm run dev`
2. Check system memory - quit heavy apps if needed
3. Webpack cache corruption: Delete `.next` folder entirely and restart
4. Check for 500 errors in API routes - these can cascade

**File size limits**: Keep page files under 3000 lines. Files over 5000 lines cause webpack serialization issues and slow hot reload.

---

## Common Gotchas

1. **RLS Policies**: Use `createServiceClient()` when operations fail due to Row Level Security
2. **Client vs Server Components**: Files with hooks must be `'use client'`
3. **Impersonation**: Uses cookies, requires full page reload to clear (`window.location.href`, not `router.push`)
4. **Pipeline Permissions**: Revenue and Pipeline are separate permissions but share a menu item

---

## Code Style

- Use CSS variables for colors (`var(--primary)`, `var(--text-secondary)`)
- Avoid inline styles when possible, use component-level styles
- Keep components focused; extract complex logic to hooks or services
- No emojis in code unless explicitly requested

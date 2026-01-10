# Pyrus Portal

A client portal and admin dashboard for Pyrus Digital Media, built with Next.js 14, Supabase, and Stripe.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe JavaScript |
| **Supabase** | PostgreSQL database + Auth + Storage |
| **Prisma** | Database ORM with type generation |
| **Stripe** | Payment processing (subscriptions, ACH) |
| **Mailgun** | Transactional email delivery |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages (login, etc.)
│   ├── (client)/          # Client portal pages
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API routes
│   └── view-proposal/     # Public proposal viewing (token-based)
├── components/            # Reusable React components
│   ├── layout/           # Sidebar, header, navigation
│   ├── recommendation-builder/  # Recommendation creation wizard
│   └── ui/               # Generic UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries and configurations
│   ├── email/            # Mailgun integration
│   ├── supabase/         # Supabase client setup
│   └── utils/            # Helper functions
├── stores/                # Zustand state management
└── types/                 # TypeScript type definitions
```

---

## Key Files Reference

### Database & API

| File | Purpose |
|------|---------|
| `src/lib/prisma.ts` | Prisma client with connection pooling (see detailed docs in file) |
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/lib/supabase/client.ts` | Browser-side Supabase client |
| `src/lib/stripe.ts` | Stripe client initialization |
| `prisma/schema.prisma` | Database schema definition |

### Authentication & Middleware

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Route protection, auth checks, redirects |
| `src/app/(auth)/login/page.tsx` | Login page |

### Client Portal

| File | Purpose |
|------|---------|
| `src/app/(client)/layout.tsx` | Client portal layout with sidebar |
| `src/app/(client)/getting-started/page.tsx` | Onboarding checklist |
| `src/app/(client)/recommendations/page.tsx` | View recommendations (Good/Better/Best) |
| `src/app/(client)/checkout/page.tsx` | Stripe checkout with ACH support |
| `src/components/layout/client-sidebar.tsx` | Client navigation sidebar |

### Admin Dashboard

| File | Purpose |
|------|---------|
| `src/app/admin/layout.tsx` | Admin layout with sidebar |
| `src/app/admin/clients/page.tsx` | Client list view |
| `src/app/admin/clients/[id]/page.tsx` | Client detail page (tabs) |
| `src/app/admin/recommendation-builder/page.tsx` | Build recommendations |
| `src/components/layout/admin-sidebar.tsx` | Admin navigation sidebar |

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/admin/clients` | CRUD for clients |
| `/api/admin/clients/[id]` | Single client operations |
| `/api/admin/recommendations` | Recommendation management |
| `/api/admin/recommendations/[id]/invite` | Send invitation emails |
| `/api/admin/products` | Product catalog |
| `/api/client/recommendation` | Get client's recommendation |
| `/api/client/info` | Get client info (for portal) |
| `/api/stripe/setup-intent` | Create Stripe payment setup |
| `/api/stripe/webhook` | Handle Stripe webhooks |

### Email System

| File | Purpose |
|------|---------|
| `src/lib/email/mailgun.ts` | Mailgun client wrapper |
| `src/lib/email/templates/` | HTML email templates |

---

## Database Architecture

### Core Tables

```
clients                 # Client companies
├── recommendations     # Pricing proposals (Good/Better/Best)
│   ├── recommendation_items    # Products in each tier
│   └── recommendation_invites  # Email invite tokens
├── subscriptions       # Active Stripe subscriptions
│   └── subscription_items      # Products in subscription
├── onboarding_checklist        # Client setup tasks
├── onboarding_responses        # Form answers
└── activity_log               # Client activity history

products               # Service catalog
├── bundles           # Product bundles
└── addons            # Add-on services

profiles              # User accounts (Supabase Auth)
```

### Key Relationships

- `clients.stripe_customer_id` → Stripe Customer
- `recommendations.client_id` → clients.id
- `subscriptions.stripe_subscription_id` → Stripe Subscription
- `recommendation_invites.token` → Used in `/view-proposal/[token]`

---

## Environment Variables

```env
# Database (Supabase)
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Mailgun (optional)
MAILGUN_API_KEY=xxx
MAILGUN_DOMAIN=mail.yourdomain.com

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## Connection Pooling

The database connection is optimized for serverless (see `src/lib/prisma.ts`):

1. **Transaction mode** (port 6543) - Connections released after each query
2. **pgbouncer=true** - Disables prepared statements for pooler compatibility
3. **Local pool max: 5** - Limits connections per app instance
4. **Global singleton** - Prevents connection leaks in development

---

## API Route Patterns

All API routes that use `request.url` or `searchParams` must include:

```typescript
export const dynamic = 'force-dynamic'
```

This prevents Next.js from attempting static rendering at build time.

---

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev

# Build for production
npm run build
```

---

## Deployment (Vercel)

1. Connect GitHub repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Ensure `DATABASE_URL` uses port 6543 with `?pgbouncer=true`
4. Deploy

### Stripe Webhooks

Configure webhook endpoint in Stripe Dashboard:
- URL: `https://your-domain.com/api/stripe/webhook`
- Events: `setup_intent.*`, `payment_intent.*`, `customer.subscription.*`, `invoice.*`

---

## Code Style

- **API routes**: Include `export const dynamic = 'force-dynamic'` if using request data
- **Database queries**: Use Prisma client from `@/lib/prisma`
- **Authentication**: Check via Supabase `createClient()` in server components
- **Styling**: Global CSS in `src/app/styles.css`, use CSS variables from `:root`

---

## Common Tasks

### Add a new API route

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // ... your logic
}
```

### Add a new client portal page

1. Create `src/app/(client)/your-page/page.tsx`
2. Add link to `src/components/layout/client-sidebar.tsx`
3. Page automatically gets client layout with sidebar

### Add a new admin page

1. Create `src/app/admin/your-page/page.tsx`
2. Add link to `src/components/layout/admin-sidebar.tsx`
3. Page automatically gets admin layout with sidebar

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Prisma + pg Pool | Better control over connection limits for Supabase |
| Route groups `(client)`, `(auth)` | Separate layouts without affecting URLs |
| `force-dynamic` on API routes | Required for serverless deployment with dynamic data |
| Transaction mode pooling | Handles high concurrency without exhausting connections |
| Stripe SetupIntent | Collect payment methods before charging |

---

## Troubleshooting

### "MaxClientsInSessionMode" error
- Ensure DATABASE_URL uses port 6543 (Transaction mode)
- Add `?pgbouncer=true` to connection string

### API route returns static render error
- Add `export const dynamic = 'force-dynamic'` to the route

### Stripe payment form not loading
- Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set
- Verify SetupIntent API returns clientSecret

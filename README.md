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

---

## Template System by Client Status

The portal uses a **status-based access control system** that shows different templates based on client lifecycle stage.

### Key Variables

| Variable | Type | Source | Purpose |
|----------|------|--------|---------|
| `hasActiveSubscriptions` | boolean | `subscriptions.filter(s => s.status === 'active')` | Primary access gate |
| `isActiveClient` | boolean | `growth_stage !== 'prospect'` | Growth stage check |
| `recommendationState` | `'pending'` \| `'purchased'` \| `'smart_available'` | Days since purchase | Smart recommendations timing |
| `hasResultsAccess` | boolean | `!!agency_dashboard_share_key` | Results dashboard integration |
| `hasActivityAccess` | boolean | `!!basecamp_id` | Activity feed integration |
| `hasWebsiteAccess` | boolean | `!!landingsite_preview_url` | Website preview integration |

### Growth Stages

| Stage | Icon | Description |
|-------|------|-------------|
| Prospect | 🌰 | Not yet a client |
| Seedling | 🌱 | Just started, foundation being established |
| Sprouting | 🌿 | Building momentum with early results |
| Blooming | 🌸 | Thriving with strong results and growth |
| Harvesting | 🌾 | Reaping sustained growth rewards |

### Templates by Status (Client Portal)

#### Getting Started Page
| Status | Template | Features |
|--------|----------|----------|
| `pending` | Welcome Hero | 3-column cards: View Proposal, Why Choose Pyrus, What Happens Next |
| `active` | Checklist + Video | Progress bar, checklist items, video chapters, onboarding summary |

#### Website Page
| Status | Has Product | Has Integration | Template | Features |
|--------|-------------|-----------------|----------|----------|
| `pending` | - | - | Locked | "Available After Purchase" message |
| `active` | No | - | Upsell | 4 website tiers + 2 care plans |
| `active` | Yes | No | Coming Soon | Checklist of setup steps, "we're building your site" |
| `active` | Yes | Yes | Dashboard | Preview iframe, edit requests, status |

#### Content Page
| Status | Has Product | Has Integration | Template | Features |
|--------|-------------|-----------------|----------|----------|
| `pending` | - | - | Locked | "Available After Purchase" message |
| `active` | No | - | Upsell Hub | Hub diagram, 3 content offerings |
| `active` | Yes | No | Coming Soon | "Content Coming Soon" with setup progress |
| `active` | Yes | Yes | Manager | Content review queue, files, stats |

#### Results Page
| Status | Has Integration | Template | Features |
|--------|-----------------|----------|----------|
| `pending` | - | Locked | "Available After Purchase" message |
| `active` | No | Coming Soon | Features preview, countdown |
| `active` | Yes | Dashboard | KPIs, keyword rankings, Pro Dashboard iframe |

#### Recommendations Page - Smart Recommendations Tab
| Status | Days Since Purchase | Template | Features |
|--------|---------------------|----------|----------|
| `pending` | - | Locked | Lock icon, upsell message |
| `active` | < 90 days | Coming Soon | Growth stage hero, countdown timer |
| `active` | ≥ 90 days | Smart Recs | 4 recommendation cards (boost, add, upgrade, premium) |

### Templates by Status (Admin Client Detail)

#### Tab Lock States
| Tab | No Subscription | Has Subscription | Has Product, No Integration | Fully Active |
|-----|-----------------|------------------|----------------------------|--------------|
| Getting Started | Shows "Welcome" | Shows "Getting Started" | Shows "Getting Started" | Shows "Getting Started" |
| Results | 🔒 Locked | "Coming Soon" badge | "Coming Soon" badge | Active |
| Activity | 🔒 Locked | "Coming Soon" badge | "Coming Soon" badge | Active |
| Website | 🔒 Locked | "Inactive" badge | "Coming Soon" badge | Active |
| Content | 🔒 Locked | "Inactive" badge | "Coming Soon" badge | Active |
| Communication | 🔒 Locked | Active | Active | Active |
| Recommendations | Active (shows proposal) | Active | Active | Active |

**Integration requirements:**
- Results: `agency_dashboard_share_key` must be set
- Activity: `basecamp_id` must be set
- Website: `landingsite_preview_url` must be set + website product purchased
- Content: Content product purchased + content integration active

---

## Template System by Purchased Products

### Product Categories

| Category | Products | Features Unlocked |
|----------|----------|-------------------|
| **Website** | Seed Site, Sprout Site, Bloom Site, Harvest Site | Website tab, preview, edit requests |
| **Care Plans** | Website Care Plan, WordPress Care Plan | Website maintenance features |
| **Content** | Content Writing, AI Creative Assets, Business Branding | Content tab, review queue, files |
| **SEO** | Growth SEO, Harvest SEO | Results dashboard, keyword rankings |
| **Ads** | Google Ads Management | Ad performance metrics |

### Product Detection Logic

```typescript
// Line 851-858 in admin/clients/[id]/page.tsx
const websiteProducts = ['bloom site', 'seedling site', 'seed site', 'website care plan', 'wordpress care plan']
const contentProducts = ['content writing', 'blog writing', 'social media', 'content marketing', 'ai creative', 'branding foundation']

const hasWebsiteProducts = activeSubscriptionProducts.some(name =>
  websiteProducts.some(wp => name.includes(wp))
)
const hasContentProducts = activeSubscriptionProducts.some(name =>
  contentProducts.some(cp => name.includes(cp))
)
```

### Content Tab Templates

| Has Content Products | Template | Components |
|---------------------|----------|------------|
| No | Content Upsell Hub | Hero, visual hub diagram, 3 offering cards |
| Yes | Content Manager | Stats bar, Review tab, Files tab |

**Content Offerings (Upsell):**
1. **Content Writing** - $99 per article
2. **AI Creative Assets** - $299/mo (marked "Best Value")
3. **Business Branding Foundation** - $99/mo or $899 one-time

### Website Tab Templates

| Has Website Products | Has Integration URL | Template |
|---------------------|---------------------|----------|
| No | - | Website Upsell (4 tiers) |
| Yes | No | "Coming Soon" state |
| Yes | Yes | Full Website Dashboard |

**Website Tiers:**
1. **Seed Site** (AI-Built) - $249/mo
2. **Sprout Site** (WordPress) - $300/mo
3. **Bloom Site** (Premium) - $450/mo
4. **Harvest Site** (Enterprise) - $600/mo

### Smart Recommendations Cards (Active Clients Only)

| Card | Description | Typical Pricing |
|------|-------------|-----------------|
| Boost Google Ads | Increase current ad spend | Variable |
| AI Visibility Foundation | AI-powered marketing | $3,000 one-time or $300/mo × 12 |
| Upgrade SEO Tier | Move from Growth to Harvest | $1,499/mo |
| Pear Analytics Premium | Full-service tier | $5,000/mo (invitation-only) |

---

## Known Issues & Fix Plan

### Phase 1: Critical Fixes (Immediate)

| Issue | File | Fix |
|-------|------|-----|
| Schema mismatch: `type` should be `activity_type` | `src/app/api/stripe/webhook/route.ts` | Change `type:` to `activity_type:` on lines 58, 75, 94, 113, 130 |
| TypeScript `pricing_type` wrong enum | `src/types/database.ts:267,283,299` | Change from `'monthly'\|'quarterly'\|'annual'` to `'good'\|'better'\|'best'\|null` |
| Debug endpoint exposed | `src/app/api/client/debug/route.ts` | Add `if (process.env.NODE_ENV === 'production') return 403` or delete file |

### Phase 2: High Priority (This Sprint)

| Issue | Files | Fix |
|-------|-------|-----|
| Missing input validation | Multiple API routes | Add Zod schemas for request body validation |
| No quantity/price validation | `src/app/api/admin/subscriptions/route.ts` | Add `if (quantity <= 0) throw Error` |
| Email format not validated | `src/app/api/admin/recommendations/[id]/invite/route.ts` | Add email regex validation |
| Inconsistent error responses | All API routes | Create `ApiError` helper, standardize format |
| Silent failures in history creation | `src/app/api/admin/recommendations/route.ts` | Log errors properly, consider failing operation |
| Missing client existence checks | Checklist, onboarding routes | Add `findUnique` before processing |

### Phase 3: Type System Cleanup (Next Sprint)

| Issue | Fix |
|-------|-----|
| Duplicate interface definitions | Create canonical types in `/src/types/` for Client, Recommendation, Subscription |
| snake_case/camelCase inconsistency | Transform at API boundary only, use camelCase in frontend |
| Decimal type handling | Create `parseDecimal()` utility, use consistently |
| Growth stage enum mismatch | Consolidate to single enum: `'prospect'\|'seedling'\|'sprouting'\|'blooming'\|'harvesting'` |
| Status enum mismatch | Consolidate to: `'active'\|'paused'\|'onboarding'\|'churned'` |

### Phase 4: Code Quality (Ongoing)

| Issue | Fix |
|-------|-----|
| Remove dead endpoints | Delete `/api/admin/fix-purchased-tier`, `/api/admin/seed-ai-creative-questions` |
| N+1 query in recommendations | Use Prisma `include` instead of mapping with separate queries |
| Missing database indexes | Add indexes on `client_id`, `status`, `created_at DESC` |
| Race conditions in updates | Wrap related operations in `prisma.$transaction()` |
| CSRF protection | Implement token validation for state-changing operations |

### Phase 5: Documentation & Testing

| Task | Description |
|------|-------------|
| API documentation | Document all endpoints with request/response schemas |
| Type generation | Consider Prisma client extensions or tRPC for auto-generated types |
| Integration tests | Add tests for critical flows (checkout, recommendations) |
| Error monitoring | Add Sentry or similar for production error tracking |

---

## Type Definitions Location

All shared types should be defined in `/src/types/`:

| File | Contents |
|------|----------|
| `database.ts` | Prisma-generated types and extensions |
| `api.ts` | API request/response types |
| `client.ts` | Client-related interfaces |
| `recommendation.ts` | Recommendation and pricing types |

**Rule**: Page-level interfaces should import from `/src/types/`, not define their own.

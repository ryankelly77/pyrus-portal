# Pyrus Portal - Page Templates Documentation

## Overview

This document catalogs all page templates in the Pyrus Portal application, their various states, and the data sources/database tables they connect to.

---

## Table of Contents

1. [Auth Pages](#auth-pages)
2. [Client Portal Pages](#client-portal-pages)
3. [Admin Pages](#admin-pages)
4. [Public Pages](#public-pages)
5. [Shared View Components](#shared-view-components)
6. [Database Tables Summary](#database-tables-summary)

---

## Auth Pages

### 1. Login (`/login`)
**File:** `src/app/(auth)/login/page.tsx`

| State | Description |
|-------|-------------|
| Default | Email/password form |
| Loading | "Signing in..." button state |
| Error | Invalid credentials message |
| Success | Redirect based on role |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| Supabase Auth | `signInWithPassword()` | `auth.users` |
| `/api/auth/me` | GET | `profiles` (role, client_id) |
| `/api/activity/log` | POST | `activity_log` |

**Routing Logic:**
- Admin roles → `/admin`
- Client roles → `/getting-started`

---

### 2. Register (`/register`)
**File:** `src/app/(auth)/register/page.tsx`

| State | Description |
|-------|-------------|
| Default | Registration form (email, password, name) |
| Loading | Awaiting Supabase response |
| Email Confirmation | "Check Your Email" message |
| Success | Redirect after verification |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| Supabase Auth | `signUp()` | `auth.users` |
| `/api/client/associate-by-token` | POST | `profiles`, `recommendation_invites`, `clients` |
| `/api/client/associate` | POST | `profiles`, `clients` |
| `/api/activity/log` | POST | `activity_log` |
| localStorage | - | `pyrus_invite_token`, `pyrus_pending_client_id` |

---

### 3. Forgot Password (`/forgot-password`)
**File:** `src/app/(auth)/forgot-password/page.tsx`

| State | Description |
|-------|-------------|
| Default | Email input form |
| Loading | Sending reset email |
| Error | Error message display |
| Success | "Check your email" confirmation |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| Supabase Auth | `resetPasswordForEmail()` | `auth.users` |

---

### 4. Reset Password (`/reset-password`)
**File:** `src/app/(auth)/reset-password/page.tsx`

| State | Description |
|-------|-------------|
| Default | New password form |
| Loading | Updating password |
| Success | "Password updated!" + redirect |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| Supabase Auth | `updateUser()` | `auth.users` |

---

## Client Portal Pages

### 1. Getting Started (`/getting-started`)
**File:** `src/app/(client)/getting-started/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Spinner while fetching data |
| Pending Client | Welcome hero + 3-card action grid (prospects only) |
| Active - Questions Tab | Multi-section onboarding form with progress |
| Active - Checklist Tab | Checklist items with progress bar |
| Active - Summary Tab | Submitted responses grouped by section |
| Coming Soon | No products - shows placeholder |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `useClientData()` | Hook | Client info from context |
| `/api/client/video-chapters` | GET | `onboarding_video_chapters` |
| `/api/client/onboarding` | GET | `checklist_items`, `onboarding_responses` |
| `/api/client/onboarding-form` | GET/POST | `onboarding_questions`, `onboarding_responses` |

---

### 2. Recommendations (`/recommendations`)
**File:** `src/app/(client)/recommendations/page.tsx`
**Shared Component:** `RecommendationsView` (see [Shared View Components](#shared-view-components))

| State | Description |
|-------|-------------|
| Loading | Spinner during data fetch |
| Coming Soon (Demo) | Timeline: account created → analyzing → proposal ready |
| Pending (Locked) | Lock icons on Smart Recommendations & Current Services tabs |
| Original Plan Tab | Good/Better/Best tier cards with pricing breakdown |
| Smart Recommendations Tab | AI-powered recommendation cards (demo) or Coming Soon |
| Current Services Tab | Active subscriptions or purchased tier items |
| Growth Stage Hero | Progress track (seedling/sprouting/blooming/harvesting) |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `useClientData()` | Hook | Client info |
| `/api/client/recommendation` | GET | `recommendations`, `recommendation_items`, `subscriptions` |

**Database Tables:**
- `clients`, `recommendations`, `recommendation_items`, `subscriptions`, `subscription_items`, `products`, `bundles`, `addons`, `recommendation_history`

---

### 3. Content (`/content`)
**File:** `src/app/(client)/content/page.tsx`
**Shared Component:** `ContentView` (see [Shared View Components](#shared-view-components))

| State | Description |
|-------|-------------|
| Loading | Client data loading |
| Pending (Locked) | Lock icon with upsell CTA |
| Coming Soon | Stats at 0, empty content grid |
| Upsell | Hero + content hub diagram + 3 offering cards |
| Active - Review Tab | Urgent/Pending/Approved/Published sections |
| Active - Files Tab | Filter by docs/images/video + grid display |
| Add to Subscription Modal | Product confirmation before API call |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `useClientData()` | Hook | Client access flags |
| `/api/client/subscription` | GET | `subscriptions` (currentPeriodEnd) |
| `/api/stripe/add-to-subscription` | POST | Stripe subscription items |

---

### 4. Website (`/website`)
**File:** `src/app/(client)/website/page.tsx`
**Shared Component:** `WebsiteView` (see [Shared View Components](#shared-view-components))

| State | Description |
|-------|-------------|
| Loading | Client data loading |
| Pending (Locked) | Lock icon with upsell CTA |
| Coming Soon | Timeline: plan selected → design → preview & launch |
| Upsell | Hero + 4 website plan cards + 2 care plan cards |
| Active | Preview iframe + info card + edit request form |
| Add to Subscription Modal | Product confirmation |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `useClientData()` | Hook | Client access flags, `landingsitePreviewUrl` |
| `/api/client/subscription` | GET | `subscriptions` |
| `/api/stripe/add-to-subscription` | POST | Stripe subscription items |

---

### 5. Activity (`/activity`)
**File:** `src/app/(client)/activity/page.tsx`
**Shared Component:** `ActivityView` (see [Shared View Components](#shared-view-components))

| State | Description |
|-------|-------------|
| Loading | Spinner |
| Pending (Locked) | "Activity Available After Purchase" |
| Coming Soon | Timeline with pending milestones |
| Active | Activity feed with filter by type |
| Empty | "No activities yet" when filtered empty |
| Demo | Hardcoded demo activities |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `useClientData()` | Hook | Client info |
| `/api/client/activity` | GET | `activity_log` |

---

### 6. Results (`/results`)
**File:** `src/app/(client)/results/page.tsx`
**Shared Component:** `ResultsView` (see [Shared View Components](#shared-view-components))

| State | Description |
|-------|-------------|
| Loading | Spinner |
| Pending (Locked) | "Results Available After Purchase" |
| Coming Soon | Setup timeline |
| Active - Overview | KPI cards + charts + keyword rankings |
| Active - Pro Dashboard | External iframe (AgencyDashboard.io) |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `useClientData()` | Hook | Client info |
| (KPI data is currently hardcoded) | - | - |

---

### 7. Settings (`/settings`)
**File:** `src/app/(client)/settings/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Spinner |
| Profile Tab | Editable name, email, phone, company |
| Subscription Tab (locked for pending) | Service cards + monthly investment |
| Payment Tab (locked for pending) | Payment methods + invoice history |
| Security Tab | Password change + 2FA + active sessions |
| No Data States | Messages for no services/payment/invoices |
| Payment Modal | Stripe PaymentElement for adding card |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `useClientData()` | Hook | Client info |
| `/api/client/subscription` | GET | `subscriptions`, `subscription_items`, payment methods, invoices |
| `/api/client/payment-method` | GET/POST | Stripe SetupIntent |

---

### 8. Checkout (`/checkout`)
**File:** `src/app/(client)/checkout/page.tsx`

| State | Description |
|-------|-------------|
| Loading | "Loading your plan..." |
| Empty Cart | Link to recommendations |
| Active | Items + billing cycle toggle + payment form |
| Saved Payment Method | Radio to use existing card |
| New Payment Method | Stripe PaymentElement |
| Zero-Dollar Order | Different UI for $0 total |
| Processing | Payment submission state |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `useClientData()` | Hook | Client info |
| `/api/client/recommendation` | GET | `recommendation_items` |
| `/api/client/subscription` | GET | Saved payment methods |
| `/api/stripe/setup-intent` | POST | Stripe SetupIntent |
| `/api/stripe/create-subscription-from-setup` | POST | Stripe Subscription |
| `/api/stripe/create-free-order` | POST | $0 order handling |

---

### 9. Checkout Success (`/checkout/success`)
**File:** `src/app/(client)/checkout/success/page.tsx`

| State | Description |
|-------|-------------|
| Verifying | "Verifying your payment..." |
| Error | Payment failed message + retry button |
| Success | Confirmation + next steps (3 items) |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| URL params | - | `payment_intent`, `redirect_status`, `tier` |

---

### 10. Communication (`/communication`)
**File:** `src/app/(client)/communication/page.tsx`
**Shared Component:** `CommunicationView` (see [Shared View Components](#shared-view-components))

| State | Description |
|-------|-------------|
| Loading | Spinner |
| Pending (Locked) | "Communication Available After Purchase" |
| Active | Stats cards + filter tabs + timeline |
| Empty | "No [type] found" for filtered results |
| Refreshing | Button shows "Refreshing..." |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `useClientData()` | Hook | Client info |
| `/api/client/communications` | GET | `communications` (+ HighLevel integration) |

---

## Admin Pages

### 1. Dashboard (`/admin/dashboard`)
**File:** `src/app/admin/dashboard/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Spinner while fetching |
| Active | Stats cards + MRR chart + activity feed + transactions |
| Empty | Messages for no activity/transactions/chart data |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/dashboard` | GET | Dashboard stats, activity, transactions |
| `/api/admin/dashboard/mrr` | GET | MRR chart data |

---

### 2. Clients List (`/admin/clients`)
**File:** `src/app/admin/clients/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Spinner |
| Grid/List View | Toggle between card grid and table |
| Filters | Search, status filter, sort options |
| Add Client Modal | Form for new client |
| Edit Client Modal | Form for updating client |
| Delete Confirmation | Inline delete state |
| Empty | No results message |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/clients` | GET | `clients` |
| `/api/admin/clients/[id]` | GET/PATCH/DELETE | `clients` |
| `/api/admin/clients` | POST | `clients` |

---

### 3. Client Detail (`/admin/clients/[id]`)
**File:** `src/app/admin/clients/[id]/page.tsx`

**Shared Components Used:**
| Tab | Shared Component |
|-----|------------------|
| Results | `ResultsView` |
| Activity | `ActivityView` |
| Website | `WebsiteView` |
| Content | `ContentView` |
| Communication | `CommunicationView` |
| Recommendations | `RecommendationsView` |

**Main Tabs:**
| Tab | Subtabs | Description |
|-----|---------|-------------|
| Getting Started | Questions, Checklist, Summary | Onboarding management |
| Results | Overview, Pro Dashboard | Performance metrics |
| Activity | (filter by type) | Basecamp activities |
| Website | - | Website management |
| Content | Review, Files | Content pipeline |
| Communication | (filter by type/date) | Email/SMS history |
| Recommendations | Smart, Original Plan, Current Services | Subscription management |

**Modals:**
- Edit Client (General, Integrations, Billing, Notifications tabs)
- Add Product
- Result Alert
- Content Requirements

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/clients/[id]` | GET/PATCH | `clients` |
| `/api/admin/clients/[id]/checklist` | GET/PATCH | `checklist_items` |
| `/api/admin/clients/[id]/payment-methods` | GET | Stripe payment methods |
| `/api/admin/onboarding/video-chapters` | GET | `onboarding_video_chapters` |
| `/api/client/onboarding` | GET | `onboarding_responses` |
| `/api/client/onboarding-form` | GET | `onboarding_questions` |
| `/api/admin/recommendations/client/[id]` | GET | `recommendations` |
| `/api/admin/clients/[id]/subscriptions` | GET | `subscriptions` |
| `/api/admin/clients/[id]/stripe-subscriptions` | GET | Stripe API |
| `/api/admin/clients/[id]/stripe-subscription-history` | GET | Stripe events |
| `/api/admin/clients/[id]/products` | GET/POST/PATCH/DELETE | `client_products` |
| `/api/admin/clients/[id]/content-stats` | GET | Content statistics |
| `/api/admin/clients/[id]/communications` | GET/POST | `communications` |
| `/api/admin/clients/[id]/activities` | GET | Basecamp API |
| `/api/admin/clients/[id]/invoices` | GET | Stripe invoices |

---

### 4. Products (`/admin/products`)
**File:** `src/app/admin/products/page.tsx`

| Tab | Description |
|-----|-------------|
| Products | Category filter + search + table with edit/duplicate/delete |
| Bundles | Grid of bundle cards |
| Add-Ons | Grid of add-on cards |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/products` | GET/POST/DELETE | `products` |
| `/api/admin/bundles` | GET/POST/DELETE | `bundles` |
| `/api/admin/addons` | GET/POST/DELETE | `addons` |

---

### 5. Product Edit (`/admin/products/[id]/edit`)
**File:** `src/app/admin/products/[id]/edit/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Fetching product |
| Active | Form with Basic Info, Pricing, Stripe Config, Settings, Dependencies |
| Error | Product not found |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/products/[id]` | GET/PUT | `products` |
| `/api/admin/products` | GET | All products for dependencies |

---

### 6. Bundle Edit (`/admin/products/bundle/[id]/edit`)
**File:** `src/app/admin/products/bundle/[id]/edit/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Fetching bundle |
| Active | Form + drag-and-drop product selection |
| Error | Bundle not found |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/bundles/[id]` | GET/PUT | `bundles`, `bundle_products` |
| `/api/admin/products` | GET | `products` |

---

### 7. Content (`/admin/content`)
**File:** `src/app/admin/content/page.tsx`

| State | Description |
|-------|-------------|
| Active | Stats cards + filters (status/client/type) + content table |

**Data Sources:**
- Currently uses hardcoded mock data (no API calls)

---

### 8. Recommendations (`/admin/recommendations`)
**File:** `src/app/admin/recommendations/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Spinner |
| Active | Expandable accordion list + filters (status/sort/search) |
| Share Modal | Send invite form |
| Edit Client Modal | Update client info |
| Delete Confirmation | Inline delete state |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/recommendations` | GET/DELETE | `recommendations` |
| `/api/admin/recommendations/[id]/invite` | POST | `recommendation_invites` |
| `/api/admin/clients/[id]` | GET/PATCH | `clients` |

---

### 9. Recommendation Builder (`/admin/recommendation-builder/[clientId]`)
**File:** `src/app/admin/recommendation-builder/[clientId]/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Fetching products/clients |
| Active | 3-column tier builder with drag-and-drop |
| Add Client Modal | Create new client |
| Share Modal | Send proposal invite |
| Service Info Modal | Product details |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/products` | GET | `products` |
| `/api/admin/bundles` | GET | `bundles` |
| `/api/admin/addons` | GET | `addons` |
| `/api/admin/clients` | GET/POST | `clients` |
| `/api/admin/recommendations/client/[id]` | GET | `recommendations` |
| `/api/admin/recommendations` | POST | `recommendations`, `recommendation_items` |
| `/api/admin/recommendations/[id]/invite` | POST | `recommendation_invites` |

---

### 10. Revenue (`/admin/revenue`)
**File:** `src/app/admin/revenue/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Spinner |
| Active | MRR chart + volume chart + pipeline table |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/dashboard/mrr` | GET | Stripe subscription data |
| (Pipeline table is hardcoded) | - | - |

---

### 11. Users (`/admin/users`)
**File:** `src/app/admin/users/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Spinner |
| Active | Admin users table + client users table |
| Filters | Status, client, search |
| Invite User Modal | Invite new client user |
| Invite Admin Modal | Invite new admin |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/users` | GET | `profiles`, `clients` |

---

### 12. Settings (`/admin/settings`)
**File:** `src/app/admin/settings/page.tsx`

| Tab | Description |
|-----|-------------|
| Profile | Admin profile edit |
| Checklist | Manage checklist templates by product |
| Questions | Manage onboarding questions by product |
| Video | Manage onboarding video chapters (drag to reorder) |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/onboarding/video-chapters` | GET/POST/PATCH/PUT/DELETE | `onboarding_video_chapters` |
| `/api/admin/products` | GET | `products` |
| `/api/admin/onboarding/checklist-templates` | GET/POST/PATCH | `checklist_templates` |
| `/api/admin/upload` | POST | Image uploads |

---

### 13. Notifications (`/admin/notifications`)
**File:** `src/app/admin/notifications/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Spinner |
| Active | Summary stats + filter tabs + grouped notifications |
| Filters | Type (all/email/proposal/login/page_view/purchase/onboarding) |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/notifications` | GET | `notifications` |
| `/api/admin/notifications/read` | GET/POST | Notification read status |

---

### 14. Websites (`/admin/websites`)
**File:** `src/app/admin/websites/page.tsx`

| State | Description |
|-------|-------------|
| Active | Filter by status/type + website cards |

**Data Sources:**
- Currently uses hardcoded mock data (no API calls)

---

### 15. Rewards (`/admin/rewards`)
**File:** `src/app/admin/rewards/page.tsx`

| State | Description |
|-------|-------------|
| Active | Thresholds list + free products list |
| Add Threshold Modal | Create spending threshold |
| Add Product Modal | Add free product reward |

**Data Sources:**
- Currently uses hardcoded mock data (no API calls)

---

## Public Pages

### 1. Home (`/`)
**File:** `src/app/page.tsx`

| State | Description |
|-------|-------------|
| Auth Check | Server-side redirect based on role |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| Supabase Auth | `getUser()` | `auth.users` |
| Database | Direct query | `profiles` (role) |

**Routing:**
- Not authenticated → `/login`
- Client role → `/getting-started`
- Admin roles → `/dashboard`

---

### 2. View Proposal (`/view-proposal/[token]`)
**File:** `src/app/view-proposal/[token]/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Validating token |
| Error | Invalid/expired token message |
| Success | Redirect to register with invite token |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/proposal/[token]` | GET | `recommendation_invites`, `clients` |
| localStorage | Set | `pyrus_pending_client_id`, `pyrus_invite_token` |

---

### 3. Admin Checkout (`/admin/checkout/[clientId]`)
**File:** `src/app/admin/checkout/[clientId]/page.tsx`

| State | Description |
|-------|-------------|
| Loading | Fetching client/cart |
| Empty Cart | Redirect prompt |
| Active | Cart items + payment form |
| Processing | Payment submission |
| Coupon States | Apply/error/success |

**Data Sources:**
| Source | Method | Table/Data |
|--------|--------|------------|
| `/api/admin/clients/[id]` | GET | `clients` |
| sessionStorage | - | Cart items |
| `/api/stripe/create-payment-intent` | POST | Stripe PaymentIntent |
| `/api/admin/subscriptions` | POST | `subscriptions` |
| `/api/admin/clients/[id]` | PATCH | Update growth stage |

---

## Shared View Components

To ensure data consistency between admin and client views, the following shared components are used across both portals. These components live in `src/components/client-views/` and accept an `isAdmin` prop to conditionally render admin-specific features.

### Component Overview

| Component | File | Admin Tab | Client Page |
|-----------|------|-----------|-------------|
| `ResultsView` | `ResultsView.tsx` | Results | `/results` |
| `WebsiteView` | `WebsiteView.tsx` | Website | `/website` |
| `ActivityView` | `ActivityView.tsx` | Activity | `/activity` |
| `ContentView` | `ContentView.tsx` | Content | `/content` |
| `RecommendationsView` | `RecommendationsView.tsx` | Recommendations | `/recommendations` |
| `CommunicationView` | `CommunicationView.tsx` | Communication | `/communication` |

### Common Props Pattern

All shared view components follow a consistent props pattern:

```typescript
interface ViewProps {
  clientId: string           // Required: Client ID for data fetching
  isAdmin?: boolean          // Optional: Enables admin-specific features
  isDemo?: boolean           // Optional: Shows demo/coming-soon states
  clientName?: string        // Optional: Client name for display
  // Component-specific props...
}
```

### Admin vs Client Differences

| Feature | Admin | Client |
|---------|-------|--------|
| Data Loading | Props passed from parent | Fetches own data |
| Edit Actions | Available (edit buttons, resend links) | Hidden |
| Review Actions | Hidden | Available (approve/reject buttons) |
| Subscription History | Visible | Hidden |
| Invoice Management | Visible | Hidden |
| Export Controls | Visible | Context-dependent |

### Usage Example

**Admin Page (data passed via props):**
```tsx
<CommunicationView
  clientId={clientId}
  isAdmin={true}
  clientName={dbClient?.name}
  communications={communications}
  communicationsLoading={communicationsLoading}
  onRefresh={refreshCommunications}
/>
```

**Client Page (fetches own data):**
```tsx
<CommunicationView clientId={client.id} />
```

---

## Database Tables Summary

| Table | Used By |
|-------|---------|
| `auth.users` | Login, Register, Forgot/Reset Password |
| `profiles` | Login, Register, Home, Users |
| `clients` | Most admin and client pages |
| `subscriptions` | Client Settings, Checkout, Admin Client Detail |
| `subscription_items` | Client Settings, Admin Client Detail |
| `recommendations` | Recommendations, Recommendation Builder |
| `recommendation_items` | Recommendations, Checkout |
| `recommendation_invites` | Register, View Proposal, Recommendations |
| `products` | Products, Recommendation Builder, Admin Settings |
| `bundles` | Products, Recommendation Builder |
| `addons` | Products, Recommendation Builder |
| `bundle_products` | Bundle Edit |
| `addon_products` | Add-on Edit |
| `client_products` | Admin Client Detail |
| `checklist_items` | Getting Started, Admin Client Detail |
| `checklist_templates` | Admin Settings |
| `onboarding_questions` | Getting Started, Admin Client Detail, Admin Settings |
| `onboarding_responses` | Getting Started, Admin Client Detail |
| `onboarding_video_chapters` | Getting Started, Admin Settings |
| `activity_log` | Login, Register, Activity |
| `communications` | Communication, Admin Client Detail |
| `notifications` | Admin Notifications |

---

*Last updated: January 17, 2026*

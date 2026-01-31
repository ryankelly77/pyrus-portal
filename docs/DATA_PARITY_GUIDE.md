# Pyrus Portal: Client/Admin Data Parity Guide

## Overview

When client and admin views display the same data, they **must** use the same data-fetching logic. Separate implementations inevitably drift, causing admins to see different information than clients.

**Golden Rule:** If both portals show the same data, both routes call the same service function.

---

## Architecture

```
Client Route  ──┐
                ├──→  Shared Service Function  ──→  Database / External APIs
Admin Route   ──┘
```

Services live in `src/lib/services/` and export typed functions that encapsulate all business logic.

---

## Existing Services

| Service | Purpose | Client Route | Admin Route |
|---------|---------|--------------|-------------|
| `contentService.ts` | Content items with categorization, stats, formatting | `/api/client/content` | `/api/admin/clients/[id]/content` |
| `subscriptionService.ts` | Subscriptions, payment methods, invoices from Stripe | `/api/client/subscription` | `/api/admin/clients/[id]/subscriptions` |
| `activityService.ts` | Basecamp activities + communications merged feed | `/api/client/activity` | `/api/admin/clients/[id]/activities` |
| `websiteService.ts` | Website data, uptime, plan detection, edit requests | `/api/client/website` | `/api/admin/clients/[id]/website` |

---

## When to Create a Shared Service

Create a shared service when:

- ✅ Client and admin views show the **same data** (even if admin shows extra fields)
- ✅ Data requires **computation** (stats, formatting, categorization, merging sources)
- ✅ Data comes from **external APIs** (Stripe, UptimeRobot, Basecamp, HighLevel)
- ✅ Business logic determines **what to display** (status derivation, plan detection)

Do NOT need a shared service when:

- ❌ Admin only **edits raw fields** (e.g., `/api/admin/clients/[id]` PATCH)
- ❌ Routes serve **different purposes** (e.g., client adds payment method, admin lists them)
- ❌ Data is **trivially different** by design

---

## How to Implement

### 1. Define the Interface

```typescript
// src/lib/services/exampleService.ts

export interface ExampleData {
  // All fields that BOTH client and admin need
  items: Array<{
    id: string
    title: string
    status: string
    // ... computed fields
  }>
  stats: {
    total: number
    pending: number
    completed: number
  }
}

export interface ExampleOptions {
  // Optional fields for admin-only data
  includeAssignments?: boolean
  includeInternalNotes?: boolean
}
```

### 2. Implement the Service Function

```typescript
export async function getExampleData(
  clientId: string,
  options: ExampleOptions = {}
): Promise<ExampleData> {
  // 1. Fetch from database
  const items = await prisma.example_items.findMany({
    where: { client_id: clientId },
    include: options.includeAssignments ? { assignee: true } : undefined,
  })

  // 2. Fetch from external APIs if needed
  const externalData = await fetchExternalApi(clientId)

  // 3. Compute/transform/merge
  const transformed = items.map(item => ({
    id: item.id,
    title: item.title,
    status: computeStatus(item),
    // ... all computation logic HERE, not in routes
  }))

  // 4. Calculate stats
  const stats = {
    total: transformed.length,
    pending: transformed.filter(i => i.status === 'pending').length,
    completed: transformed.filter(i => i.status === 'completed').length,
  }

  return { items: transformed, stats }
}
```

### 3. Refactor Client Route

```typescript
// src/app/api/client/example/route.ts

import { getExampleData } from '@/lib/services/exampleService'

export async function GET(request: NextRequest) {
  // Auth and get clientId...
  
  const data = await getExampleData(clientId)
  return NextResponse.json(data)
}
```

### 4. Refactor Admin Route

```typescript
// src/app/api/admin/clients/[id]/example/route.ts

import { getExampleData } from '@/lib/services/exampleService'

export async function GET(request: NextRequest, { params }) {
  // Auth check...
  const { id: clientId } = await params
  
  // Admin can request extra fields
  const data = await getExampleData(clientId, { 
    includeAssignments: true 
  })
  return NextResponse.json(data)
}
```

---

## Checklist for New Features

Before implementing a new feature that displays data to both clients and admins:

### Planning Phase

- [ ] Will clients see this data?
- [ ] Will admins see this same data?
- [ ] If yes to both → **Plan for shared service from the start**

### Implementation Phase

- [ ] Create service file: `src/lib/services/{feature}Service.ts`
- [ ] Define TypeScript interface for response shape
- [ ] Implement single `get{Feature}Data(clientId, options?)` function
- [ ] Move ALL computation/formatting logic into service (not routes)
- [ ] Client route calls service with default options
- [ ] Admin route calls service (optionally with extra fields)

### Verification Phase

- [ ] Both routes return **identical base structure**
- [ ] View same client in both portals → data matches exactly
- [ ] `npm run build` passes
- [ ] Add to services table in this document

---

## Common Patterns

### Admin-Only Fields

Use an options parameter:

```typescript
export async function getData(clientId: string, options?: { 
  includeInternalNotes?: boolean 
}) {
  const data = await fetchData(clientId)
  
  return {
    ...data,
    // Only include if admin requests it
    ...(options?.includeInternalNotes && { 
      internalNotes: data.internal_notes 
    }),
  }
}
```

### External API Caching

If external APIs are slow, consider caching in the service:

```typescript
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>()

export async function getData(clientId: string) {
  const cached = cache.get(clientId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  
  const data = await fetchExpensiveData(clientId)
  cache.set(clientId, { data, timestamp: Date.now() })
  return data
}
```

### Merging Multiple Sources

Merge and sort in the service, not routes:

```typescript
export async function getActivityData(clientId: string) {
  const [basecampData, communicationsData] = await Promise.all([
    fetchBasecampActivities(clientId),
    fetchCommunications(clientId),
  ])
  
  // Merge and sort by timestamp
  return [...basecampData, ...communicationsData]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100)
}
```

---

## Anti-Patterns to Avoid

### ❌ Duplicated Logic

```typescript
// BAD: Same computation in two places
// client route
const status = item.due_date < now ? 'overdue' : 'pending'

// admin route (copy-pasted, will drift)
const status = item.due_date < now ? 'overdue' : 'pending'
```

### ❌ Different Database Queries

```typescript
// BAD: Client uses raw SQL, admin uses Prisma
// Results may differ due to query differences

// client route
const result = await dbPool.query('SELECT * FROM items WHERE...')

// admin route  
const result = await prisma.items.findMany({ where: ... })
```

### ❌ Different Response Shapes

```typescript
// BAD: Client gets categorized, admin gets flat array
// client route
return { pending: [...], completed: [...] }

// admin route
return items // flat array
```

---

## Testing Parity

Add integration tests to verify parity:

```typescript
// src/__tests__/services/dataParity.test.ts

describe('Data Parity', () => {
  it('content: client and admin return same structure', async () => {
    const clientData = await getContentData(testClientId)
    const adminData = await getContentData(testClientId, { includeAssignments: true })
    
    // Base structure must match
    expect(clientData.stats).toEqual(adminData.stats)
    expect(clientData.content.pendingApproval.length)
      .toEqual(adminData.content.pendingApproval.length)
  })
})
```

---

## Questions?

If unsure whether a feature needs a shared service, ask:

> "If I change how this data is computed, will I need to update two files?"

If yes → shared service required.

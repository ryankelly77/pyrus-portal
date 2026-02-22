# API Route Skill - Pyrus Portal

This skill documents how to create API routes in Pyrus Portal using Next.js App Router conventions.

## 1. File Structure

### Location
```
/src/app/api/
├── admin/          # Admin-only routes (require admin role)
│   └── [name]/
│       └── route.ts
├── client/         # Client portal routes (require authentication)
│   └── [name]/
│       └── route.ts
├── cron/           # Scheduled jobs (require cron secret)
│   └── [name]/
│       └── route.ts
└── [name]/         # Public or mixed routes
    └── route.ts
```

### Dynamic Route Parameters
```
/src/app/api/admin/clients/[id]/route.ts    → /api/admin/clients/abc123
/src/app/api/admin/users/[id]/route.ts      → /api/admin/users/xyz789
```

### Export Async Functions
```typescript
// Export one or more HTTP methods
export async function GET(request: NextRequest) { ... }
export async function POST(request: NextRequest) { ... }
export async function PUT(request: NextRequest) { ... }
export async function PATCH(request: NextRequest) { ... }
export async function DELETE(request: NextRequest) { ... }
```

### Required Header
Always include at the top of every route:
```typescript
export const dynamic = 'force-dynamic'
```

---

## 2. Authentication Pattern

### Imports
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
```

### Get Current User (Client Routes)
```typescript
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Use user.id for queries
    // ...
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### Admin Routes with requireAdmin
```typescript
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth

    // user.id - Supabase user ID
    // profile.role - 'super_admin', 'admin', 'production_team', 'sales'
    // profile.full_name - User's name

    // Optional: Check specific roles
    if (!['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ...
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### Service Client (Bypasses RLS)
Use `createServiceClient()` for:
- Webhooks (no user session)
- Cron jobs
- Background operations
- Cross-user data access

```typescript
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Verify webhook signature first!
  const supabase = await createServiceClient()

  // This bypasses Row Level Security - use carefully
  const { data } = await supabase.from('profiles').select('*')
}
```

### Cron Route Authentication
```typescript
export const maxDuration = 300 // 5 minutes max

function verifyCronAuth(request: NextRequest): boolean {
  // Vercel cron jobs include this header
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  if (isVercelCron) return true

  // Manual trigger with secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ...
}
```

---

## 3. Response Format

### Success Responses
```typescript
// Return data directly
return NextResponse.json(client)

// Return with wrapper
return NextResponse.json({ data: result })

// Return with status
return NextResponse.json(client, { status: 201 })

// Return success flag
return NextResponse.json({ success: true })

// Return multiple items
return NextResponse.json({
  clients,
  pagination: { total, page, limit }
})
```

### Error Responses
```typescript
// 400 - Bad Request (invalid input)
return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

// 401 - Unauthorized (not logged in)
return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// 403 - Forbidden (logged in but not allowed)
return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

// 404 - Not Found
return NextResponse.json({ error: 'Client not found' }, { status: 404 })
return NextResponse.json({ error: 'No client associated with user' }, { status: 404 })

// 500 - Server Error
return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
```

---

## 4. Database Access

### When to Use Prisma (Recommended)
- Type-safe queries with autocomplete
- Simple CRUD operations
- Relations and includes
- Transactions

```typescript
import { prisma } from '@/lib/prisma'

// Find many with filtering
const clients = await prisma.clients.findMany({
  where: clientIdFilter ? { id: { in: clientIdFilter } } : undefined,
  orderBy: { name: 'asc' },
  include: {
    subscriptions: {
      where: { status: 'active' },
      include: {
        subscription_items: { select: { id: true } },
      },
    },
  },
})

// Find unique
const client = await prisma.clients.findUnique({
  where: { id },
})

// Create
const client = await prisma.clients.create({
  data: {
    name,
    contact_email: contactEmail || null,
    status: status || 'active',
  },
})

// Update
const client = await prisma.clients.update({
  where: { id },
  data: {
    name,
    ...(status !== undefined && { status }),
    updated_at: new Date(),
  },
})

// Delete
await prisma.clients.delete({
  where: { id },
})
```

### When to Use dbPool (Raw SQL)
- Complex JOINs across many tables
- Aggregations and GROUP BY
- DISTINCT queries
- Bulk operations
- Queries Prisma can't express

```typescript
import { dbPool } from '@/lib/prisma'

// Simple query
const result = await dbPool.query(
  `SELECT id, name FROM clients WHERE status = 'active' ORDER BY name`
)
const clients = result.rows

// Parameterized query (prevents SQL injection)
const result = await dbPool.query(
  `SELECT * FROM profiles WHERE id = $1`,
  [userId]
)
const profile = result.rows[0]

// Multiple parameters
const result = await dbPool.query(
  `INSERT INTO client_users (client_id, user_id, role, is_primary)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (client_id, user_id) DO NOTHING`,
  [clientId, userId, 'member', true]
)

// Complex JOIN
const result = await dbPool.query(
  `SELECT
    p.id,
    p.full_name as name,
    p.email,
    c.name as client_name
  FROM profiles p
  JOIN clients c ON c.id = p.client_id
  WHERE p.role = $1
  ORDER BY p.created_at DESC`,
  ['client']
)
```

---

## 5. Error Handling

### Standard Try/Catch Pattern
```typescript
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // ... your logic

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}
```

### With Error Details (Development)
```typescript
catch (error) {
  console.error('Failed to update client:', error)
  return NextResponse.json(
    {
      error: 'Failed to update client',
      details: error instanceof Error ? error.message : String(error)
    },
    { status: 500 }
  )
}
```

### Non-Critical Operations
```typescript
// Log activity (non-blocking, ignore failures)
try {
  await dbPool.query(
    `INSERT INTO activity_log (user_id, activity_type, description)
     VALUES ($1, $2, $3)`,
    [userId, 'created_client', `Created client ${name}`]
  )
} catch (logError) {
  console.error('Failed to log activity (non-critical):', logError)
}

return NextResponse.json({ success: true })
```

---

## 6. Request Parsing

### URL Parameters (Dynamic Routes)
```typescript
// Route: /api/admin/clients/[id]/route.ts
// URL: /api/admin/clients/abc123

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // id = 'abc123'
}

// Multiple params: /api/admin/clients/[id]/items/[itemId]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params
}
```

### Query Parameters
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const clientId = searchParams.get('clientId')        // string | null
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status') || 'active'
}
```

### JSON Body (POST/PATCH/PUT)
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, email, password } = body

  // Validate required fields
  if (!name || !email) {
    return NextResponse.json(
      { error: 'Name and email are required' },
      { status: 400 }
    )
  }
}
```

### Headers
```typescript
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const contentType = request.headers.get('content-type')
}
```

---

## 7. Complete Examples

### GET with Auth Check (Admin Route)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth

    const clients = await prisma.clients.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Failed to fetch clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}
```

### POST with Body Parsing (Admin Route)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { name, contactEmail, status } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const client = await prisma.clients.create({
      data: {
        name,
        contact_email: contactEmail || null,
        status: status || 'active',
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Failed to create client:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}
```

### GET/PATCH/DELETE with URL Params (Admin Route)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { id } = await params

    const client = await prisma.clients.findUnique({
      where: { id },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Failed to fetch client:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    const body = await request.json()

    const client = await prisma.clients.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.status !== undefined && { status: body.status }),
        updated_at: new Date(),
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error('Failed to update client:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { id } = await params

    await prisma.clients.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete client:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}
```

### Client Route with User's Client
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's client
    const profileResult = await dbPool.query(
      `SELECT client_id FROM profiles WHERE id = $1`,
      [user.id]
    )

    const clientId = profileResult.rows[0]?.client_id
    if (!clientId) {
      return NextResponse.json(
        { error: 'No client associated with user' },
        { status: 404 }
      )
    }

    // Fetch data for this client
    const result = await dbPool.query(
      `SELECT * FROM content WHERE client_id = $1 ORDER BY created_at DESC`,
      [clientId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}
```

---

## 8. Common Mistakes to Avoid

### DO NOT forget auth check
```typescript
// WRONG - No authentication!
export async function GET() {
  const clients = await prisma.clients.findMany()
  return NextResponse.json(clients)
}

// RIGHT - Always check auth for protected routes
export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  // ...
}
```

### DO NOT return raw errors to client
```typescript
// WRONG - Exposes internal details
catch (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// RIGHT - User-friendly message, log full error
catch (error) {
  console.error('Failed to create client:', error)
  return NextResponse.json(
    { error: 'Failed to create client' },
    { status: 500 }
  )
}
```

### DO NOT forget try/catch
```typescript
// WRONG - Unhandled errors crash the route
export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const clients = await prisma.clients.findMany()
  return NextResponse.json(clients)
}

// RIGHT - Wrap in try/catch
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const clients = await prisma.clients.findMany()
    return NextResponse.json(clients)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### DO NOT use Response instead of NextResponse
```typescript
// WRONG - Missing Next.js features
return new Response(JSON.stringify(data))

// RIGHT - Use NextResponse
return NextResponse.json(data)
```

### DO NOT forget force-dynamic
```typescript
// WRONG - May cache API responses
export async function GET() { ... }

// RIGHT - Always include for API routes
export const dynamic = 'force-dynamic'

export async function GET() { ... }
```

### DO NOT forget to await params
```typescript
// WRONG - params is a Promise in Next.js 15
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id  // Error!
}

// RIGHT - Await the params
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
}
```

### DO NOT use string concatenation for SQL
```typescript
// WRONG - SQL injection vulnerability!
const result = await dbPool.query(
  `SELECT * FROM clients WHERE id = '${clientId}'`
)

// RIGHT - Use parameterized queries
const result = await dbPool.query(
  `SELECT * FROM clients WHERE id = $1`,
  [clientId]
)
```

---

## 9. Import Summary

```typescript
// Core Next.js
import { NextRequest, NextResponse } from 'next/server'

// Authentication
import { createClient } from '@/lib/supabase/server'      // User session
import { createServiceClient } from '@/lib/supabase/server' // Bypass RLS
import { requireAdmin } from '@/lib/auth/requireAdmin'    // Admin check

// Database
import { prisma } from '@/lib/prisma'    // Typed ORM queries
import { dbPool } from '@/lib/prisma'    // Raw SQL queries
```

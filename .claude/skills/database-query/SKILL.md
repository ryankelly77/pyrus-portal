# Database Query Skill - Pyrus Portal

This skill documents how to query the database in Pyrus Portal using Prisma, raw SQL (dbPool), and Supabase clients.

## Connection Architecture

```
Next.js App (multiple requests)
     ↓
Local pg Pool (max 5 connections)
     ↓
Supavisor Pooler (port 6543, Transaction mode)
     ↓
PostgreSQL Database (Supabase)
```

---

## 1. When to Use Prisma

**Best for most cases** - type-safe, auto-complete, maintainable.

### Use Prisma for:
- Simple CRUD operations
- Queries with relations/includes
- Type-safe queries with autocomplete
- Single-table operations
- Creating, updating, deleting records

### Import
```typescript
import { prisma } from '@/lib/prisma'
```

### Advantages
- Full TypeScript types for all tables and relations
- Auto-complete in IDE
- Automatic query building
- Built-in protection against SQL injection
- Relations handled automatically

---

## 2. When to Use dbPool

**For complex queries** that Prisma can't express elegantly.

### Use dbPool for:
- Complex JOINs across 3+ tables
- Aggregations (COUNT, SUM, AVG, GROUP BY)
- DISTINCT queries
- Complex WHERE clauses with subqueries
- Raw SQL for performance-critical queries
- Queries with dynamic column selection
- Bulk operations

### Import
```typescript
import { dbPool } from '@/lib/prisma'
```

### Advantages
- Full SQL control
- Better for complex aggregations
- Can use PostgreSQL-specific features
- Sometimes more readable for complex queries

---

## 3. When to Use Supabase Client

**For auth-related operations** where you need user session context.

### Use createClient for:
- Getting current authenticated user
- User session management
- RLS-aware queries (respects row-level security)
- Client-side data fetching
- Real-time subscriptions

### Import
```typescript
import { createClient } from '@/lib/supabase/server'
```

### Example
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

---

## 4. When to Use Service Client

**For bypassing RLS** in server-side operations.

### Use createServiceClient for:
- Cron jobs (no user session)
- Webhooks (external triggers)
- Admin operations bypassing RLS
- Background tasks
- Cross-user data access
- System-level operations

### Import
```typescript
import { createServiceClient } from '@/lib/supabase/server'
```

### Example
```typescript
const supabase = await createServiceClient()
// This bypasses Row Level Security - use carefully!
const { data } = await supabase.from('profiles').select('*')
```

### Warning
Service client has FULL database access. Only use when:
1. No user session exists (webhooks, cron)
2. You need to access data across users
3. You've verified the operation is authorized

---

## 5. Prisma Examples

### findMany with Filters and Relations
```typescript
const clients = await prisma.clients.findMany({
  where: {
    status: 'active',
    growth_stage: { in: ['seedling', 'sprouting', 'blooming', 'harvesting'] }
  },
  orderBy: { name: 'asc' },
  include: {
    subscriptions: {
      where: { status: 'active' },
      include: {
        subscription_items: { select: { id: true } }
      }
    }
  },
  take: 50,
  skip: 0
})
```

### findUnique
```typescript
const client = await prisma.clients.findUnique({
  where: { id: clientId },
  include: {
    profiles: true,
    subscriptions: true
  }
})

if (!client) {
  return NextResponse.json({ error: 'Client not found' }, { status: 404 })
}
```

### count
```typescript
const activeClients = await prisma.clients.count({
  where: {
    status: 'active',
    growth_stage: { in: ['seedling', 'sprouting', 'blooming', 'harvesting'] }
  }
})
```

### create
```typescript
const client = await prisma.clients.create({
  data: {
    name: 'Acme Corp',
    contact_email: 'contact@acme.com',
    status: 'active',
    growth_stage: 'seedling',
    // Prisma uses snake_case for database columns
  }
})
```

### create with Relations
```typescript
const recommendation = await prisma.recommendations.create({
  data: {
    client_id: clientId,
    created_by: userId,
    status: 'draft',
    recommendation_items: {
      create: [
        { product_id: productId1, tier: 'good', quantity: 1 },
        { product_id: productId2, tier: 'better', quantity: 1 }
      ]
    }
  },
  include: {
    recommendation_items: true
  }
})
```

### update
```typescript
const client = await prisma.clients.update({
  where: { id: clientId },
  data: {
    name: newName,
    // Use spread for conditional updates
    ...(status !== undefined && { status }),
    ...(notes !== undefined && { notes: notes || null }),
    updated_at: new Date()
  }
})
```

### upsert
```typescript
await prisma.client_checklist_items.upsert({
  where: {
    client_id_template_id: { client_id: clientId, template_id: templateId }
  },
  create: {
    client_id: clientId,
    template_id: templateId,
    is_completed: true,
    completed_at: new Date()
  },
  update: {
    is_completed: true,
    completed_at: new Date()
  }
})
```

### delete
```typescript
// Single delete
await prisma.clients.delete({
  where: { id: clientId }
})

// Delete many
await prisma.recommendation_items.deleteMany({
  where: { recommendation_id: recId }
})
```

### Parallel Queries
```typescript
const [clients, products, bundles] = await Promise.all([
  prisma.clients.findMany({ where: { status: 'active' } }),
  prisma.products.findMany({ where: { status: 'active' } }),
  prisma.bundles.findMany({ where: { status: 'active' } })
])
```

---

## 6. dbPool Examples

### Basic Query with Parameters
```typescript
const result = await dbPool.query(
  `SELECT id, name, email FROM profiles WHERE role = $1`,
  ['admin']
)
const admins = result.rows
```

### Multiple Parameters
```typescript
const result = await dbPool.query(
  `SELECT * FROM clients
   WHERE status = $1 AND growth_stage = $2
   ORDER BY name`,
  ['active', 'blooming']
)
```

### Complex JOIN
```typescript
const result = await dbPool.query(`
  SELECT
    c.id,
    c.title,
    c.status,
    cl.name as client_name,
    p.full_name as author_name
  FROM content c
  LEFT JOIN clients cl ON cl.id = c.client_id
  LEFT JOIN profiles p ON p.id = c.author_id
  WHERE c.status = $1
  ORDER BY c.created_at DESC
  LIMIT $2 OFFSET $3
`, [status, limit, offset])
```

### Aggregations
```typescript
const statsResult = await dbPool.query(`
  SELECT
    COUNT(*) FILTER (WHERE status = 'draft') as drafts,
    COUNT(*) FILTER (WHERE status IN ('sent_for_review', 'client_reviewing')) as in_review,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(DISTINCT client_id) as unique_clients
  FROM content
`)
const stats = statsResult.rows[0]
```

### COUNT with GROUP BY
```typescript
const result = await dbPool.query(`
  SELECT
    client_id,
    COUNT(*) as content_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count
  FROM content
  GROUP BY client_id
  ORDER BY content_count DESC
`)
```

### INSERT with RETURNING
```typescript
const result = await dbPool.query(
  `INSERT INTO client_users (client_id, user_id, role, is_primary, receives_alerts)
   VALUES ($1, $2, $3, $4, $5)
   RETURNING id`,
  [clientId, userId, 'member', true, true]
)
const newId = result.rows[0].id
```

### UPDATE with RETURNING
```typescript
const result = await dbPool.query(
  `UPDATE clients
   SET status = $1, updated_at = NOW()
   WHERE id = $2
   RETURNING *`,
  ['paused', clientId]
)
const updatedClient = result.rows[0]
```

### ON CONFLICT (Upsert)
```typescript
await dbPool.query(
  `INSERT INTO client_users (client_id, user_id, role, is_primary)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (client_id, user_id) DO NOTHING`,
  [clientId, userId, 'member', false]
)
```

### Dynamic WHERE Clauses
```typescript
let query = `SELECT * FROM content WHERE 1=1`
const params: (string | number)[] = []
let paramIndex = 1

if (status) {
  query += ` AND status = $${paramIndex++}`
  params.push(status)
}
if (clientId) {
  query += ` AND client_id = $${paramIndex++}`
  params.push(clientId)
}

query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
params.push(limit, offset)

const result = await dbPool.query(query, params)
```

### Handling Results
```typescript
const result = await dbPool.query('SELECT * FROM clients WHERE id = $1', [id])

// Check if record exists
if (result.rows.length === 0) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// Single row
const client = result.rows[0]

// Multiple rows
const clients = result.rows

// Row count
const count = parseInt(result.rows[0].count)
```

---

## 7. RLS Considerations

### Tables WITHOUT RLS (direct access OK)
Most tables in Pyrus Portal do NOT use RLS. They rely on:
- API route authentication (requireAdmin, createClient)
- Application-level access control

### Tables WITH RLS
```
profiles          - Users can only read/update their own profile
```

### When RLS Blocks Queries

If using Supabase client and getting empty results:
```typescript
// This might return empty due to RLS
const supabase = await createClient()
const { data } = await supabase.from('profiles').select('*')

// Use service client to bypass RLS
const supabase = await createServiceClient()
const { data } = await supabase.from('profiles').select('*')
```

### Best Practice
For API routes, prefer **Prisma** or **dbPool** - they bypass RLS entirely and connect directly to PostgreSQL.

---

## 8. Common Mistakes to Avoid

### DON'T mix Prisma and raw SQL in same transaction
```typescript
// WRONG - No transaction guarantee
await prisma.clients.create({ data: {...} })
await dbPool.query('INSERT INTO activity_log...')

// RIGHT - Use Prisma for both OR dbPool for both
await prisma.$transaction([
  prisma.clients.create({ data: {...} }),
  prisma.activity_log.create({ data: {...} })
])
```

### DON'T forget to handle null results
```typescript
// WRONG
const client = await prisma.clients.findUnique({ where: { id } })
console.log(client.name)  // Error if null!

// RIGHT
const client = await prisma.clients.findUnique({ where: { id } })
if (!client) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
console.log(client.name)
```

### DON'T expose raw errors to client
```typescript
// WRONG
catch (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// RIGHT
catch (error) {
  console.error('Failed to fetch clients:', error)
  return NextResponse.json(
    { error: 'Failed to fetch clients' },
    { status: 500 }
  )
}
```

### DON'T use string concatenation for SQL
```typescript
// WRONG - SQL injection vulnerability!
const result = await dbPool.query(
  `SELECT * FROM clients WHERE id = '${clientId}'`
)

// RIGHT - Parameterized query
const result = await dbPool.query(
  `SELECT * FROM clients WHERE id = $1`,
  [clientId]
)
```

### DON'T forget to await params in Next.js 15
```typescript
// WRONG
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id  // Error in Next.js 15!
}

// RIGHT
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
}
```

### DON'T query in loops
```typescript
// WRONG - N+1 query problem
for (const client of clients) {
  const subs = await prisma.subscriptions.findMany({
    where: { client_id: client.id }
  })
}

// RIGHT - Single query with include
const clients = await prisma.clients.findMany({
  include: { subscriptions: true }
})
```

---

## 9. Key Tables Reference

### Core Entities

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `clients` | Client companies | `id`, `name`, `status`, `growth_stage`, `stripe_customer_id` |
| `profiles` | User accounts | `id`, `email`, `role`, `client_id`, `active_client_id` |
| `client_users` | User-client many-to-many | `client_id`, `user_id`, `is_primary`, `receives_alerts` |
| `user_invites` | Pending user invitations | `email`, `role`, `client_ids[]`, `invite_token`, `status` |

### Products & Subscriptions

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `products` | Service offerings | `id`, `name`, `category`, `monthly_price`, `stripe_product_id` |
| `bundles` | Product bundles | `id`, `name`, `monthly_price` |
| `subscriptions` | Active subscriptions | `client_id`, `stripe_subscription_id`, `status`, `monthly_amount` |
| `subscription_items` | Items in subscription | `subscription_id`, `product_id`, `quantity` |
| `client_products` | Manual product assignments | `client_id`, `product_id` (for non-Stripe clients) |

### Content Management

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `content` | Blog posts, pages | `client_id`, `title`, `status`, `platform`, `content_type` |
| `content_comments` | Review comments | `content_id`, `user_id`, `comment` |
| `content_revisions` | Version history | `content_id`, `body`, `revision_notes` |

### Recommendations (Sales Pipeline)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `recommendations` | Sales proposals | `client_id`, `status`, `total_monthly`, `purchased_tier` |
| `recommendation_items` | Items in proposal | `recommendation_id`, `product_id`, `tier` |
| `smart_recommendations` | AI-powered recommendations | `client_id`, `status` |

### Email System

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `email_templates` | Email templates | `slug`, `subject_template`, `body_html` |
| `email_logs` | Sent email history | `template_slug`, `recipient_email`, `status` |
| `email_automations` | Automation workflows | `slug`, `trigger_type`, `is_active` |
| `email_automation_enrollments` | Active enrollments | `automation_id`, `status`, `next_step_due_at` |

### Activity & Notifications

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `activity_log` | System activity | `client_id`, `user_id`, `activity_type`, `description` |
| `activity_feed` | Unified feed | `client_id`, `activity_type`, `message` |
| `notifications` | User notifications | `user_id`, `title`, `read_at` |
| `client_alerts` | Client-facing alerts | `client_id`, `message`, `alert_type`, `status` |

### Common Relationships

```
clients
  ├── profiles (via client_id)           - Legacy single-client link
  ├── client_users → profiles            - Multi-client users
  ├── subscriptions → subscription_items
  ├── recommendations → recommendation_items
  ├── content
  └── client_alerts

profiles
  ├── client (via client_id)             - Primary client
  ├── active_client (via active_client_id)
  ├── client_users → clients             - All linked clients
  └── notifications

products
  ├── subscription_items
  ├── recommendation_items
  ├── client_products
  └── bundle_products → bundles
```

### Commonly Misunderstood Fields

| Field | Table | Notes |
|-------|-------|-------|
| `client_id` | `profiles` | Legacy single-client link; use `client_users` for multi-client |
| `active_client_id` | `profiles` | Currently selected client for multi-client users |
| `purchased_tier` | `recommendations` | `null` = not purchased, `'good'`/`'better'`/`'best'` = tier purchased |
| `status` | `content` | Complex workflow: `draft` → `sent_for_review` → `approved` → `posted` |
| `growth_stage` | `clients` | `'prospect'` → `'seedling'` → `'sprouting'` → `'blooming'` → `'harvesting'` |

---

## 10. Import Summary

```typescript
// Database clients
import { prisma } from '@/lib/prisma'           // Type-safe ORM
import { dbPool } from '@/lib/prisma'           // Raw SQL queries

// Supabase clients
import { createClient } from '@/lib/supabase/server'        // User session
import { createServiceClient } from '@/lib/supabase/server' // Bypass RLS

// Auth helper
import { requireAdmin } from '@/lib/auth/requireAdmin'
```

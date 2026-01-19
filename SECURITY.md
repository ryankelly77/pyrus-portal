# Security & Development Guidelines

This document outlines security protocols established during the P0/P1/P2 security audit. Follow these guidelines for all new features, API routes, and integrations.

---

## API Route Security

### Admin Routes (Required)

Every admin API route MUST include authentication:

```typescript
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  
  // auth is now { user, profile }
  // Your code here
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  
  // Your code here
}
```

**Critical:** The `if (auth instanceof NextResponse) return auth` check MUST come immediately after `requireAdmin()`. Without this, unauthorized requests will still execute.

---

## Input Validation (Required for POST/PUT/PATCH)

All routes accepting user input MUST validate with Zod.

### 1. Define Schema

Add schemas to `src/lib/validation/schemas.ts`:

```typescript
import { z } from 'zod'

export const clientCreateSchema = z.object({
  name: z.string().min(1).max(255),
  contactEmail: z.string().email().optional(),
  status: z.enum(['active', 'paused', 'churned', 'prospect']).optional(),
})

export const clientUpdateSchema = clientCreateSchema.partial()
```

### 2. Use in Route

```typescript
import { clientCreateSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const result = clientCreateSchema.safeParse(body)
  
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }
  
  const { name, contactEmail, status } = result.data  // Validated & typed
  
  // Proceed with validated data
}
```

---

## Environment Variables

### Adding New Variables

1. **Local development:** Add to `.env` (never commit this file)
2. **Production:** Add to Vercel dashboard
3. **CI/CD:** Add to GitHub repo → Settings → Secrets → Actions
4. **CI workflow:** Update `.github/workflows/ci.yml` env block

```yaml
- name: Build project
  run: npm run build
  env:
    NEW_SERVICE_API_KEY: ${{ secrets.NEW_SERVICE_API_KEY }}
```

### Rules

- ❌ Never hardcode secrets in code
- ❌ Never commit `.env` files
- ❌ Never log secrets or include in error messages
- ✅ Use `process.env.VARIABLE_NAME`
- ✅ Check variables at runtime, not module load time

```typescript
// Bad - crashes at build time
const apiKey = process.env.API_KEY!
if (!apiKey) throw new Error('Missing API_KEY')

// Good - crashes only when function is called
function getClient() {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not configured')
  }
  return new Client(process.env.API_KEY)
}
```

---

## Testing Requirements

### New API Routes Must Have Tests

Create test files in `src/__tests__/`:

```typescript
// src/__tests__/newFeatureRoute.test.ts
import { GET, POST } from '@/app/api/admin/feature/route'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { NextRequest, NextResponse } from 'next/server'

jest.mock('@/lib/auth/requireAdmin')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    feature: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

describe('Feature API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('should return 400 when validation fails', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({ 
      user: { id: '123' }, 
      profile: { role: 'admin' } 
    })

    const request = new NextRequest('http://localhost/api/admin/feature', {
      method: 'POST',
      body: JSON.stringify({ /* invalid data */ }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should return 200 with data when admin', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({ 
      user: { id: '123' }, 
      profile: { role: 'admin' } 
    })

    // Mock your data layer
    const mockData = [{ id: '1', name: 'Test' }]
    const { prisma } = require('@/lib/prisma')
    prisma.feature.findMany.mockResolvedValue(mockData)

    const response = await GET()
    expect(response.status).toBe(200)
  })
})
```

### Run Tests Before Pushing

```bash
npm test
npm run build
npx tsc --noEmit
```

All three must pass.

---

## PR Security Checklist

Copy this into your PR description:

```markdown
## Security Checklist

### Authentication
- [ ] Admin routes have `requireAdmin()` call
- [ ] Admin routes have `if (auth instanceof NextResponse) return auth` check
- [ ] Auth check comes BEFORE any data access

### Validation
- [ ] POST/PUT/PATCH routes have Zod schema
- [ ] Using `safeParse()` (not `parse()`)
- [ ] Returns 400 with error details on validation failure
- [ ] Only using `result.data` after validation passes

### Environment Variables
- [ ] No hardcoded secrets
- [ ] New env vars added to Vercel
- [ ] New env vars added to GitHub Secrets
- [ ] CI workflow updated if needed

### Testing
- [ ] Tests written for new routes
- [ ] Tests cover: no auth (401), bad input (400), success case
- [ ] `npm test` passes
- [ ] `npm run build` passes

### General
- [ ] No sensitive data in error messages
- [ ] No sensitive data logged
- [ ] Types imported from `@/types` (not defined locally)
```

---

## Quick Reference

### Response Status Codes

| Code | When to Use |
|------|-------------|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 400 | Validation failed |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 500 | Server error (should be rare) |

### Error Response Shape

Always use consistent error responses:

```typescript
// Validation error
return NextResponse.json(
  { error: 'Validation failed', details: result.error.flatten() },
  { status: 400 }
)

// Auth error
return NextResponse.json(
  { error: 'Unauthorized' },
  { status: 401 }
)

// Not found
return NextResponse.json(
  { error: 'Client not found' },
  { status: 404 }
)
```

---

## Agent Prompt Template

When using AI agents to add features, use this prompt:

```
I'm adding [describe feature]. Create the API route following these requirements:

1. Add requireAdmin() check at the top with `if (auth instanceof NextResponse) return auth`
2. Create a Zod schema in src/lib/validation/schemas.ts for input validation
3. Use safeParse() and return 400 on validation failure
4. Create a test file in src/__tests__/ covering:
   - No auth returns 401
   - Bad input returns 400  
   - Success case returns correct status and data
5. Run npm test and npm run build to verify

Show me the schema, route, and test file.
```

---

## Credential Rotation

If credentials are ever exposed:

1. **Immediately rotate** in the service dashboard (Supabase, Stripe, etc.)
2. **Update** in Vercel environment variables
3. **Update** in GitHub Secrets
4. **Verify** CI still passes
5. **Check** git history - use BFG Repo-Cleaner if secrets were committed

---

## Questions?

If unsure whether something is secure, ask:
1. Can an unauthenticated user reach this code?
2. Can a non-admin user reach this code?
3. What happens if someone sends malicious input?
4. Are there any secrets in this code or logs?

When in doubt, add more checks, not fewer.

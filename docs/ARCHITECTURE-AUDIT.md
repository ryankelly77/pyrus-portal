# Architecture Audit Report: Pyrus Portal

**Audit Date:** 2026-01-17
**Auditor:** AI Architecture Agent
**Codebase Version:** 825931b

---

## Overall Score: 48/100 (Grade: D - Structural Problems Throughout)

---

## Category Breakdown

| Category | Score | Max | Key Issues |
|----------|-------|-----|------------|
| Architectural Boundaries | 14 | 25 | Moderate violations, layer separation needs work |
| Type Safety & Contracts | 11 | 20 | No Zod validation, scattered magic strings |
| API & Backend Hygiene | 6 | 15 | No input validation, inconsistent error handling |
| Security Controls | 3 | 15 | **CRITICAL**: .env committed, no auth on admin APIs |
| Testing & CI | 0 | 10 | No tests, no CI pipeline |
| Dependency & Build | 7 | 10 | High vulnerabilities, otherwise clean build |
| Database & Data | 7 | 5 | Good schema, no migrations folder |

---

## Critical Issues (P0)

### 1. SECRETS COMMITTED TO REPOSITORY

**File:** `.env` (tracked in git)
**Severity:** CRITICAL

```
DATABASE_URL="postgresql://postgres.shukvylhjmqkadubvnsz:..."
NEXT_PUBLIC_SUPABASE_URL="https://shukvylhjmqkadubvnsz.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

The `.env` file is NOT in `.gitignore` and contains **production database credentials, Supabase service role keys, and other sensitive tokens**. These credentials are exposed in the git history.

**Immediate Actions Required:**
1. Rotate ALL credentials immediately (Database password, Supabase keys)
2. Add `.env` to `.gitignore`
3. Use `git filter-branch` or BFG to remove secrets from history
4. Consider using Vercel/Supabase environment variable management

### 2. NO AUTHENTICATION ON ADMIN API ROUTES

**Files:** `src/app/api/admin/clients/route.ts`, `src/app/api/admin/products/route.ts`, and 30+ other admin routes

Most admin API routes have **no authentication checks**. Example from `src/app/api/admin/clients/route.ts:5-18`:

```typescript
export async function GET() {
  try {
    const clients = await prisma.clients.findMany({...})
    return NextResponse.json(clients)  // No auth check!
  }
}
```

Only 7 of ~40 admin routes check `createClient()` for authentication.

### 3. HIGH SEVERITY NPM VULNERABILITIES

```
3 high severity vulnerabilities:
- hono <=4.11.3 - JWT algorithm confusion
- @prisma/dev - Depends on vulnerable hono
- prisma 6.20.0-7.3.0 - Depends on vulnerable @prisma/dev
```

---

## Phase 2: Architectural Boundaries (14/25)

### 2.1 Import Discipline (9/15)

**Positive:**
- Path aliases configured (`@/*` -> `./src/*`) and used consistently
- No deep relative imports (`../../../`)
- Clear layer separation: `/lib`, `/stores`, `/components`, `/app`

**Violations Found:**
- Store import in page component is appropriate: `src/app/admin/recommendation-builder/[clientId]/page.tsx:import { useRecommendationStore } from '@/stores/recommendation-store'`
- No circular dependencies detected
- Some API routes mix Supabase client and Prisma directly

### 2.2 Layer Separation (5/10)

**Violations:**
- API routes directly access both `prisma` and `supabase` clients interchangeably (e.g., `src/app/api/stripe/webhook/route.ts` uses both)
- Business logic embedded in page components (e.g., `src/app/admin/clients/[id]/page.tsx` at 4,499 lines)
- No service layer - API routes contain all business logic

---

## Phase 3: Type Safety & Contracts (11/20)

### 3.1 Magic String Elimination (4/8)

**Violations Found:**
- Status strings scattered across files:
  - `'active' | 'paused' | 'churned' | 'prospect'` defined in 3+ places
  - `'draft' | 'pending_review' | 'revision' | 'approved' | 'published'` inline
- Types defined in `@/types/client.ts` but not consistently imported
- `src/app/admin/clients/[id]/page.tsx` defines local types that duplicate `@/types`

### 3.2 Schema & Validation Consistency (3/7)

**Critical Finding:** Zod is in `package.json` but **never used** in the codebase.
- No `grep -r "zod\|z\.object"` matches in `/src`
- All API routes accept `await request.json()` with no validation

### 3.3 Contract as Source of Truth (4/5)

**Positive:**
- `@/types/index.ts` exports centralized types
- Transform functions exist: `transformDBClient()`, `transformDBSubscription()`
- snake_case/camelCase convention documented

**Violations:**
- `useClientData.ts:5-31` defines duplicate `ClientInfo` interface instead of importing from `@/types`
- `src/app/admin/clients/[id]/page.tsx` defines ~10 local interfaces

---

## Phase 4: API & Backend Hygiene (6/15)

### 4.1 Route Validation Coverage (2/8)

**0% validation coverage.** Every route trusts raw input:

```typescript
// src/app/api/admin/clients/route.ts:24-37
const body = await request.json()
const { name, contactName, contactEmail, growthStage, status } = body
// No validation!
```

### 4.2 Error Handling & Response Shapes (4/7)

**Positive:**
- Consistent try/catch in most routes
- Error responses follow `{ error: string }` shape

**Violations:**
- Stack traces logged to console (may leak in some environments)
- `src/app/api/admin/clients/[id]/route.ts:90` leaks error details in response:
  ```typescript
  { error: 'Failed to update client', details: error.message }
  ```
- No standardized error codes

---

## Phase 5: Security Controls (3/15)

### 5.1 Secrets & Configuration (0/6)

**FAILED - CRITICAL**
- Production `.env` file committed to repository
- Contains database credentials, Supabase service role key
- No `.env` in `.gitignore`

### 5.2 Authentication & Authorization (2/5)

**Violations:**
- Middleware only protects page routes, not API routes
- `superAdminRoutes` defined in middleware but never enforced
- No role-based access control on admin APIs
- No rate limiting anywhere

### 5.3 Sensitive Data Handling (1/4)

**Partial:**
- Stripe webhook properly validates signatures
- No audit logging for sensitive data access
- No PHI/PII protection measures

---

## Phase 6: Testing & CI (0/10)

### 6.1 Test Coverage (0/6)

**No test files exist.** `find` returns only `node_modules` test files.

### 6.2 CI/CD Pipeline (0/4)

**No GitHub workflows directory exists.** No automated testing, linting, or deployment pipeline.

---

## Phase 7: Dependency & Build Health (7/10)

### 7.1 Dependency Hygiene (4/5)

- 3 high severity vulnerabilities (JWT-related in Prisma/Hono chain)
- All dependencies recent versions
- No deprecated packages in direct dependencies

### 7.2 Build & Alias Consistency (3/5)

**Positive:**
- Path aliases match across tsconfig
- `prisma generate` in build script
- Build produces correct output

---

## Phase 8: Database & Data (7/5) - Above Average

### 8.1 Migration Discipline (4/3)

**Note:** Uses Prisma with `db pull` workflow (no migrations folder)
- Schema is well-organized with clear sections
- Proper use of relations and foreign keys
- UUID primary keys throughout

### 8.2 Data Invariant Enforcement (3/2)

**Positive:**
- Proper `@@unique` constraints
- `onDelete: Cascade` used appropriately
- `@@index` on frequently queried columns

---

## Remediation Plan

### Priority Matrix

| Priority | Issue | Current State | Target State | Effort | Impact |
|----------|-------|---------------|--------------|--------|--------|
| P0 | Secrets in repo | .env committed | Secrets rotated, .env gitignored | 2h | CRITICAL |
| P0 | Admin auth missing | No auth checks | All admin routes protected | 4h | CRITICAL |
| P0 | NPM vulnerabilities | 3 high severity | 0 vulnerabilities | 1h | HIGH |
| P1 | No input validation | 0% coverage | Zod schemas on all routes | 8h | HIGH |
| P1 | Giant page file | 4,499 lines | Extracted components | 6h | MEDIUM |
| P2 | No tests | 0 tests | Core flows covered | 16h | MEDIUM |
| P2 | No CI pipeline | Manual deploys | GitHub Actions CI | 2h | MEDIUM |
| P3 | Type duplication | Local interfaces | Import from @/types | 4h | LOW |

---

### P0 Critical Fixes (Do Today)

#### 1. Rotate Secrets & Fix Git History

```bash
# 1. Add to .gitignore immediately
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# 2. Remove from git tracking
git rm --cached .env .env.local

# 3. Commit the fix
git commit -m "Remove .env from tracking"

# 4. CRITICAL: Rotate ALL credentials
# - Supabase: Dashboard > Settings > API > Regenerate keys
# - Database: Reset password in Supabase
# - Any other keys in the file

# 5. Consider using BFG Repo-Cleaner to remove from history
# bfg --delete-files .env
```

#### 2. Add Auth Middleware to Admin APIs

Create `src/lib/auth/requireAdmin.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { role: true }
  })

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, profile }
}
```

Apply to all admin routes:

```typescript
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  // ... rest of handler
}
```

#### 3. Fix NPM Vulnerabilities

```bash
npm audit fix --force
# Review breaking changes in prisma@6.19.2
```

---

### P1 High Priority (This Week)

#### Add Zod Validation to API Routes

Create `src/lib/validation/schemas.ts`:

```typescript
import { z } from 'zod'

export const clientCreateSchema = z.object({
  name: z.string().min(1).max(255),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  growthStage: z.enum(['prospect', 'seedling', 'sprouting', 'blooming', 'harvesting']).optional(),
  status: z.enum(['active', 'paused', 'churned', 'prospect']).optional(),
})

export const clientUpdateSchema = clientCreateSchema.partial()
```

Apply in routes:

```typescript
const body = await request.json()
const result = clientCreateSchema.safeParse(body)
if (!result.success) {
  return NextResponse.json(
    { error: 'Validation failed', details: result.error.flatten() },
    { status: 400 }
  )
}
const { name, contactEmail, ... } = result.data
```

---

### P2 Medium Priority (Next Sprint)

#### Add Basic CI Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx tsc --noEmit
```

---

## Quick Wins (< 1 day effort)

1. Add `.env` to `.gitignore` (5 min)
2. Fix npm audit (30 min)
3. Add `requireAdmin()` wrapper to 5 most sensitive routes (2h)
4. Create basic GitHub Actions CI (1h)
5. Extract status enums to constants file (30 min)

---

## Recommended Tooling

| Tool | Purpose |
|------|---------|
| `eslint-plugin-security` | Flag security issues in code |
| `dependency-cruiser` | Enforce import boundaries |
| `husky` + `lint-staged` | Pre-commit hooks |
| `zod` (already installed!) | Runtime validation |
| `vitest` or `jest` | Unit/integration testing |

---

## Governance Recommendations

1. **Code Review Checklist:**
   - [ ] Auth check present on all admin routes
   - [ ] Input validated with Zod schema
   - [ ] No secrets hardcoded
   - [ ] Types imported from `@/types`

2. **CI Gates to Add:**
   - TypeScript strict mode check
   - Lint pass required
   - npm audit with 0 high/critical
   - (future) Test coverage threshold

3. **Documentation Updates:**
   - Add SECURITY.md with credential rotation procedures
   - Document API authentication requirements
   - Add architecture decision records (ADRs)

---

## Executive Summary

**Score: 48/100 (Grade D)** - Structural problems throughout requiring significant attention.

### Top 3 Critical Issues Requiring Immediate Attention:

1. **SECRETS IN GIT** - Production database credentials and API keys are committed to the repository. Rotate immediately.

2. **NO AUTH ON ADMIN APIs** - Over 30 admin API routes have zero authentication checks. Any user can access client data, create recommendations, and modify records.

3. **NO INPUT VALIDATION** - Despite Zod being in `package.json`, it's never used. All API routes blindly trust input data.

### Path to 80+ Score:

| Action | Score Gain |
|--------|------------|
| Fix secrets + add auth | +12 |
| Add Zod validation | +8 |
| Add basic test suite | +6 |
| Add CI pipeline | +4 |
| Fix npm vulnerabilities | +2 |
| **Total Potential** | **+32 -> 80** |

### Risk Assessment if Unaddressed:

- **Data breach risk**: HIGH - Credentials exposed in git history
- **Unauthorized access**: HIGH - No API authentication
- **Data corruption**: MEDIUM - No input validation
- **Regression risk**: HIGH - No tests or CI

The codebase has good foundations (well-structured types, clean Prisma schema, proper Next.js patterns) but lacks critical security controls. The P0 issues should be addressed before any new features.

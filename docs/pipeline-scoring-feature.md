# Sales Pipeline Confidence Scoring

## Feature Overview

Pipeline Confidence Scoring is a system within the Pyrus Portal that calculates a **weighted pipeline value** for every open sales recommendation. It combines a sales rep's subjective post-call assessment with automated behavioral signals — email opens, proposal views, and prospect responsiveness — to produce a confidence score from 0 to 100. That score is multiplied against predicted revenue to yield a **weighted pipeline value**, giving leadership a realistic picture of expected monthly recurring revenue (MRR) and one-time revenue at any point in time.

---

## Why This Exists

Raw pipeline totals are misleading. A $5,000/mo recommendation sent three weeks ago with no email open is not worth the same as a $2,000/mo recommendation where the prospect viewed the proposal yesterday and asked follow-up questions. Confidence scoring solves this by:

- Giving each deal a **0–100 confidence score** that reflects how likely it is to close.
- Applying **automatic time-based decay** so stale deals don't inflate the pipeline.
- Rewarding **positive engagement signals** (email opens, proposal views, inbound communication).
- Producing **weighted pipeline values** (predicted_price × confidence%) for accurate forecasting.

---

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Database | Supabase (PostgreSQL) | Schema, RLS, views, stored config |
| Scoring Engine | TypeScript (pure function) | Deterministic score computation |
| Event Hooks | Supabase Edge Functions / API routes | Trigger recalculation on events |
| Daily Job | pg_cron or Edge Function (scheduled) | Recompute time-based decay |
| Pipeline UI | Next.js (React) | Dashboard, rep input forms |
| Communication Sync | HighLevel webhooks | Auto-populate communication logs |

### Data Flow

```
Sales Call → Rep fills Call Score Form → Base score computed
                                              ↓
Invite sent → Email opened? → Proposal viewed? → Prospect replied?
                                              ↓
              Penalties/bonuses calculated from timestamps
                                              ↓
              confidence_score = clamp(base - penalties + bonus, 0, 100)
                                              ↓
              weighted_monthly = predicted_monthly × (score / 100)
              weighted_onetime = predicted_onetime × (score / 100)
```

---

## Database Schema

### Modified Tables

#### `recommendations` (existing table — new columns)

| Column | Type | Description |
|--------|------|-------------|
| `predicted_tier` | `text` | Which pricing tier the rep predicts: `good`, `better`, or `best` |
| `predicted_monthly` | `numeric` | Cached monthly price for the predicted tier |
| `predicted_onetime` | `numeric` | Cached one-time price for the predicted tier |
| `confidence_score` | `integer` | Computed score 0–100 |
| `confidence_percent` | `numeric` | Derived: `confidence_score / 100` |
| `weighted_monthly` | `numeric` | `predicted_monthly × confidence_percent` |
| `weighted_onetime` | `numeric` | `predicted_onetime × confidence_percent` |
| `last_scored_at` | `timestamptz` | When the score was last computed |
| `closed_lost_at` | `timestamptz` | When the deal was marked closed/lost |
| `closed_lost_reason` | `text` | Free-text reason for closing the deal |

The `status` constraint is expanded to include `closed_lost`:
`draft → sent → accepted | declined | closed_lost`

The `created_by` column on recommendations serves as the sales rep identifier. No separate `sales_rep_id` is needed.

#### `recommendation_invites` (existing table — new columns)

| Column | Type | Description |
|--------|------|-------------|
| `email_opened_at` | `timestamptz` | When the invite email was first opened (tracking pixel) |
| `account_created_at` | `timestamptz` | When this invitee created their portal account |

Existing columns used by scoring: `sent_at`, `viewed_at` (proposal page view), `responded_at`.

### New Tables

#### `recommendation_call_scores`

Stores the rep's subjective assessment from the sales call. **One record per recommendation** (enforced by UNIQUE constraint on `recommendation_id`). Raw selection values are stored (not computed points) so scores can be recomputed when weights change.

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `id` | `uuid` | PK | Auto-generated |
| `recommendation_id` | `uuid` | UNIQUE, FK → recommendations | Links to the recommendation |
| `budget_clarity` | `text` | `clear`, `vague`, `none`, `no_budget` | How clearly the prospect defined their budget |
| `competition` | `text` | `none`, `some`, `many` | Number of competing proposals |
| `engagement` | `text` | `high`, `medium`, `low` | Prospect's enthusiasm on the call |
| `plan_fit` | `text` | `strong`, `medium`, `weak`, `poor` | How well Pyrus services match their needs |
| `created_by` | `uuid` | FK → profiles | Rep who entered the score |
| `created_at` | `timestamptz` | | Auto-set |
| `updated_at` | `timestamptz` | | Auto-set |

#### `recommendation_communications`

Logs all communication events relevant to a deal. Populated by HighLevel webhooks, manual rep entries, or system events. The scoring engine uses this to compute the **silence penalty**.

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `id` | `uuid` | PK | Auto-generated |
| `recommendation_id` | `uuid` | FK → recommendations | Links to the recommendation |
| `direction` | `text` | `inbound`, `outbound` | Who initiated: prospect or team |
| `channel` | `text` | `email`, `sms`, `chat`, `call`, `other` | Communication channel |
| `contact_at` | `timestamptz` | NOT NULL | When the communication happened |
| `source` | `text` | `highlevel_webhook`, `manual`, `system` | How this record was created |
| `highlevel_message_id` | `text` | | External ID for deduplication |
| `notes` | `text` | | Optional (e.g., "spoke on phone about pricing") |
| `created_at` | `timestamptz` | | Auto-set |

### Views

#### `pipeline_reps`

Encapsulates "who counts as a sales rep" in a single view. A pipeline rep is any user who can own deals:

- `role = 'sales'` (explicit sales users), **OR**
- Has access to both `recommendations` AND `users` menu items (catches admins, super_admins, any hybrid roles)

```sql
SELECT DISTINCT p.id, p.first_name, p.last_name, p.email, p.role, p.avatar_url
FROM profiles p
WHERE p.role = 'sales'
   OR (EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role = p.role AND rp.menu_key = 'recommendations' AND rp.has_access = true)
       AND EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role = p.role AND rp.menu_key = 'users' AND rp.has_access = true));
```

**Usage:** `JOIN pipeline_reps pr ON pr.id = r.created_by`

### Indexes

| Index | On | Purpose |
|-------|----|---------|
| `idx_recommendations_pipeline` | `recommendations(status, confidence_score DESC) WHERE status='sent'` | Pipeline dashboard queries |
| `idx_recommendations_created_by` | `recommendations(created_by) WHERE created_by IS NOT NULL` | Filter by rep |
| `idx_recommendations_predicted_tier` | `recommendations(predicted_tier) WHERE predicted_tier IS NOT NULL` | Filter by tier |
| `idx_recommendations_last_scored` | `recommendations(last_scored_at) WHERE status='sent'` | Find stale scores for daily recalc |
| `idx_rec_comms_recommendation_direction` | `recommendation_communications(recommendation_id, direction, contact_at DESC)` | Find last inbound/outbound per deal |
| `idx_rec_comms_highlevel_id` | `recommendation_communications(highlevel_message_id) WHERE NOT NULL` | Deduplicate HighLevel syncs |
| `idx_rec_call_scores_recommendation` | `recommendation_call_scores(recommendation_id)` | Look up call score by recommendation |
| `idx_rec_invites_recommendation_milestones` | `recommendation_invites(recommendation_id, email_opened_at, account_created_at, viewed_at)` | Aggregate invite milestones |

### RLS Policies

- **Admins/super_admins**: Full CRUD on `recommendation_call_scores` and `recommendation_communications`
- **Clients**: Read-only access to `recommendation_communications` for their own recommendations (via `recommendations → clients → profiles` chain)

### Settings

Scoring configuration is stored as a JSON value in the `settings` table under key `pipeline_scoring_config`. This allows tuning weights, penalties, and bonuses without code changes.

---

## Scoring Algorithm

The scoring engine is a **pure function** — no database calls, no `Date.now()`, no side effects. All inputs (deal data, call scores, milestones, communications, config, current timestamp) are passed in, and a deterministic `ScoringResult` is returned.

### Step 1: Terminal Status Check

| Status | Score | Action |
|--------|-------|--------|
| `closed_lost` | 0 | Return immediately |
| `accepted` | 100 | Return immediately |

### Step 2: Base Score from Call Factors

If the rep has filled out the call scoring form, the base score is computed as a weighted sum:

```
base = Σ (weight[factor] × mapping[factor][selection])
```

**Default weights** (sum to 100):

| Factor | Weight | Selections (multiplier) |
|--------|--------|------------------------|
| Budget Clarity | 25 | clear (1.0), vague (0.5), none (0.2), no_budget (0) |
| Competition | 20 | none (1.0), some (0.5), many (0.15) |
| Engagement | 25 | high (1.0), medium (0.55), low (0.15) |
| Plan Fit | 30 | strong (1.0), medium (0.6), weak (0.25), poor (0) |

**Example:** Budget=clear, Competition=some, Engagement=high, Plan Fit=strong
→ `25×1.0 + 20×0.5 + 25×1.0 + 30×1.0 = 25 + 10 + 25 + 30 = 90`

If no call score exists, the base defaults to **50**.

For `draft` status: the base score is returned directly (no penalties applied).

### Step 3: Email Not Opened Penalty

Applies when the recommendation has been sent but no invitee has opened the email.

- **Trigger:** `first_email_opened_at` is null AND `sent_at` is not null
- **Grace period:** 24 hours after `sent_at`
- **Penalty:** 2.5 points per day after grace period
- **Maximum:** 35 points
- **Removed when:** Any invitee opens the email

### Step 4: Proposal Not Viewed Penalty

Applies when email has been opened but no invitee has viewed the actual recommendation page.

- **Trigger:** `first_email_opened_at` is not null AND `first_proposal_viewed_at` is null
- **Anchor:** Starts from `first_email_opened_at` (not `sent_at`)
- **Grace period:** 48 hours after email open
- **Penalty:** 2 points per day after grace period
- **Maximum:** 25 points
- **Removed when:** Any invitee views the proposal

### Step 5: Silence Penalty

Applies when there has been no recent inbound communication from the prospect.

- **Anchor:** Uses the latest of: `last_prospect_contact_at` or `sent_at`
- **Grace period:** 5 days from anchor
- **Penalty:** 3 points per day after grace period
- **Maximum:** 80 points
- **Acceleration:** If ≥ 2 outbound follow-ups since last inbound reply, the daily penalty is multiplied by **1.5×** (4.5/day instead of 3/day)

### Step 6: Multi-Invite Bonus

When a recommendation has multiple invitees, bonus points are awarded if ALL of them hit milestones:

| Milestone | Bonus | Condition |
|-----------|-------|-----------|
| All opened email | +3 | `opened_count == total_invites` AND `total_invites > 1` |
| All viewed proposal | +5 | `viewed_count == total_invites` AND `total_invites > 1` |

These stack: if all invitees both opened and viewed, the bonus is **+8**.

### Step 7: Final Score

```
final = clamp(base - email_penalty - proposal_penalty - silence_penalty + bonus, 0, 100)
```

### Step 8: Weighted Values

```
confidence_percent = final / 100
weighted_monthly = predicted_monthly × confidence_percent
weighted_onetime = predicted_onetime × confidence_percent
```

### Scoring Result Object

The function returns a full breakdown for debugging and UI display:

```typescript
{
  confidence_score: 67,        // 0-100
  confidence_percent: 0.67,    // 0-1
  weighted_monthly: 2010,      // $3,000 × 0.67
  weighted_onetime: 335,       // $500 × 0.67
  base_score: 90,              // From call factors
  total_penalties: 31,         // Sum of all penalties
  total_bonus: 8,              // Sum of all bonuses
  penalty_breakdown: {
    email_not_opened: 0,       // Email was opened
    proposal_not_viewed: 0,    // Proposal was viewed
    silence: 31,               // 10 days of silence after grace
    multi_invite_bonus: -8     // All 2 invitees opened + viewed
  }
}
```

---

## Configuration Reference

All values are tunable via the `pipeline_scoring_config` setting in the database.

```json
{
  "call_weights": {
    "budget_clarity": 25,
    "competition": 20,
    "engagement": 25,
    "plan_fit": 30
  },
  "call_score_mappings": {
    "budget_clarity": { "clear": 1.0, "vague": 0.5, "none": 0.2, "no_budget": 0 },
    "competition": { "none": 1.0, "some": 0.5, "many": 0.15 },
    "engagement": { "high": 1.0, "medium": 0.55, "low": 0.15 },
    "plan_fit": { "strong": 1.0, "medium": 0.6, "weak": 0.25, "poor": 0 }
  },
  "penalties": {
    "email_not_opened": {
      "grace_period_hours": 24,
      "daily_penalty": 2.5,
      "max_penalty": 35
    },
    "proposal_not_viewed": {
      "grace_period_hours": 48,
      "daily_penalty": 2,
      "max_penalty": 25
    },
    "silence": {
      "grace_period_days": 5,
      "daily_penalty": 3,
      "max_penalty": 80,
      "followup_acceleration_threshold": 2,
      "followup_acceleration_multiplier": 1.5
    }
  },
  "multi_invite_bonus": {
    "all_opened_bonus": 3,
    "all_viewed_bonus": 5
  },
  "default_base_score": 50
}
```

---

## Implementation Phases

### Phase 1 — Database Schema + Scoring Engine ✅ Complete

**Deliverables:**

| File | Description |
|------|-------------|
| `migration.sql` | Full database migration (idempotent, safe to re-run) |
| `types.ts` | All TypeScript interfaces |
| `scoring-engine.ts` | Pure scoring function |
| `default-config.ts` | TypeScript config matching the settings seed |
| `scoring-engine.test.ts` | 68 unit tests (all passing) |

### Phase 2 — Event Hooks

Wire score recalculation to real-time events:

- **Recommendation status change** (sent, accepted, closed_lost) → Recalculate immediately
- **Invite milestones** (email_opened_at, account_created_at, viewed_at) → Recalculate affected recommendation
- **Communication logged** (new inbound or outbound) → Recalculate affected recommendation

Each hook: assembles `ScoringInput` from DB, calls `calculatePipelineScore()`, writes results back to `recommendations`.

### Phase 3 — Daily Recalculation Job

Scheduled job (pg_cron or Supabase Edge Function cron) that:

1. Selects all recommendations WHERE `status = 'sent'` AND (`last_scored_at IS NULL` OR `last_scored_at < now() - interval '1 day'`)
2. Assembles scoring inputs for each
3. Calls `calculatePipelineScore()` for each
4. Writes updated scores back to `recommendations`

This ensures time-based decay penalties are applied even when no events trigger a recalculation.

### Phase 4 — Pipeline Dashboard UI

A new view (on the Revenue/MRR page or a dedicated tab) showing:

- Table of all `status = 'sent'` recommendations
- Columns: Client, Rep, Good/Better/Best prices, Date Sent, Last Communication, Age (days), Confidence Score
- Aggregate totals: Total Weighted MRR, Total Weighted One-time
- Filters: By rep, by predicted tier, by date range
- Color-coded confidence: Green (70–100), Yellow (40–69), Red (0–39)
- Score breakdown tooltip/expandable row

### Phase 5 — Rep Input Forms

- **Call Scoring Form**: 4-factor dropdown/radio inputs after a sales call. Can be a step in recommendation creation or a standalone panel on the recommendation detail page.
- **Communication Log**: Manual entry form for calls/meetings not in HighLevel (channel, direction, notes).
- **HighLevel Auto-sync**: Webhook listener or polling job that syncs messages from HighLevel into `recommendation_communications` with proper direction detection and deduplication via `highlevel_message_id`.

---

## HighLevel Integration

The existing Pyrus Portal already has `clients.highlevel_id` and a `highlevel_oauth` table for authentication. The pipeline scoring system extends this with communication syncing:

- **Webhook or polling**: Receives message events from HighLevel
- **Direction detection**: Maps HighLevel message direction to `inbound` (prospect → team) or `outbound` (team → prospect)
- **Recommendation matching**: Looks up the client's active recommendation via `clients.highlevel_id → recommendations.client_id`
- **Deduplication**: Uses `highlevel_message_id` to prevent duplicate entries
- **Channel mapping**: Maps HighLevel message types to `email`, `sms`, `chat`, `call`, or `other`

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| No separate `sales_rep_id` on recommendations | `created_by` already tracks who created the recommendation — that's the deal owner |
| No roles table (string-based roles) | Only 5 roles that rarely change. A roles table adds complexity without benefit |
| `pipeline_reps` as a view (not a table) | Derived from existing data, always up to date, single place to change if logic evolves |
| Pure scoring function (no DB calls) | Fully testable, deterministic, can be called from any context |
| Raw selections stored (not computed points) | Allows weight changes to retroactively affect all scores without data migration |
| Penalty phases are sequential | Email → proposal → silence mirrors the actual sales funnel. Penalties don't stack for the same unmet milestone |
| Multi-invite uses ANY for removing penalties | If any one invitee opens/views, the penalty is removed — don't punish the deal for one unresponsive invitee |
| Multi-invite uses ALL for bonus | Bonus only when every invitee has engaged — signals organization-wide interest |
| `now` passed as parameter | Enables deterministic testing; no hidden `Date.now()` calls |

---

## TypeScript Interface Summary

### Input Types

```typescript
// Call score factor options
type BudgetClarity = 'clear' | 'vague' | 'none' | 'no_budget';
type Competition = 'none' | 'some' | 'many';
type Engagement = 'high' | 'medium' | 'low';
type PlanFit = 'strong' | 'medium' | 'weak' | 'poor';

// Deal statuses
type DealStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'closed_lost';

// Main scoring input (everything assembled from DB before calling the function)
interface ScoringInput {
  deal: DealData;                    // status, sent_at, predicted pricing
  call_scores: CallScoreInputs | null; // null if no call score form filled
  milestones: InviteMilestones;      // first email open, first account, first view
  invite_stats: InviteStats;         // counts: total, opened, accounts, viewed
  communications: CommunicationData; // last prospect contact, last team contact, followup count
  config: ScoringConfig;             // weights, mappings, penalties, bonuses
  now: string;                       // current timestamp (ISO string)
}
```

### Output Type

```typescript
interface ScoringResult {
  confidence_score: number;      // 0-100
  confidence_percent: number;    // 0-1
  weighted_monthly: number;      // predicted × percent
  weighted_onetime: number;      // predicted × percent
  base_score: number;            // before penalties
  total_penalties: number;       // sum of all penalties
  total_bonus: number;           // sum of all bonuses
  penalty_breakdown: PenaltyBreakdown;
}
```

---

## Test Coverage

The scoring engine has **68 unit tests** covering:

- Utility functions (`daysBetween`, `hoursBetween`)
- Base score calculation across all factor combinations
- Each penalty type independently (email, proposal, silence)
- Silence penalty acceleration mechanics
- Multi-invite bonus logic (single vs. multiple invitees, partial vs. full engagement)
- Full integration scenarios combining multiple penalties and bonuses
- Edge cases: null values, zero invites, status transitions, maximum penalties

All tests pass in ~15ms with no external dependencies.

---

## File Inventory (Phase 1)

```
pipeline-scoring/
├── migration.sql              # 382 lines — Full database migration
├── types.ts                   # 163 lines — All TypeScript interfaces
├── scoring-engine.ts          # 411 lines — Pure scoring function
├── default-config.ts          #  62 lines — Config matching settings seed
└── scoring-engine.test.ts     # 900+ lines — 68 comprehensive tests
```

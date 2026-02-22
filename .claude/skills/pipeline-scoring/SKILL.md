# Pipeline Scoring Skill - Pyrus Portal

This skill documents how the sales pipeline scoring system works in Pyrus Portal, including the confidence score algorithm, penalty calculations, and recalculation triggers.

---

## 1. Overview

The pipeline scoring system calculates a **confidence score** (0-100) for each sales recommendation/deal, representing the likelihood of closing. This score is used to weight pipeline values for forecasting.

### Key Concepts
- **Confidence Score**: 0-100 integer representing close probability
- **Weighted Pipeline**: `predicted_monthly × (confidence_score / 100)`
- **Base Score**: Starting score from rep's call assessment (or default 50)
- **Penalties**: Time-based decay for lack of engagement
- **Bonuses**: Additional points for multi-invite engagement

### Formula
```
final_score = clamp(base_score - penalties + bonus, 0, 100)
```

---

## 2. Lead Tiers (Deal Status)

| Status | Behavior | Score |
|--------|----------|-------|
| `draft` | No penalties, base score only | 0-100 (no decay) |
| `sent` | Active pipeline, penalties apply | 0-100 (decays) |
| `declined` | Still in pipeline, penalties apply | 0-100 (decays) |
| `accepted` | Converted to customer | Fixed at 100 |
| `closed_lost` | Lost deal | Fixed at 0 |

Only `sent` and `declined` deals are considered "active pipeline" for recalculation.

---

## 3. Scoring Factors (Base Score)

The base score comes from rep-entered call assessment. If no call scores exist, uses `default_base_score` (50).

### Call Score Weights
| Factor | Weight | Description |
|--------|--------|-------------|
| `budget_clarity` | 25 | How clear is their budget? |
| `competition` | 20 | Are they talking to competitors? |
| `engagement` | 25 | How engaged are they in the process? |
| `plan_fit` | 30 | How well do our services fit their needs? |

**Total possible: 100 points**

### Factor Values and Multipliers

**Budget Clarity**
| Value | Multiplier | Points |
|-------|------------|--------|
| `clear` | 1.0 | 25 |
| `vague` | 0.5 | 12.5 |
| `none` | 0.2 | 5 |
| `no_budget` | 0 | 0 |

**Competition**
| Value | Multiplier | Points |
|-------|------------|--------|
| `none` | 1.0 | 20 |
| `some` | 0.5 | 10 |
| `many` | 0.15 | 3 |

**Engagement**
| Value | Multiplier | Points |
|-------|------------|--------|
| `high` | 1.0 | 25 |
| `medium` | 0.70 | 17.5 |
| `low` | 0.15 | 3.75 |

**Plan Fit**
| Value | Multiplier | Points |
|-------|------------|--------|
| `strong` | 1.0 | 30 |
| `medium` | 0.65 | 19.5 |
| `weak` | 0.25 | 7.5 |
| `poor` | 0 | 0 |

### Example Base Score Calculation
```
Budget: clear (1.0 × 25) = 25
Competition: some (0.5 × 20) = 10
Engagement: high (1.0 × 25) = 25
Plan Fit: medium (0.65 × 30) = 19.5

Base Score = 25 + 10 + 25 + 19.5 = 79.5 → 80
```

---

## 4. 60-Day Decay Window (Penalties)

Three time-based penalties erode the score after grace periods. With current settings, a deal with no engagement reaches ~0 after approximately 60 days.

### Email Not Opened Penalty
| Setting | Value |
|---------|-------|
| Grace Period | 48 hours |
| Daily Penalty | 0.5 points |
| Max Penalty | 25 points |
| Time to Max | 50 days |

**Logic**: Starts from `sent_at`. Stops entirely if any invitee opens the email (`first_email_opened_at` is set).

### Proposal Not Viewed Penalty
| Setting | Value |
|---------|-------|
| Grace Period | 120 hours (5 days) |
| Daily Penalty | 0.5 points |
| Max Penalty | 20 points |
| Time to Max | 40 days |

**Logic**: Only starts AFTER email is opened or account is created. Anchor point is whichever happened first (`first_email_opened_at` or `first_account_created_at`). Stops if proposal is viewed (`first_proposal_viewed_at`).

### Silence Penalty
| Setting | Value |
|---------|-------|
| Grace Period | 10 days |
| Daily Penalty | 1.2 points |
| Max Penalty | 60 points |
| Time to Max | 50 days |
| Followup Acceleration | 3+ followups = 1.5× penalty |

**Logic**: Anchor is `last_prospect_contact_at` (their last inbound communication) or `sent_at` if they've never replied. Accelerates if team has sent 3+ unanswered follow-ups.

### Penalty Calculation Example
```
Day 0: Proposal sent, base score = 80
Day 3: Email not opened penalty starts (48hr grace passed)
Day 3-10: Accumulating 0.5/day email penalty
Day 10: Silence penalty starts (10 day grace)
Day 15: Email penalty = 6 pts, Silence penalty = 6 pts
        Score = 80 - 12 = 68
Day 30: Email penalty = 14 pts, Silence penalty = 24 pts
        Score = 80 - 38 = 42
Day 60: Email penalty = 25 pts (max), Silence penalty = 60 pts (max)
        Score = 80 - 85 = 0 (clamped)
```

---

## 5. Confidence Score Calculation

The scoring engine is a pure function with no side effects.

### Flow
1. Check status: `closed_lost` → return 0, `accepted` → return 100
2. `draft` status: base score only, no penalties
3. `sent`/`declined`: compute base, penalties, and bonus
4. Apply snooze/revival adjustments if applicable
5. Clamp final score to 0-100

### Snooze and Revival
- **Snoozed**: If `snoozed_until` is in the future, penalties are frozen at 0
- **Snooze expired**: Penalties restart from `snoozed_until` date
- **Revived**: If `revived_at > sent_at`, penalties start fresh from revival date

### Multi-Invite Bonus
When multiple people are invited:
- All opened email: +3 points
- All viewed proposal: +5 points

Only applies when `total_invites > 1`.

---

## 6. Tier Predictions

Reps predict which pricing tier the prospect will choose. This sets the `predicted_monthly` and `predicted_onetime` values.

| Column | Purpose |
|--------|---------|
| `predicted_tier` | 'good', 'better', or 'best' |
| `predicted_monthly` | Cached monthly price for predicted tier |
| `predicted_onetime` | Cached one-time price for predicted tier |
| `weighted_monthly` | `predicted_monthly × confidence_percent` |
| `weighted_onetime` | `predicted_onetime × confidence_percent` |

### Weighted Pipeline Calculation
```typescript
const weighted_monthly = predicted_monthly * (confidence_score / 100)
const weighted_onetime = predicted_onetime * (confidence_score / 100)
```

Example: $500/mo deal at 60% confidence = $300 weighted monthly value

---

## 7. Database Tables

### Main Tables

**recommendations** (extended)
| Column | Type | Description |
|--------|------|-------------|
| `confidence_score` | integer | 0-100 score |
| `confidence_percent` | numeric | 0-1 derived |
| `weighted_monthly` | numeric | Weighted pipeline value |
| `weighted_onetime` | numeric | Weighted one-time value |
| `base_score` | integer | Score before penalties |
| `total_penalties` | numeric | Sum of all penalties |
| `total_bonus` | integer | Multi-invite bonus |
| `penalty_email_not_opened` | numeric | Email penalty amount |
| `penalty_proposal_not_viewed` | numeric | Proposal penalty amount |
| `penalty_silence` | numeric | Silence penalty amount |
| `last_scored_at` | timestamptz | When score was computed |
| `predicted_tier` | text | 'good', 'better', 'best' |
| `predicted_monthly` | numeric | Predicted tier price |
| `snoozed_until` | timestamptz | Freeze penalties until |
| `revived_at` | timestamptz | Fresh start date |

**recommendation_call_scores**
| Column | Type | Values |
|--------|------|--------|
| `budget_clarity` | text | clear, vague, none, no_budget |
| `competition` | text | none, some, many |
| `engagement` | text | high, medium, low |
| `plan_fit` | text | strong, medium, weak, poor |

**recommendation_invites** (extended)
| Column | Type | Description |
|--------|------|-------------|
| `email_opened_at` | timestamptz | When email was opened |
| `account_created_at` | timestamptz | When account was created |
| `viewed_at` | timestamptz | When proposal was viewed |

**recommendation_communications**
| Column | Type | Description |
|--------|------|-------------|
| `direction` | text | 'inbound' or 'outbound' |
| `channel` | text | email, sms, chat, call, other |
| `contact_at` | timestamptz | When communication happened |
| `source` | text | highlevel_webhook, manual, system |

### History & Audit Tables

**pipeline_score_history**
| Column | Type | Description |
|--------|------|-------------|
| `recommendation_id` | uuid | Link to recommendation |
| `confidence_score` | integer | Score at this point |
| `trigger_source` | text | What caused recalculation |
| `breakdown` | jsonb | Full ScoringResult object |
| `scored_at` | timestamptz | When scored |

**pipeline_score_events** (trigger queue)
| Column | Type | Description |
|--------|------|-------------|
| `recommendation_id` | uuid | Link to recommendation |
| `event_type` | text | What happened |
| `processed_at` | timestamptz | When cron processed it |

**pipeline_scoring_runs** (audit log)
| Column | Type | Description |
|--------|------|-------------|
| `run_type` | text | daily_cron, event_queue, manual |
| `processed` | integer | Total deals processed |
| `succeeded` | integer | Successful recalculations |
| `failed` | integer | Failed recalculations |

---

## 8. Code Locations

### Core Scoring Files
| File | Purpose |
|------|---------|
| `src/lib/pipeline/scoring-engine.ts` | Pure scoring function |
| `src/lib/pipeline/types.ts` | Type definitions |
| `src/lib/pipeline/default-config.ts` | Default scoring configuration |
| `src/lib/pipeline/assemble-scoring-input.ts` | Gathers data from database |
| `src/lib/pipeline/recalculate-score.ts` | Orchestrates recalculation |
| `src/lib/pipeline/write-score.ts` | Writes results to database |
| `src/lib/pipeline/batch-recalculate.ts` | Batch processing for cron |

### API Routes
| File | Purpose |
|------|---------|
| `src/app/api/cron/pipeline-scores/route.ts` | Daily cron job (6 AM UTC) |

### Database Migrations
| File | Purpose |
|------|---------|
| `supabase/migrations/20260204143743_pipeline_scoring.sql` | Core tables and config |
| `supabase/migrations/20260204150000_pipeline_scoring_triggers.sql` | Database triggers |
| `supabase/migrations/20260204180000_pipeline_score_history.sql` | History table |
| `supabase/migrations/20260204210000_pipeline_snooze.sql` | Snooze feature |
| `supabase/migrations/20260204220000_pipeline_archiving.sql` | Archive feature |

### Key Functions

**computePipelineScore(input: ScoringInput): ScoringResult**
- Pure function, no database calls
- Takes assembled data, returns score breakdown

**recalculateScore(recommendationId, triggerSource)**
- Main entry point for recalculation
- Handles errors gracefully (returns null on failure)

**runDailyBatchRecalculation()**
- Called by cron job
- Processes event queue, then stale scores

---

## 9. Common Scenarios

### Scenario 1: New Proposal Sent
1. Rep creates recommendation, enters call scores
2. Base score calculated: e.g., 75
3. Status changed to `sent`
4. Score = 75 (no penalties yet)
5. Daily cron will start applying penalties after grace periods

### Scenario 2: Prospect Opens Email
1. Tracking pixel fires, `email_opened_at` set
2. Trigger queues recalculation event
3. Next cron run: `email_not_opened` penalty → 0
4. `proposal_not_viewed` penalty grace period starts

### Scenario 3: Deal Goes Cold
Day 0: Sent, score = 80
Day 15: No engagement
- Email penalty: 6.5 pts
- Silence penalty: 6 pts
- Score: 80 - 12.5 = 67.5 → 68

Day 30: Still no response
- Email penalty: 14 pts
- Silence penalty: 24 pts
- Score: 80 - 38 = 42

Day 60: Max penalties hit
- Email penalty: 25 pts (max)
- Silence penalty: 60 pts (max)
- Score: 0

### Scenario 4: Snoozing a Deal
1. Admin snoozes deal until next quarter
2. `snoozed_until` set to future date
3. Penalties freeze at current values
4. When `snoozed_until` passes:
   - Penalties recalculate from snooze expiry date
   - "Fresh start" for time-based decay

### Scenario 5: Prospect Replies
1. Communication logged with `direction: 'inbound'`
2. Silence penalty anchor resets to now
3. Next recalculation: silence penalty → 0
4. Grace period restarts

---

## 10. Gotchas and Important Notes

### Recalculation Timing
- Daily cron runs at **6 AM UTC** (midnight CST)
- Scores may be up to 24 hours stale between cron runs
- Event triggers queue recalculations for next cron run
- Manual triggers via API also supported

### Terminal Status Handling
- `accepted` deals: score fixed at 100, not recalculated
- `closed_lost` deals: score fixed at 0, not recalculated
- Only `sent` and `declined` are active pipeline

### Config Changes
- Config stored in `settings` table, key: `pipeline_scoring_config`
- Falls back to `default-config.ts` if not in database
- After config change, run `recalculateAllActiveDeals()` to apply

### History Tracking
- Every recalculation writes to `pipeline_score_history`
- Full breakdown stored as JSONB for audit
- `trigger_source` tracks what caused the recalc:
  - `invite_sent`, `call_score_updated`, `status_changed`
  - `email_opened`, `proposal_viewed`, `account_created`
  - `communication_logged`, `daily_cron`, `manual_refresh`

### Penalty Independence
- Email and proposal penalties are independent
- Email penalty can max out while proposal penalty is still accumulating
- Silence penalty accelerates with unanswered follow-ups

### Scoring is Non-Blocking
- `recalculateScore()` catches all errors and returns null
- Primary operations (invite send, status change) never fail due to scoring
- Failures logged but don't propagate

### Multi-Invite Edge Cases
- Bonus only applies when `total_invites > 1`
- "All opened" requires every invitee to open, not just one
- Bonus is additive, can partially offset penalties

### Database Triggers
Automatic event queuing on:
- `recommendation_invites`: INSERT, UPDATE (tracking columns)
- `recommendation_call_scores`: INSERT, UPDATE, DELETE
- `recommendation_communications`: INSERT
- `recommendations`: UPDATE (status changes)

### Running Manual Recalculation
```bash
# From project root
npx tsx src/lib/pipeline/batch-recalculate.ts

# Or trigger via API (with auth)
curl -X POST https://app.example.com/api/cron/pipeline-scores \
  -H "Authorization: Bearer $CRON_SECRET"
```

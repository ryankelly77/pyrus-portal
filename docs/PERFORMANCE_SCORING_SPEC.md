# Pyrus Portal: Client Performance Scoring System

## Overview

The Performance Scoring System provides internal visibility into client health and success metrics. It enables the Pyrus team to:

- Identify underperforming accounts before churn
- Recognize high-performing accounts for case studies and upsells
- Prioritize team attention based on data, not gut feeling
- Track client progress through their growth journey

---

## Core Concepts

### Performance Score (0-100)

A weighted composite score measuring how well a client is performing based on:

- Metric improvements (keywords, traffic, leads, AI visibility, conversions)
- Result alerts sent (positive news delivered to client)
- Account velocity (improvements relative to tenure)

### Growth Stage

A lifecycle classification based on account tenure:

| Stage | Icon | Tenure | Description |
|-------|------|--------|-------------|
| Seedling | 🌱 | 0-90 days | Ramp-up period, foundation building |
| Sprouting | 🌿 | 90 days - 6 months | Early results appearing |
| Blooming | 🌸 | 6-12 months | Multi-metric growth expected |
| Harvesting | 🌾 | 12-24+ months | Mature, stable, expansion-ready |

### Stage-Adjusted Evaluation

Combines Performance Score with Growth Stage to determine if a client is on track:

```
                        PERFORMANCE SCORE
                    0-39    40-59    60-79    80-100
                  ┌────────┬────────┬────────┬────────┐
     🌾 Harvesting│ CHURN  │ DECLINE│ STABLE │ IDEAL  │
        12-24mo   │ RISK   │        │        │        │
                  ├────────┼────────┼────────┼────────┤
GROWTH  🌸 Blooming│ PROBLEM│ BEHIND │ ON     │ STAR   │
STAGE      6-12mo │        │        │ TRACK  │        │
                  ├────────┼────────┼────────┼────────┤
      🌿 Sprouting│ SLOW   │ NORMAL │ AHEAD  │ FAST   │
        90d-6mo   │ START  │        │        │ START  │
                  ├────────┼────────┼────────┼────────┤
       🌱 Seedling│ EARLY  │ NORMAL │ STRONG │ EXCEP- │
          0-90d   │        │        │ START  │ TIONAL │
                  └────────┴────────┴────────┴────────┘
```

---

## Data Requirements

### New Database Tables

#### `metric_snapshots`

Stores point-in-time metric values for trend analysis.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | FK to clients |
| metric_type | enum | visitors, keyword_avg_position, leads, ai_visibility, conversions |
| value | decimal | The metric value |
| period_start | date | Start of measurement period |
| period_end | date | End of measurement period |
| created_at | timestamp | Record creation time |

#### `keyword_rankings`

Historical keyword position tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | FK to clients |
| keyword | varchar | The tracked keyword |
| position | integer | Current ranking position |
| search_engine | enum | google, bing, chatgpt, perplexity, gemini, copilot |
| recorded_at | timestamp | When this position was recorded |
| created_at | timestamp | Record creation time |

#### `leads`

Individual lead records with source attribution.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | FK to clients |
| source | enum | organic, paid, referral, direct, social |
| lead_score | integer | Optional quality score (1-100) |
| converted | boolean | Whether lead became customer |
| created_at | timestamp | When lead was captured |

#### `ai_visibility_scores`

AI platform visibility tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | FK to clients |
| platform | enum | chatgpt, perplexity, gemini, copilot, claude |
| query | varchar | The search query tested |
| visibility_score | integer | Score 0-100 |
| mentioned | boolean | Whether client was mentioned |
| position | integer | Position in AI response (if listed) |
| recorded_at | timestamp | When test was performed |

#### `client_alerts`

Performance alerts published to clients.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | FK to clients |
| message | text | Alert message content |
| alert_type | enum | performance_focus, general_update, milestone, intervention |
| status | enum | draft, published, dismissed |
| published_at | timestamp | When alert was published |
| dismissed_at | timestamp | When client dismissed alert |
| created_by | uuid | FK to admin user who created |
| created_at | timestamp | Record creation time |

### Existing Tables (Modifications)

#### `clients` (add columns)

| Column | Type | Description |
|--------|------|-------------|
| growth_stage | enum | seedling, sprouting, blooming, harvesting |
| stage_updated_at | timestamp | Last stage transition |
| performance_score | integer | Cached current score (0-100) |
| score_updated_at | timestamp | Last score calculation |

#### `client_communications` (existing - used for Result Alerts)

Already contains result alerts with types:
- keyword_ranking
- traffic_milestone
- lead_increase
- campaign_milestone
- other_update
- ai_alert

---

## Algorithm Specification

### Step 1: Calculate Metric Deltas

For each metric, compare current billing period to previous billing period:

```
current_period = last 30 days (aligned to billing cycle)
previous_period = 30 days before current_period

delta_percent = ((current_value - previous_value) / previous_value) * 100
```

**Special cases:**

| Scenario | Handling |
|----------|----------|
| Previous value = 0 | Use absolute thresholds instead of percent |
| No previous data | Score as 50 (neutral) |
| Keywords (lower is better) | Invert: `((previous - current) / previous) * 100` |

### Step 2: Convert Deltas to Points (0-100)

```javascript
function deltaToPoints(delta) {
  // Base formula: 50 = no change, +1% = +1 point
  let points = 50 + delta;
  
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, points));
}
```

| Delta Range | Points | Interpretation |
|-------------|--------|----------------|
| < -30% | 0-20 | Significant decline |
| -30% to -15% | 20-35 | Moderate decline |
| -15% to -5% | 35-45 | Slight decline |
| -5% to +5% | 45-55 | Stable |
| +5% to +15% | 55-65 | Slight growth |
| +15% to +30% | 65-80 | Good growth |
| > +30% | 80-100 | Exceptional growth |

### Step 3: Calculate Result Alerts Score

Result alerts represent positive news delivered to the client. More alerts = more wins to report.

**Alert type weights:**

| Alert Type | Points |
|------------|--------|
| lead_increase | 15 |
| ai_alert | 12.5 |
| keyword_ranking | 10 |
| traffic_milestone | 10 |
| campaign_milestone | 7.5 |
| other_update | 5 |

**Calculation:**

```javascript
function calculateAlertsScore(alerts) {
  let totalPoints = alerts.reduce((sum, alert) => {
    return sum + ALERT_WEIGHTS[alert.type];
  }, 0);
  
  // 50 points of alerts = score of 100
  return Math.min(100, totalPoints * 2);
}
```

| Alerts Sent | Approx Score |
|-------------|--------------|
| 0 alerts | 0 |
| 1-2 alerts | 20-40 |
| 3-4 alerts | 50-70 |
| 5+ meaningful alerts | 80-100 |

### Step 4: Apply Plan-Based Weights

Different service plans prioritize different metrics:

| Metric | SEO | Paid Media | AI Optimization | Full Service |
|--------|-----|------------|-----------------|--------------|
| Keyword Rankings | 30% | 10% | 10% | 20% |
| Website Visitors | 20% | 15% | 15% | 15% |
| Leads | 15% | 40% | 15% | 20% |
| AI Visibility | 5% | 5% | 35% | 15% |
| Conversions | 10% | 15% | 10% | 15% |
| Result Alerts | 20% | 15% | 15% | 15% |
| **Total** | 100% | 100% | 100% | 100% |

**If a metric is not tracked for a client:**

Redistribute that weight proportionally among remaining metrics.

```javascript
function redistributeWeights(weights, excludedMetrics) {
  const activeMetrics = Object.keys(weights).filter(m => !excludedMetrics.includes(m));
  const excludedWeight = excludedMetrics.reduce((sum, m) => sum + weights[m], 0);
  const redistributeRatio = 1 + (excludedWeight / (100 - excludedWeight));
  
  return activeMetrics.reduce((newWeights, metric) => {
    newWeights[metric] = weights[metric] * redistributeRatio;
    return newWeights;
  }, {});
}
```

### Step 5: Calculate Base Score

```javascript
function calculateBaseScore(metricScores, weights) {
  return Object.keys(weights).reduce((total, metric) => {
    return total + (metricScores[metric] * weights[metric] / 100);
  }, 0);
}
```

### Step 6: Apply Velocity Modifier

Velocity measures improvements relative to account tenure.

**Calculate velocity:**

```javascript
function calculateVelocity(client, improvements) {
  const monthsActive = getMonthsActive(client.created_at);
  const velocity = improvements / monthsActive;
  return velocity;
}
```

**Expected velocity by plan:**

| Plan | Expected Monthly Improvements |
|------|------------------------------|
| SEO | 3 keyword improvements |
| Paid Media | 2 lead increases |
| AI Optimization | 1 visibility improvement |
| Full Service | 4 combined improvements |

**Velocity modifier:**

```javascript
function getVelocityModifier(client, velocity) {
  const expected = EXPECTED_VELOCITY[client.plan_type];
  const ratio = velocity / expected;
  
  // During ramp period, no penalty
  if (isInRampPeriod(client)) {
    return 1.0;
  }
  
  if (ratio >= 1.5) return 1.15;      // 15% bonus - exceeding expectations
  if (ratio >= 1.0) return 1.0;       // On track
  if (ratio >= 0.5) return 0.85;      // 15% penalty - below expectations
  return 0.70;                         // 30% penalty - stagnant account
}
```

**Ramp periods:**

| Plan | Ramp Period |
|------|-------------|
| SEO | 90 days |
| Paid Media | 30 days |
| AI Optimization | 60 days |
| Full Service | 90 days |

### Step 7: Calculate Final Score

```javascript
function calculateFinalScore(baseScore, velocityModifier) {
  const finalScore = baseScore * velocityModifier;
  return Math.max(0, Math.min(100, Math.round(finalScore)));
}
```

---

## Growth Stage Definitions

### 🌱 Seedling (0-90 days)

**Characteristics:**
- Account just launched
- Baseline metrics being established
- Focus on setup and foundation

**Scoring adjustments:**
- Metric declines: No penalty (baseline still forming)
- Result alerts: Weighted higher (shows engagement)
- Any positive movement: Bonus points

**Expected score range:** 40-60

**Evaluation labels:**

| Score | Label |
|-------|-------|
| 80-100 | Exceptional Start |
| 60-79 | Strong Start |
| 40-59 | Normal Ramp |
| 20-39 | Slow Start |
| 0-19 | Stalled Launch |

### 🌿 Sprouting (90 days - 6 months)

**Characteristics:**
- Past initial ramp
- Should see early wins in primary metric
- SEO: keyword improvements appearing
- Paid: leads flowing

**Scoring adjustments:**
- Full velocity modifier applies
- Primary metric weighted slightly higher
- Stagnation begins to penalize

**Expected score range:** 50-70

**Evaluation labels:**

| Score | Label |
|-------|-------|
| 80-100 | Fast Tracker |
| 60-79 | Ahead of Schedule |
| 40-59 | Normal Growth |
| 20-39 | Behind Schedule |
| 0-19 | Failing |

### 🌸 Blooming (6-12 months)

**Characteristics:**
- Should see multi-metric growth
- Traffic, keywords, and leads all moving
- Relationship established

**Scoring adjustments:**
- All metrics weighted normally
- Movement expected everywhere
- Stagnation = significant penalty

**Expected score range:** 60-80

**Evaluation labels:**

| Score | Label |
|-------|-------|
| 80-100 | Star Client |
| 60-79 | On Track |
| 40-59 | Needs Attention |
| 20-39 | At Risk |
| 0-19 | Critical |

### 🌾 Harvesting (12-24+ months)

**Characteristics:**
- Mature account
- Stability is acceptable (not just growth)
- Upsell and expansion opportunities
- Premium service candidates

**Scoring adjustments:**
- Stability (no decline) scores well
- Service expansion weighted
- Upsell readiness flagged

**Expected score range:** 70-90

**Evaluation labels:**

| Score | Label |
|-------|-------|
| 80-100 | Ideal / Premium Candidate |
| 60-79 | Stable |
| 40-59 | Declining |
| 20-39 | Churn Risk |
| 0-19 | Likely Lost |

---

## Status Labels & Colors

### Score-Based Status

| Score | Status | Color | Hex |
|-------|--------|-------|-----|
| 80-100 | Thriving | Dark Green | #16a34a |
| 60-79 | Healthy | Light Green | #22c55e |
| 40-59 | Needs Attention | Yellow | #eab308 |
| 20-39 | At Risk | Orange | #f97316 |
| 0-19 | Critical | Red | #dc2626 |

### Stage-Adjusted Flags

| Condition | Flag | Action |
|-----------|------|--------|
| Harvesting + Score < 40 | 🚨 Churn Risk | Immediate intervention |
| Blooming + Score < 40 | ⚠️ Problem Account | Strategy review |
| Sprouting + Score > 80 | 🚀 Fast Tracker | Upsell candidate |
| Harvesting + Score > 80 | ⭐ Premium Candidate | Offer premium services |
| Any stage + Score < 20 | 🔴 Critical | All hands on deck |

---

## Client Alert System

### Alert Types

| Type | Use Case |
|------|----------|
| performance_focus | Team is actively working to improve account |
| general_update | Informational message |
| milestone | Celebrating an achievement |
| intervention | Serious attention needed (internal trigger) |

### Alert Workflow

1. **Admin creates alert** from Performance Dashboard
2. **Alert saved as draft** (optional preview)
3. **Admin publishes alert**
4. **Client sees alert on next login** (banner at top of portal)
5. **Alert logged to activity stream**
6. **Client dismisses alert** (or it auto-dismisses after X days)

### Alert Templates

**Performance Focus (At Risk accounts):**
```
Our team is actively focused on improving your account performance. 
We're implementing new strategies and you should see improvements soon. 
Questions? Chat with us anytime.
```

**Milestone (High performers):**
```
Congratulations! Your [metric] has [achievement]. 
This puts you in the top [X]% of accounts at this stage. 
Keep up the great work!
```

**Intervention (Critical accounts):**
```
We've identified some areas where your account needs attention. 
Our team is prioritizing your account this week. 
We'll have an update for you soon.
```

---

## API Endpoints

### `GET /api/admin/performance`

Returns performance dashboard data.

**Query params:**
- `stage` (optional): Filter by growth stage
- `status` (optional): Filter by status (critical, at_risk, etc.)
- `sort` (optional): score_asc, score_desc, name, stage

**Response:**
```json
{
  "summary": {
    "total_clients": 18,
    "average_score": 62,
    "by_stage": {
      "seedling": { "count": 4, "avg_score": 52 },
      "sprouting": { "count": 3, "avg_score": 61 },
      "blooming": { "count": 6, "avg_score": 58 },
      "harvesting": { "count": 5, "avg_score": 71 }
    },
    "needs_attention": 4,
    "upsell_ready": 2
  },
  "clients": [
    {
      "id": "uuid",
      "name": "ABC Corp",
      "score": 21,
      "growth_stage": "harvesting",
      "status": "churn_risk",
      "plan_type": "seo",
      "mrr": 1500,
      "tenure_months": 18,
      "metrics": {
        "keywords": { "score": 30, "delta": -22 },
        "visitors": { "score": 28, "delta": -31 },
        "leads": { "score": 50, "delta": 0 },
        "ai_visibility": { "score": 60, "delta": 12 },
        "alerts": { "score": 0, "count": 0 }
      },
      "velocity_modifier": 0.70,
      "last_alert_at": "2024-12-15T00:00:00Z",
      "flags": ["churn_risk", "no_recent_alerts"]
    }
  ]
}
```

### `GET /api/admin/performance/[clientId]`

Returns detailed performance data for a single client.

**Response:**
```json
{
  "client": {
    "id": "uuid",
    "name": "ABC Corp",
    "score": 21,
    "growth_stage": "harvesting",
    "status": "churn_risk",
    "plan_type": "seo",
    "mrr": 1500,
    "tenure_months": 18,
    "created_at": "2023-07-15T00:00:00Z"
  },
  "current_period": {
    "start": "2025-01-01",
    "end": "2025-01-30"
  },
  "metrics": {
    "keywords": {
      "current": 12.5,
      "previous": 9.8,
      "delta": -22,
      "score": 30,
      "weight": 30,
      "contribution": 9.0
    },
    "visitors": {
      "current": 1850,
      "previous": 2680,
      "delta": -31,
      "score": 28,
      "weight": 20,
      "contribution": 5.6
    }
    // ... other metrics
  },
  "velocity": {
    "improvements_total": 5,
    "months_active": 18,
    "velocity": 0.28,
    "expected": 3.0,
    "ratio": 0.09,
    "modifier": 0.70
  },
  "calculation": {
    "base_score": 29.7,
    "velocity_modifier": 0.70,
    "final_score": 21
  },
  "alerts_history": [
    {
      "id": "uuid",
      "type": "keyword_ranking",
      "sent_at": "2024-10-15T00:00:00Z"
    }
  ],
  "red_flags": [
    "No result alerts sent in 45 days",
    "8 keywords dropped out of top 20",
    "Traffic down 3 consecutive months"
  ],
  "recommendations": [
    "Send a result alert to re-engage",
    "Review keyword strategy",
    "Consider publishing intervention alert"
  ]
}
```

### `POST /api/admin/performance/alerts`

Create a client alert.

**Request:**
```json
{
  "client_id": "uuid",
  "message": "Our team is actively focused on improving...",
  "alert_type": "performance_focus",
  "publish": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "published",
  "published_at": "2025-01-29T15:30:00Z"
}
```

### `POST /api/admin/performance/alerts/[alertId]/dismiss`

Admin dismisses an alert (removes from client view).

### `GET /api/client/alerts`

Client-facing endpoint to get active alerts.

**Response:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "message": "Our team is actively focused on...",
      "alert_type": "performance_focus",
      "published_at": "2025-01-29T15:30:00Z"
    }
  ]
}
```

### `POST /api/client/alerts/[alertId]/dismiss`

Client dismisses an alert.

---

## UI Specifications

### Navigation

Add under Revenue/MRR menu:
```
Revenue/MRR
├── Overview
├── MRR Tracking
└── Performance    ← NEW
```

### Performance Dashboard Page

**Route:** `/admin/performance`

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Performance Dashboard                                    [Jan 2026 ▼]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ SUMMARY CARDS                                                           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │    18    │ │    4     │ │    8     │ │    4     │ │   62.3   │       │
│ │ Clients  │ │ Critical │ │ Healthy  │ │ Thriving │ │ Avg Score│       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                                         │
│ BY GROWTH STAGE                                                         │
│ ┌───────────────┬───────────────┬───────────────┬───────────────┐      │
│ │ 🌱 Seedling   │ 🌿 Sprouting  │ 🌸 Blooming   │ 🌾 Harvesting │      │
│ │    4 clients  │    3 clients  │    6 clients  │    5 clients  │      │
│ │    Avg: 52    │    Avg: 61    │    Avg: 58    │    Avg: 71    │      │
│ │ ░░░░░░░░░░░░  │ ░░░░░░░░░░░░  │ ░░░░░░░░░░░░  │ ░░░░░░░░░░░░  │      │
│ │ 1 slow start  │ 0 behind      │ 2 need attn   │ 1 declining   │      │
│ └───────────────┴───────────────┴───────────────┴───────────────┘      │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ FILTERS & SORT                                                          │
│ [All Stages ▼] [All Status ▼] [All Plans ▼]    Sort: [Score ▼]         │
│ [☐ Show Critical Only]                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ CLIENT LIST                                                             │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🔴 21   ABC Corp          🌾 Harvesting   SEO          Churn Risk  │ │
│ │         18 months │ $1,500 MRR           Last alert: 45 days ago   │ │
│ │         ↓ Keywords  ↓ Traffic  → Leads   [View] [Alert]            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🟠 38   XYZ Inc           🌸 Blooming    Paid Media    Behind      │ │
│ │         8 months │ $2,200 MRR            Last alert: 12 days ago   │ │
│ │         → Keywords  ↓ Traffic  ↓ Leads   [View] [Alert]            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🟢 88   Best Company      🌾 Harvesting  AI + SEO     Premium ⭐   │ │
│ │         14 months │ $3,500 MRR           Last alert: 1 day ago     │ │
│ │         ↑ Keywords  ↑ Traffic  ↑ Leads   [View] [Alert]            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Load More]                                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Client Detail Modal/Panel

**Triggered by:** Click [View] on client row

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ABC Corp                                                          [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────┐                                                     │
│ │       21        │  🌾 Harvesting (18 months)                         │
│ │    ─────────    │  Plan: SEO │ MRR: $1,500                           │
│ │   CHURN RISK    │                                                     │
│ └─────────────────┘                                                     │
│                                                                         │
│ For a Harvesting client, we expect scores of 70-90.                    │
│ This client is 49 points below expectation.                            │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ METRIC BREAKDOWN                              30-DAY TREND              │
│                                                                         │
│ Keywords     ████████░░░░░░░░░░░░  30   -22%     ──────╲___            │
│ Visitors     ██████░░░░░░░░░░░░░░  28   -31%            ╲__╲           │
│ Leads        ██████████░░░░░░░░░░  50    0%      ────────────          │
│ AI Visibility████████████░░░░░░░░  60   +12%     ___──────             │
│ Conversions  █████████░░░░░░░░░░░  45   -5%      ─────╲──              │
│ Alerts Sent  ░░░░░░░░░░░░░░░░░░░░   0    0       (none)                │
│                                                                         │
│ Velocity: 0.28/mo (expected: 3.0) → 0.70x modifier                     │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ ⚠️  RED FLAGS                                                           │
│                                                                         │
│ • No result alerts sent in 45 days                                     │
│ • 8 keywords dropped out of top 20                                     │
│ • Traffic down 3 consecutive months                                    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ 📢 PUBLISH CLIENT ALERT                                                 │
│                                                                         │
│ Template: [Performance Focus ▼]                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Our team is actively focused on improving your account              │ │
│ │ performance. We're implementing new strategies and you should       │ │
│ │ see improvements soon. Questions? Chat with us anytime.             │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Preview]  [Publish Alert]                                              │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ ALERT HISTORY                                                           │
│                                                                         │
│ Oct 15, 2024 │ Keyword improvement │ "Your keyword 'digital mar..."    │
│ Aug 3, 2024  │ Traffic milestone   │ "Congratulations on reaching..."  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Client Portal Alert Banner

**Shows when:** Client has active (published, not dismissed) alert

**Location:** Top of client portal, below header

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📢 Message from your Pyrus team                              [Dismiss] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Our team is actively focused on improving your account performance.    │
│ We're implementing new strategies and you should see improvements      │
│ soon. Questions? Chat with us anytime.                                 │
│                                                                         │
│ - The Pyrus Digital Team                         Posted: Jan 29, 2026  │
│                                                                         │
│ [Start Chat]  [View My Results]                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Data Infrastructure

**Estimated effort:** 1-2 days

1. Create database migrations for new tables:
   - metric_snapshots
   - keyword_rankings
   - leads
   - ai_visibility_scores
   - client_alerts

2. Add columns to clients table:
   - growth_stage
   - stage_updated_at
   - performance_score
   - score_updated_at

3. Create Prisma schema updates

4. Run migrations

### Phase 2: Scoring Algorithm

**Estimated effort:** 2-3 days

1. Create scoring library:
   - `src/lib/performance/calculateScore.ts`
   - `src/lib/performance/weights.ts`
   - `src/lib/performance/velocity.ts`
   - `src/lib/performance/stages.ts`

2. Create Zod validation schemas:
   - `src/lib/validation/performanceSchemas.ts`

3. Write unit tests:
   - `src/__tests__/performance/calculateScore.test.ts`
   - `src/__tests__/performance/velocity.test.ts`

4. Create API endpoints:
   - `GET /api/admin/performance`
   - `GET /api/admin/performance/[clientId]`

### Phase 3: Alert System

**Estimated effort:** 1-2 days

1. Create alert API endpoints:
   - `POST /api/admin/performance/alerts`
   - `GET /api/admin/performance/alerts/[alertId]`
   - `POST /api/admin/performance/alerts/[alertId]/dismiss`
   - `GET /api/client/alerts`
   - `POST /api/client/alerts/[alertId]/dismiss`

2. Create alert templates

3. Write tests for alert CRUD

### Phase 4: Admin UI

**Estimated effort:** 3-4 days

1. Add Performance nav item

2. Create Performance Dashboard page:
   - Summary cards component
   - Growth stage breakdown component
   - Client list component
   - Filter/sort controls

3. Create Client Detail panel:
   - Score display component
   - Metric breakdown component
   - Trend charts (simple)
   - Red flags component
   - Alert composer component

4. Style with existing design system

### Phase 5: Client Portal UI

**Estimated effort:** 1 day

1. Create alert banner component

2. Add to client portal layout

3. Implement dismiss functionality

4. Log to activity stream

### Phase 6: Data Population

**Estimated effort:** Ongoing

1. Manual data entry (initial)

2. Future: Integrations with:
   - Google Analytics
   - SEMrush / Ahrefs
   - Agency Dashboard
   - AI visibility tools

---

## Testing Requirements

### Unit Tests

- [ ] `calculateScore()` returns correct score for various inputs
- [ ] `deltaToPoints()` handles edge cases (zero, negative, large values)
- [ ] `getVelocityModifier()` applies correct modifier by stage
- [ ] `redistributeWeights()` correctly redistributes when metrics missing
- [ ] Alert CRUD operations

### Integration Tests

- [ ] `GET /api/admin/performance` returns correct structure
- [ ] `GET /api/admin/performance/[clientId]` returns client data
- [ ] `POST /api/admin/performance/alerts` creates and publishes alert
- [ ] Client portal shows active alerts
- [ ] Dismiss functionality works

### Manual QA

- [ ] Dashboard loads and displays all clients
- [ ] Sorting works correctly
- [ ] Filters work correctly
- [ ] Client detail panel shows correct data
- [ ] Alert publish flow works end-to-end
- [ ] Client sees alert on login
- [ ] Client can dismiss alert

---

## Future Enhancements

### Automated Alerts

- Trigger alert draft when score drops below threshold
- Weekly digest of accounts needing attention
- Slack notifications for critical accounts

### Predictive Scoring

- Use historical patterns to predict future score
- Early warning for declining trajectories
- Churn probability scoring

### Benchmarking

- Compare client to others in same industry
- Compare client to others at same growth stage
- Show percentile rankings

### Goal Setting

- Set target score for each client
- Track progress toward goals
- Celebrate when targets hit

---

## Appendix: Example Calculations

### Example 1: Thriving Harvesting Client

**Client:** Best Company  
**Stage:** Harvesting (14 months)  
**Plan:** AI + SEO (Full Service weights)

| Metric | Current | Previous | Delta | Points | Weight | Contribution |
|--------|---------|----------|-------|--------|--------|--------------|
| Keywords | 4.2 avg | 5.8 avg | +28% | 78 | 20% | 15.6 |
| Visitors | 12,500 | 10,200 | +23% | 73 | 15% | 11.0 |
| Leads | 45 | 38 | +18% | 68 | 20% | 13.6 |
| AI Visibility | 72 | 58 | +24% | 74 | 15% | 11.1 |
| Conversions | 12 | 10 | +20% | 70 | 15% | 10.5 |
| Alerts | 6 sent | - | - | 100 | 15% | 15.0 |
| **Base Score** | | | | | | **76.8** |

**Velocity:**
- Improvements: 52 total over 14 months = 3.7/month
- Expected: 4.0/month
- Ratio: 0.93 → Modifier: 1.0

**Final Score:** 76.8 × 1.0 = **77** 🟢 Healthy

---

### Example 2: Critical Seedling Client

**Client:** New Startup LLC  
**Stage:** Seedling (45 days)  
**Plan:** Paid Media

| Metric | Current | Previous | Delta | Points | Weight | Contribution |
|--------|---------|----------|-------|--------|--------|--------------|
| Keywords | N/A | N/A | - | 50 | 10% | 5.0 |
| Visitors | 850 | 920 | -8% | 42 | 15% | 6.3 |
| Leads | 2 | 5 | -60% | 0 | 40% | 0.0 |
| AI Visibility | N/A | N/A | - | 50 | 5% | 2.5 |
| Conversions | 0 | 1 | -100% | 0 | 15% | 0.0 |
| Alerts | 0 sent | - | - | 0 | 15% | 0.0 |
| **Base Score** | | | | | | **13.8** |

**Velocity:**
- In ramp period → Modifier: 1.0 (no penalty)

**Final Score:** 13.8 × 1.0 = **14** 🔴 Stalled Launch

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 29, 2026 | Claude + Ryan | Initial specification |

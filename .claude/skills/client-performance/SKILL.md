# Client Performance Scoring Skill - Pyrus Portal

This skill documents how the client performance scoring system works in Pyrus Portal, including the algorithm, growth stages, and metric weights.

---

## 1. Overview

The Client Performance Scoring System measures **active client health** to help the team identify underperforming accounts before churn and recognize high performers for upsells.

### What It Measures
- **Metric improvements**: Keywords, traffic, leads, AI visibility, conversions
- **Result alerts sent**: Positive news delivered to clients
- **Account velocity**: Improvements relative to tenure

### How It Differs from Pipeline Scoring
| Aspect | Pipeline Scoring | Performance Scoring |
|--------|-----------------|---------------------|
| **Target** | Leads/prospects (recommendations) | Active paying clients |
| **Purpose** | Predict close probability | Measure client health |
| **Outcome** | Weighted pipeline values | Churn risk / upsell candidates |
| **Trigger** | Deal events, daily cron | On-demand, cached hourly |

### When Scores Are Calculated
- **On-demand**: When admin views performance dashboard
- **Cached**: Scores cached for 1 hour to avoid recalculation
- **Stored**: `clients.performance_score` and `clients.score_updated_at`
- **History**: Recorded in `score_history` when score changes or daily

---

## 2. Performance Score (0-100)

### What the Score Represents
A weighted composite measuring how well a client is performing compared to their previous period. The score reflects **growth momentum** and **engagement quality**.

### Formula
```
base_score = Σ(metric_score × metric_weight) for all metrics
final_score = base_score × velocity_modifier
```

### Growth Momentum
Measured by comparing current 30-day period metrics to previous 30-day period:
- **Positive delta** = growing (score above 50)
- **No change** = stable (score at 50)
- **Negative delta** = declining (score below 50)

### Engagement Quality
Measured by result alerts sent to the client:
- More meaningful alerts = more wins to report = higher engagement score
- Alert types weighted by impact (lead_increase = 15 pts, keyword_ranking = 10 pts)

### Delta to Points Conversion
```javascript
function deltaToPoints(delta) {
  // Base formula: 50 = no change, +1% = +1 point
  const points = 50 + delta
  return Math.max(0, Math.min(100, Math.round(points)))
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

---

## 3. Score Ranges

### 0-19: Critical
- **Status**: 🔴 Critical
- **Color**: Red (#dc2626)
- **Description**: Immediate attention required
- **Triggers**:
  - Multiple metrics declining severely (>30%)
  - No result alerts sent
  - Very low or zero velocity
- **Action**: All hands on deck

### 20-39: At Risk
- **Status**: 🟠 At Risk
- **Color**: Orange (#f97316)
- **Description**: Declining metrics, needs intervention
- **Triggers**:
  - One or more metrics declining 15-30%
  - Few alerts sent
  - Below-expected velocity
- **Action**: Strategy review, intervention alert

### 40-59: Needs Attention
- **Status**: 🟡 Needs Attention
- **Color**: Yellow (#eab308)
- **Description**: Below expectations, monitor closely
- **Triggers**:
  - Metrics flat or slightly declining
  - Some alerts but inconsistent
  - Velocity below expected
- **Action**: Increase engagement, send alerts

### 60-79: Healthy
- **Status**: 🟢 Healthy
- **Color**: Light Green (#22c55e)
- **Description**: Meeting expectations, on track
- **Triggers**:
  - Most metrics stable or growing
  - Regular alerts being sent
  - Velocity at or above expected
- **Action**: Maintain momentum

### 80-100: Thriving
- **Status**: 🟢 Thriving
- **Color**: Dark Green (#16a34a)
- **Description**: Exceeding expectations
- **Triggers**:
  - Multiple metrics growing 15%+
  - Consistent alerts
  - High velocity
- **Action**: Case study candidate, explore upsells

---

## 4. Metric Weights by Plan

Different service plans prioritize different metrics. All weights sum to 100%.

### SEO Only (`seo`)
| Metric | Weight | Rationale |
|--------|--------|-----------|
| Keywords | 30% | Primary SEO indicator |
| Visitors | 20% | Traffic is key outcome |
| Leads | 15% | End conversion goal |
| AI Visibility | 5% | Secondary benefit |
| Conversions | 10% | Business impact |
| Alerts | 20% | Engagement indicator |

### Paid Media (`paid_media`)
| Metric | Weight | Rationale |
|--------|--------|-----------|
| Keywords | 10% | Less relevant |
| Visitors | 15% | Traffic from ads |
| Leads | 40% | Primary paid goal |
| AI Visibility | 5% | Not primary focus |
| Conversions | 15% | ROI measure |
| Alerts | 15% | Engagement |

### AI Optimization (`ai_optimization`)
| Metric | Weight | Rationale |
|--------|--------|-----------|
| Keywords | 10% | Supporting metric |
| Visitors | 15% | AI-driven traffic |
| Leads | 15% | Secondary outcome |
| AI Visibility | 35% | Primary AI indicator |
| Conversions | 10% | Business impact |
| Alerts | 15% | Engagement |

### Full Service (`full_service`)
| Metric | Weight | Rationale |
|--------|--------|-----------|
| Keywords | 20% | Balanced SEO |
| Visitors | 15% | Traffic matters |
| Leads | 20% | Lead generation |
| AI Visibility | 15% | AI component |
| Conversions | 15% | Business results |
| Alerts | 15% | Engagement |

### Weight Redistribution
When a metric is not tracked for a client, its weight is proportionally distributed among remaining metrics.

```javascript
function redistributeWeights(weights, excludedMetrics) {
  const activeWeight = 100 - excludedWeight
  const scaleFactor = 100 / activeWeight
  // Multiply each remaining weight by scaleFactor
}
```

---

## 5. Growth Stages

Growth stages are lifecycle classifications based on account tenure. Each stage has different expectations.

### 🌱 Seedling (0-3 months)
| Aspect | Value |
|--------|-------|
| Tenure | 0-90 days |
| Expected Score | 40-60 |
| Description | Ramp-up period, foundation building |
| Ramp Period | SEO: 90d, Paid: 30d, AI: 60d |

**Scoring Adjustments**:
- No velocity penalty (in ramp period)
- Metric declines less penalized (baseline forming)
- Any positive movement is a bonus

**Evaluation Labels**:
| Score | Label |
|-------|-------|
| 80-100 | Exceptional Start |
| 60-79 | Strong Start |
| 40-59 | Normal Ramp |
| 20-39 | Slow Start |
| 0-19 | Stalled Launch |

### 🌿 Sprouting (3-6 months)
| Aspect | Value |
|--------|-------|
| Tenure | 90-180 days |
| Expected Score | 50-70 |
| Description | Early results appearing |

**Scoring Adjustments**:
- Full velocity modifier applies
- Primary metric weighted slightly higher
- Stagnation begins to penalize

**Evaluation Labels**:
| Score | Label |
|-------|-------|
| 80-100 | Fast Tracker |
| 60-79 | Ahead of Schedule |
| 40-59 | Normal Growth |
| 20-39 | Behind Schedule |
| 0-19 | Failing |

### 🌸 Blooming (6-12 months)
| Aspect | Value |
|--------|-------|
| Tenure | 180-365 days |
| Expected Score | 60-80 |
| Description | Multi-metric growth expected |

**Scoring Adjustments**:
- All metrics weighted normally
- Movement expected everywhere
- Stagnation = significant penalty

**Evaluation Labels**:
| Score | Label |
|-------|-------|
| 80-100 | Star Client |
| 60-79 | On Track |
| 40-59 | Needs Attention |
| 20-39 | At Risk |
| 0-19 | Critical |

### 🌾 Harvesting (12+ months)
| Aspect | Value |
|--------|-------|
| Tenure | 365+ days |
| Expected Score | 70-90 |
| Description | Mature, stable, expansion-ready |

**Scoring Adjustments**:
- Stability (no decline) scores well
- Service expansion weighted
- Upsell readiness flagged

**Evaluation Labels**:
| Score | Label |
|-------|-------|
| 80-100 | Ideal / Premium Candidate |
| 60-79 | Stable |
| 40-59 | Declining |
| 20-39 | Churn Risk |
| 0-19 | Likely Lost |

---

## 6. Velocity Modifier

Velocity measures improvements relative to account tenure. It rewards fast-improving accounts and penalizes stagnant ones.

### What It Measures
```javascript
velocity = improvementsTotal / monthsActive
```

Improvements are counted from:
- Positive result alerts (success highlight_type)
- Activity log entries (seo_ranking, traffic_milestone, lead_generated, social_engagement)

### Expected Velocity by Plan
| Plan | Expected Monthly |
|------|------------------|
| SEO | 3 keyword improvements |
| Paid Media | 2 lead increases |
| AI Optimization | 1 visibility improvement |
| Full Service | 4 combined improvements |

### Modifier Calculation
```javascript
ratio = actual_velocity / expected_velocity

if (inRampPeriod) return 1.0      // No penalty during ramp
if (ratio >= 1.5) return 1.15     // 15% boost - exceeding
if (ratio >= 1.0) return 1.0      // On track
if (ratio >= 0.5) return 0.85     // 15% penalty - below
return 0.70                        // 30% penalty - stagnant
```

### Modifier Range
| Ratio | Modifier | Label |
|-------|----------|-------|
| ≥ 1.5 | 1.15 | Exceeding (15% boost) |
| ≥ 1.0 | 1.0 | On Track |
| ≥ 0.5 | 0.85 | Below (15% penalty) |
| < 0.5 | 0.70 | Stagnant (30% penalty) |

### Ramp Periods (No Penalty)
| Plan | Ramp Days |
|------|-----------|
| SEO | 90 |
| Paid Media | 30 |
| AI Optimization | 60 |
| Full Service | 90 |

---

## 7. Database Tables

### metric_snapshots
Stores point-in-time metric values for trend analysis.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | FK to clients |
| metric_type | string | visitors, keyword_avg_position, leads, ai_visibility, conversions |
| value | decimal | The metric value |
| period_start | date | Start of measurement period |
| period_end | date | End of measurement period |
| created_at | timestamptz | Record creation time |

**Data Flow**: Populated from Agency Dashboard sync (pending API connection).

### score_history
Historical record of client scores for sparkline charts.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | FK to clients |
| score | integer | Performance score 0-100 |
| growth_stage | string | Stage at time of recording |
| recorded_at | timestamptz | When score was recorded |
| created_at | timestamptz | Record creation time |

**Recording Logic**: New record created when:
- Score changes from previous record, OR
- Last record is older than 24 hours

### clients (columns)
| Column | Type | Description |
|--------|------|-------------|
| growth_stage | string | seedling, sprouting, blooming, harvesting |
| stage_updated_at | timestamptz | Last stage transition |
| performance_score | integer | Cached current score (0-100) |
| score_updated_at | timestamptz | Last score calculation |

### client_alerts
Performance alerts published to clients.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | FK to clients |
| message | text | Alert message content |
| alert_type | string | performance_focus, general_update, milestone, intervention |
| status | string | draft, published, dismissed |
| published_at | timestamptz | When alert was published |
| dismissed_at | timestamptz | When client dismissed |

---

## 8. Code Locations

### Scoring Algorithm
| File | Purpose |
|------|---------|
| `src/lib/performance/calculateScore.ts` | Main scoring functions |
| `src/lib/performance/weights.ts` | Plan-based metric weights |
| `src/lib/performance/stages.ts` | Growth stage definitions |
| `src/lib/performance/velocity.ts` | Velocity modifier calculation |
| `src/lib/performance/index.ts` | Exports all performance functions |

### Key Functions
| Function | File | Purpose |
|----------|------|---------|
| `calculateClientPerformance()` | calculateScore.ts | Main entry point |
| `deltaToPoints()` | calculateScore.ts | Convert delta to 0-100 |
| `calculateAlertsScore()` | calculateScore.ts | Score from alert activity |
| `getWeightsForPlan()` | weights.ts | Get metric weights |
| `getVelocityModifier()` | velocity.ts | Calculate velocity boost/penalty |
| `getGrowthStage()` | stages.ts | Determine stage from tenure |
| `getScoreStatus()` | stages.ts | Get status label and color |

### API Routes
| File | Purpose |
|------|---------|
| `src/app/api/admin/performance/route.ts` | Dashboard data |
| `src/app/api/admin/performance/[clientId]/route.ts` | Client detail |
| `src/app/api/admin/performance/[clientId]/history/route.ts` | Score history |
| `src/app/api/admin/performance/avg-history/route.ts` | Average score trend |
| `src/app/api/admin/performance/alerts/route.ts` | Create/list alerts |
| `src/app/api/admin/performance/alerts/[alertId]/route.ts` | Get/update alert |
| `src/app/api/admin/performance/alerts/[alertId]/dismiss/route.ts` | Dismiss alert |

### UI Components
| File | Purpose |
|------|---------|
| `src/app/admin/clients/performance/page.tsx` | Performance dashboard page |
| `src/components/admin/performance/SummaryCards.tsx` | Top-level stats |
| `src/components/admin/performance/GrowthStageCards.tsx` | Stage breakdown |
| `src/components/admin/performance/ClientList.tsx` | Sortable client table |
| `src/components/admin/performance/ClientDetailModal.tsx` | Client deep-dive |
| `src/components/admin/performance/ScoringExplainerModal.tsx` | How scoring works |
| `src/components/admin/performance/AlertComposer.tsx` | Create client alerts |
| `src/components/admin/performance/Sparkline.tsx` | Mini trend charts |

### Validation Schemas
| File | Purpose |
|------|---------|
| `src/lib/validation/performanceSchemas.ts` | Zod schemas for API |

---

## 9. Current Status

### What's Built
- Complete scoring algorithm with all weights and modifiers
- Growth stage lifecycle management
- Velocity calculation and modifier
- Performance dashboard UI with filters and sorting
- Client detail modal with metric breakdown
- Alert system for client communication
- Score history tracking for sparklines
- API routes for all operations

### What's Pending
**NOTE: This feature is awaiting API connection to Agency Dashboard**

The `metric_snapshots` table is designed to receive data from:
- Google Analytics (visitors)
- SEMrush / Ahrefs (keyword positions)
- Agency Dashboard (leads, conversions)
- AI visibility tools

Until the Agency Dashboard API is connected:
- Scores may show as 50 (neutral) for missing metrics
- Metrics are redistributed among available data
- Manual data entry is possible via direct database access

### How to Test with Mock Data
```sql
-- Insert test metric snapshot
INSERT INTO metric_snapshots (client_id, metric_type, value, period_start, period_end)
VALUES (
  'your-client-uuid',
  'visitors',
  5000,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);

-- Insert previous period for comparison
INSERT INTO metric_snapshots (client_id, metric_type, value, period_start, period_end)
VALUES (
  'your-client-uuid',
  'visitors',
  4000,
  CURRENT_DATE - INTERVAL '60 days',
  CURRENT_DATE - INTERVAL '30 days'
);
```

---

## 10. Gotchas and Important Notes

### New Clients Have Limited Data
- First 30 days: Only current period, no previous to compare
- Metrics without data score as 50 (neutral)
- Weights redistribute to available metrics
- Velocity modifier is 1.0 during ramp period

### Plan Type Must Be Set Correctly
- Plan type determines which weights apply
- Detected from subscription items and client_products
- Falls back to `full_service` if unclear
- Check product category matches: 'ai', 'root', 'growth'

### Growth Stage Affects Interpretation
The same score means different things at different stages:
- Score 50 for Seedling = "Normal Ramp" (acceptable)
- Score 50 for Harvesting = "Declining" (concerning)

Always consider stage when interpreting scores.

### Metric Period Alignment
- Current period: Last 30 days
- Previous period: 30 days before current
- Snapshots matched by `period_start` date
- Allow ±5 days tolerance for matching

### Inverted Metrics
Keyword position is inverted (lower = better):
```javascript
// For keywords, delta is calculated as:
delta = ((previous - current) / previous) * 100
// So position 5 → 3 shows as +40% improvement
```

### Alert System Integration
- Alerts count toward engagement score
- Alert types have different weights:
  - lead_increase: 15 pts
  - ai_alert: 12.5 pts
  - keyword_ranking: 10 pts
  - traffic_milestone: 10 pts
  - campaign_milestone: 7.5 pts
  - other_update: 5 pts
- 50 points of weighted alerts = 100 score

### Caching Behavior
- Dashboard recalculates all clients on each load (expensive)
- Results cached in `clients.performance_score` for 1 hour
- Cache invalidated when `score_updated_at` is stale
- Consider background job for production scale

### Special Flags
Stage-adjusted flags for quick identification:
| Condition | Flag | Priority |
|-----------|------|----------|
| Any stage + Score < 20 | 🔴 Critical | critical |
| Harvesting + Score < 40 | 🚨 Churn Risk | critical |
| Blooming + Score < 40 | ⚠️ Problem Account | high |
| Sprouting + Score > 80 | 🚀 Fast Tracker | low |
| Harvesting + Score > 80 | ⭐ Premium Candidate | low |

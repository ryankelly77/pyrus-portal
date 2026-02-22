# Email Automation System Skill - Pyrus Portal

This skill documents how the email automation system works in Pyrus Portal, including the workflow builder, processing logic, and the recommendation funnel.

---

## 1. Overview

### What the System Does
The email automation system allows admins to create multi-step email sequences that are triggered by user actions and automatically send follow-up emails on a schedule.

### Visual Workflow Builder
Automations are built using a drag-and-drop workflow editor powered by ReactFlow:
- **Trigger node**: Defines what starts the automation
- **Delay nodes**: Add wait times between steps
- **Email nodes**: Send templated emails
- **Condition nodes**: Branch based on criteria
- **End nodes**: Mark completion points

### How Automations Are Processed
- **Hourly cron job** runs at `/api/cron/process-automations`
- Finds all enrollments with `next_step_due_at <= now`
- Processes up to 50 enrollments per run
- Checks exit conditions before sending
- Logs all activity to `email_automation_step_logs`

---

## 2. Core Concepts

### Automations
An automation is a defined sequence of email steps triggered by a specific event.

| Property | Description |
|----------|-------------|
| `name` | Human-readable name |
| `slug` | Unique identifier |
| `trigger_type` | Event that starts the automation |
| `trigger_conditions` | JSONB filter on trigger data |
| `global_stop_conditions` | Exit conditions checked before each step |
| `send_window_start/end` | Hours when emails can be sent (e.g., 9 AM - 5 PM) |
| `send_on_weekends` | Whether to send on Sat/Sun |
| `is_active` | Enable/disable the automation |
| `flow_definition` | Visual editor state (nodes, edges) |

### Steps (Nodes)
Steps are the building blocks of an automation workflow.

**Email Nodes**
- Send a templated email via `sendTemplatedEmail()`
- Reference template by `template_slug`
- Can override subject line

**Delay Nodes**
- Wait X days and Y hours before next step
- `delay_from`: 'previous_step' or 'trigger'

**Condition Nodes**
- Branch based on `send_conditions` or `skip_conditions`
- Evaluate JSONB against current context

**Node Connections**
Steps are ordered by `step_order` (1, 2, 3...). The cron finds the next step by:
```javascript
const nextStep = steps.find(s => s.step_order === currentStepOrder + 1)
```

### Enrollments
An enrollment represents a user's journey through an automation.

| Property | Description |
|----------|-------------|
| `automation_id` | Which automation they're in |
| `recipient_email` | Who to send to |
| `recipient_name` | Display name |
| `trigger_record_type` | What type triggered this (e.g., 'recommendation_invite') |
| `trigger_record_id` | ID of the trigger record |
| `context_data` | JSONB with template variables |
| `status` | 'active', 'completed', 'stopped' |
| `current_step_order` | Last completed step number |
| `next_step_due_at` | When to process next step |
| `stopped_reason` | Why they exited (if applicable) |

**How Users Enter**
Users are enrolled via `enrollInAutomations(triggerType, context)` called from:
- `/api/admin/recommendations/[id]/invite` → `recommendation_sent`
- `/api/webhooks/mailgun` → `recommendation_email_opened`, `recommendation_email_clicked`
- `/api/proposal/[token]` → `recommendation_viewed`

**How Users Exit**
Users exit when:
1. All steps complete → status = 'completed'
2. Exit condition met → status = 'stopped'
3. Manually stopped → status = 'stopped'

---

## 3. Trigger Types

Triggers define what starts an automation. Available triggers:

### Recommendation Triggers
| Trigger | When It Fires |
|---------|---------------|
| `recommendation_sent` | Recommendation invite email is sent |
| `recommendation_email_opened` | Mailgun webhook fires on email open |
| `recommendation_email_clicked` | Mailgun webhook fires on link click |
| `recommendation_viewed` | User views the proposal page |

### Client Triggers
| Trigger | When It Fires |
|---------|---------------|
| `client_created` | New client record created |
| `client_login` | Client logs into portal |

### Content Triggers
| Trigger | When It Fires |
|---------|---------------|
| `content_approved` | Content piece is approved |

### Page View Triggers
| Trigger | When It Fires |
|---------|---------------|
| `page_view_dashboard` | Client views dashboard |
| `page_view_results` | Client views results page |
| `page_view_recommendations` | Client views recommendations |

### Billing Triggers
| Trigger | When It Fires |
|---------|---------------|
| `invoice_sent` | Invoice email sent |
| `payment_received` | Payment processed |
| `subscription_started` | New subscription created |

### Other
| Trigger | When It Fires |
|---------|---------------|
| `manual` | Admin manually triggers |

---

## 4. Exit Conditions

Exit conditions are stored in `global_stop_conditions` JSONB and checked **BEFORE each email send**.

### Available Exit Conditions
| Key | Checked Against | Description |
|-----|-----------------|-------------|
| `on_purchase` | `deal_status === 'accepted'` | User made a purchase |
| `on_email_open` | `email_opened === true` | User opened any email |
| `on_email_click` | Mailgun click event | User clicked a link |
| `on_recommendation_view` | `proposal_viewed === true` | User viewed proposal |
| `on_reply` | Future: reply detection | User replied to email |
| `on_unsubscribe` | Future: unsubscribe tracking | User unsubscribed |

### How Exit Checking Works
1. Before processing each step, `refreshContextData()` fetches latest state
2. `evaluateConditions(globalStopConditions, contextData)` runs
3. If conditions match, enrollment is stopped with reason
4. Stop is logged to `email_automation_step_logs`

### Condition Evaluation Logic
```javascript
// Supports: equality, array inclusion, negation, exists, or/and
evaluateConditions(conditions, state)

// Examples:
{ on_email_open: true }  // Stops if state.on_email_open === true
{ deal_status: ['accepted', 'declined'] }  // Stops if status in array
{ or: [{ purchased: true }, { unsubscribed: true }] }  // OR logic
```

---

## 5. How Processing Works

### Step-by-Step Flow

1. **Cron job runs** (hourly via Vercel cron)
   ```
   GET /api/cron/process-automations
   Authorization: Bearer $CRON_SECRET
   ```

2. **Find ready enrollments**
   ```sql
   SELECT * FROM email_automation_enrollments
   WHERE status = 'active'
   AND next_step_due_at <= NOW()
   LIMIT 50
   ```

3. **For each enrollment:**
   - Get the automation and its steps
   - Find current step by `current_step_order + 1`
   - If no more steps → mark completed

4. **Refresh context data**
   - Fetch latest state from trigger record
   - Build context with `email_opened`, `proposal_viewed`, `deal_status`

5. **Check exit conditions**
   - If `global_stop_conditions` match → stop enrollment
   - Log with status 'stopped'

6. **Check step conditions**
   - `skip_conditions`: If match, skip step and advance
   - `send_conditions`: If don't match, reschedule 1 hour later

7. **Send the email**
   ```javascript
   await sendTemplatedEmail({
     to: enrollment.recipient_email,
     templateSlug: currentStep.template_slug,
     variables: contextData,
     subject: currentStep.subject_override
   })
   ```

8. **Log execution**
   ```javascript
   await supabase.from('email_automation_step_logs').insert({
     enrollment_id, step_id, scheduled_for, processed_at,
     status: 'sent', email_log_id
   })
   ```

9. **Schedule next step**
   - Calculate delay from current step's `delay_days` + `delay_hours`
   - Update `current_step_order` and `next_step_due_at`
   - If no more steps → mark completed

---

## 6. Mailgun Webhooks

### Webhook Endpoint
```
POST /api/webhooks/mailgun
```

### Signature Verification
```javascript
const encodedToken = crypto
  .createHmac('sha256', MAILGUN_WEBHOOK_SIGNING_KEY)
  .update(timestamp + token)
  .digest('hex')
return encodedToken === signature
```

### How Opens Are Tracked
1. Mailgun sends `event: opened` with recipient email
2. Find invite by email: `recommendation_invites.email = recipient`
3. Update `email_opened_at` on invite
4. Update `email_logs` status to 'opened'
5. Enroll in automations with trigger `recommendation_email_opened`
6. Check and stop any automations with `on_email_open` exit condition
7. Trigger pipeline score recalculation

### How Clicks Are Tracked
1. Mailgun sends `event: clicked` with recipient and URL
2. Same flow as opens but:
   - Trigger type: `recommendation_email_clicked`
   - Exit condition: `on_email_click`

### Tag Filtering
Only processes emails tagged with `recommendation-invite`:
```javascript
if (!tags.includes('recommendation-invite')) {
  return { received: true, skipped: 'not recommendation-invite' }
}
```

---

## 7. Duplicate Prevention

### Rule
Users cannot be enrolled in the same automation twice while an enrollment is active.

### Implementation
```javascript
// Check before creating enrollment
const { data: existingEnrollment } = await supabase
  .from('email_automation_enrollments')
  .select('id')
  .eq('automation_id', automation.id)
  .eq('recipient_email', context.recipientEmail)
  .eq('status', 'active')
  .maybeSingle();

if (existingEnrollment) {
  console.log('Skipping - already active');
  continue;
}
```

### What This Means
- Same user CAN be in multiple DIFFERENT automations simultaneously
- Same user CANNOT have two active enrollments in the SAME automation
- After completion/stop, user CAN re-enroll in the same automation

---

## 8. Database Tables

### email_automations
The automation definition.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | string | Display name |
| slug | string | Unique identifier |
| description | string | Optional description |
| trigger_type | string | What starts this automation |
| trigger_conditions | JSONB | Filter on trigger data |
| global_stop_conditions | JSONB | Exit conditions |
| send_window_start | time | Earliest send time (e.g., '09:00') |
| send_window_end | time | Latest send time (e.g., '17:00') |
| send_window_timezone | string | Timezone (default: 'America/Chicago') |
| send_on_weekends | boolean | Send on Sat/Sun |
| is_active | boolean | Enable/disable |
| flow_definition | JSONB | Visual editor state |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Last modified |

### email_automation_steps
Individual steps in an automation.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| automation_id | uuid | FK to email_automations |
| step_order | int | Sequence number (1, 2, 3...) |
| delay_days | int | Days to wait before this step |
| delay_hours | int | Hours to wait before this step |
| delay_from | string | 'previous_step' or 'trigger' |
| template_slug | string | FK to email_templates.slug |
| subject_override | string | Optional custom subject |
| send_conditions | JSONB | Conditions required to send |
| skip_conditions | JSONB | Conditions that skip this step |
| created_at | timestamptz | Created timestamp |

**Unique constraint**: `(automation_id, step_order)`

### email_automation_enrollments
Active user journeys through automations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| automation_id | uuid | FK to email_automations |
| trigger_record_type | string | e.g., 'recommendation_invite' |
| trigger_record_id | uuid | ID of trigger record |
| recipient_email | string | Email to send to |
| recipient_name | string | Display name |
| context_data | JSONB | Template variables |
| status | string | 'active', 'completed', 'stopped' |
| current_step_order | int | Last completed step (0 = none) |
| next_step_due_at | timestamptz | When to process next |
| stopped_reason | string | Why stopped (if applicable) |
| stopped_at | timestamptz | When stopped |
| created_at | timestamptz | Enrolled timestamp |
| updated_at | timestamptz | Last modified |

### email_automation_step_logs
Audit trail of step executions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| enrollment_id | uuid | FK to enrollments |
| step_id | uuid | FK to steps |
| scheduled_for | timestamptz | When step was scheduled |
| processed_at | timestamptz | When step was processed |
| status | string | 'sent', 'skipped', 'failed', 'stopped' |
| skip_reason | string | Why skipped (if applicable) |
| error_message | string | Error details (if failed) |
| email_log_id | uuid | FK to email_logs (if sent) |
| created_at | timestamptz | Created timestamp |

---

## 9. The 4-Workflow Recommendation Funnel

Pyrus Portal uses a staged automation funnel for recommendation follow-ups:

### Workflow 1: Not Opened
| Setting | Value |
|---------|-------|
| Trigger | `recommendation_sent` |
| Exit Condition | `on_email_open: true` |
| Purpose | Follow up with people who haven't opened the email |
| Steps | Day 1: Reminder, Day 3: Second reminder, Day 7: Final reminder |

### Workflow 2: Opened Not Clicked
| Setting | Value |
|---------|-------|
| Trigger | `recommendation_email_opened` |
| Exit Condition | `on_email_click: true` |
| Purpose | Follow up with people who opened but didn't click |
| Steps | Encourage them to view the proposal |

### Workflow 3: Clicked Not Viewed
| Setting | Value |
|---------|-------|
| Trigger | `recommendation_email_clicked` |
| Exit Condition | `on_recommendation_view: true` |
| Purpose | Follow up with people who clicked but didn't view proposal |
| Steps | Check if they had issues accessing it |

### Workflow 4: Viewed Not Purchased
| Setting | Value |
|---------|-------|
| Trigger | `recommendation_viewed` |
| Exit Condition | `on_purchase: true` |
| Purpose | Follow up with people who viewed but didn't buy |
| Steps | Address concerns, offer help, gentle nudges |

### How They Chain Together
1. User receives recommendation → enrolled in Workflow 1
2. User opens email → exits Workflow 1, enrolled in Workflow 2
3. User clicks link → exits Workflow 2, enrolled in Workflow 3
4. User views proposal → exits Workflow 3, enrolled in Workflow 4
5. User purchases → exits Workflow 4

**Key point**: Each workflow has an exit condition that prevents overlap and ensures users only receive relevant emails.

---

## 10. Code Locations

### Core Service
| File | Purpose |
|------|---------|
| `/src/lib/email/automation-service.ts` | Enrollment and stop logic |

Key functions:
- `enrollInAutomations()` - Create new enrollments
- `checkAndStopEnrollments()` - Check exit conditions
- `stopEnrollment()` - Mark enrollment as stopped
- `evaluateConditions()` - JSONB condition evaluation

### Cron Job
| File | Purpose |
|------|---------|
| `/src/app/api/cron/process-automations/route.ts` | Hourly processing |

### Webhooks
| File | Purpose |
|------|---------|
| `/src/app/api/webhooks/mailgun/route.ts` | Mailgun event handling |

### Admin UI
| File | Purpose |
|------|---------|
| `/src/app/admin/automations/page.tsx` | Automations list |
| `/src/app/admin/automations/[id]/page.tsx` | Workflow editor |
| `/src/components/admin/automations/` | UI components |

### Visual Editor Components
| File | Purpose |
|------|---------|
| `toolbox.tsx` | Draggable node palette |
| `workflow-canvas.tsx` | ReactFlow canvas |
| `properties-panel.tsx` | Node property editor |
| `flow-utils.ts` | Convert between flow and DB |
| `nodes/` | Custom node components |

---

## 11. Common Scenarios

### User Receives Recommendation
1. Admin sends recommendation via `/api/admin/recommendations/[id]/invite`
2. Email sent via Mailgun with tag `recommendation-invite`
3. `enrollInAutomations('recommendation_sent', ...)` called
4. User enrolled in all active automations with trigger `recommendation_sent`
5. First step scheduled based on delay settings

### User Opens Email
1. Mailgun sends webhook to `/api/webhooks/mailgun`
2. Event type: `opened`, recipient identified
3. `email_opened_at` set on `recommendation_invites`
4. `enrollInAutomations('recommendation_email_opened', ...)` called
5. `checkAndStopEnrollments(..., { on_email_open: true })` called
6. Any automations with `on_email_open` exit condition are stopped

### User Clicks Link
1. Mailgun sends webhook with event type: `clicked`
2. `enrollInAutomations('recommendation_email_clicked', ...)` called
3. `checkAndStopEnrollments(..., { on_email_click: true })` called

### User Views Proposal
1. User visits `/view-proposal/[token]`
2. `viewed_at` set on `recommendation_invites`
3. `enrollInAutomations('recommendation_viewed', ...)` called
4. `checkAndStopEnrollments(..., { on_recommendation_view: true })` called

### User Purchases
1. Recommendation status changed to 'accepted'
2. On next cron run, `refreshContextData()` gets `deal_status: 'accepted'`
3. `evaluateConditions({ on_purchase: true }, { deal_status: 'accepted' })`
4. Condition matches → enrollment stopped

---

## 12. Gotchas and Important Notes

### Exit Condition Key Naming
Exit conditions use specific keys that may differ from trigger names:
- `on_email_open` (not `email_opened`)
- `on_email_click` (not `email_clicked`)
- `on_recommendation_view` (not `recommendation_viewed`)
- `on_purchase` (checks `deal_status === 'accepted'`)

### Delay Calculation
Delay is calculated from **enrollment time** or **previous step completion**, not from trigger:
```javascript
const nextDueAt = new Date(Date.now() + delayMs)
```

### Multiple Automation Enrollment
Users **can** be in multiple different automations simultaneously. The duplicate check only prevents re-enrollment in the **same** automation.

### Cron Timing
- Cron runs **hourly**, not real-time
- Emails may be delayed up to 1 hour from scheduled time
- Send window enforcement may push emails to next business day

### Send Window Logic
```javascript
if (hour < startHour) hour = startHour
if (hour >= endHour) nextDay + startHour
if (!sendOnWeekends && isWeekend) skipToMonday
```

### Context Data Refresh
Before each step, `refreshContextData()` pulls fresh state from the trigger record. This ensures exit conditions use current data, not stale enrollment data.

### Template Variables
Available in email templates via `context_data`:
- `recipientFirstName` - First name
- `recipientName` - Full name
- `clientName` - Company name
- `proposalSentDate` - Formatted date
- `email_opened` - Boolean
- `proposal_viewed` - Boolean
- `deal_status` - Current status

### Error Handling
- Failed email sends are logged but don't stop the automation
- Step marked as 'failed' with error message
- Next cron run will try the next enrollment

### Webhook Filtering
Only processes emails with `recommendation-invite` tag. Other email types are ignored.

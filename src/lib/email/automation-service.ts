import { createClient } from '@/lib/supabase/server';

interface EnrollmentContext {
  recipientEmail: string;
  recipientName?: string;
  triggerRecordType: string;
  triggerRecordId: string;
  contextData: Record<string, any>;
}

/**
 * Enroll a recipient in matching automations based on trigger type
 */
export async function enrollInAutomations(
  triggerType: string,
  context: EnrollmentContext
): Promise<string[]> {
  // Use any type until database types are regenerated
  const supabase = await createClient() as any;

  // Find active automations for this trigger
  const { data: automations } = await supabase
    .from('email_automations' as any)
    .select('*, email_automation_steps(*)')
    .eq('trigger_type', triggerType)
    .eq('is_active', true);

  if (!automations?.length) return [];

  const enrollmentIds: string[] = [];

  for (const automation of automations) {
    // Check trigger conditions match
    if (!evaluateConditions(automation.trigger_conditions, context.contextData)) {
      continue;
    }

    // Get first step
    const firstStep = automation.email_automation_steps
      ?.sort((a: any, b: any) => a.step_order - b.step_order)[0];

    if (!firstStep) continue;

    // Calculate when first step is due
    const nextStepDueAt = calculateDueDate(
      new Date(),
      firstStep.delay_days,
      firstStep.delay_hours,
      automation
    );

    // Create enrollment
    const { data: enrollment } = await supabase
      .from('email_automation_enrollments' as any)
      .insert({
        automation_id: automation.id,
        trigger_record_type: context.triggerRecordType,
        trigger_record_id: context.triggerRecordId,
        recipient_email: context.recipientEmail,
        recipient_name: context.recipientName,
        context_data: context.contextData,
        status: 'active',
        current_step_order: 0,
        next_step_due_at: nextStepDueAt.toISOString(),
      })
      .select('id')
      .single();

    if (enrollment) {
      enrollmentIds.push(enrollment.id);
    }
  }

  return enrollmentIds;
}

/**
 * Stop an enrollment with a reason
 */
export async function stopEnrollment(
  enrollmentId: string,
  reason: string
): Promise<void> {
  const supabase = await createClient() as any;

  await supabase
    .from('email_automation_enrollments' as any)
    .update({
      status: 'stopped',
      stopped_reason: reason,
      stopped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId);
}

/**
 * Check stop conditions and stop matching enrollments
 * Call this when events happen (email opened, proposal viewed, etc.)
 */
export async function checkAndStopEnrollments(
  triggerRecordType: string,
  triggerRecordId: string,
  currentState: Record<string, any>
): Promise<number> {
  const supabase = await createClient() as any;

  // Find active enrollments for this record
  const { data: enrollments } = await supabase
    .from('email_automation_enrollments' as any)
    .select('*, email_automations(*)')
    .eq('trigger_record_type', triggerRecordType)
    .eq('trigger_record_id', triggerRecordId)
    .eq('status', 'active');

  if (!enrollments?.length) return 0;

  let stoppedCount = 0;

  for (const enrollment of enrollments) {
    const stopConditions = (enrollment.email_automations as any)?.global_stop_conditions;

    if (stopConditions && evaluateConditions(stopConditions, currentState)) {
      await stopEnrollment(enrollment.id, 'Stop condition met');
      stoppedCount++;
    }
  }

  return stoppedCount;
}

/**
 * Evaluate JSONB conditions against current state
 * Supports: equality, array inclusion, boolean, negation, exists, or/and
 */
export function evaluateConditions(
  conditions: Record<string, any>,
  state: Record<string, any>
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true; // No conditions = pass
  }

  // Handle OR conditions
  if (conditions.or && Array.isArray(conditions.or)) {
    return conditions.or.some((c: Record<string, any>) => evaluateConditions(c, state));
  }

  // Handle AND conditions
  if (conditions.and && Array.isArray(conditions.and)) {
    return conditions.and.every((c: Record<string, any>) => evaluateConditions(c, state));
  }

  // Handle individual conditions
  for (const [key, expected] of Object.entries(conditions)) {
    if (key === 'or' || key === 'and') continue;

    const actual = state[key];

    // Array inclusion check
    if (Array.isArray(expected)) {
      if (!expected.includes(actual)) return false;
    }
    // Negation
    else if (typeof expected === 'object' && expected !== null && 'not' in expected) {
      if (actual === expected.not) return false;
    }
    // Exists check
    else if (expected === 'exists') {
      if (actual === null || actual === undefined) return false;
    }
    // Equality
    else {
      if (actual !== expected) return false;
    }
  }

  return true;
}

/**
 * Calculate when a step should be executed, respecting send window
 */
function calculateDueDate(
  from: Date,
  delayDays: number,
  delayHours: number,
  automation: any
): Date {
  const dueDate = new Date(from);
  dueDate.setDate(dueDate.getDate() + delayDays);
  dueDate.setHours(dueDate.getHours() + delayHours);

  // Adjust for send window (simplified - just set to start of window if before)
  // Full implementation would handle timezone properly
  const startHour = parseInt(automation.send_window_start?.split(':')[0] || '9');
  const endHour = parseInt(automation.send_window_end?.split(':')[0] || '17');

  if (dueDate.getHours() < startHour) {
    dueDate.setHours(startHour, 0, 0, 0);
  } else if (dueDate.getHours() >= endHour) {
    // Push to next day
    dueDate.setDate(dueDate.getDate() + 1);
    dueDate.setHours(startHour, 0, 0, 0);
  }

  // Skip weekends if needed
  if (!automation.send_on_weekends) {
    while (dueDate.getDay() === 0 || dueDate.getDay() === 6) {
      dueDate.setDate(dueDate.getDate() + 1);
    }
  }

  return dueDate;
}

/**
 * Get enrollment status with steps and logs
 */
export async function getEnrollmentStatus(enrollmentId: string) {
  const supabase = await createClient() as any;

  const { data } = await supabase
    .from('email_automation_enrollments' as any)
    .select(`
      *,
      email_automations(*),
      email_automation_step_logs(*)
    `)
    .eq('id', enrollmentId)
    .single();

  return data;
}
